import { marked } from 'marked'
import { copyText } from '../lib/clipboard'
import { entryKey, type ProgressMap } from '../lib/itinerary-progress'
import {
  STAGE_LINKS,
  dayRange,
  parseItinerary,
  type Itinerary,
  type ItineraryBlock,
  type ItineraryItem,
} from '../lib/itinerary'

marked.setOptions({ gfm: true, breaks: false })

export interface RenderOptions {
  interactive?: boolean
  preview?: boolean
  maskCodes?: boolean
  today?: number | null
  progress?: ProgressMap
  onToggle?: (line: number, checked: boolean) => void
}

export interface ProgressStats {
  done: number
  total: number
}

export interface DayInfo {
  id: string
  label: string
  title: string
  from: number | null
  to: number | null
}

export function dayInfo(block: ItineraryBlock, index: number): DayInfo {
  const range = dayRange(block.title)
  const label = range?.label ?? String(index)
  return {
    id: `hari-${index}`,
    label: /^[0-9]+$/.test(label) ? label.padStart(2, '0') : label,
    title: block.title,
    from: range?.from ?? index,
    to: range?.to ?? index,
  }
}

function escapeAngles(value: string): string {
  return value.replace(/</g, '&lt;')
}

function inline(value: string): string {
  return marked.parseInline(escapeAngles(value)) as string
}

function block(value: string): string {
  return marked.parse(escapeAngles(value)) as string
}

function sanitize(root: HTMLElement) {
  root.querySelectorAll('a').forEach((anchor) => {
    const href = anchor.getAttribute('href') ?? ''
    if (/^\s*(javascript|data|vbscript):/i.test(href)) {
      anchor.removeAttribute('href')
      return
    }
    if (/^https?:\/\//i.test(href)) {
      anchor.setAttribute('target', '_blank')
      anchor.setAttribute('rel', 'noopener noreferrer')
    }
  })
  root.querySelectorAll('img').forEach((image) => {
    image.replaceWith(document.createTextNode(image.getAttribute('alt') ?? ''))
  })
}

function decorateCodes(root: HTMLElement, mask: boolean, interactive: boolean) {
  root.querySelectorAll('code').forEach((code) => {
    if (code.closest('pre')) return
    const value = code.textContent ?? ''
    if (!value) return

    const wrap = document.createElement('span')
    wrap.className = 'code'
    wrap.dataset.code = value
    wrap.dataset.mask = String(mask)

    const valueButton = document.createElement('button')
    valueButton.type = 'button'
    valueButton.className = 'code__value'
    valueButton.textContent = mask ? '••••' : value
    valueButton.setAttribute('aria-label', mask ? 'Tampilkan kode' : 'Sembunyikan kode')
    if (!interactive) {
      valueButton.disabled = true
    }

    const copyButton = document.createElement('button')
    copyButton.type = 'button'
    copyButton.className = 'code__copy'
    copyButton.textContent = 'Salin'
    copyButton.setAttribute('aria-label', 'Salin kode')
    if (!interactive) copyButton.hidden = true

    valueButton.addEventListener('click', () => {
      const revealed = wrap.dataset.revealed === 'true'
      wrap.dataset.revealed = String(!revealed)
      const masked = wrap.dataset.mask === 'true'
      valueButton.textContent = !revealed || !masked ? value : '••••'
      valueButton.setAttribute('aria-label', revealed ? 'Sembunyikan kode' : 'Tampilkan kode')
    })

    copyButton.addEventListener('click', async () => {
      const copied = await copyText(value)
      copyButton.textContent = copied ? 'Tersalin' : 'Gagal'
      const region = document.getElementById('pengumuman')
      if (region) region.textContent = copied ? 'Kode disalin.' : 'Kode gagal disalin.'
      window.setTimeout(() => {
        copyButton.textContent = 'Salin'
      }, 1500)
    })

    wrap.append(valueButton, copyButton)
    code.replaceWith(wrap)
  })
}

