import { createServerClient } from './supabase-server'
import {
  globalSearchItemsSchema,
  type GlobalSearchItem,
} from '@/lib/global-search'
import type { Company, Product, Supplier } from '@/types/database'

/** When set, list queries only include that brand’s supply-chain slice. */
export type CompanyScopeId = number | null

// ─── Company picker (always full list; not scope-filtered) ───────────────────

export type CompanyPickerRow = { id: number; name: string }

export async function getCompanyPickerList(): Promise<CompanyPickerRow[]> {
  const db = createServerClient()
  const { data, error } = await db
    .from('company')
    .select('id, name')
    .order('name')
  if (error) throw new Error(error.message)
  return (data ?? []) as CompanyPickerRow[]
}

// ─── Cockpit stats ────────────────────────────────────────────────────────────

export async function getCockpitStats(
  scopeCompanyId: CompanyScopeId = null
): Promise<{
  finishedGoods: number
  rawMaterials: number
  suppliers: number
  companies: number
}> {
  const db = createServerClient()

  if (scopeCompanyId === null) {
    const [
      { count: finishedGoods },
      { count: rawMaterials },
      { count: suppliers },
      { count: companies },
    ] = await Promise.all([
      db
        .from('product')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'finished-good'),
      db
        .from('product')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'raw-material'),
      db.from('supplier').select('*', { count: 'exact', head: true }),
      db.from('company').select('*', { count: 'exact', head: true }),
    ])

    return {
      finishedGoods: finishedGoods ?? 0,
      rawMaterials: rawMaterials ?? 0,
      suppliers: suppliers ?? 0,
      companies: companies ?? 0,
    }
  }

  const [
    { count: finishedGoods },
    { count: rawMaterials },
    { data: links, error: lErr },
    { data: products, error: pErr },
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

  if (lErr) throw new Error(lErr.message)
  if (pErr) throw new Error(pErr.message)

  const typedProducts = (products ?? []) as Product[]
  const typedLinks = (links ?? []) as Array<{
    supplier_id: number
    product_id: number
  }>

  const rawMatIds = new Set(
    typedProducts
      .filter(
        (p) => p.type === 'raw-material' && p.company_id === scopeCompanyId
      )
      .map((p) => p.id)
  )

  const supplierIds = new Set<number>()
  for (const row of typedLinks) {
    if (rawMatIds.has(row.product_id)) supplierIds.add(row.supplier_id)
  }

  return {
    finishedGoods: finishedGoods ?? 0,
    rawMaterials: rawMaterials ?? 0,
    suppliers: supplierIds.size,
    companies: 1,
  }
}

// ─── Sidebar nav counts (lightweight) ────────────────────────────────────────

