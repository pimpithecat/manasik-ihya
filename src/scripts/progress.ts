export const PROGRESS_KEY = 'manasik:progress'
export const LAST_KEY = 'manasik:last'

export function getProgress(): string[] {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []
    return parsed.filter((value): value is string => typeof value === 'string')
  } catch {
    return []
  }
}

export function isDone(slug: string): boolean {
  return getProgress().includes(slug)
}

export function markDone(slug: string): void {
  const list = new Set(getProgress())
  list.add(slug)
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify([...list]))
  } catch {}
}

export function unmarkDone(slug: string): void {
  const list = getProgress().filter((item) => item !== slug)
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(list))
  } catch {}
}

export function setLast(slug: string): void {
  try {
    localStorage.setItem(LAST_KEY, slug)
  } catch {}
}

export function getLast(): string | null {
  try {
    return localStorage.getItem(LAST_KEY)
  } catch {
    return null
  }
}