export function applyCodeMask(root: HTMLElement, mask: boolean) {
  root.querySelectorAll<HTMLElement>('.code').forEach((wrap) => {
    wrap.dataset.mask = String(mask)
    const value = wrap.dataset.code ?? ''
    const revealed = wrap.dataset.revealed === 'true'
    const button = wrap.querySelector<HTMLButtonElement>('.code__value')
    if (!button) return
    button.textContent = mask && !revealed ? '••••' : value
    button.setAttribute('aria-label', mask && !revealed ? 'Tampilkan kode' : 'Sembunyikan kode')
  })
}

export function renderItinerary(root: HTMLElement, raw: string, options: RenderOptions = {}): Itinerary {
  const {
    interactive = true,
    preview = false,
    maskCodes = true,
    today = null,
    progress = {},
    onToggle,
  } = options

  const data = parseItinerary(raw)
  root.innerHTML = ''

  let dayIndex = 0
  for (const blockData of data.blocks) {
    if (blockData.kind === 'day') {
      dayIndex += 1
      const info = dayInfo(blockData, dayIndex)
      const isToday =
        today != null &&
        (info.from != null && info.to != null
          ? today >= info.from && today <= info.to
          : today === dayIndex)

      const section = document.createElement('section')
      section.className = 'itinerary-day'
      section.id = info.id
      if (isToday) section.dataset.today = 'true'

      const head = document.createElement('header')
      head.className = 'itinerary-day__head'
      head.innerHTML = `
        <p class="label">Hari ${info.label}</p>
        <h2>${inline(displayTitle(info.title))}</h2>
        ${isToday ? '<span class="tag itinerary-today">Hari ini</span>' : ''}
      `

      const trackable = blockData.items.some((item) => isTrackable(item))
      if (!preview && interactive && trackable) {
        const tools = document.createElement('div')
        tools.className = 'itinerary-day__tools'
        tools.innerHTML = `
          <span class="itinerary-day__count" data-day-count></span>
          <button type="button" class="itinerary-day__toggle" data-day-toggle aria-pressed="false">
            Tandai kegiatan hari ini
          </button>
        `
        head.append(tools)
      }

      section.append(head)
      section.append(
        renderItems(blockData.items, {
          interactive,
          preview,
          dayTitle: blockData.title,
          progress,
          onToggle,
        })
      )
      root.append(section)
      continue
    }

    const section = document.createElement('section')
    section.className = 'itinerary-section'
    if (blockData.title) {
      const head = document.createElement('header')
      head.className = 'itinerary-section__head'
      head.innerHTML = `<h2>${inline(blockData.title)}</h2>`
      section.append(head)
    }
    section.append(
      renderItems(blockData.items, {
        interactive,
        preview,
        dayTitle: blockData.title,
        progress,
        onToggle,
      })
    )
    root.append(section)
  }

  sanitize(root)
  if (!preview) decorateCodes(root, maskCodes, interactive)
  if (!preview && interactive) applyProgress(root, progress)

  return data
}

function displayTitle(title: string): string {
  const stripped = title
    .replace(
      /^\s*(?:hari|day)(?:\s*ke-?)?\s*[0-9]+(?:\s*[&–—-]\s*[0-9]+)?\s*[—–:-]?\s*/i,
      ''
    )
    .trim()
  return stripped || title
}

function isTrackable(item: ItineraryItem): boolean {
  return item.kind === 'entry' && !item.checkbox && Boolean(item.time)
}