export async function getNavCounts(scopeCompanyId: CompanyScopeId = null) {
  const db = createServerClient()

  if (scopeCompanyId === null) {
    const [{ count: fg }, { count: rm }, { count: sup }] = await Promise.all([
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
      suppliers: sup ?? 0,
    }
  }

  const [
    { count: fg },
    { count: rm },
    { data: links, error: lErr },
    { data: products, error: pErr },
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

  if (lErr) throw new Error(lErr.message)
  if (pErr) throw new Error(pErr.message)

  const typedProducts = (products ?? []) as Product[]
  const typedLinks = (links ?? []) as Array<{
    supplier_id: number
    product_id: number
  }>

  const rawMatIds = new Set(
    typedProducts
      .filter(
        (p) => p.type === 'raw-material' && p.company_id === scopeCompanyId
      )
      .map((p) => p.id)
  )

  const supplierIds = new Set<number>()
  for (const row of typedLinks) {
    if (rawMatIds.has(row.product_id)) supplierIds.add(row.supplier_id)
  }

  return {
    finishedGoods: fg ?? 0,
    rawMaterials: rm ?? 0,
    suppliers: supplierIds.size,
  }
}

// ─── Products (finished-goods) with ingredient count ─────────────────────────

export type FinishedGoodRow = {
  id: number
  sku: string
  company_id: number
  companyName: string
  ingredientCount: number
}

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
    { data: products, error: pErr },
    { data: boms, error: bErr },
    { data: components, error: cErr },
  ] = await Promise.all([
    productQuery,
    db.from('bom').select('*'),
    db.from('bom_component').select('*'),
  ])

  if (pErr) throw new Error(pErr.message)
  if (bErr) throw new Error(bErr.message)
  if (cErr) throw new Error(cErr.message)

  const typedProducts = (products ?? []) as unknown as Array<
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

  // product_id → bom_id
  const productToBom = new Map<number, number>()
  for (const b of typedBoms) productToBom.set(b.produced_product_id, b.id)

  // bom_id → component count
  const bomToCount = new Map<number, number>()
  for (const c of typedComponents) {
    bomToCount.set(c.bom_id, (bomToCount.get(c.bom_id) ?? 0) + 1)
  }

  return typedProducts.map((p) => {
    const bomId = productToBom.get(p.id)
    return {
      id: p.id,
      sku: p.sku,
      company_id: p.company_id,
      companyName: p.company?.name ?? '—',
      ingredientCount: bomId !== undefined ? (bomToCount.get(bomId) ?? 0) : 0,
    }
  })
}

// ─── Raw materials with supplier + product usage count ───────────────────────

export type RawMaterialRow = {
  id: number
  sku: string
  company_id: number
  companyName: string
  supplierCount: number
  usedInProducts: number
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
    { data: products, error: pErr },
    { data: supplierLinks, error: sErr },
    { data: components, error: cErr },
    { data: boms, error: bErr },
  ] = await Promise.all([
    productQuery,
    db.from('supplier_product').select('*'),
    db.from('bom_component').select('*'),
    db.from('bom').select('*'),
  ])

  if (pErr) throw new Error(pErr.message)
  if (sErr) throw new Error(sErr.message)
  if (cErr) throw new Error(cErr.message)
  if (bErr) throw new Error(bErr.message)

  const typedProducts = (products ?? []) as unknown as Array<
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

  // product_id → supplier count
  const supplierCountMap = new Map<number, number>()
  for (const row of typedSupplierLinks) {
    supplierCountMap.set(
      row.product_id,
      (supplierCountMap.get(row.product_id) ?? 0) + 1
    )
  }

  // consumed_product_id → set of bom_ids (= finished good count)
  // Each unique bom_id corresponds to one finished good
  const bomSet = new Set(typedBoms.map((b) => b.id))
  const usageMap = new Map<number, Set<number>>()
  for (const c of typedComponents) {
    if (!bomSet.has(c.bom_id)) continue
    if (!usageMap.has(c.consumed_product_id))
      usageMap.set(c.consumed_product_id, new Set())
    usageMap.get(c.consumed_product_id)!.add(c.bom_id)
  }

  return typedProducts.map((p) => ({
    id: p.id,
    sku: p.sku,
    company_id: p.company_id,
    companyName: p.company?.name ?? '—',
    supplierCount: supplierCountMap.get(p.id) ?? 0,
    usedInProducts: usageMap.get(p.id)?.size ?? 0,
  }))
}

// ─── Suppliers with material count ───────────────────────────────────────────

export type SupplierRow = {
  id: number
  name: string
  /** Distinct raw-material SKUs linked via `supplier_product` (not volumes). */
  materialCount: number
}

