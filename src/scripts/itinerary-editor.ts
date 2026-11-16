import { cleanArtifacts } from '../lib/itinerary'
import { copyText } from '../lib/clipboard'
import { renderItinerary } from './itinerary-render'

const PLAN_KEY = 'manasik:itinerary'
const UPDATED_KEY = 'manasik:itinerary-updated'
const BACKUP_KEY = 'manasik:itinerary-backup'
const BACKUP_AT_KEY = 'manasik:itinerary-backup-at'

const TEMPLATE = `---
nama: Perjalanan Umrah
mulai: 2026-11-17
selesai: 2026-11-28
zona: WITA · WIB · AST
---

## Hari 1 — Selasa, 17 November 2026
- **10:30 WITA** — Berangkat dari rumah menuju bandara.
- **14:00 WIB** — Penerbangan menuju Jakarta.
- [ ] Paspor
- [ ] Visa

## Hari 2 — Rabu, 18 November 2026
- **00:20 WIB** — Penerbangan menuju Doha.
- **10:05 AST** — Tiba di Jeddah, lanjut ke Madinah.

## Hari 5 — Sabtu, 21 November 2026
- **11:15 AST** — Mandi ihram dan mengenakan pakaian ihram. #ihram
- **14:15 AST** — Niat umrah di Bir Ali, mulai talbiyah. #ihram
- **22:00 AST** — Tawaf, sa'i, tahallul. #tawaf #sai #tahallul

## Checklist dokumen
- [ ] Paspor
- [ ] Visa umrah
- [ ] Kartu vaksin meningitis
- [ ] QR Nusuk
`

const root = document.querySelector<HTMLElement>('[data-editor]')

