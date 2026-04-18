import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import type { NetworkMapNode, NetworkMapArc } from '@/lib/network-map-data'

export const revalidate = 300 // 5 min cache

export async function GET() {
  const db = createServerClient()

  const [
    { data: companies, error: cErr },
    { data: suppliers, error: sErr },
    { data: products, error: pErr },
    { data: supplierLinks, error: slErr },
  ] = await Promise.all([
    db
      .from('company')
      .select('id, name, lat, lng')
      .not('lat', 'is', null)
      .not('lng', 'is', null),
    db
      .from('supplier')
      .select('id, name, lat, lng')
      .not('lat', 'is', null)
      .not('lng', 'is', null),
    db.from('product').select('id, company_id, type'),
    db.from('supplier_product').select('supplier_id, product_id'),
  ])

  if (cErr || sErr || pErr || slErr) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  type GeoRow = {
    id: number
    name: string
    lat: number | null
    lng: number | null
  }
  type ProductRow = { id: number; company_id: number; type: string }
  type SupplierLinkRow = { supplier_id: number; product_id: number }

  const typedCompanies = (companies ?? []) as GeoRow[]
  const typedSuppliers = (suppliers ?? []) as GeoRow[]
  const typedProducts = (products ?? []) as ProductRow[]
  const typedLinks = (supplierLinks ?? []) as SupplierLinkRow[]

  // Build lookup maps
  const companyCoords = new Map(typedCompanies.map((c) => [c.id, c]))
  const supplierCoords = new Map(typedSuppliers.map((s) => [s.id, s]))

  // product_id → company_id (for raw materials)
  const rawMaterialToCompany = new Map<number, number>()
  for (const p of typedProducts) {
    if (p.type === 'raw-material') rawMaterialToCompany.set(p.id, p.company_id)
  }

  // Build unique company→supplier connections
  const connectionSet = new Set<string>()
  const arcs: NetworkMapArc[] = []

  for (const link of typedLinks) {
    const companyId = rawMaterialToCompany.get(link.product_id)
    if (companyId === undefined) continue

    const company = companyCoords.get(companyId)
    const supplier = supplierCoords.get(link.supplier_id)
    if (!company || !supplier) continue
    if (company.lat == null || company.lng == null) continue
    if (supplier.lat == null || supplier.lng == null) continue

    const key = `${companyId}:${link.supplier_id}`
    if (connectionSet.has(key)) continue
    connectionSet.add(key)

    arcs.push({
      id: `arc-${key}`,
      sourcePosition: [supplier.lng, supplier.lat],
      targetPosition: [company.lng, company.lat],
    })
  }

  // Build nodes
  const nodes: NetworkMapNode[] = [
    ...typedCompanies
      .filter((c) => c.lat != null && c.lng != null)
      .map((c) => ({
        id: `company-${c.id}`,
        name: c.name,
        kind: 'customer' as const,
        position: [c.lng!, c.lat!] as [number, number],
      })),
    ...typedSuppliers
      .filter((s) => s.lat != null && s.lng != null)
      .map((s) => ({
        id: `supplier-${s.id}`,
        name: s.name,
        kind: 'supplier' as const,
        position: [s.lng!, s.lat!] as [number, number],
      })),
  ]

  return NextResponse.json({ nodes, arcs })
}
