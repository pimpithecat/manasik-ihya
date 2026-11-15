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
