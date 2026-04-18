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
