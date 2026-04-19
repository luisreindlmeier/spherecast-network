import { createServerClient } from '@/lib/supabase-server'
import type { Company, Product, Supplier } from '@/types/database'
import type { CompanyScopeId } from '@/lib/queries/shared'
import { throwIfError } from '@/lib/queries/shared'
import type {
  CompanyWithCounts,
  FinishedGoodRow,
  RawMaterialRow,
  SupplierRow,
} from '@/lib/queries/types'

export async function getFinishedGoods(
  scopeCompanyId: CompanyScopeId = null
): Promise<FinishedGoodRow[]> {
  const db = createServerClient()

  let productQuery = db
    .from('product')
    .select('*, company(name)')
    .eq('type', 'finished-good')
    .order('sku')

  if (scopeCompanyId !== null) {
    productQuery = productQuery.eq('company_id', scopeCompanyId)
  }

  const [
    { data: products, error: productsError },
    { data: boms, error: bomsError },
    { data: components, error: componentsError },
  ] = await Promise.all([
    productQuery,
    db.from('bom').select('*'),
    db.from('bom_component').select('*'),
  ])

  throwIfError(productsError, 'getFinishedGoods.products')
  throwIfError(bomsError, 'getFinishedGoods.boms')
  throwIfError(componentsError, 'getFinishedGoods.components')

  const typedProducts = (products ?? []) as Array<
    Product & { company: Pick<Company, 'name'> | null }
  >

  const typedBoms = (boms ?? []) as Array<{
    id: number
    produced_product_id: number
  }>

  const typedComponents = (components ?? []) as Array<{
    bom_id: number
    consumed_product_id: number
  }>

  const productToBom = new Map<number, number>()
  for (const bom of typedBoms) {
    productToBom.set(bom.produced_product_id, bom.id)
  }

  const bomToCount = new Map<number, number>()
  for (const component of typedComponents) {
    bomToCount.set(
      component.bom_id,
      (bomToCount.get(component.bom_id) ?? 0) + 1
    )
  }

  return typedProducts.map((product) => {
    const bomId = productToBom.get(product.id)
    return {
      id: product.id,
      sku: product.sku,
      company_id: product.company_id,
      companyName: product.company?.name ?? '—',
      ingredientCount: bomId !== undefined ? (bomToCount.get(bomId) ?? 0) : 0,
    }
  })
}

export async function getRawMaterials(
  scopeCompanyId: CompanyScopeId = null
): Promise<RawMaterialRow[]> {
  const db = createServerClient()

  let productQuery = db
    .from('product')
    .select('*, company(name)')
    .eq('type', 'raw-material')
    .order('sku')

  if (scopeCompanyId !== null) {
    productQuery = productQuery.eq('company_id', scopeCompanyId)
  }

  const [
    { data: products, error: productsError },
    { data: supplierLinks, error: supplierLinksError },
    { data: components, error: componentsError },
    { data: boms, error: bomsError },
  ] = await Promise.all([
    productQuery,
    db.from('supplier_product').select('*'),
    db.from('bom_component').select('*'),
    db.from('bom').select('*'),
  ])

  throwIfError(productsError, 'getRawMaterials.products')
  throwIfError(supplierLinksError, 'getRawMaterials.supplierLinks')
  throwIfError(componentsError, 'getRawMaterials.components')
  throwIfError(bomsError, 'getRawMaterials.boms')

  const typedProducts = (products ?? []) as Array<
    Product & { company: Pick<Company, 'name'> | null }
  >

  const typedSupplierLinks = (supplierLinks ?? []) as Array<{
    supplier_id: number
    product_id: number
  }>

  const typedComponents = (components ?? []) as Array<{
    bom_id: number
    consumed_product_id: number
  }>

  const typedBoms = (boms ?? []) as Array<{
    id: number
    produced_product_id: number
  }>

  const supplierCountMap = new Map<number, number>()
  for (const row of typedSupplierLinks) {
    supplierCountMap.set(
      row.product_id,
      (supplierCountMap.get(row.product_id) ?? 0) + 1
    )
  }

  const bomSet = new Set(typedBoms.map((bom) => bom.id))
  const usageMap = new Map<number, Set<number>>()
  for (const component of typedComponents) {
    if (!bomSet.has(component.bom_id)) {
      continue
    }

    if (!usageMap.has(component.consumed_product_id)) {
      usageMap.set(component.consumed_product_id, new Set())
    }

    usageMap.get(component.consumed_product_id)?.add(component.bom_id)
  }

  return typedProducts.map((product) => ({
    id: product.id,
    sku: product.sku,
    company_id: product.company_id,
    companyName: product.company?.name ?? '—',
    supplierCount: supplierCountMap.get(product.id) ?? 0,
    usedInProducts: usageMap.get(product.id)?.size ?? 0,
  }))
}

