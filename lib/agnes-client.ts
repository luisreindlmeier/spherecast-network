const BASE = '/api/agnes'

async function get<T>(
  path: string,
  params?: Record<string, string | number | undefined>
): Promise<T> {
  const url = new URL(path, 'http://localhost')
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) url.searchParams.set(k, String(v))
    }
  }
  const res = await fetch(`${BASE}${url.pathname}${url.search}`, {
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Agnes ${path} failed: ${res.status}`)
  return res.json() as Promise<T>
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Agnes POST ${path} failed: ${res.status}`)
  return res.json() as Promise<T>
}

export type AgnesCompany = {
  id: number
  name: string
  finishedGoods: number
  rawMaterials: number
}
export type AgnesCompanyDetail = {
  id: number
  name: string
  finishedGoods: { id: number; sku: string; ingredientCount: number }[]
  rawMaterials: {
    id: number
    sku: string
    supplierCount: number
    usedInProducts: number
  }[]
}
export type AgnesProduct = {
  id: number
  sku: string
  companyId: number
  companyName: string
  ingredientCount: number
}
export type AgnesProductDetail = AgnesProduct & {
  ingredients: { id: number; sku: string; companyName: string; type: string }[]
}
export type IngredientProfile = {
  functionalClass: string | null
  allergens: string[]
  vegan: boolean | null
  kosher: boolean | null
  halal: boolean | null
  nonGmo: boolean | null
  eNumber: string | null
  confidence: number | null
  description: string | null
  synonyms: string[]
  enrichedSources: string[]
}

export type AgnesEnrichmentStats = {
  total_raw_materials: number
  enriched: number
  enrichment_rate: number
  vegan_known: number
  vegan_true: number
  by_functional_class: { class: string; count: number }[]
}

export type AgnesRawMaterial = {
  id: number
  sku: string
  companyId: number
  companyName: string
  supplierCount: number
  usedInProducts: number
}
export type AgnesRawMaterialDetail = AgnesRawMaterial & {
  suppliers: { id: number; name: string }[]
  foundIn: { productId: number; sku: string; companyName: string }[]
  profile: IngredientProfile
}
export type AgnesSupplier = { id: number; name: string; materialCount: number }
export type AgnesSupplierDetail = {
  id: number
  name: string
  materialCount: number
  companiesReached: number
  materials: {
    productId: number
    sku: string
    companyName: string
    usedInProducts: number
  }[]
  companies: { id: number; name: string; productCount: number }[]
}
export type AgnesStats = {
  finishedGoods: number
  rawMaterials: number
  suppliers: number
  companies: number
}
export type AgnesSearchItem = {
  kind: 'supplier' | 'company' | 'raw-material' | 'finished-good'
  id: number
  label: string
  subtitle: string
  href: string
}

export type AgnesRecommendationOriginal = {
  sku: string
  name: string
  functional_class?: string
  current_suppliers: string[]
  single_source_risk: boolean
}

export type AgnesRecommendationSubstitute = {
  sku: string
  name: string
  similarity: number
  confidence: number
  combined_score: number
  functional_fit: number
  compliance: boolean
  violations: string[]
  available_from: string[]
  co2_vs_original?: number
}

export type AgnesRecommendation = {
  original: AgnesRecommendationOriginal
  substitutes: AgnesRecommendationSubstitute[]
  explanation: string | null
  sourcing_actions: string[]
}

export type AgnesOpportunityStatus = 'open' | 'in_review'

export type AgnesOpportunityMatchLine = {
  label: string
  detail: string
}

export type AgnesOpportunityBrandAffected = {
  name: string
  productCount: number
}

export type AgnesOpportunityConsolidation = {
  via: string
  combinedVolume: string
  estimatedSavings: string
  supplierRisk: string
}

export type AgnesOpportunity = {
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
  status: AgnesOpportunityStatus
  matchReasoning: AgnesOpportunityMatchLine[]
  brandsAffected: AgnesOpportunityBrandAffected[]
  consolidation: AgnesOpportunityConsolidation
  explanation: string | null
  sourcingActions: string[]
  substitutes: AgnesRecommendationSubstitute[]
}

export type AgnesOpportunitiesResponse = {
  items: AgnesOpportunity[]
  count: number
}

export const getStats = (scopeCompanyId?: number) =>
  get<AgnesStats>('/stats', { scope_company_id: scopeCompanyId })

export const getCompanies = (scopeCompanyId?: number) =>
  get<AgnesCompany[]>('/companies', { scope_company_id: scopeCompanyId })

export const getCompanyDetail = (id: number) =>
  get<AgnesCompanyDetail>(`/companies/${id}`)

export const getProducts = (scopeCompanyId?: number) =>
  get<AgnesProduct[]>('/products', { scope_company_id: scopeCompanyId })

export const getProductDetail = (id: number) =>
  get<AgnesProductDetail>(`/products/${id}`)

export const getRawMaterials = (scopeCompanyId?: number) =>
  get<AgnesRawMaterial[]>('/raw-materials', {
    scope_company_id: scopeCompanyId,
  })

export const getRawMaterialDetail = (id: number) =>
  get<AgnesRawMaterialDetail>(`/raw-materials/${id}`)

export const getSuppliers = (scopeCompanyId?: number) =>
  get<AgnesSupplier[]>('/suppliers', { scope_company_id: scopeCompanyId })

export const getSupplierDetail = (id: number) =>
  get<AgnesSupplierDetail>(`/suppliers/${id}`)

export const globalSearch = (q: string, scopeCompanyId?: number) =>
  get<AgnesSearchItem[]>('/search', { q, scope_company_id: scopeCompanyId })

export const getNetworkMap = () =>
  get<{ nodes: unknown[]; arcs: unknown[] }>('/network-map')

export const getRecommendations = (sku: string, topK = 5) =>
  post<unknown>('/recommend', {
    ingredient_sku: sku,
    top_k: topK,
    explain: true,
  })

export const getSingleSupplierRisk = (minBoms = 1) =>
  get<unknown>('/risk', { min_boms: minBoms })

export const getEnrichmentStats = () =>
  get<AgnesEnrichmentStats>('/enrichment/stats')

export const getOpportunities = (scopeCompanyId?: number, limit = 18) =>
  get<AgnesOpportunitiesResponse>('/opportunities', {
    scope_company_id: scopeCompanyId,
    limit,
  })
