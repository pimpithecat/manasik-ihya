import { normalizeArabic, normalizeLatin } from '../lib/text'

const form = document.querySelector<HTMLElement>('[data-search]')
const input = form?.querySelector<HTMLInputElement>('[data-search-input]')
const clear = form?.querySelector<HTMLButtonElement>('[data-search-clear]')
const status = form?.querySelector<HTMLElement>('[data-search-status]')
const rows = Array.from(document.querySelectorAll<HTMLElement>('[data-cari]'))
const groups = Array.from(document.querySelectorAll<HTMLElement>('[data-group]'))

function tokens(query: string): string[] {
  const normalised = /[\u0600-\u06ff]/.test(query) ? normalizeArabic(query) : normalizeLatin(query)
  return normalised.split(' ').filter(Boolean)
}

function apply(query: string) {
  if (!form || !input) return
  const terms = tokens(query)
  form.dataset.filled = String(query.length > 0)

  let visible = 0
  for (const row of rows) {
    const haystack = row.dataset.cari ?? ''
    const match = terms.every((term) => haystack.includes(term))
    row.hidden = !match
    if (match) visible += 1
  }

  for (const group of groups) {
    const any = Array.from(group.querySelectorAll<HTMLElement>('[data-cari]')).some((row) => !row.hidden)
    group.hidden = !any
  }

  form.dataset.empty = String(visible === 0 && terms.length > 0)
  if (status) {
    if (terms.length === 0) status.textContent = `${rows.length} doa`
    else status.textContent = visible === 0 ? 'Tidak ada hasil' : `${visible} doa ditemukan`
  }
}

input?.addEventListener('input', () => apply(input.value))
clear?.addEventListener('click', () => {
  if (!input) return
  input.value = ''
  apply('')
  input.focus()
})

document.addEventListener('keydown', (event) => {
  if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return
  const tag = (event.target as HTMLElement)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return
  event.preventDefault()
  input?.focus()
})

apply(input?.value ?? '')
