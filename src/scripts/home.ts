import { getLast, getProgress } from './progress'

const items = Array.from(document.querySelectorAll<HTMLElement>('[data-stage-item]'))
const done = new Set(getProgress())

for (const item of items) {
  const slug = item.dataset.stage
  if (slug && done.has(slug)) item.dataset.done = 'true'
}

const last = getLast()
const link = document.querySelector<HTMLAnchorElement>('[data-continue]')
const title = link?.querySelector<HTMLElement>('[data-continue-title]')

if (last && link) {
  const match = items.find((item) => item.dataset.stage === last)
  if (match) {
    link.href = match.dataset.href ?? link.href
    if (title) title.textContent = match.dataset.title ?? title.textContent
    link.hidden = false
  }
}

// Ringkasan itinerary pribadi di beranda (tanpa memuat parser/marked).
const planBox = document.querySelector<HTMLElement>('[data-home-plan]')
if (planBox) {
  let raw = ''
  try {
    raw = localStorage.getItem('manasik:itinerary') ?? ''
  } catch {}

  if (raw.trim()) {
    const field = (key: string) =>
      raw.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1]?.replace(/^["']|["']$/g, '').trim() ?? ''
    const nama = field('nama') || 'Rencana perjalanan'
    const mulai = field('mulai')
    const selesai = field('selesai')
    const zona = field('zona')

    const format = (value: string) => {
      if (!value) return ''
      const date = new Date(`${value}T00:00:00`)
      if (Number.isNaN(date.getTime())) return value
      return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    }

    const range = [format(mulai), format(selesai)].filter(Boolean).join(' – ')
    const meta = [range, zona].filter(Boolean).join(' · ')

    const title = planBox.querySelector<HTMLElement>('[data-home-plan-title]')
    const metaEl = planBox.querySelector<HTMLElement>('[data-home-plan-meta]')
    const empty = planBox.querySelector<HTMLElement>('[data-home-plan-empty]')
    const filled = planBox.querySelector<HTMLElement>('[data-home-plan-filled]')

    if (title) title.textContent = nama
    if (metaEl) metaEl.textContent = meta
    if (empty) empty.hidden = true
    if (filled) filled.hidden = false
  }
}
