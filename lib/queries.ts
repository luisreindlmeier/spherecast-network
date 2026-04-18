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

// ─── Products (finished-goods) ────────────────────────────────────────────────

export type ProductWithCompany = Product & {
  company: Pick<Company, 'name'> | null
}

export async function getFinishedGoods(): Promise<ProductWithCompany[]> {
  const db = createServerClient()

  const { data, error } = await db
    .from('product')
    .select('*, company(name)')
    .eq('type', 'finished-good')
    .order('sku')

  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as ProductWithCompany[]
}

// ─── Raw materials ────────────────────────────────────────────────────────────

export type RawMaterialWithSuppliers = Product & {
  company: Pick<Company, 'name'> | null
  supplierCount: number
}

export async function getRawMaterials(): Promise<RawMaterialWithSuppliers[]> {
  const db = createServerClient()

  const { data: products, error: pErr } = await db
    .from('product')
    .select('*, company(name)')
    .eq('type', 'raw-material')
    .order('sku')

  if (pErr) throw new Error(pErr.message)

  const { data: supplierLinks, error: sErr } = await db
    .from('supplier_product')
    .select('*')

  if (sErr) throw new Error(sErr.message)

  const typedProducts = (products ?? []) as unknown as ProductWithCompany[]
  const typedLinks = (supplierLinks ?? []) as Array<{
    supplier_id: number
    product_id: number
  }>

  const countMap = new Map<number, number>()
  for (const row of typedLinks) {
    countMap.set(row.product_id, (countMap.get(row.product_id) ?? 0) + 1)
  }

  return typedProducts.map((p) => ({
    ...p,
    supplierCount: countMap.get(p.id) ?? 0,
  }))
}

// ─── Suppliers ────────────────────────────────────────────────────────────────

export type SupplierWithProductCount = Supplier & { productCount: number }

export async function getSuppliers(): Promise<SupplierWithProductCount[]> {
  const db = createServerClient()

  const { data: suppliers, error: sErr } = await db
    .from('supplier')
    .select('*')
    .order('name')

  if (sErr) throw new Error(sErr.message)

  const { data: links, error: lErr } = await db
    .from('supplier_product')
    .select('*')

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
    ...s,
    productCount: countMap.get(s.id) ?? 0,
  }))
}

// ─── Companies ────────────────────────────────────────────────────────────────

export type CompanyWithCounts = Company & {
  finishedGoods: number
  rawMaterials: number
}

export async function getCompanies(): Promise<CompanyWithCounts[]> {
  const db = createServerClient()

  const { data: companies, error: cErr } = await db
    .from('company')
    .select('*')
    .order('name')

  if (cErr) throw new Error(cErr.message)

  const { data: products, error: pErr } = await db.from('product').select('*')

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
    ...c,
    finishedGoods: fgMap.get(c.id) ?? 0,
    rawMaterials: rmMap.get(c.id) ?? 0,
  }))
}
