import { parseDate, parseItinerary, todayDayNumber, type Itinerary } from '../lib/itinerary'
import {
  entryKey,
  pruneProgress,
  readProgress,
  writeProgress,
  type ProgressMap,
} from '../lib/itinerary-progress'
import { applyCodeMask, applyProgress, dayInfo, renderItinerary } from './itinerary-render'

const PLAN_KEY = 'manasik:itinerary'
const MASK_KEY = 'manasik:mask-codes'

const root = document.querySelector<HTMLElement>('[data-itinerary]')

if (root) init(root)

function init(root: HTMLElement) {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual'

  const title = root.querySelector<HTMLElement>('[data-plan-title]')
  const metaLine = root.querySelector<HTMLElement>('[data-plan-meta]')
  const actions = root.querySelector<HTMLElement>('[data-plan-actions]')
  const empty = root.querySelector<HTMLElement>('[data-plan-empty]')
  const content = root.querySelector<HTMLElement>('[data-plan-content]')
  const body = root.querySelector<HTMLElement>('[data-plan-body]')
  const rail = root.querySelector<HTMLElement>('[data-plan-rail]')
  const railbar = root.querySelector<HTMLElement>('.itinerary-railbar')
  const todayLink = root.querySelector<HTMLAnchorElement>('[data-plan-today]')
  const progressLine = root.querySelector<HTMLElement>('[data-plan-progress]')
  const resetButton = root.querySelector<HTMLButtonElement>('[data-plan-reset-progress]')
  const loading = root.querySelector<HTMLElement>('[data-plan-loading]')
  const maskInput = root.querySelector<HTMLInputElement>('[data-plan-mask]')
  const printButton = root.querySelector<HTMLButtonElement>('[data-plan-print]')

  let raw = readPlan()
  let data: Itinerary = { meta: {}, blocks: [] }
  let progress: ProgressMap = readProgress()

  if (!raw) {
    document.documentElement.removeAttribute('data-plan')
    if (empty) empty.hidden = false
    return
  }

  document.documentElement.dataset.plan = '1'

  const maskStored = readMask()
  let mask = maskStored !== 'off'
  if (maskInput) {
    maskInput.checked = mask
    maskInput.addEventListener('change', () => {
      mask = maskInput.checked
      try {
        localStorage.setItem(MASK_KEY, mask ? 'on' : 'off')
      } catch {}
      if (body) applyCodeMask(body, mask)
    })
  }

  const today = () => {
    const number = todayDayNumber(data.meta)
    return number
  }

  function paintMeta(itinerary: Itinerary) {
    const { meta } = itinerary
    if (title) title.textContent = meta.nama?.trim() || 'Itinerary'

    const pieces: string[] = []
    const range = formatRange(meta.mulai, meta.selesai)
    if (range) pieces.push(range)
    if (meta.zona) pieces.push(meta.zona)
    if (metaLine) metaLine.textContent = pieces.join(' · ')
    if (metaLine) metaLine.hidden = pieces.length === 0
  }

  function paintRail(itinerary: Itinerary) {
    if (!rail) return
    rail.innerHTML = ''
    const current = today()
    let dayIndex = 0

    for (const blockData of itinerary.blocks) {
      if (blockData.kind !== 'day') continue
      dayIndex += 1
      const info = dayInfo(blockData, dayIndex)
      const link = document.createElement('a')
      link.href = `#${info.id}`
      link.textContent = info.label
      link.setAttribute('aria-label', info.title)
      if (
        current != null &&
        info.from != null &&
        info.to != null &&
        current >= info.from &&
        current <= info.to
      ) {
        link.setAttribute('aria-current', 'date')
      }
      rail.append(link)
    }

    rail.hidden = dayIndex === 0
  }

  function paintSummary(stats: { done: number; total: number }) {
    if (!progressLine) return
    if (stats.total === 0) {
      progressLine.textContent = 'Belum ada kegiatan bertanda.'
      if (resetButton) resetButton.hidden = true
      return
    }

    const pieces = [`${stats.done} dari ${stats.total} kegiatan selesai`]
    const start = data.meta.mulai ? parseDate(data.meta.mulai) : null
    const end = data.meta.selesai ? parseDate(data.meta.selesai) : null
    const now = new Date()
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    if (start && day < start) {
      pieces.push(`Rencana dimulai ${shortDate(start)}`)
    } else if (end && day > end) {
      pieces.push('Rencana telah selesai')
    }

    progressLine.textContent = pieces.join(' · ')
    if (resetButton) resetButton.hidden = stats.done === 0
  }

  /**
   * Cakupan pencarian posisi: hari ini, hari terakhir setelah perjalanan,
   * atau seluruh rencana (sebelum mulai / tanpa tanggal).
   */
  function focusDay(): HTMLElement | null {
    if (!body) return null
    const todaySection = body.querySelector<HTMLElement>('[data-today]')
    if (todaySection) return todaySection

    const days = Array.from(body.querySelectorAll<HTMLElement>('.itinerary-day'))
    if (!days.length) return null

    const end = data.meta.selesai ? parseDate(data.meta.selesai) : null
    const now = new Date()
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    if (end && day > end) return days[days.length - 1]
    return null
  }

  /** Tandai kegiatan pertama yang belum selesai sebagai “Berikutnya”. */
  function paintNext() {
    if (!body) return
    body.querySelectorAll('.itinerary-next').forEach((element) => element.remove())
    body.querySelectorAll('.is-next').forEach((element) => element.classList.remove('is-next'))
    body.querySelectorAll<HTMLElement>('[data-complete]').forEach((element) => {
      delete element.dataset.complete
    })

    const section = focusDay()
    const scope = section ?? body
    const rows = Array.from(scope.querySelectorAll<HTMLElement>('[data-progress-entry]'))

    if (!rows.length) {
      if (section && todayLink) {
        todayLink.href = `#${section.id}`
        todayLink.hidden = false
        todayLink.textContent = section.dataset.today ? 'Hari ini ↓' : 'Hari terakhir ↓'
      } else if (todayLink) {
        todayLink.hidden = true
      }
      return
    }

    const next = rows.find((row) => row.dataset.done !== 'true')
    if (next) {
      next.classList.add('is-next')
      const label = document.createElement('span')
      label.className = 'itinerary-next'
      label.textContent = 'Berikutnya'
      const target = next.querySelector<HTMLElement>('[data-entry-body]')
      if (target) target.prepend(label)
      else next.prepend(label)
      if (todayLink) {
        todayLink.href = `#${next.id}`
        todayLink.hidden = false
        todayLink.textContent = 'Berikutnya ↓'
      }
      return
    }

    if (!section) {
      if (todayLink) todayLink.hidden = true
      return
    }

    section.dataset.complete = 'true'
    const label = document.createElement('span')
    label.className = 'itinerary-next itinerary-next--day'
    label.textContent = 'Selesai'
    section.querySelector('.itinerary-day__head')?.append(label)
    if (todayLink) {
      todayLink.href = `#${section.id}`
      todayLink.hidden = false
      todayLink.textContent = section.dataset.today ? 'Hari ini ↓' : 'Hari terakhir ↓'
    }
  }

  function paintProgress() {
    if (!body) return
    const stats = applyProgress(body, progress)
    paintSummary(stats)
    measureRail()
  }

  /** Samakan offset gulir dengan tinggi rail sticky yang sedang tampil. */
  function measureRail() {
    if (!railbar) return
    const height = railbar.getBoundingClientRect().height
    if (height > 0) {
      document.documentElement.style.setProperty(
        '--itinerary-rail-height',
        `${Math.floor(height * 100) / 100}px`
      )
    }
  }

  function scrollToCurrent() {
    const run = (target: HTMLElement) => {
      const scroll = () => {
        measureRail()
        requestAnimationFrame(() => target.scrollIntoView({ block: 'start', behavior: 'instant' }))
      }
      const fonts = document.fonts
      if (fonts && fonts.status !== 'loaded') {
        fonts.ready.then(scroll).catch(scroll)
      } else {
        scroll()
      }
    }

    if (location.hash) {
      const anchor = document.getElementById(decodeURIComponent(location.hash.slice(1)))
      if (anchor) run(anchor)
      return
    }

    const target =
      body?.querySelector<HTMLElement>('.is-next[data-progress-entry]') ??
      body?.querySelector<HTMLElement>('[data-today]')
    if (!target) return
    run(target)
  }

  function render() {
    if (!body) return
    const parsed = parseItinerary(raw)
    const keys = collectKeys(parsed)
    const pruned = pruneProgress(progress, keys)
    if (Object.keys(progress).some((key) => !(key in pruned))) {
      progress = pruned
      writeProgress(progress)
    }

    data = renderItinerary(body, raw, {
      interactive: true,
      maskCodes: mask,
      today: todayDayNumber(parsed.meta),
      progress,
      onToggle: (line, checked) => {
        const lines = raw.split('\n')
        if (!lines[line]) return
        lines[line] = lines[line].replace(/\[( |x|X)\]/, checked ? '[x]' : '[ ]')
        raw = lines.join('\n')
        writePlan(raw)
      },
    })

    if (loading) loading.hidden = true
    if (empty) empty.hidden = true
    if (content) content.hidden = false
    if (actions) actions.hidden = false

    paintMeta(data)
    paintRail(data)
    paintProgress()
    paintNext()
    measureRail()
    applyCodeMask(body, mask)
  }

  function setEntryDone(key: string, done: boolean) {
    if (done) progress[key] = Date.now()
    else delete progress[key]
    writeProgress(progress)
    paintProgress()
    paintNext()
    measureRail()
    announce(done ? 'Kegiatan ditandai selesai.' : 'Kegiatan ditandai belum selesai.')
  }

  function toggleDay(section: HTMLElement) {
    const rows = Array.from(section.querySelectorAll<HTMLElement>('[data-progress-entry]'))
    if (!rows.length) return
    const allDone = rows.every((row) => Boolean(progress[row.dataset.progressKey ?? '']))
    const stamp = Date.now()
    for (const row of rows) {
      const key = row.dataset.progressKey
      if (!key) continue
      if (allDone) delete progress[key]
      else progress[key] = stamp
    }
    writeProgress(progress)
    paintProgress()
    paintNext()
    measureRail()
    announce(allDone ? 'Status hari dibatalkan.' : 'Semua kegiatan hari ini ditandai selesai.')
  }

  render()
  scrollToCurrent()

  window.addEventListener('resize', measureRail, { passive: true })

  body?.addEventListener('click', (event) => {
    const target = event.target as HTMLElement
    const entryToggle = target.closest<HTMLElement>('[data-progress-toggle]')
    if (entryToggle) {
      const key = entryToggle.dataset.progressKey
      if (key) setEntryDone(key, !progress[key])
      return
    }
    const dayToggle = target.closest<HTMLElement>('[data-day-toggle]')
    if (dayToggle) {
      const section = dayToggle.closest<HTMLElement>('.itinerary-day')
      if (section) toggleDay(section)
    }
  })

  resetButton?.addEventListener('click', () => {
    if (!window.confirm('Hapus semua tanda selesai? Rencana tidak berubah.')) return
    progress = {}
    writeProgress(progress)
    paintProgress()
    paintNext()
    measureRail()
    announce('Tanda selesai direset.')
  })

  printButton?.addEventListener('click', () => window.print())

  window.addEventListener('storage', (event) => {
    if (event.key !== PLAN_KEY) return
    raw = readPlan()
    if (!raw) {
      window.location.reload()
      return
    }
    render()
  })
}

