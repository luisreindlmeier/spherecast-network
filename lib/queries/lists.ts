import {
  getCompanies,
  getFinishedGoods,
  getRawMaterials,
  getSuppliers,
} from '@/lib/agnes-queries'
import type {
  CompanyWithCounts,
  FinishedGoodRow,
  RawMaterialRow,
  SupplierRow,
} from '@/lib/queries/types'
import type { CompanyScopeId } from '@/lib/queries/shared'

export async function getFinishedGoodsList(
  scopeCompanyId: CompanyScopeId = null
): Promise<FinishedGoodRow[]> {
  return getFinishedGoods(scopeCompanyId)
}

export async function getRawMaterialsList(
  scopeCompanyId: CompanyScopeId = null
): Promise<RawMaterialRow[]> {
  return getRawMaterials(scopeCompanyId)
}

export async function getSuppliersList(
  scopeCompanyId: CompanyScopeId = null
): Promise<SupplierRow[]> {
  return getSuppliers(scopeCompanyId)
}

export async function getCompaniesList(
  scopeCompanyId: CompanyScopeId = null
): Promise<CompanyWithCounts[]> {
  return getCompanies(scopeCompanyId)
}
