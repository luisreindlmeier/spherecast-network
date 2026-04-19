/**
 * Server-side typed wrappers around the Agnes backend API.
 * Use these in Server Components and Next.js route handlers.
 * For Client Components, use lib/agnes-client.ts instead.
 */
import { agnesGet } from '@/lib/agnes-server'
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
} from '@/lib/agnes-client'

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`Agnes error ${res.status}: ${res.url}`)
  return res.json() as Promise<T>
}

export async function getStats(scopeCompanyId?: number | null): Promise<AgnesStats> {
  const p = new URLSearchParams()
  if (scopeCompanyId != null) p.set('scope_company_id', String(scopeCompanyId))
  return json(await agnesGet('/stats', p))
}

export async function getCompanyPickerList(): Promise<{ id: number; name: string }[]> {
  const list = await json<AgnesCompany[]>(await agnesGet('/companies'))
  return list.map(({ id, name }) => ({ id, name }))
}

export async function getNavCounts(scopeCompanyId?: number | null): Promise<{ finishedGoods: number; rawMaterials: number; suppliers: number }> {
  const stats = await getStats(scopeCompanyId)
  return { finishedGoods: stats.finishedGoods, rawMaterials: stats.rawMaterials, suppliers: stats.suppliers }
}

export async function getCockpitStats(scopeCompanyId?: number | null): Promise<AgnesStats> {
  return getStats(scopeCompanyId)
}

export async function getCompanies(scopeCompanyId?: number | null): Promise<AgnesCompany[]> {
  const p = new URLSearchParams()
  if (scopeCompanyId != null) p.set('scope_company_id', String(scopeCompanyId))
  return json(await agnesGet('/companies', p))
}

export async function getCompanyDetail(id: number): Promise<AgnesCompanyDetail | null> {
  const res = await agnesGet(`/companies/${id}/detail`)
  if (res.status === 404) return null
  return json(res)
}

export async function getFinishedGoods(scopeCompanyId?: number | null): Promise<AgnesProduct[]> {
  const p = new URLSearchParams()
  if (scopeCompanyId != null) p.set('scope_company_id', String(scopeCompanyId))
  return json(await agnesGet('/products', p))
}

export async function getFinishedGoodDetail(id: number): Promise<AgnesProductDetail | null> {
  const res = await agnesGet(`/products/${id}`)
  if (res.status === 404) return null
  return json(res)
}

export async function getRawMaterials(scopeCompanyId?: number | null): Promise<AgnesRawMaterial[]> {
  const p = new URLSearchParams()
  if (scopeCompanyId != null) p.set('scope_company_id', String(scopeCompanyId))
  return json(await agnesGet('/raw-materials', p))
}

export async function getRawMaterialDetail(id: number): Promise<AgnesRawMaterialDetail | null> {
  const res = await agnesGet(`/raw-materials/${id}`)
  if (res.status === 404) return null
  return json(res)
}

export async function getSuppliers(scopeCompanyId?: number | null): Promise<AgnesSupplier[]> {
  const p = new URLSearchParams()
  if (scopeCompanyId != null) p.set('scope_company_id', String(scopeCompanyId))
  return json(await agnesGet('/suppliers', p))
}

export async function getSupplierDetail(id: number): Promise<AgnesSupplierDetail | null> {
  const res = await agnesGet(`/suppliers/${id}`)
  if (res.status === 404) return null
  return json(res)
}

// Type aliases matching the old queries.ts shapes — drop-in replacements
export type CompanyPickerRow = { id: number; name: string }
export type CompanyWithCounts = AgnesCompany
export type FinishedGoodRow = AgnesProduct
export type RawMaterialRow = AgnesRawMaterial
export type SupplierRow = AgnesSupplier

export async function getGlobalSearchItems(scopeCompanyId?: number | null): Promise<AgnesSearchItem[]> {
  const p = new URLSearchParams({ q: '' })
  if (scopeCompanyId != null) p.set('scope_company_id', String(scopeCompanyId))
  return json(await agnesGet('/search', p))
}
