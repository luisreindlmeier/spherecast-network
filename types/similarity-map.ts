import type { IngredientCategory } from '@/components/similarity-map/similarity-map-categories'

export type SimilarityPoint = {
  /** Unique id: "rm-{productId}-sup-{supplierId}" */
  id: string
  name: string
  category: IngredientCategory
  supplierName: string
  umap: [number, number, number]
  /** How many companies have any product with this ingredient name */
  companyCount: number
  /** First product ID with this ingredient name — used for navigation */
  productId: string
}