function renderItems(
  items: ItineraryItem[],
  options: {
    interactive: boolean
    preview: boolean
    dayTitle: string
    progress: ProgressMap
    onToggle?: (line: number, checked: boolean) => void
  }
): HTMLElement {
  const list = document.createElement('div')
  list.className = 'itinerary-items'

  for (const item of items) {
    if (item.kind === 'text') {
      const text = document.createElement('div')
      text.className = 'itinerary-text'
      text.innerHTML = block(item.body)
      list.append(text)
      continue
    }

    const row = document.createElement('div')
    row.className = 'itinerary-entry'
    if (!item.time) row.classList.add('itinerary-entry--plain')
    if (item.indent) row.dataset.indent = String(item.indent)

    const time = document.createElement('div')
    time.className = 'itinerary-entry__time'
    if (item.time) {
      time.innerHTML = `<time>${item.time}</time>${item.zone ? `<span>${item.zone}</span>` : ''}`
    }

    const body = document.createElement('div')
    body.className = 'itinerary-entry__body'
    body.dataset.entryBody = ''

    if (item.checkbox) {
      const label = document.createElement('label')
      label.className = 'itinerary-check'
      const input = document.createElement('input')
      input.type = 'checkbox'
      input.checked = item.checked
      input.dataset.line = String(item.line)
      input.disabled = !options.interactive
      input.addEventListener('change', () => {
        options.onToggle?.(item.line, input.checked)
      })
      const text = document.createElement('span')
      text.innerHTML = inline(item.body)
      label.append(input, text)
      body.append(label)
    } else {
      body.innerHTML = inline(item.body)
    }

    if (item.tags.length > 0) {
      const tags = document.createElement('div')
      tags.className = 'itinerary-entry__tags'
      for (const tag of item.tags) {
        const href = STAGE_LINKS[tag]
        const element = document.createElement(href ? 'a' : 'span')
        element.className = 'tag'
        if (href) element.setAttribute('href', href)
        element.textContent = tag
        tags.append(element)
      }
      body.append(tags)
    }

    row.append(time, body)

    if (!options.preview && options.interactive && isTrackable(item)) {
      const key = entryKey(options.dayTitle, item)
      row.classList.add('itinerary-entry--tracked')
      row.id = `kegiatan-${key}`
      row.dataset.progressEntry = ''
      row.dataset.progressKey = key
      row.dataset.done = String(Boolean(options.progress[key]))

      const toggle = document.createElement('button')
      toggle.type = 'button'
      toggle.className = 'entry-check'
      toggle.dataset.progressToggle = ''
      toggle.dataset.progressKey = key
      toggle.setAttribute('aria-pressed', String(Boolean(options.progress[key])))
      toggle.setAttribute(
        'aria-label',
        options.progress[key] ? 'Tandai belum selesai' : 'Tandai selesai'
      )
      toggle.innerHTML = '<span class="entry-check__mark" aria-hidden="true"></span>'
      row.append(toggle)
    }

    list.append(row)
  }

  return list
}

/** Terapkan status selesai ke DOM dan kembalikan hitungan total. */
export function applyProgress(root: HTMLElement, progress: ProgressMap): ProgressStats {
  let done = 0
  let total = 0

  root.querySelectorAll<HTMLElement>('[data-progress-entry]').forEach((row) => {
    const key = row.dataset.progressKey ?? ''
    const isDone = Boolean(progress[key])
    row.dataset.done = String(isDone)
    row.classList.toggle('is-done', isDone)
    const button = row.querySelector<HTMLButtonElement>('[data-progress-toggle]')
    if (button) {
      button.setAttribute('aria-pressed', String(isDone))
      button.setAttribute('aria-label', isDone ? 'Tandai belum selesai' : 'Tandai selesai')
    }
    total += 1
    if (isDone) done += 1
  })

  root.querySelectorAll<HTMLElement>('.itinerary-day').forEach((section) => {
    const rows = Array.from(section.querySelectorAll<HTMLElement>('[data-progress-entry]'))
    const toggle = section.querySelector<HTMLButtonElement>('[data-day-toggle]')
    if (!rows.length) return

    const dayDone = rows.filter((row) => row.dataset.done === 'true').length
    const all = dayDone === rows.length
    section.dataset.done = String(all)

    const count = section.querySelector<HTMLElement>('[data-day-count]')
    if (count) count.textContent = `${dayDone}/${rows.length} selesai`

    if (toggle) {
      toggle.setAttribute('aria-pressed', String(all))
      toggle.textContent = all ? 'Batalkan kegiatan hari ini' : 'Tandai kegiatan hari ini'
    }
  })

  return { done, total }
}