if (root) {
  const input = root.querySelector<HTMLTextAreaElement>('[data-input]')
  const preview = root.querySelector<HTMLElement>('[data-preview]')
  const previewEmpty = root.querySelector<HTMLElement>('[data-preview-empty]')
  const status = root.querySelector<HTMLElement>('[data-status]')
  const undo = root.querySelector<HTMLElement>('[data-undo]')
  const undoText = root.querySelector<HTMLElement>('[data-undo-text]')
  const restore = root.querySelector<HTMLButtonElement>('[data-restore]')
  const fileInput = root.querySelector<HTMLInputElement>('[data-file]')
  const previewEmptyText = previewEmpty?.textContent ?? 'Belum ada isi.'

  let raw = readPlan()
  let saveTimer = 0
  let previewTimer = 0

  const params = new URLSearchParams(location.search)
  if (!raw.trim() && params.get('mode') === 'template') {
    raw = TEMPLATE
  }

  if (input) input.value = raw
  renderPreview()
  paintStatus()
  updateRestore()
  if (!readPlan().trim() && raw.trim()) saveNow()

  input?.addEventListener('input', () => {
    raw = input.value
    if (status) status.textContent = 'Menyimpan…'
    window.clearTimeout(saveTimer)
    saveTimer = window.setTimeout(saveNow, 500)
    window.clearTimeout(previewTimer)
    previewTimer = window.setTimeout(renderPreview, 300)
  })

  root.querySelectorAll<HTMLButtonElement>('[data-insert]').forEach((button) => {
    button.addEventListener('click', () => {
      const kind = button.dataset.insert
      const atLineStart =
        !input || input.selectionStart === 0 || input.value[input.selectionStart - 1] === '\n'
      const lead = atLineStart ? '' : '\n'
      switch (kind) {
        case 'bold':
          insert('**', '**', 'teks')
          break
        case 'heading':
          insert(`${lead}## Hari 1 — `, '', '')
          break
        case 'list':
          insert(`${lead}- `, '', '')
          break
        case 'check':
          insert(`${lead}- [ ] `, '', '')
          break
        case 'code':
          insert('`', '`', 'kode')
          break
        case 'link':
          insert('[', '](https://)', 'teks')
          break
        case 'tag':
          insert(`${lead}#ihram`, '', '')
          break
      }
    })
  })

  root.querySelector('[data-import]')?.addEventListener('click', () => fileInput?.click())

  fileInput?.addEventListener('change', async () => {
    const file = fileInput.files?.[0]
    if (!file) return
    const text = (await file.text()).replace(/\r\n?/g, '\n')
    fileInput.value = ''
    if (raw.trim() && !window.confirm('Ganti rencana yang ada?')) return
    backup()
    raw = text
    if (input) input.value = raw
    saveNow()
    renderPreview()
    showUndo('Rencana diganti. Cadangan versi sebelumnya tersedia.')
  })

  root.querySelector('[data-export]')?.addEventListener('click', () => {
    const name = slug(raw.match(/^nama:\s*(.+)$/m)?.[1] ?? 'rencana')
    const date = raw.match(/^mulai:\s*(.+)$/m)?.[1] ?? new Date().toISOString().slice(0, 10)
    download(`itinerary-${name}-${date}.md`, raw)
  })

  root.querySelector('[data-copy]')?.addEventListener('click', async (event) => {
    const button = event.currentTarget as HTMLButtonElement
    const copied = await copyText(raw)
    button.textContent = copied ? 'Tersalin' : 'Gagal'
    announce(copied ? 'Markdown disalin.' : 'Markdown gagal disalin.')
    window.setTimeout(() => {
      button.textContent = 'Salin'
    }, 1500)
  })

  root.querySelector('[data-template]')?.addEventListener('click', () => {
    if (raw.trim() && !window.confirm('Ganti dengan template?')) return
    backup()
    raw = TEMPLATE
    if (input) input.value = raw
    saveNow()
    renderPreview()
    showUndo('Template dimuat. Cadangan versi sebelumnya tersedia.')
  })

  root.querySelector('[data-clean]')?.addEventListener('click', () => {
    if (!raw.trim()) return
    backup()
    raw = cleanArtifacts(raw)
    if (input) input.value = raw
    saveNow()
    renderPreview()
    showUndo('Artefak dirapikan. Cadangan versi sebelumnya tersedia.')
  })

  root.querySelector('[data-delete]')?.addEventListener('click', () => {
    if (!raw.trim()) return
    if (!window.confirm('Hapus rencana? Cadangan versi sebelumnya akan disimpan.')) return
    backup()
    raw = ''
    if (input) input.value = ''
    saveNow()
    renderPreview()
    showUndo('Rencana dihapus. Cadangan tersedia.')
  })

  root.querySelector('[data-undo-action]')?.addEventListener('click', restoreBackup)
  restore?.addEventListener('click', restoreBackup)
  root.querySelector('[data-undo-close]')?.addEventListener('click', hideUndo)

  function insert(before: string, after = '', placeholder = '') {
    if (!input) return
    const start = input.selectionStart
    const end = input.selectionEnd
    const selected = input.value.slice(start, end) || placeholder
    input.setRangeText(before + selected + after, start, end, 'end')
    input.focus()
    const cursor = start + before.length
    input.setSelectionRange(cursor, cursor + selected.length)
    input.dispatchEvent(new Event('input'))
  }

  function readPlan(): string {
    try {
      return localStorage.getItem(PLAN_KEY) ?? ''
    } catch {
      return ''
    }
  }

  function saveNow() {
    try {
      if (raw.trim()) {
        localStorage.setItem(PLAN_KEY, raw)
        localStorage.setItem(UPDATED_KEY, String(Date.now()))
      } else {
        localStorage.removeItem(PLAN_KEY)
      }
    } catch {}
    paintStatus()
    updateRestore()
  }

  function paintStatus() {
    if (!status) return
    if (!raw.trim()) {
      status.textContent = 'Belum ada rencana'
      return
    }
    const time = new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    })
    status.textContent = `Tersimpan ${time}`
  }

  function renderPreview() {
    if (!preview) return
    if (!raw.trim()) {
      preview.innerHTML = ''
      if (previewEmpty) {
        previewEmpty.hidden = false
        previewEmpty.textContent = previewEmptyText
      }
      return
    }
    try {
      renderItinerary(preview, raw, {
        preview: true,
        interactive: false,
        maskCodes: false,
      })
      if (previewEmpty) previewEmpty.hidden = true
    } catch {
      preview.innerHTML = ''
      if (previewEmpty) {
        previewEmpty.hidden = false
        previewEmpty.textContent = 'Pratinjau gagal dirender. Periksa format markdown.'
      }
    }
  }

  function backup() {
    if (!raw.trim()) return
    try {
      localStorage.setItem(BACKUP_KEY, raw)
      localStorage.setItem(BACKUP_AT_KEY, String(Date.now()))
    } catch {}
    updateRestore()
  }

  function restoreBackup() {
    let value = ''
    try {
      value = localStorage.getItem(BACKUP_KEY) ?? ''
    } catch {}
    if (!value) return
    raw = value
    if (input) input.value = raw
    saveNow()
    renderPreview()
    hideUndo()
    updateRestore()
    announce('Rencana dipulihkan dari cadangan.')
  }

  function updateRestore() {
    if (!restore) return
    let value = ''
    try {
      value = localStorage.getItem(BACKUP_KEY) ?? ''
    } catch {}
    restore.hidden = !value || value === raw
  }

  function showUndo(message: string) {
    if (!undo || !undoText) return
    undoText.textContent = message
    undo.hidden = false
  }

  function hideUndo() {
    if (undo) undo.hidden = true
  }

  function announce(message: string) {
    const region = document.getElementById('pengumuman')
    if (region) region.textContent = message
  }
}

function slug(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || 'rencana'
  )
}

function download(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
