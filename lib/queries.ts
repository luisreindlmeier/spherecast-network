import { createServerClient } from './supabase-server'
import type { Company, Product, Supplier } from '@/types/database'

// ─── Cockpit stats ────────────────────────────────────────────────────────────

export async function getCockpitStats() {
  const db = createServerClient()

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

// ─── Sidebar nav counts (lightweight) ────────────────────────────────────────

export async function getNavCounts() {
  const db = createServerClient()
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
  return { finishedGoods: fg ?? 0, rawMaterials: rm ?? 0, suppliers: sup ?? 0 }
}

// ─── Products (finished-goods) with ingredient count ─────────────────────────

export type FinishedGoodRow = {
  id: number
  sku: string
  company_id: number
  companyName: string
  ingredientCount: number
}

export async function getFinishedGoods(): Promise<FinishedGoodRow[]> {
  const db = createServerClient()

  const [
    { data: products, error: pErr },
    { data: boms, error: bErr },
    { data: components, error: cErr },
  ] = await Promise.all([
    db
      .from('product')
      .select('*, company(name)')
      .eq('type', 'finished-good')
      .order('sku'),
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

export async function getRawMaterials(): Promise<RawMaterialRow[]> {
  const db = createServerClient()

  const [
    { data: products, error: pErr },
    { data: supplierLinks, error: sErr },
    { data: components, error: cErr },
    { data: boms, error: bErr },
  ] = await Promise.all([
    db
      .from('product')
      .select('*, company(name)')
      .eq('type', 'raw-material')
      .order('sku'),
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
  materialCount: number
}

export async function getSuppliers(): Promise<SupplierRow[]> {
  const db = createServerClient()

  const [{ data: suppliers, error: sErr }, { data: links, error: lErr }] =
    await Promise.all([
      db.from('supplier').select('*').order('name'),
      db.from('supplier_product').select('*'),
    ])

  if (sErr) throw new Error(sErr.message)
  if (lErr) throw new Error(lErr.message)

  const typedSuppliers = (suppliers ?? []) as Supplier[]
  const typedLinks = (links ?? []) as Array<{
    supplier_id: number
    product_id: number
  }>

  const countMap = new Map<number, number>()
  for (const row of typedLinks) {
    countMap.set(row.supplier_id, (countMap.get(row.supplier_id) ?? 0) + 1)
  }

  return typedSuppliers.map((s) => ({
    id: s.id,
    name: s.name,
    materialCount: countMap.get(s.id) ?? 0,
  }))
}

// ─── Companies ────────────────────────────────────────────────────────────────

export type CompanyWithCounts = Company & {
  finishedGoods: number
  rawMaterials: number
}

export async function getCompanies(): Promise<CompanyWithCounts[]> {
  const db = createServerClient()

  const [{ data: companies, error: cErr }, { data: products, error: pErr }] =
    await Promise.all([
      db.from('company').select('*').order('name'),
      db.from('product').select('*'),
    ])

  if (cErr) throw new Error(cErr.message)
  if (pErr) throw new Error(pErr.message)

  const typedCompanies = (companies ?? []) as Company[]
  const typedProducts = (products ?? []) as Product[]

  const fgMap = new Map<number, number>()
  const rmMap = new Map<number, number>()
  for (const p of typedProducts) {
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
