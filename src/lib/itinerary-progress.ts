import type { ItineraryEntry } from './itinerary'

const PROGRESS_KEY = 'manasik:itinerary-progress'

export type ProgressMap = Record<string, number>

export function readProgress(): ProgressMap {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const map: ProgressMap = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'number' && Number.isFinite(value)) map[key] = value
    }
    return map
  } catch {
    return {}
  }
}

/** Buang kunci yang tidak lagi ada di rencana (teks kegiatan berubah/dihapus). */
export function pruneProgress(map: ProgressMap, keys: Iterable<string>): ProgressMap {
  const valid = new Set(keys)
  const next: ProgressMap = {}
  for (const [key, value] of Object.entries(map)) {
    if (valid.has(key)) next[key] = value
  }
  return next
}

export function writeProgress(map: ProgressMap): void {
  try {
    if (Object.keys(map).length === 0) {
      localStorage.removeItem(PROGRESS_KEY)
    } else {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(map))
    }
  } catch {}
}

/** Kunci stabil dari hari + jam + teks; bertahan selama teks tidak diubah. */
export function entryKey(dayTitle: string, entry: ItineraryEntry): string {
  return hash(`${dayTitle}|${entry.time ?? ''}|${entry.body}`)
}

function hash(value: string): string {
  let h = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    h ^= value.charCodeAt(index)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}