export async function getSuppliers(
  scopeCompanyId: CompanyScopeId = null
): Promise<SupplierRow[]> {
  const db = createServerClient()

  const [
    { data: suppliers, error: sErr },
    { data: links, error: lErr },
    { data: products, error: pErr },
  ] = await Promise.all([
    db.from('supplier').select('*').order('name'),
    db.from('supplier_product').select('*'),
    db.from('product').select('id, company_id, type'),
  ])

  if (sErr) throw new Error(sErr.message)
  if (lErr) throw new Error(lErr.message)
  if (pErr) throw new Error(pErr.message)

  const typedSuppliers = (suppliers ?? []) as Supplier[]
  const typedLinks = (links ?? []) as Array<{
    supplier_id: number
    product_id: number
  }>
  const typedProducts = (products ?? []) as Product[]

  const rawMatCompanyByProductId = new Map<number, number>()
  for (const p of typedProducts) {
    if (p.type === 'raw-material')
      rawMatCompanyByProductId.set(p.id, p.company_id)
  }

  const countMap = new Map<number, number>()
  for (const row of typedLinks) {
    if (scopeCompanyId !== null) {
      const owner = rawMatCompanyByProductId.get(row.product_id)
      if (owner !== scopeCompanyId) continue
    }
    countMap.set(row.supplier_id, (countMap.get(row.supplier_id) ?? 0) + 1)
  }

  let list = typedSuppliers.map((s) => ({
    id: s.id,
    name: s.name,
    materialCount: countMap.get(s.id) ?? 0,
  }))

  if (scopeCompanyId !== null) {
    list = list.filter((s) => s.materialCount > 0)
  }

  return list
}

// ─── Companies ────────────────────────────────────────────────────────────────

export type CompanyWithCounts = Company & {
  finishedGoods: number
  rawMaterials: number
}

export async function getCompanies(
  scopeCompanyId: CompanyScopeId = null
): Promise<CompanyWithCounts[]> {
  const db = createServerClient()

  const [{ data: companies, error: cErr }, { data: products, error: pErr }] =
    await Promise.all([
      db.from('company').select('*').order('name'),
      db.from('product').select('*'),
    ])

  if (cErr) throw new Error(cErr.message)
  if (pErr) throw new Error(pErr.message)

  let typedCompanies = (companies ?? []) as Company[]
  if (scopeCompanyId !== null) {
    typedCompanies = typedCompanies.filter((c) => c.id === scopeCompanyId)
  }

  const typedProducts = (products ?? []) as Product[]

  const fgMap = new Map<number, number>()
  const rmMap = new Map<number, number>()
  for (const p of typedProducts) {
    if (scopeCompanyId !== null && p.company_id !== scopeCompanyId) continue
    if (p.type === 'finished-good')
      fgMap.set(p.company_id, (fgMap.get(p.company_id) ?? 0) + 1)
    else rmMap.set(p.company_id, (rmMap.get(p.company_id) ?? 0) + 1)
  }

  return typedCompanies.map((c) => ({
    id: c.id,
    name: c.name,
    finishedGoods: fgMap.get(c.id) ?? 0,
    rawMaterials: rmMap.get(c.id) ?? 0,
  }))
}

// ─── Raw Material detail ──────────────────────────────────────────────────────

export type RawMaterialDetail = {
  id: number
  sku: string
  companyId: number
  companyName: string
  supplierCount: number
  usedInProducts: number
  suppliers: Array<{ id: number; name: string }>
  foundIn: Array<{ productId: number; sku: string; companyName: string }>
}

