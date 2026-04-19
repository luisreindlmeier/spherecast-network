import { NextResponse } from 'next/server'
import { resolveCompanyScopeFilter } from '@/lib/company-scope-server'
import { agnesGet } from '@/lib/agnes-server'
import {
  computeSimilarityUmap,
  inferIngredientCategory,
  parseIngredientNameFromSku,
} from '@/lib/similarity-map-utils'
import type { SimilarityPoint } from '@/types/similarity-map'
import type {
  SimilarityBomComponentRow,
  SimilarityBomRow,
  SimilarityFinishedGoodRow,
  SimilarityRawMaterialProductRow,
  SimilaritySupplierLinkRow,
  SimilaritySupplierRow,
} from '@/types/similarity-map-api'

export const dynamic = 'force-dynamic'

export async function GET() {
  const scopeCompanyId = await resolveCompanyScopeFilter()
  
  const p = new URLSearchParams()
  if (scopeCompanyId != null) p.set('scope_company_id', String(scopeCompanyId))
  
  const res = await agnesGet('/similarity-map', p)
  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to fetch similarity map data from Agnes' }, { status: 500 })
  }
  
  const rawData = await res.json()

  const rawMaterials = (rawData.products ?? []) as SimilarityRawMaterialProductRow[]
  const links = (rawData.supplier_links ?? []) as SimilaritySupplierLinkRow[]
  const suppliers = (rawData.suppliers ?? []) as SimilaritySupplierRow[]
  const boms = (rawData.boms ?? []) as SimilarityBomRow[]
  const comps = (rawData.bom_components ?? []) as SimilarityBomComponentRow[]
  const fgs = (rawData.finished_goods ?? []) as SimilarityFinishedGoodRow[]

  const supplierMap = new Map(suppliers.map((s) => [s.id, s.name]))

  /** Raw-material product IDs that appear in BOMs of this company’s finished goods */
  let rmIdsUsedByScopeCompany: Set<number> | null = null
  if (scopeCompanyId !== null) {
    const fgProductIds = new Set(
      fgs.filter((fg) => fg.company_id === scopeCompanyId).map((fg) => fg.id)
    )
    const bomIdsForCompany = new Set<number>()
    for (const bom of boms) {
      if (fgProductIds.has(bom.produced_product_id)) {
        bomIdsForCompany.add(bom.id)
      }
    }
    const rmIds = new Set<number>()
    for (const comp of comps) {
      if (bomIdsForCompany.has(comp.bom_id)) {
        rmIds.add(comp.consumed_product_id)
      }
    }
    rmIdsUsedByScopeCompany = rmIds
  }

  // product_id → normalized ingredient name
  const productName = new Map<number, string>()
  for (const rm of rawMaterials) {
    const name = parseIngredientNameFromSku(rm.sku)
    productName.set(rm.id, name)
  }

  // ingredient name → Set<company_id> (companies that own any RM with that name)
  const nameToCompanies = new Map<string, Set<number>>()
  for (const rm of rawMaterials) {
    const name = productName.get(rm.id)
    if (!name) continue
    const set = nameToCompanies.get(name) ?? new Set()
    set.add(rm.company_id)
    nameToCompanies.set(name, set)
  }

  // Collect unique (ingredient_name, supplier_id) pairs
  // key: `{name}||{supplierId}`
  const seen = new Set<string>()
  const points: SimilarityPoint[] = []

  for (const link of links) {
    if (
      rmIdsUsedByScopeCompany !== null &&
      !rmIdsUsedByScopeCompany.has(link.product_id)
    ) {
      continue
    }

    const name = productName.get(link.product_id)
    if (!name) continue

    const key = `${name}||${link.supplier_id}`
    if (seen.has(key)) continue
    seen.add(key)

    const category = inferIngredientCategory(name)
    const supplierName =
      supplierMap.get(link.supplier_id) ?? `Supplier ${link.supplier_id}`
    const umap = computeSimilarityUmap(name, category, link.supplier_id)
    const companyCount = nameToCompanies.get(name)?.size ?? 0
    const productId = String(link.product_id)

    points.push({
      id: `rm-${link.product_id}-sup-${link.supplier_id}`,
      name,
      category,
      supplierName,
      umap,
      companyCount,
      productId,
    })
  }

  return NextResponse.json({ points })
}
