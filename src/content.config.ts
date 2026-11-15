import { defineCollection } from 'astro:content'
import { z } from 'astro/zod'
import { glob } from 'astro/loaders'

const stages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/stages' }),
  schema: z.object({
    order: z.number().int().min(1).max(9),
    title: z.string(),
    short: z.string(),
    place: z.string(),
    summary: z.string(),
    note: z.string().optional(),
  }),
})

const duas = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/duas' }),
  schema: z.object({
    stage: z.enum([
      'persiapan',
      'perjalanan',
      'ihram',
      'makkah',
      'tawaf',
      'sai',
      'tahallul',
      'wada',
      'kepulangan',
    ]),
    order: z.number().int().positive(),
    title: z.string(),
    kind: z.enum(['dua', 'ayat']).default('dua'),
    position: z.string().optional(),
    source: z.array(z.number().int().positive()).min(1),
    arabic: z.string().min(1),
    translation: z.string().min(1),
    note: z.string().optional(),
  }),
})

export const collections = { stages, duas }
