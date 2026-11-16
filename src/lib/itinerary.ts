export interface ItineraryMeta {
  nama?: string
  mulai?: string
  selesai?: string
  zona?: string
}

export interface ItineraryEntry {
  kind: 'entry'
  line: number
  time?: string
  zone?: string
  body: string
  tags: string[]
  checkbox: boolean
  checked: boolean
  indent: number
}

export interface ItineraryText {
  kind: 'text'
  line: number
  body: string
}

export type ItineraryItem = ItineraryEntry | ItineraryText

export interface ItineraryBlock {
  kind: 'day' | 'section'
  title: string
  line: number
  items: ItineraryItem[]
}

export interface Itinerary {
  meta: ItineraryMeta
  blocks: ItineraryBlock[]
}

export const STAGE_LINKS: Record<string, string> = {
  persiapan: '/panduan/persiapan/',
  perjalanan: '/panduan/perjalanan/',
  ziarah: '/panduan/ziarah/',
  ihram: '/panduan/ihram/',
  makkah: '/panduan/makkah/',
  tawaf: '/panduan/tawaf/',
  sai: '/panduan/sai/',
  tahallul: '/panduan/tahallul/',
  wada: '/panduan/wada/',
  kepulangan: '/panduan/kepulangan/',
}

const DAY_RE = /\b(hari|day)\b/i

// 10:30, 10.30, rentang 10:30–10:45, zona opsional, bold opsional.
const ZONE = '(WITA|WIB|AST|UTC[+-]?\\d{0,2}|SAUDI)?'
const BOLD_TIME_RE = new RegExp(
  `^\\*\\*\\s*([0-9]{1,2}[:.][0-9]{2})\\s*${ZONE}\\s*(?:[–—-]\\s*([0-9]{1,2}[:.][0-9]{2})\\s*${ZONE})?\\s*:?\\s*\\*\\*\\s*[:–—-]?\\s*`,
  'i'
)
const PLAIN_TIME_RE = new RegExp(
  `^([0-9]{1,2}[:.][0-9]{2})\\s*${ZONE}\\s*(?:[–—-]\\s*([0-9]{1,2}[:.][0-9]{2})\\s*${ZONE})?\\s*[:–—-]\\s+`,
  'i'
)

