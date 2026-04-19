import { createServerClient } from '@/lib/supabase-server'
import {
  globalSearchItemsSchema,
  type GlobalSearchItem,
} from '@/lib/global-search'
import type { Company, Product, Supplier } from '@/types/database'
import type { CompanyScopeId } from '@/lib/queries/shared'
import { throwIfError } from '@/lib/queries/shared'

export async function getGlobalSearchItems(
  scopeCompanyId: CompanyScopeId = null
): Promise<GlobalSearchItem[]> {
  const db = createServerClient()

  const [
    { data: companies, error: companiesError },
    { data: suppliers, error: suppliersError },
    { data: products, error: productsError },
    { data: supplierLinks, error: linksError },
  ] = await Promise.all([
    db.from('company').select('id, name').order('name'),
    db.from('supplier').select('id, name').order('name'),
    db
      .from('product')
      .select('id, sku, type, company_id, company(name)')
      .order('sku'),
    db.from('supplier_product').select('supplier_id, product_id'),
  ])

  throwIfError(companiesError, 'getGlobalSearchItems.companies')
  throwIfError(suppliersError, 'getGlobalSearchItems.suppliers')
  throwIfError(productsError, 'getGlobalSearchItems.products')
  throwIfError(linksError, 'getGlobalSearchItems.supplierLinks')

  const typedProducts = (products ?? []) as Array<
    Product & { company: Pick<Company, 'name'> | null }
  >

  const typedLinks = (supplierLinks ?? []) as Array<{
    supplier_id: number
    product_id: number
  }>

  const rawMaterialIdsForScope = new Set<number>()
  if (scopeCompanyId !== null) {
    for (const product of typedProducts) {
      if (product.type === 'raw-material' && product.company_id === scopeCompanyId) {
        rawMaterialIdsForScope.add(product.id)
      }
    }
  }

  const supplierIdsForScope = new Set<number>()
  if (scopeCompanyId !== null) {
    for (const link of typedLinks) {
      if (rawMaterialIdsForScope.has(link.product_id)) {
        supplierIdsForScope.add(link.supplier_id)
      }
    }
  }

  const items: GlobalSearchItem[] = []

  for (const row of companies ?? []) {
    const company = row as Pick<Company, 'id' | 'name'>
    if (scopeCompanyId !== null && company.id !== scopeCompanyId) {
      continue
    }

    items.push({
      kind: 'company',
      id: company.id,
      label: company.name,
      subtitle: 'Company',
      href: `/companies/${company.id}`,
    })
  }

  for (const row of suppliers ?? []) {
    const supplier = row as Pick<Supplier, 'id' | 'name'>
    if (scopeCompanyId !== null && !supplierIdsForScope.has(supplier.id)) {
      continue
    }

    items.push({
      kind: 'supplier',
      id: supplier.id,
      label: supplier.name,
      subtitle: 'Supplier',
      href: `/suppliers/${supplier.id}`,
    })
  }

  for (const product of typedProducts) {
    if (scopeCompanyId !== null && product.company_id !== scopeCompanyId) {
      continue
    }

    const brand = product.company?.name ?? '—'
    if (product.type === 'finished-good') {
      items.push({
        kind: 'finished-good',
        id: product.id,
        label: product.sku,
        subtitle: `Finished good · ${brand}`,
        href: `/products/${product.id}`,
      })
    } else {
      items.push({
        kind: 'raw-material',
        id: product.id,
        label: product.sku,
        subtitle: `Raw material · ${brand}`,
        href: `/raw-materials/${product.id}`,
      })
    }
  }

  return globalSearchItemsSchema.parse(items)
}
