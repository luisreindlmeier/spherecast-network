import { z } from 'zod'

export const globalSearchKindSchema = z.enum([
  'company',
  'supplier',
  'finished-good',
  'raw-material',
])

export const globalSearchItemSchema = z.object({
  kind: globalSearchKindSchema,
  id: z.number(),
  label: z.string(),
  subtitle: z.string(),
  href: z.string(),
})

export type GlobalSearchItem = z.infer<typeof globalSearchItemSchema>

export const globalSearchItemsSchema = z.array(globalSearchItemSchema)

export function parseGlobalSearchItems(data: unknown): GlobalSearchItem[] {
  const parsed = globalSearchItemsSchema.safeParse(data)
  return parsed.success ? parsed.data : []
}
