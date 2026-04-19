import type { PostgrestError } from '@supabase/supabase-js'

/** When set, list queries only include that brand's supply-chain slice. */
export type CompanyScopeId = number | null

export type SupplierProductLinkRow = {
  supplier_id: number
  product_id: number
}

export type ProductCompanyTypeRow = {
  id: number
  company_id: number
  type: string
}

export function throwIfError(
  error: PostgrestError | null,
  context: string
): void {
  if (error) {
    throw new Error(`${context}: ${error.message}`)
  }
}

export function countScopedSuppliers(
  products: ProductCompanyTypeRow[],
  links: SupplierProductLinkRow[],
  scopeCompanyId: number
): number {
  const rawMaterialIds = new Set(
    products
      .filter(
        (product) =>
          product.type === 'raw-material' && product.company_id === scopeCompanyId
      )
      .map((product) => product.id)
  )

  const supplierIds = new Set<number>()
  for (const link of links) {
    if (rawMaterialIds.has(link.product_id)) {
      supplierIds.add(link.supplier_id)
    }
  }

  return supplierIds.size
}
