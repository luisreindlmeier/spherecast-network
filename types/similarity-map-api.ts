export type SimilarityRawMaterialProductRow = {
  id: number
  sku: string
  company_id: number
}

export type SimilaritySupplierLinkRow = {
  supplier_id: number
  product_id: number
}

export type SimilaritySupplierRow = {
  id: number
  name: string
}

export type SimilarityBomRow = {
  id: number
  produced_product_id: number
}

export type SimilarityBomComponentRow = {
  bom_id: number
  consumed_product_id: number
}

export type SimilarityFinishedGoodRow = {
  id: number
  company_id: number
}