function parseMeta(lines: string[]): { meta: ItineraryMeta; start: number } {
  if (lines[0]?.trim() !== '---') return { meta: {}, start: 0 }
  const end = lines.findIndex((line, index) => index > 0 && line.trim() === '---')
  if (end < 0) return { meta: {}, start: 0 }

  const meta: ItineraryMeta = {}
  for (let index = 1; index < end; index += 1) {
    const match = lines[index].match(/^([a-zA-Z]+):\s*(.*)$/)
    if (!match) continue
    const key = match[1].toLowerCase()
    const value = match[2].replace(/^["']|["']$/g, '').trim()
    if (key === 'nama' || key === 'mulai' || key === 'selesai' || key === 'zona') {
      meta[key] = value
    }
  }
  return { meta, start: end + 1 }
}

/**
 * Pisahkan tag #ihram dari teks tanpa menyentuh isi inline code.
 */
function extractTags(body: string): { body: string; tags: string[] } {
  const codes: string[] = []
  const masked = body.replace(/`[^`]*`/g, (match) => {
    codes.push(match)
    return `\u0000${codes.length - 1}\u0000`
  })

  const tags: string[] = []
  const cleaned = masked.replace(/(^|\s)#([a-z][a-z0-9-]*)/gi, (_, prefix: string, tag: string) => {
    tags.push(tag.toLowerCase())
    return prefix
  })

  const restored = cleaned.replace(/\u0000(\d+)\u0000/g, (_, index: string) => codes[Number(index)] ?? '')
  return { body: restored.trim(), tags }
}

function parseTime(rest: string): { time?: string; zone?: string; body: string } {
  const bold = rest.match(BOLD_TIME_RE)
  if (bold) {
    const [, start, startZone, end, endZone] = bold
    return {
      time: end ? `${start}–${end}` : start,
      zone: formatZone(startZone, endZone),
      body: rest.slice(bold[0].length),
    }
  }
  const plain = rest.match(PLAIN_TIME_RE)
  if (plain) {
    const [, start, startZone, end, endZone] = plain
    return {
      time: end ? `${start}–${end}` : start,
      zone: formatZone(startZone, endZone),
      body: rest.slice(plain[0].length),
    }
  }
  return { body: rest }
}

function formatZone(start?: string, end?: string): string | undefined {
  const a = start?.toUpperCase()
  const b = end?.toUpperCase()
  if (a && b && a !== b) return `${a}–${b}`
  return b ?? a
}

export function parseItinerary(raw: string): Itinerary {
  const lines = raw.replace(/\r\n?/g, '\n').split('\n')
  const { meta, start } = parseMeta(lines)
  const blocks: ItineraryBlock[] = []
  let current: ItineraryBlock | null = null
  let lastText: ItineraryText | null = null
  let lastWasBlank = true

  for (let index = start; index < lines.length; index += 1) {
    const line = lines[index]
    const trimmed = line.trim()

    if (!trimmed) {
      lastWasBlank = true
      lastText = null
      continue
    }

    const heading = trimmed.match(/^#{1,6}\s+(.*)$/)
    if (heading) {
      const title = heading[1].trim()
      current = {
        kind: DAY_RE.test(title) ? 'day' : 'section',
        title,
        line: index,
        items: [],
      }
      blocks.push(current)
      lastText = null
      lastWasBlank = true
      continue
    }

    if (!current) {
      current = { kind: 'section', title: '', line: index, items: [] }
      blocks.push(current)
    }

    const list = line.match(/^(\s*)[-*+]\s+(.*)$/)
    if (list) {
      const indent = Math.min(4, Math.floor(list[1].length / 2))
      let rest = list[2]
      let checkbox = false
      let checked = false

      const check = rest.match(/^\[( |x|X)\]\s+/)
      if (check) {
        checkbox = true
        checked = check[1].toLowerCase() === 'x'
        rest = rest.slice(check[0].length)
      }

      const parsed = parseTime(rest)
      const { body, tags } = extractTags(parsed.body.trim())

      current.items.push({
        kind: 'entry',
        line: index,
        time: parsed.time,
        zone: parsed.zone,
        body,
        tags,
        checkbox,
        checked,
        indent,
      })
      lastText = null
      lastWasBlank = false
      continue
    }

    if (lastText && !lastWasBlank) {
      lastText.body += ' ' + trimmed
    } else {
      const item: ItineraryText = { kind: 'text', line: index, body: trimmed }
      current.items.push(item)
      lastText = item
    }
    lastWasBlank = false
  }

  return { meta, blocks }
}

/** Nomor hari dari judul, mis. "Hari 3 & 4", "HARI 9–11", "Hari ke-1". */
export function dayRange(title: string): { label: string; from: number; to: number } | null {
  const match = title.match(/\b(?:hari|day)(?:\s*ke-?)?\s*([0-9]+)(?:\s*[&–—-]\s*([0-9]+))?/i)
  if (!match) return null
  const from = Number(match[1])
  const to = Number(match[2] ?? match[1])
  return { label: match[2] ? `${from}–${to}` : String(from), from, to }
}

/** Hari ini dalam rentang perjalanan, 1-based; null jika di luar rentang. */
export function todayDayNumber(meta: ItineraryMeta, now = new Date()): number | null {
  if (!meta.mulai) return null
  const start = parseDate(meta.mulai)
  if (!start) return null
  const end = parseDate(meta.selesai ?? meta.mulai) ?? start
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (today < start || today > end) return null
  return Math.round((today.getTime() - start.getTime()) / 86_400_000) + 1
}

export function parseDate(value: string): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Bersihkan artefak konversi PDF: NBSP, zero-width, tanda hubung aneh,
 * spasi di dalam bold waktu, dan sisa LaTeX.
 */
export function cleanArtifacts(input: string): string {
  let text = input.replace(/\r\n?/g, '\n')
  text = text.replace(/[\u00A0\u2007\u202F\u2009\u200A]/g, ' ')
  text = text.replace(/[\u200B-\u200D\uFEFF]/g, '')
  text = text.replace(/[\u2010\u2011]/g, '-')

  // ** 10:30 ** -> **10:30**
  text = text.replace(/\*\*\s+([0-9]{1,2}[:.][0-9]{2}[^*\n]*?)\s*\*\*/g, '**$1**')

  text = text.replace(/\$\\le\s*/g, '≤ ').replace(/\$\\ge\s*/g, '≥ ')
  text = text.replace(/\\le\b/g, '≤').replace(/\\ge\b/g, '≥')
  text = text.replace(/\\rightarrow\b/g, '→').replace(/\\times\b/g, '×').replace(/\\pm\b/g, '±')
  text = text.replace(/\\text\{([^}]*)\}/g, '$1')
  text = text.replace(/\\[,;:! ]/g, ' ')
  text = text.replace(/\$([^$\n]+)\$/g, '$1')

  return text
}
