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

type SimilarityRawPayload = {
  products: SimilarityRawMaterialProductRow[]
  supplier_links: SimilaritySupplierLinkRow[]
  suppliers: SimilaritySupplierRow[]
  boms: SimilarityBomRow[]
  bom_components: SimilarityBomComponentRow[]
  finished_goods: SimilarityFinishedGoodRow[]
}

export async function GET() {
  const scopeCompanyId = await resolveCompanyScopeFilter()
  const searchParams = new URLSearchParams()
  if (scopeCompanyId !== null) {
    searchParams.set('scope_company_id', String(scopeCompanyId))
  }

  const res = await agnesGet('/similarity-map-data', searchParams)
  if (!res.ok) {
    return NextResponse.json({ points: [] })
  }

  const payload = (await res.json()) as SimilarityRawPayload

  const rawMaterials = payload.products ?? []
  const links = payload.supplier_links ?? []
  const suppliers = payload.suppliers ?? []
  const boms = payload.boms ?? []
  const comps = payload.bom_components ?? []
  const fgs = payload.finished_goods ?? []

  const supplierMap = new Map(suppliers.map((s) => [s.id, s.name]))

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

  const productName = new Map<number, string>()
  for (const rm of rawMaterials) {
    const name = parseIngredientNameFromSku(rm.sku)
    productName.set(rm.id, name)
  }

  const nameToCompanies = new Map<string, Set<number>>()
  for (const rm of rawMaterials) {
    const name = productName.get(rm.id)
    if (!name) continue
    const set = nameToCompanies.get(name) ?? new Set<number>()
    set.add(rm.company_id)
    nameToCompanies.set(name, set)
  }

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

    points.push({
      id: `rm-${link.product_id}-sup-${link.supplier_id}`,
      name,
      category,
      supplierName,
      umap,
      companyCount,
      productId: String(link.product_id),
    })
  }

  return NextResponse.json({ points })
}