export async function getSuppliers(
  scopeCompanyId: CompanyScopeId = null
): Promise<SupplierRow[]> {
  const db = createServerClient()

  const [
    { data: suppliers, error: suppliersError },
    { data: links, error: linksError },
    { data: products, error: productsError },
  ] = await Promise.all([
    db.from('supplier').select('*').order('name'),
    db.from('supplier_product').select('*'),
    db.from('product').select('id, company_id, type'),
  ])

  throwIfError(suppliersError, 'getSuppliers.suppliers')
  throwIfError(linksError, 'getSuppliers.links')
  throwIfError(productsError, 'getSuppliers.products')

  const typedSuppliers = (suppliers ?? []) as Supplier[]
  const typedLinks = (links ?? []) as Array<{
    supplier_id: number
    product_id: number
  }>
  const typedProducts = (products ?? []) as Product[]

  const rawMaterialOwnerByProductId = new Map<number, number>()
  for (const product of typedProducts) {
    if (product.type === 'raw-material') {
      rawMaterialOwnerByProductId.set(product.id, product.company_id)
    }
  }

  const supplierLinkCountBySupplierId = new Map<number, number>()
  for (const link of typedLinks) {
    if (scopeCompanyId !== null) {
      const owner = rawMaterialOwnerByProductId.get(link.product_id)
      if (owner !== scopeCompanyId) {
        continue
      }
    }

    supplierLinkCountBySupplierId.set(
      link.supplier_id,
      (supplierLinkCountBySupplierId.get(link.supplier_id) ?? 0) + 1
    )
  }

  let rows = typedSuppliers.map((supplier) => ({
    id: supplier.id,
    name: supplier.name,
    materialCount: supplierLinkCountBySupplierId.get(supplier.id) ?? 0,
  }))

  if (scopeCompanyId !== null) {
    rows = rows.filter((row) => row.materialCount > 0)
  }

  return rows
}

export async function getCompanies(
  scopeCompanyId: CompanyScopeId = null
): Promise<CompanyWithCounts[]> {
  const db = createServerClient()

  const [
    { data: companies, error: companiesError },
    { data: products, error: productsError },
  ] = await Promise.all([
    db.from('company').select('*').order('name'),
    db.from('product').select('*'),
  ])

  throwIfError(companiesError, 'getCompanies.companies')
  throwIfError(productsError, 'getCompanies.products')

  let typedCompanies = (companies ?? []) as Company[]
  if (scopeCompanyId !== null) {
    typedCompanies = typedCompanies.filter((company) => company.id === scopeCompanyId)
  }

  const typedProducts = (products ?? []) as Product[]

  const finishedGoodsCountByCompany = new Map<number, number>()
  const rawMaterialsCountByCompany = new Map<number, number>()

  for (const product of typedProducts) {
    if (scopeCompanyId !== null && product.company_id !== scopeCompanyId) {
      continue
    }

    if (product.type === 'finished-good') {
      finishedGoodsCountByCompany.set(
        product.company_id,
        (finishedGoodsCountByCompany.get(product.company_id) ?? 0) + 1
      )
    } else {
      rawMaterialsCountByCompany.set(
        product.company_id,
        (rawMaterialsCountByCompany.get(product.company_id) ?? 0) + 1
      )
    }
  }

  return typedCompanies.map((company) => ({
    id: company.id,
    name: company.name,
    finishedGoods: finishedGoodsCountByCompany.get(company.id) ?? 0,
    rawMaterials: rawMaterialsCountByCompany.get(company.id) ?? 0,
  }))
}
