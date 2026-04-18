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

/** Demo graph: customer HQs → supplier sites (shared across sourcing pages). */
const rawBundle = {
  nodes: [
    {
      id: 'c-berlin',
      name: 'HQ · Berlin',
      kind: 'customer' as const,
      position: [13.405, 52.52] as [number, number],
    },
    {
      id: 'c-paris',
      name: 'HQ · Paris',
      kind: 'customer' as const,
      position: [2.3522, 48.8566] as [number, number],
    },
    {
      id: 'c-amsterdam',
      name: 'HQ · Amsterdam',
      kind: 'customer' as const,
      position: [4.9041, 52.3676] as [number, number],
    },
    {
      id: 's-hamburg',
      name: 'Plant · Hamburg',
      kind: 'supplier' as const,
      position: [9.9937, 53.5511] as [number, number],
    },
    {
      id: 's-milan',
      name: 'Plant · Milan',
      kind: 'supplier' as const,
      position: [9.19, 45.4642] as [number, number],
    },
    {
      id: 's-prague',
      name: 'Lab · Prague',
      kind: 'supplier' as const,
      position: [14.4378, 50.0755] as [number, number],
    },
    {
      id: 's-barcelona',
      name: 'Plant · Barcelona',
      kind: 'supplier' as const,
      position: [2.1734, 41.3851] as [number, number],
    },
    {
      id: 's-warsaw',
      name: 'DC · Warsaw',
      kind: 'supplier' as const,
      position: [21.0122, 52.2297] as [number, number],
    },
    {
      id: 's-rotterdam',
      name: 'Port · Rotterdam',
      kind: 'supplier' as const,
      position: [4.4777, 51.9244] as [number, number],
    },
    {
      id: 's-lyon',
      name: 'Plant · Lyon',
      kind: 'supplier' as const,
      position: [4.8357, 45.764] as [number, number],
    },
  ],
  arcs: [
    {
      id: 'a1',
      sourcePosition: [13.405, 52.52] as [number, number],
      targetPosition: [9.9937, 53.5511] as [number, number],
    },
    {
      id: 'a2',
      sourcePosition: [13.405, 52.52] as [number, number],
      targetPosition: [14.4378, 50.0755] as [number, number],
    },
    {
      id: 'a3',
      sourcePosition: [2.3522, 48.8566] as [number, number],
      targetPosition: [9.19, 45.4642] as [number, number],
    },
    {
      id: 'a4',
      sourcePosition: [2.3522, 48.8566] as [number, number],
      targetPosition: [4.8357, 45.764] as [number, number],
    },
    {
      id: 'a5',
      sourcePosition: [4.9041, 52.3676] as [number, number],
      targetPosition: [4.4777, 51.9244] as [number, number],
    },
    {
      id: 'a6',
      sourcePosition: [4.9041, 52.3676] as [number, number],
      targetPosition: [9.9937, 53.5511] as [number, number],
    },
    {
      id: 'a7',
      sourcePosition: [13.405, 52.52] as [number, number],
      targetPosition: [21.0122, 52.2297] as [number, number],
    },
    {
      id: 'a8',
      sourcePosition: [2.3522, 48.8566] as [number, number],
      targetPosition: [2.1734, 41.3851] as [number, number],
    },
    {
      id: 'a9',
      sourcePosition: [4.9041, 52.3676] as [number, number],
      targetPosition: [14.4378, 50.0755] as [number, number],
    },
  ],
} satisfies z.input<typeof networkMapBundleSchema>

export const networkMapBundle = networkMapBundleSchema.parse(rawBundle)
