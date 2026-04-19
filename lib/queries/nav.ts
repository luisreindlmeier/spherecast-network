import { createServerClient } from '@/lib/supabase-server'
import type { CompanyScopeId } from '@/lib/queries/shared'
import {
  countScopedSuppliers,
  throwIfError,
  type ProductCompanyTypeRow,
  type SupplierProductLinkRow,
} from '@/lib/queries/shared'
import type { CompanyPickerRow } from '@/lib/queries/types'

type NavCounts = {
  finishedGoods: number
  rawMaterials: number
  suppliers: number
}

async function getUnscopedNavCounts(): Promise<NavCounts> {
  const db = createServerClient()
  const [{ count: fg }, { count: rm }, { count: suppliers }] =
    await Promise.all([
      db
        .from('product')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'finished-good'),
      db
        .from('product')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'raw-material'),
      db.from('supplier').select('*', { count: 'exact', head: true }),
    ])

  return {
    finishedGoods: fg ?? 0,
    rawMaterials: rm ?? 0,
    suppliers: suppliers ?? 0,
  }
}

async function getScopedNavCounts(scopeCompanyId: number): Promise<NavCounts> {
  const db = createServerClient()

  const [
    { count: fg },
    { count: rm },
    { data: links, error: linksError },
    { data: products, error: productsError },
  ] = await Promise.all([
    db
      .from('product')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'finished-good')
      .eq('company_id', scopeCompanyId),
    db
      .from('product')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'raw-material')
      .eq('company_id', scopeCompanyId),
    db.from('supplier_product').select('supplier_id, product_id'),
    db.from('product').select('id, company_id, type'),
  ])

  throwIfError(linksError, 'getScopedNavCounts.links')
  throwIfError(productsError, 'getScopedNavCounts.products')

  return {
    finishedGoods: fg ?? 0,
    rawMaterials: rm ?? 0,
    suppliers: countScopedSuppliers(
      (products ?? []) as ProductCompanyTypeRow[],
      (links ?? []) as SupplierProductLinkRow[],
      scopeCompanyId
    ),
  }
}

export async function getCompanyPickerList(): Promise<CompanyPickerRow[]> {
  const db = createServerClient()
  const { data, error } = await db
    .from('company')
    .select('id, name')
    .order('name')

  throwIfError(error, 'getCompanyPickerList')

  return (data ?? []) as CompanyPickerRow[]
}

export async function getCockpitStats(
  scopeCompanyId: CompanyScopeId = null
): Promise<{
  finishedGoods: number
  rawMaterials: number
  suppliers: number
  companies: number
}> {
  if (scopeCompanyId === null) {
    const db = createServerClient()
    const [navCounts, { count: companies }] = await Promise.all([
      getUnscopedNavCounts(),
      db.from('company').select('*', { count: 'exact', head: true }),
    ])

    return {
      ...navCounts,
      companies: companies ?? 0,
    }
  }

  const navCounts = await getScopedNavCounts(scopeCompanyId)

  return {
    ...navCounts,
    companies: 1,
  }
}

export async function getNavCounts(scopeCompanyId: CompanyScopeId = null) {
  if (scopeCompanyId === null) {
    return getUnscopedNavCounts()
  }

  return getScopedNavCounts(scopeCompanyId)
}
