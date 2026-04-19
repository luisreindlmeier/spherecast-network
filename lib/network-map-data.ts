import { z } from 'zod'

const lngLat = z.tuple([
  z.number().min(-180).max(180),
  z.number().min(-85).max(85),
])

export const networkMapNodeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: z.enum(['customer', 'supplier']),
  position: lngLat,
  refId: z.number().int().positive(),
})

export const networkMapArcSchema = z.object({
  id: z.string().min(1),
  sourcePosition: lngLat,
  targetPosition: lngLat,
})

export const networkMapBundleSchema = z.object({
  nodes: z.array(networkMapNodeSchema),
  arcs: z.array(networkMapArcSchema),
})

export type NetworkMapNode = z.infer<typeof networkMapNodeSchema>
export type NetworkMapArc = z.infer<typeof networkMapArcSchema>
