import { parseDate, parseItinerary, todayDayNumber, type Itinerary } from '../lib/itinerary'
import { applyCodeMask, dayInfo, renderItinerary } from './itinerary-render'

const PLAN_KEY = 'manasik:itinerary'
const MASK_KEY = 'manasik:mask-codes'

const root = document.querySelector<HTMLElement>('[data-itinerary]')

if (root) init(root)

function init(root: HTMLElement) {
  const title = root.querySelector<HTMLElement>('[data-plan-title]')
  const metaLine = root.querySelector<HTMLElement>('[data-plan-meta]')
  const actions = root.querySelector<HTMLElement>('[data-plan-actions]')
  const empty = root.querySelector<HTMLElement>('[data-plan-empty]')
  const content = root.querySelector<HTMLElement>('[data-plan-content]')
  const body = root.querySelector<HTMLElement>('[data-plan-body]')
  const rail = root.querySelector<HTMLElement>('[data-plan-rail]')
  const todayLink = root.querySelector<HTMLAnchorElement>('[data-plan-today]')
  const loading = root.querySelector<HTMLElement>('[data-plan-loading]')
  const maskInput = root.querySelector<HTMLInputElement>('[data-plan-mask]')
  const printButton = root.querySelector<HTMLButtonElement>('[data-plan-print]')
  const exportButton = root.querySelector<HTMLButtonElement>('[data-plan-export]')

  let raw = readPlan()
  let data: Itinerary = { meta: {}, blocks: [] }

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

    const todaySection = body?.querySelector<HTMLElement>('[data-today]')
    if (todayLink) {
      if (todaySection) {
        todayLink.href = `#${todaySection.id}`
        todayLink.hidden = false
      } else {
        todayLink.hidden = true
      }
    }
  }

  function render() {
    if (!body) return
    const parsed = parseItinerary(raw)
    data = renderItinerary(body, raw, {
      interactive: true,
      maskCodes: mask,
      today: todayDayNumber(parsed.meta),
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
    applyCodeMask(body, mask)
  }

  render()

  printButton?.addEventListener('click', () => window.print())

  exportButton?.addEventListener('click', () => {
    const name = slug(data.meta.nama ?? 'rencana')
    const date = data.meta.mulai ?? new Date().toISOString().slice(0, 10)
    download(`itinerary-${name}-${date}.md`, raw)
  })

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

function slug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'rencana'
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
