import { getCollection, type CollectionEntry } from 'astro:content'

export type Stage = CollectionEntry<'stages'>
export type Dua = CollectionEntry<'duas'>
export type DuaWithContext = Dua & {
  index: number
  stageOrder: number
  stageTitle: string
  stageShort: string
  stageSlug: string
}

export async function getStages(): Promise<Stage[]> {
  const stages = await getCollection('stages')
  return stages.sort((a, b) => a.data.order - b.data.order)
}

export function stageSlugFromId(id: string): string {
  return id.replace(/^\d+-/, '')
}

export async function getDuas(): Promise<DuaWithContext[]> {
  const [stages, duas] = await Promise.all([getStages(), getCollection('duas')])
  const bySlug = new Map(stages.map((stage) => [stageSlugFromId(stage.id), stage]))

  return duas
    .map((dua) => {
      const stage = bySlug.get(dua.data.stage)
      if (!stage) {
        throw new Error(`Doa "${dua.id}" merujuk tahap yang tidak ada: ${dua.data.stage}`)
      }
      return {
        ...dua,
        index: 0,
        stageOrder: stage.data.order,
        stageTitle: stage.data.title,
        stageShort: stage.data.short,
        stageSlug: dua.data.stage,
      }
    })
    .sort((a, b) => a.stageOrder - b.stageOrder || a.data.order - b.data.order)
    .map((dua, index) => ({ ...dua, index: index + 1 }))
}

export async function getDuasByStage(): Promise<Map<string, DuaWithContext[]>> {
  const duas = await getDuas()
  const map = new Map<string, DuaWithContext[]>()
  for (const dua of duas) {
    const list = map.get(dua.stageSlug) ?? []
    list.push(dua)
    map.set(dua.stageSlug, list)
  }
  return map
}

export function duaHref(id: string): string {
  return `/baca/#dua-${id}`
}

export function stageHref(slug: string): string {
  return `/panduan/${slug}/`
}
