/**
 * Server-side typed wrappers around the Agnes backend API.
 * Use these in Server Components and Next.js route handlers.
 * For Client Components, use lib/agnes-client.ts instead.
 */
import { agnesGet } from '@/lib/agnes-server'
import { agnesPost } from '@/lib/agnes-server'
import type {
  AgnesStats,
  AgnesCompany,
  AgnesCompanyDetail,
  AgnesProduct,
  AgnesProductDetail,
  AgnesRawMaterial,
  AgnesRawMaterialDetail,
  AgnesSupplier,
  AgnesSupplierDetail,
  AgnesSearchItem,
  AgnesRecommendation,
  AgnesRecommendationSubstitute,
  AgnesOpportunitiesResponse,
  AgnesOpportunity,
} from '@/lib/agnes-client'

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Agnes error ${res.status}: ${res.url}`)
  return res.json() as Promise<T>
}

function logFallback(queryName: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error)
  console.warn(`[agnes-queries] ${queryName} failed, using fallback: ${message}`)
}

export async function isAgnesAvailable(): Promise<boolean> {
  try {
    const res = await agnesGet('/')
    return res.ok
  } catch {
    return false
  }
}

export async function getStats(scopeCompanyId?: number | null): Promise<AgnesStats> {
  try {
    const p = new URLSearchParams()
    if (scopeCompanyId != null) p.set('scope_company_id', String(scopeCompanyId))
    return await json(await agnesGet('/stats', p))
  } catch (error) {
    logFallback('getStats', error)
    return { finishedGoods: 0, rawMaterials: 0, suppliers: 0, companies: 0 }
  }
}

export async function getCompanyPickerList(): Promise<{ id: number; name: string }[]> {
  try {
    const list = await json<AgnesCompany[]>(await agnesGet('/companies'))
    return list.map(({ id, name }) => ({ id, name }))
  } catch (error) {
    logFallback('getCompanyPickerList', error)
    return []
  }
}

export async function getNavCounts(scopeCompanyId?: number | null): Promise<{ finishedGoods: number; rawMaterials: number; suppliers: number }> {
  const stats = await getStats(scopeCompanyId)
  return { finishedGoods: stats.finishedGoods, rawMaterials: stats.rawMaterials, suppliers: stats.suppliers }
}

export async function getCockpitStats(scopeCompanyId?: number | null): Promise<AgnesStats> {
  return getStats(scopeCompanyId)
}

export async function getCompanies(scopeCompanyId?: number | null): Promise<AgnesCompany[]> {
  try {
    const p = new URLSearchParams()
    if (scopeCompanyId != null) p.set('scope_company_id', String(scopeCompanyId))
    return await json(await agnesGet('/companies', p))
  } catch (error) {
    logFallback('getCompanies', error)
    return []
  }
}

export async function getCompanyDetail(id: number): Promise<AgnesCompanyDetail | null> {
  try {
    const res = await agnesGet(`/companies/${id}/detail`)
    if (res.status === 404) return null
    return await json(res)
  } catch (error) {
    logFallback('getCompanyDetail', error)
    return null
  }
}

export async function getFinishedGoods(scopeCompanyId?: number | null): Promise<AgnesProduct[]> {
  try {
    const p = new URLSearchParams()
    if (scopeCompanyId != null) p.set('scope_company_id', String(scopeCompanyId))
    return await json(await agnesGet('/products', p))
  } catch (error) {
    logFallback('getFinishedGoods', error)
    return []
  }
}

export async function getFinishedGoodDetail(id: number): Promise<AgnesProductDetail | null> {
  try {
    const res = await agnesGet(`/products/${id}`)
    if (res.status === 404) return null
    return await json(res)
  } catch (error) {
    logFallback('getFinishedGoodDetail', error)
    return null
  }
}

export async function getRawMaterials(scopeCompanyId?: number | null): Promise<AgnesRawMaterial[]> {
  try {
    const p = new URLSearchParams()
    if (scopeCompanyId != null) p.set('scope_company_id', String(scopeCompanyId))
    return await json(await agnesGet('/raw-materials', p))
  } catch (error) {
    logFallback('getRawMaterials', error)
    return []
  }
}

export async function getRawMaterialDetail(id: number): Promise<AgnesRawMaterialDetail | null> {
  try {
    const res = await agnesGet(`/raw-materials/${id}`)
    if (res.status === 404) return null
    return await json(res)
  } catch (error) {
    logFallback('getRawMaterialDetail', error)
    return null
  }
}

export async function getSuppliers(scopeCompanyId?: number | null): Promise<AgnesSupplier[]> {
  try {
    const p = new URLSearchParams()
    if (scopeCompanyId != null) p.set('scope_company_id', String(scopeCompanyId))
    return await json(await agnesGet('/suppliers', p))
  } catch (error) {
    logFallback('getSuppliers', error)
    return []
  }
}

export async function getSupplierDetail(id: number): Promise<AgnesSupplierDetail | null> {
  try {
    const res = await agnesGet(`/suppliers/${id}`)
    if (res.status === 404) return null
    return await json(res)
  } catch (error) {
    logFallback('getSupplierDetail', error)
    return null
  }
}

// Type aliases matching the old queries.ts shapes — drop-in replacements
export type CompanyPickerRow = { id: number; name: string }
export type CompanyWithCounts = AgnesCompany
export type FinishedGoodRow = AgnesProduct
export type RawMaterialRow = AgnesRawMaterial
export type SupplierRow = AgnesSupplier

export async function getGlobalSearchItems(scopeCompanyId?: number | null): Promise<AgnesSearchItem[]> {
  try {
    const p = new URLSearchParams({ q: '' })
    if (scopeCompanyId != null) p.set('scope_company_id', String(scopeCompanyId))
    return await json(await agnesGet('/search', p))
  } catch (error) {
    logFallback('getGlobalSearchItems', error)
    return []
  }
}

export type OpportunityStatus = 'open' | 'in_review'

export interface OpportunityMatchLine {
  label: string
  detail: string
}

export interface OpportunityBrandAffected {
  name: string
  productCount: number
}

export interface OpportunityConsolidation {
  via: string
  combinedVolume: string
  estimatedSavings: string
  supplierRisk: string
}

export interface OpportunityRow {
  id: string
  rawMaterialId: number
  rawMaterialSku: string
  confidence: number
  ingredientName: string
  brandsDisplay: string
  currentSupplier: string
  altSupplier: string
  risk: string
  brandKey: string
  category: string
  supplierKey: string
  status: OpportunityStatus
  matchReasoning: readonly OpportunityMatchLine[]
  brandsAffected: readonly OpportunityBrandAffected[]
  consolidation: OpportunityConsolidation
}

export interface OpportunityDetail {
  row: OpportunityRow
  explanation: string | null
  sourcingActions: string[]
  allSubstitutes: readonly AgnesRecommendationSubstitute[]
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

function formatPct(value: number): string {
  return `${Math.round(value * 100)}%`
}

function formatSavings(top: AgnesRecommendationSubstitute): string {
  if (typeof top.co2_vs_original === 'number') {
    const sign = top.co2_vs_original > 0 ? '+' : ''
    return `CO2 delta: ${sign}${top.co2_vs_original.toFixed(2)} kg/kg`
  }
  return 'Savings estimate pending'
}

function toOpportunityCategory(functionalClass: string | undefined): string {
  if (!functionalClass) return 'Unclassified'
  return functionalClass
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function buildOpportunityRow(params: {
  rawMaterialId: number
  rawMaterialSku: string
  companyName: string
  usedInProducts: number
  rec: AgnesRecommendation
}): OpportunityRow | null {
  const { rawMaterialId, rawMaterialSku, companyName, usedInProducts, rec } = params
  const top = rec.substitutes[0]
  if (!top) return null

  const confidence = clamp01(
    typeof top.combined_score === 'number'
      ? top.combined_score
      : typeof top.confidence === 'number'
        ? top.confidence
        : top.similarity
  )

  const currentSupplier = rec.original.current_suppliers[0] ?? 'Unknown'
  const supplierKey = currentSupplier
  const risk = rec.original.single_source_risk
    ? 'High (single source)'
    : top.compliance
      ? 'Moderate'
      : 'Compliance review'

  const matchReasoning: OpportunityMatchLine[] = [
    { label: 'Similarity', detail: formatPct(clamp01(top.similarity)) },
    { label: 'Functional fit', detail: formatPct(clamp01(top.functional_fit)) },
    { label: 'Compliance', detail: top.compliance ? 'Pass' : 'Review required' },
  ]

  const brandsAffected: OpportunityBrandAffected[] = [
    {
      name: companyName,
      productCount: usedInProducts,
    },
  ]

  const consolidation: OpportunityConsolidation = {
    via: `Primary alternative: ${top.name}`,
    combinedVolume: `Used in ${usedInProducts} finished product${usedInProducts === 1 ? '' : 's'}`,
    estimatedSavings: formatSavings(top),
    supplierRisk: risk,
  }

  return {
    id: String(rawMaterialId),
    rawMaterialId,
    rawMaterialSku,
    confidence,
    ingredientName: rec.original.name,
    brandsDisplay: `${companyName}${usedInProducts > 1 ? `+${usedInProducts - 1}` : ''}`,
    currentSupplier,
    altSupplier: top.name,
    risk,
    brandKey: companyName,
    category: toOpportunityCategory(rec.original.functional_class),
    supplierKey,
    status: rec.original.single_source_risk ? 'open' : 'in_review',
    matchReasoning,
    brandsAffected,
    consolidation,
  }
}

function mapOpportunityApiRow(item: AgnesOpportunity): OpportunityRow {
  return {
    id: item.id,
    rawMaterialId: item.rawMaterialId,
    rawMaterialSku: item.rawMaterialSku,
    confidence: clamp01(item.confidence),
    ingredientName: item.ingredientName,
    brandsDisplay: item.brandsDisplay,
    currentSupplier: item.currentSupplier,
    altSupplier: item.altSupplier,
    risk: item.risk,
    brandKey: item.brandKey,
    category: toOpportunityCategory(item.category),
    supplierKey: item.supplierKey,
    status: item.status,
    matchReasoning: item.matchReasoning,
    brandsAffected: item.brandsAffected,
    consolidation: item.consolidation,
  }
}

export async function getOpportunities(scopeCompanyId?: number | null): Promise<OpportunityRow[]> {
  try {
    const p = new URLSearchParams()
    p.set('limit', '18')
    p.set('top_k', '3')
    if (scopeCompanyId != null) {
      p.set('scope_company_id', String(scopeCompanyId))
    }

    const res = await agnesGet('/opportunities', p)
    if (!res.ok) return []
    const payload = await json<AgnesOpportunitiesResponse>(res)

    return payload.items
      .map(mapOpportunityApiRow)
      .sort((a, b) => b.confidence - a.confidence)
  } catch (error) {
    logFallback('getOpportunities', error)
    return []
  }
}

export async function getOpportunityDetail(
  rawMaterialId: number,
  scopeCompanyId?: number | null
): Promise<OpportunityDetail | null> {
  try {
    const p = new URLSearchParams()
    p.set('raw_material_id', String(rawMaterialId))
    p.set('top_k', '5')
    p.set('explain', 'true')
    if (scopeCompanyId != null) {
      p.set('scope_company_id', String(scopeCompanyId))
    }

    const res = await agnesGet('/opportunities', p)
    if (!res.ok) return null
    const payload = await json<AgnesOpportunitiesResponse>(res)
    const first = payload.items[0]
    if (!first) return null

    return {
      row: mapOpportunityApiRow(first),
      explanation: first.explanation,
      sourcingActions: first.sourcingActions,
      allSubstitutes: first.substitutes,
    }
  } catch (error) {
    logFallback('getOpportunityDetail', error)
    return null
  }
}