function readPlan(): string {
  try {
    return localStorage.getItem(PLAN_KEY) ?? ''
  } catch {
    return ''
  }
}

function writePlan(value: string) {
  try {
    localStorage.setItem(PLAN_KEY, value)
    localStorage.setItem('manasik:itinerary-updated', String(Date.now()))
  } catch {}
}

function readMask(): string {
  try {
    return localStorage.getItem(MASK_KEY) ?? 'on'
  } catch {
    return 'on'
  }
}

function collectKeys(itinerary: Itinerary): string[] {
  const keys: string[] = []
  for (const block of itinerary.blocks) {
    for (const item of block.items) {
      if (item.kind === 'entry' && !item.checkbox && item.time) {
        keys.push(entryKey(block.title, item))
      }
    }
  }
  return keys
}

function shortDate(date: Date): string {
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function announce(message: string) {
  const region = document.getElementById('pengumuman')
  if (region) region.textContent = message
}

function formatRange(startValue?: string, endValue?: string): string {
  const start = startValue ? parseDate(startValue) : null
  const end = endValue ? parseDate(endValue) : null
  if (!start && !end) return ''

  const month = (date: Date) => date.toLocaleDateString('id-ID', { month: 'long' })
  const full = (date: Date) =>
    date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

  if (start && end) {
    if (start.getTime() === end.getTime()) return full(start)
    if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
      const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1
      return `${start.getDate()}–${end.getDate()} ${month(end)} ${end.getFullYear()} · ${days} hari`
    }
    return `${full(start)} – ${full(end)}`
  }
  return full((start ?? end) as Date)
}