export async function getRawMaterialDetail(
  id: number
): Promise<RawMaterialDetail | null> {
  const db = createServerClient()

  const [
    { data: product, error: pErr },
    { data: supplierLinks, error: slErr },
    { data: allSuppliers, error: sErr },
    { data: bomComponents, error: bcErr },
    { data: allBoms, error: bErr },
    { data: allProducts, error: apErr },
    { data: allCompanies, error: acErr },
  ] = await Promise.all([
    db.from('product').select('*, company(name)').eq('id', id).single(),
    db.from('supplier_product').select('*').eq('product_id', id),
    db.from('supplier').select('*'),
    db.from('bom_component').select('*').eq('consumed_product_id', id),
    db.from('bom').select('*'),
    db.from('product').select('*'),
    db.from('company').select('*'),
  ])

  if (pErr || !product) return null
  if (slErr) throw new Error(slErr.message)
  if (sErr) throw new Error(sErr.message)
  if (bcErr) throw new Error(bcErr.message)
  if (bErr) throw new Error(bErr.message)
  if (apErr) throw new Error(apErr.message)
  if (acErr) throw new Error(acErr.message)

  const typedProduct = product as unknown as Product & {
    company: Pick<Company, 'name'> | null
  }
  const typedSupplierLinks = (supplierLinks ?? []) as Array<{
    supplier_id: number
    product_id: number
  }>
  const typedSuppliers = (allSuppliers ?? []) as Supplier[]
  const typedBomComponents = (bomComponents ?? []) as Array<{
    bom_id: number
    consumed_product_id: number
  }>
  const typedBoms = (allBoms ?? []) as Array<{
    id: number
    produced_product_id: number
  }>
  const typedProducts = (allProducts ?? []) as Product[]
  const typedCompanies = (allCompanies ?? []) as Company[]

  const supplierMap = new Map(typedSuppliers.map((s) => [s.id, s]))
  const bomMap = new Map(typedBoms.map((b) => [b.id, b.produced_product_id]))
  const productMap = new Map(typedProducts.map((p) => [p.id, p]))
  const companyMap = new Map(typedCompanies.map((c) => [c.id, c]))

  const suppliers = typedSupplierLinks
    .map((sl) => supplierMap.get(sl.supplier_id))
    .filter((s): s is Supplier => s !== undefined)
    .sort((a, b) => a.name.localeCompare(b.name))

  const foundIn = typedBomComponents
    .map((bc) => {
      const producedProductId = bomMap.get(bc.bom_id)
      if (producedProductId === undefined) return null
      const p = productMap.get(producedProductId)
      if (!p) return null
      const co = companyMap.get(p.company_id)
      return { productId: p.id, sku: p.sku, companyName: co?.name ?? '—' }
    })
    .filter(
      (x): x is { productId: number; sku: string; companyName: string } =>
        x !== null
    )
    .sort((a, b) => a.sku.localeCompare(b.sku))

  return {
    id: typedProduct.id,
    sku: typedProduct.sku,
    companyId: typedProduct.company_id,
    companyName: typedProduct.company?.name ?? '—',
    supplierCount: suppliers.length,
    usedInProducts: foundIn.length,
    suppliers,
    foundIn,
  }
}

// ─── Supplier detail ──────────────────────────────────────────────────────────

export type SupplierDetail = {
  id: number
  name: string
  materialCount: number
  companiesReached: number
  materials: Array<{
    productId: number
    sku: string
    companyName: string
    usedInProducts: number
  }>
  companies: Array<{ id: number; name: string; productCount: number }>
}

