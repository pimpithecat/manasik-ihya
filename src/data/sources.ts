export interface SourceRef {
  n: number
  work: string
  workShort: string
  vol?: number
  page: number
  note?: string
}

const IHYA = "Ihya' 'Ulum al-Din"
const IHYA_SHORT = "Ihya'"

export const sources: SourceRef[] = [
  { n: 1, work: IHYA, workShort: IHYA_SHORT, vol: 1, page: 246 },
  { n: 2, work: IHYA, workShort: IHYA_SHORT, vol: 1, page: 247 },
  { n: 3, work: IHYA, workShort: IHYA_SHORT, vol: 1, page: 247 },
  { n: 4, work: IHYA, workShort: IHYA_SHORT, vol: 1, page: 247 },
  { n: 5, work: IHYA, workShort: IHYA_SHORT, vol: 1, page: 248 },
  { n: 6, work: IHYA, workShort: IHYA_SHORT, vol: 1, page: 246 },
  {
    n: 7,
    work: IHYA,
    workShort: IHYA_SHORT,
    vol: 1,
    page: 257,
  },
  { n: 8, work: IHYA, workShort: IHYA_SHORT, vol: 1, page: 249 },
  { n: 9, work: IHYA, workShort: IHYA_SHORT, vol: 1, page: 249 },
  { n: 10, work: IHYA, workShort: IHYA_SHORT, vol: 1, page: 250 },
  { n: 11, work: IHYA, workShort: IHYA_SHORT, vol: 1, page: 250 },
  { n: 12, work: IHYA, workShort: IHYA_SHORT, vol: 1, page: 251 },
  { n: 13, work: IHYA, workShort: IHYA_SHORT, vol: 1, page: 252 },
  { n: 14, work: IHYA, workShort: IHYA_SHORT, vol: 1, page: 252 },
  { n: 15, work: IHYA, workShort: IHYA_SHORT, vol: 1, page: 256 },
  {
    n: 16,
    work: 'al-Wasit fi al-Madhhab',
    workShort: 'al-Wasit',
    vol: 2,
    page: 664,
    note: 'Rujukan tambahan untuk tahallul.',
  },
  { n: 17, work: IHYA, workShort: IHYA_SHORT, vol: 1, page: 258 },
  { n: 18, work: IHYA, workShort: IHYA_SHORT, vol: 1, page: 261 },
  { n: 19, work: IHYA, workShort: IHYA_SHORT, vol: 2, page: 256 },
]

export const sourceByNumber = new Map(sources.map((source) => [source.n, source]))

export function sourceLabel(source: SourceRef): string {
  const vol = source.vol ? ` ${['0', 'I', 'II', 'III', 'IV', 'V'][source.vol] ?? source.vol}` : ''
  return `${source.workShort}${vol}/${source.page}`
}

export function sourceLabelLong(source: SourceRef): string {
  const vol = source.vol ? `Jilid ${['0', 'I', 'II', 'III', 'IV', 'V'][source.vol] ?? source.vol}, ` : ''
  return `${source.work} — ${vol}hlm. ${source.page}`
}

/** Posisi tawaf, dipakai penghitung dan halaman tahap. */
export const tawafStops = [
  { key: 'hajar-aswad', label: 'Hajar Aswad', dua: 'tawaf-hajar-aswad' },
  { key: 'maqam-ibrahim', label: 'Di depan pintu Ka\u2019bah', dua: 'tawaf-pintu' },
  { key: 'rukun-iraqi', label: 'Rukun Iraqi', dua: 'tawaf-iraqi' },
  { key: 'mizab', label: 'Di bawah Mizab', dua: 'tawaf-mizab' },
  { key: 'rukun-syami', label: 'Rukun Syami', dua: 'tawaf-syami' },
  { key: 'rukun-yamani', label: 'Rukun Yamani', dua: 'tawaf-yamani' },
  { key: 'antara-yamani-aswad', label: 'Antara Yamani dan Hajar Aswad', dua: 'tawaf-antara-yamani' },
] as const

export const tawafAfter = [
  { key: 'hajar-aswad-kembali', label: 'Kembali ke Hajar Aswad', dua: 'tawaf-kembali' },
  { key: 'multazam', label: 'Di Multazam', dua: 'tawaf-multazam' },
  { key: 'zamzam', label: 'Minum air zamzam', dua: 'tawaf-zamzam' },
] as const

export const saiStops = [
  { key: 'shafa', label: 'Di Bukit Shafa', dua: 'sai-shafa' },
  { key: 'jalan', label: 'Antara Shafa dan Marwah', dua: 'sai-jalan' },
  { key: 'marwah', label: 'Di Bukit Marwah', dua: 'sai-marwah' },
] as const
