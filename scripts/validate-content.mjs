#!/usr/bin/env node
/**
 * Pemeriksaan isi sebelum build.
 * Menjaga agar setiap doa punya lafaz, terjemah, dan rujukan;
 * serta agar posisi yang dipakai penghitung benar-benar ada.
 */
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const duasDir = path.join(root, 'src/content/duas')
const stagesDir = path.join(root, 'src/content/stages')

const STAGES = [
  'persiapan',
  'perjalanan',
  'ihram',
  'makkah',
  'tawaf',
  'sai',
  'tahallul',
  'wada',
  'kepulangan',
]

const REQUIRED_POSITIONS = [
  'hajar-aswad',
  'maqam-ibrahim',
  'rukun-iraqi',
  'mizab',
  'rukun-syami',
  'rukun-yamani',
  'antara-yamani-aswad',
  'hajar-aswad-kembali',
  'multazam',
  'zamzam',
  'shafa',
  'jalan',
  'marwah',
]

const REQUIRED_IDS = [
  'tawaf-hajar-aswad',
  'tawaf-pintu',
  'tawaf-iraqi',
  'tawaf-mizab',
  'tawaf-syami',
  'tawaf-yamani',
  'tawaf-antara-yamani',
  'tawaf-kembali',
  'tawaf-multazam',
  'tawaf-zamzam',
  'sai-shafa',
  'sai-jalan',
  'sai-marwah',
]

const problems = []
const ids = new Set()
const byStage = Object.fromEntries(STAGES.map((stage) => [stage, 0]))
const positions = new Map()
const orderByStage = new Map()

/** Ambil isi block scalar YAML (indentasi dua spasi). */
function blockScalar(frontmatter, key) {
  const lines = frontmatter.split('\n')
  const start = lines.findIndex((line) => line.startsWith(`${key}: |`))
  if (start < 0) return null
  const out = []
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index]
    if (line.trim() === '') {
      out.push('')
      continue
    }
    if (!line.startsWith('  ')) break
    out.push(line.slice(2))
  }
  return out.join('\n').trim()
}

function passages(text) {
  return text.split(/\n\s*\n/).filter((part) => part.trim()).length
}

const files = (await readdir(duasDir)).filter((file) => file.endsWith('.md'))

for (const file of files) {
  const raw = await readFile(path.join(duasDir, file), 'utf8')
  const id = file.replace(/\.md$/, '')
  if (ids.has(id)) problems.push(`id ganda: ${id}`)
  ids.add(id)

  const frontmatter = raw.split('---')[1] ?? ''
  const field = (key) => {
    const match = frontmatter.match(new RegExp(`^${key}: (.*)$`, 'm'))
    return match ? match[1].trim() : null
  }

  const stage = field('stage')
  const order = Number(field('order'))
  const source = field('source')
  const position = field('position')

  if (!stage || !(stage in byStage)) problems.push(`${id}: stage tidak dikenal (${stage})`)
  else byStage[stage] += 1

  if (!Number.isInteger(order) || order < 1) problems.push(`${id}: order tidak valid`)
  if (stage) {
    const used = orderByStage.get(stage) ?? new Set()
    if (used.has(order)) problems.push(`${id}: order ${order} ganda di tahap ${stage}`)
    used.add(order)
    orderByStage.set(stage, used)
  }
  if (!raw.includes('arabic: |')) problems.push(`${id}: lafaz Arab kosong`)
  if (!raw.includes('translation: |')) problems.push(`${id}: terjemah kosong`)

  const arabicText = blockScalar(frontmatter, 'arabic')
  const translationText = blockScalar(frontmatter, 'translation')
  if (arabicText && translationText && passages(arabicText) !== passages(translationText)) {
    problems.push(
      `${id}: ${passages(arabicText)} bagian Arab vs ${passages(translationText)} terjemah`
    )
  }

  if (!source || !/^\[\d+(, \d+)*\]$/.test(source)) {
    problems.push(`${id}: source harus [1] atau [1, 2]`)
  } else {
    for (const number of source.slice(1, -1).split(',').map((value) => Number(value.trim()))) {
      if (number < 1 || number > 19) problems.push(`${id}: rujukan di luar 1-19 (${number})`)
    }
  }

  if (position) {
    if (positions.has(position)) problems.push(`posisi ganda: ${position}`)
    positions.set(position, id)
  }
}

const stages = (await readdir(stagesDir)).filter((file) => file.endsWith('.md'))
if (stages.length !== STAGES.length) problems.push(`jumlah tahap ${stages.length}, seharusnya 9`)

for (const stage of STAGES) {
  if (!byStage[stage]) problems.push(`tahap tanpa doa: ${stage}`)
}

for (const position of REQUIRED_POSITIONS) {
  if (!positions.has(position)) problems.push(`posisi hilang: ${position}`)
}

for (const id of REQUIRED_IDS) {
  if (!ids.has(id)) problems.push(`doa untuk penghitung hilang: ${id}`)
}

if (problems.length) {
  console.error(`Isi bermasalah (${problems.length}):`)
  for (const problem of problems) console.error(`  - ${problem}`)
  process.exit(1)
}

console.log(
  `Isi valid: ${files.length} doa, ${stages.length} tahap, ${positions.size} posisi manasik.`
)
