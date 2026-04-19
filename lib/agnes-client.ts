const BASE = '/api/agnes'

async function get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(path, 'http://localhost')
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) url.searchParams.set(k, String(v))
    }
  }
  const res = await fetch(`${BASE}${url.pathname}${url.search}`, { cache: 'no-store' })
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

export type AgnesCompany = { id: number; name: string; finishedGoods: number; rawMaterials: number }
export type AgnesCompanyDetail = {
  id: number; name: string
  finishedGoods: { id: number; sku: string; ingredientCount: number }[]
  rawMaterials: { id: number; sku: string; supplierCount: number; usedInProducts: number }[]
}
export type AgnesProduct = { id: number; sku: string; companyId: number; companyName: string; ingredientCount: number }
export type AgnesProductDetail = AgnesProduct & {
  ingredients: { id: number; sku: string; companyName: string; type: string }[]
}
export type AgnesRawMaterial = { id: number; sku: string; companyId: number; companyName: string; supplierCount: number; usedInProducts: number }
export type AgnesRawMaterialDetail = AgnesRawMaterial & {
  suppliers: { id: number; name: string }[]
  foundIn: { productId: number; sku: string; companyName: string }[]
}
export type AgnesSupplier = { id: number; name: string; materialCount: number }
export type AgnesSupplierDetail = {
  id: number; name: string; materialCount: number; companiesReached: number
  materials: { productId: number; sku: string; companyName: string; usedInProducts: number }[]
  companies: { id: number; name: string; productCount: number }[]
}
export type AgnesStats = { finishedGoods: number; rawMaterials: number; suppliers: number; companies: number }
export type AgnesSearchItem = { kind: string; id: number; label: string; subtitle: string; href: string }

export const getStats = (scopeCompanyId?: number) =>
  get<AgnesStats>('/stats', { scope_company_id: scopeCompanyId })

export const getCompanies = (scopeCompanyId?: number) =>
  get<AgnesCompany[]>('/companies', { scope_company_id: scopeCompanyId })

export const getCompanyDetail = (id: number) =>
  get<AgnesCompanyDetail>(`/companies/${id}/detail`)

export const getProducts = (scopeCompanyId?: number) =>
  get<AgnesProduct[]>('/products', { scope_company_id: scopeCompanyId })

export const getProductDetail = (id: number) =>
  get<AgnesProductDetail>(`/products/${id}`)

export const getRawMaterials = (scopeCompanyId?: number) =>
  get<AgnesRawMaterial[]>('/raw-materials', { scope_company_id: scopeCompanyId })

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
  post<unknown>('/recommend', { ingredient_sku: sku, top_k: topK, explain: true })

export const getSingleSupplierRisk = (minBoms = 1) =>
  get<unknown>('/risk', { min_boms: minBoms })
