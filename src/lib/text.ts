/** Normalisasi teks Latin: huruf kecil, tanpa diakritik, tanpa tanda baca. */
export function normalizeLatin(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\u00df-\u024f\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const HARAKAT = /[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/g
const ALIF = /[\u0622\u0623\u0625\u0671]/g

/** Normalisasi teks Arab: buang harakat dan samakan bentuk huruf. */
export function normalizeArabic(value: string): string {
  return value
    .replace(HARAKAT, '')
    .replace(ALIF, '\u0627')
    .replace(/\u0649/g, '\u064a')
    .replace(/\u0629/g, '\u0647')
    .replace(/[^\u0600-\u06ff\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Teks untuk atribut pencarian di halaman /dua. */
export function searchIndex(...values: string[]): string {
  return values
    .map((value) => {
      const arabic = /[\u0600-\u06ff]/.test(value) ? normalizeArabic(value) : ''
      const latin = normalizeLatin(value)
      return `${latin} ${arabic}`.trim()
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V']

export function volumeRoman(vol: number | undefined): string {
  return vol ? (ROMAN[vol] ?? String(vol)) : ''
}

/** Satu doa bisa terdiri dari beberapa bagian, dipisahkan baris kosong. */
export function splitPassages(value: string): string[] {
  return value
    .trim()
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean)
}