export async function getSupplierDetail(
  id: number
): Promise<SupplierDetail | null> {
  const db = createServerClient()

  const [
    { data: supplier, error: sErr },
    { data: supplierLinks, error: slErr },
    { data: allProducts, error: pErr },
    { data: allCompanies, error: cErr },
    { data: allBomComponents, error: bcErr },
    { data: allBoms, error: bErr },
  ] = await Promise.all([
    db.from('supplier').select('*').eq('id', id).single(),
    db.from('supplier_product').select('*').eq('supplier_id', id),
    db.from('product').select('*, company(name)'),
    db.from('company').select('*'),
    db.from('bom_component').select('*'),
    db.from('bom').select('*'),
  ])

  if (sErr || !supplier) return null
  if (slErr) throw new Error(slErr.message)
  if (pErr) throw new Error(pErr.message)
  if (cErr) throw new Error(cErr.message)
  if (bcErr) throw new Error(bcErr.message)
  if (bErr) throw new Error(bErr.message)

  const typedSupplier = supplier as Supplier
  const typedLinks = (supplierLinks ?? []) as Array<{
    supplier_id: number
    product_id: number
  }>
  const typedProducts = (allProducts ?? []) as unknown as Array<
    Product & { company: Pick<Company, 'name'> | null }
  >
  const typedCompanies = (allCompanies ?? []) as Company[]
  const typedBomComponents = (allBomComponents ?? []) as Array<{
    bom_id: number
    consumed_product_id: number
  }>
  const typedBoms = (allBoms ?? []) as Array<{
    id: number
    produced_product_id: number
  }>

  const productMap = new Map(typedProducts.map((p) => [p.id, p]))
  const companyMap = new Map(typedCompanies.map((c) => [c.id, c]))
  const bomMap = new Map(typedBoms.map((b) => [b.id, b.produced_product_id]))

  // consumed_product_id → number of products it appears in
  const usageMap = new Map<number, Set<number>>()
  for (const bc of typedBomComponents) {
    const producedId = bomMap.get(bc.bom_id)
    if (producedId === undefined) continue
    if (!usageMap.has(bc.consumed_product_id))
      usageMap.set(bc.consumed_product_id, new Set())
    usageMap.get(bc.consumed_product_id)!.add(producedId)
  }

  const suppliedProductIds = new Set(typedLinks.map((l) => l.product_id))

  const materials = typedLinks
    .map((sl) => {
      const p = productMap.get(sl.product_id)
      if (!p) return null
      return {
        productId: p.id,
        sku: p.sku,
        companyName: p.company?.name ?? '—',
        usedInProducts: usageMap.get(p.id)?.size ?? 0,
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.sku.localeCompare(b.sku))

  // Which companies' products use the raw materials this supplier provides?
  const reachedCompanyIds = new Set<number>()
  for (const productId of suppliedProductIds) {
    const usedInSet = usageMap.get(productId)
    if (!usedInSet) continue
    for (const producedId of usedInSet) {
      const p = productMap.get(producedId)
      if (p) reachedCompanyIds.add(p.company_id)
    }
  }

  const companies = [...reachedCompanyIds]
    .map((cId) => {
      const co = companyMap.get(cId)
      if (!co) return null
      const productCount = [...suppliedProductIds].filter((pid) => {
        const usedIn = usageMap.get(pid)
        if (!usedIn) return false
        for (const producedId of usedIn) {
          const p = productMap.get(producedId)
          if (p?.company_id === cId) return true
        }
        return false
      }).length
      return { id: co.id, name: co.name, productCount }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.productCount - a.productCount)

  return {
    id: typedSupplier.id,
    name: typedSupplier.name,
    materialCount: materials.length,
    companiesReached: companies.length,
    materials,
    companies,
  }
}

// ─── Company detail ───────────────────────────────────────────────────────────

export type CompanyDetail = {
  id: number
  name: string
  finishedGoods: Array<{ id: number; sku: string; ingredientCount: number }>
  rawMaterials: Array<{
    id: number
    sku: string
    supplierCount: number
    usedInProducts: number
  }>
}

export async function getCompanyDetail(
  id: number
): Promise<CompanyDetail | null> {
  const db = createServerClient()

  const [
    { data: company, error: cErr },
    { data: products, error: pErr },
    { data: allBoms, error: bErr },
    { data: allBomComponents, error: bcErr },
    { data: allSupplierLinks, error: slErr },
  ] = await Promise.all([
    db.from('company').select('*').eq('id', id).single(),
    db.from('product').select('*').eq('company_id', id),
    db.from('bom').select('*'),
    db.from('bom_component').select('*'),
    db.from('supplier_product').select('*'),
  ])

  if (cErr || !company) return null
  if (pErr) throw new Error(pErr.message)
  if (bErr) throw new Error(bErr.message)
  if (bcErr) throw new Error(bcErr.message)
  if (slErr) throw new Error(slErr.message)

  const typedCompany = company as Company
  const typedProducts = (products ?? []) as Product[]
  const typedBoms = (allBoms ?? []) as Array<{
    id: number
    produced_product_id: number
  }>
  const typedBomComponents = (allBomComponents ?? []) as Array<{
    bom_id: number
    consumed_product_id: number
  }>
  const typedSupplierLinks = (allSupplierLinks ?? []) as Array<{
    supplier_id: number
    product_id: number
  }>

  const productToBom = new Map(
    typedBoms.map((b) => [b.produced_product_id, b.id])
  )
  const bomToCount = new Map<number, number>()
  for (const bc of typedBomComponents) {
    bomToCount.set(bc.bom_id, (bomToCount.get(bc.bom_id) ?? 0) + 1)
  }

  const supplierCountMap = new Map<number, number>()
  for (const sl of typedSupplierLinks) {
    supplierCountMap.set(
      sl.product_id,
      (supplierCountMap.get(sl.product_id) ?? 0) + 1
    )
  }

  // usage map: consumed_product_id → set of bom_ids
  const usageMap = new Map<number, Set<number>>()
  for (const bc of typedBomComponents) {
    if (!usageMap.has(bc.consumed_product_id))
      usageMap.set(bc.consumed_product_id, new Set())
    usageMap.get(bc.consumed_product_id)!.add(bc.bom_id)
  }

  const finishedGoods = typedProducts
    .filter((p) => p.type === 'finished-good')
    .map((p) => {
      const bomId = productToBom.get(p.id)
      return {
        id: p.id,
        sku: p.sku,
        ingredientCount: bomId !== undefined ? (bomToCount.get(bomId) ?? 0) : 0,
      }
    })
    .sort((a, b) => a.sku.localeCompare(b.sku))

  const rawMaterials = typedProducts
    .filter((p) => p.type === 'raw-material')
    .map((p) => ({
      id: p.id,
      sku: p.sku,
      supplierCount: supplierCountMap.get(p.id) ?? 0,
      usedInProducts: usageMap.get(p.id)?.size ?? 0,
    }))
    .sort((a, b) => a.sku.localeCompare(b.sku))

  return {
    id: typedCompany.id,
    name: typedCompany.name,
    finishedGoods,
    rawMaterials,
  }
}

// ─── Global header search (companies, suppliers, products) ─────────────────────

export async function getGlobalSearchItems(
  scopeCompanyId: CompanyScopeId = null
): Promise<GlobalSearchItem[]> {
  const db = createServerClient()

  const [
    { data: companies, error: cErr },
    { data: suppliers, error: sErr },
    { data: products, error: pErr },
    { data: supplierLinks, error: slErr },
  ] = await Promise.all([
    db.from('company').select('id, name').order('name'),
    db.from('supplier').select('id, name').order('name'),
    db
      .from('product')
      .select('id, sku, type, company_id, company(name)')
      .order('sku'),
    db.from('supplier_product').select('supplier_id, product_id'),
  ])

  if (cErr) throw new Error(cErr.message)
  if (sErr) throw new Error(sErr.message)
  if (pErr) throw new Error(pErr.message)
  if (slErr) throw new Error(slErr.message)

  const typedProductsFull = (products ?? []) as Array<
    Product & { company: Pick<Company, 'name'> | null }
  >
  const typedLinks = (supplierLinks ?? []) as Array<{
    supplier_id: number
    product_id: number
  }>

  const rawMatIdsForScope = new Set<number>()
  if (scopeCompanyId !== null) {
    for (const p of typedProductsFull) {
      if (p.type === 'raw-material' && p.company_id === scopeCompanyId)
        rawMatIdsForScope.add(p.id)
    }
  }

  const supplierIdsForScope = new Set<number>()
  if (scopeCompanyId !== null) {
    for (const l of typedLinks) {
      if (rawMatIdsForScope.has(l.product_id))
        supplierIdsForScope.add(l.supplier_id)
    }
  }

  const items: GlobalSearchItem[] = []

  for (const row of companies ?? []) {
    const c = row as Pick<Company, 'id' | 'name'>
    if (scopeCompanyId !== null && c.id !== scopeCompanyId) continue
    items.push({
      kind: 'company',
      id: c.id,
      label: c.name,
      subtitle: 'Company',
      href: `/companies/${c.id}`,
    })
  }

  for (const row of suppliers ?? []) {
    const s = row as Pick<Supplier, 'id' | 'name'>
    if (scopeCompanyId !== null && !supplierIdsForScope.has(s.id)) continue
    items.push({
      kind: 'supplier',
      id: s.id,
      label: s.name,
      subtitle: 'Supplier',
      href: `/suppliers/${s.id}`,
    })
  }

  for (const row of typedProductsFull) {
    const p = row
    if (scopeCompanyId !== null && p.company_id !== scopeCompanyId) continue
    const brand = p.company?.name ?? '—'
    if (p.type === 'finished-good') {
      items.push({
        kind: 'finished-good',
        id: p.id,
        label: p.sku,
        subtitle: `Finished good · ${brand}`,
        href: `/products/${p.id}`,
      })
    } else {
      items.push({
        kind: 'raw-material',
        id: p.id,
        label: p.sku,
        subtitle: `Raw material · ${brand}`,
        href: `/raw-materials/${p.id}`,
      })
    }
  }

  return globalSearchItemsSchema.parse(items)
}

// ─── Finished good (product) detail ─────────────────────────────────────────

export type FinishedGoodIngredientRow = {
  id: number
  sku: string
  companyName: string
  type: 'raw-material' | 'finished-good'
}

export type FinishedGoodDetail = {
  id: number
  sku: string
  companyId: number
  companyName: string
  ingredientCount: number
  ingredients: FinishedGoodIngredientRow[]
}

export async function getFinishedGoodDetail(
  id: number
): Promise<FinishedGoodDetail | null> {
  const db = createServerClient()

  const { data: product, error: pErr } = await db
    .from('product')
    .select('*, company(name)')
    .eq('id', id)
    .single()

  if (pErr || !product) return null

  const typed = product as unknown as Product & {
    company: Pick<Company, 'name'> | null
  }
  if (typed.type !== 'finished-good') return null

  const { data: bom, error: bErr } = await db
    .from('bom')
    .select('id')
    .eq('produced_product_id', id)
    .maybeSingle()

  if (bErr) throw new Error(bErr.message)

  if (!bom) {
    return {
      id: typed.id,
      sku: typed.sku,
      companyId: typed.company_id,
      companyName: typed.company?.name ?? '—',
      ingredientCount: 0,
      ingredients: [],
    }
  }

  const bomId = (bom as { id: number }).id

  const { data: components, error: bcErr } = await db
    .from('bom_component')
    .select('consumed_product_id')
    .eq('bom_id', bomId)

  if (bcErr) throw new Error(bcErr.message)

  const consumedIds = [
    ...new Set(
      (components ?? []).map(
        (c) => (c as { consumed_product_id: number }).consumed_product_id
      )
    ),
  ]

  if (consumedIds.length === 0) {
    return {
      id: typed.id,
      sku: typed.sku,
      companyId: typed.company_id,
      companyName: typed.company?.name ?? '—',
      ingredientCount: 0,
      ingredients: [],
    }
  }

  const { data: consumedRows, error: consErr } = await db
    .from('product')
    .select('id, sku, type, company(name)')
    .in('id', consumedIds)

  if (consErr) throw new Error(consErr.message)

  const ingredients = (consumedRows ?? [])
    .map((row) => {
      const r = row as Product & { company: Pick<Company, 'name'> | null }
      return {
        id: r.id,
        sku: r.sku,
        companyName: r.company?.name ?? '—',
        type: r.type,
      }
    })
    .sort((a, b) => a.sku.localeCompare(b.sku))

  return {
    id: typed.id,
    sku: typed.sku,
    companyId: typed.company_id,
    companyName: typed.company?.name ?? '—',
    ingredientCount: ingredients.length,
    ingredients,
  }
}
