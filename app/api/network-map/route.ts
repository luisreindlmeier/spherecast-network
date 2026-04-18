import { NextResponse } from 'next/server'
import { resolveCompanyScopeFilter } from '@/lib/company-scope-server'
import { createServerClient } from '@/lib/supabase-server'
import type { NetworkMapNode, NetworkMapArc } from '@/lib/network-map-data'

export const revalidate = 300 // 5 min cache

export async function GET() {
  const scopeCompanyId = await resolveCompanyScopeFilter()
  const db = createServerClient()

  const [
    { data: companies, error: cErr },
    { data: facilities, error: fErr },
    { data: supplierFallbacks, error: sfErr },
    { data: products, error: pErr },
    { data: supplierLinks, error: slErr },
  ] = await Promise.all([
    db
      .from('company')
      .select('id, name, lat, lng')
      .not('lat', 'is', null)
      .not('lng', 'is', null),
    db
      .from('supplier_facility')
      .select('id, supplier_id, facility_name, city, state, lat, lng')
      .not('lat', 'is', null)
      .not('lng', 'is', null),
    // Fallback: supplier.lat/lng for suppliers with no facility rows yet
    db
      .from('supplier')
      .select('id, name, lat, lng')
      .not('lat', 'is', null)
      .not('lng', 'is', null),
    db.from('product').select('id, company_id, type'),
    db.from('supplier_product').select('supplier_id, product_id'),
  ])

  if (cErr || fErr || sfErr || pErr || slErr) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  type GeoCompany = { id: number; name: string; lat: number; lng: number }
  type GeoFacility = {
    id: number
    supplier_id: number
    facility_name: string | null
    city: string | null
    state: string | null
    lat: number
    lng: number
  }
  type GeoSupplier = { id: number; name: string; lat: number; lng: number }
  type ProductRow = { id: number; company_id: number; type: string }
  type SupplierLinkRow = { supplier_id: number; product_id: number }

  const typedCompanies = (companies ?? []) as GeoCompany[]
  const typedFacilities = (facilities ?? []) as GeoFacility[]
  const typedFallbacks = (supplierFallbacks ?? []) as GeoSupplier[]
  const typedProducts = (products ?? []) as ProductRow[]
  const typedLinks = (supplierLinks ?? []) as SupplierLinkRow[]

  // supplier_id → [facilities with coords]
  const facilityMap = new Map<number, GeoFacility[]>()
  for (const f of typedFacilities) {
    const arr = facilityMap.get(f.supplier_id) ?? []
    arr.push(f)
    facilityMap.set(f.supplier_id, arr)
  }

  // HQ fallback lookup
  const fallbackMap = new Map(typedFallbacks.map((s) => [s.id, s]))

  // product_id → company_id (raw materials only)
  const rawMaterialToCompany = new Map<number, number>()
  for (const p of typedProducts) {
    if (p.type === 'raw-material') rawMaterialToCompany.set(p.id, p.company_id)
  }

  // company lookup
  const companyMap = new Map(typedCompanies.map((c) => [c.id, c]))

  // Pick the facility geographically closest to the target company.
  // This guarantees every arc originates exactly at a visible node.
  function closestFacility(
    facs: GeoFacility[],
    company: GeoCompany
  ): GeoFacility {
    let best = facs[0]
    let bestDist = Infinity
    for (const f of facs) {
      const d = (f.lat - company.lat) ** 2 + (f.lng - company.lng) ** 2
      if (d < bestDist) {
        bestDist = d
        best = f
      }
    }
    return best
  }

  // Build arcs — one per unique company→supplier pair.
  // Source = closest facility (or HQ fallback) so the arc always starts at a node.
  const connectionSet = new Set<string>()
  const arcs: NetworkMapArc[] = []
  // Track which facility IDs and fallback supplier IDs are actually used
  const usedFacilityIds = new Set<number>()
  const usedFallbackSupplierIds = new Set<number>()

  for (const link of typedLinks) {
    const companyId = rawMaterialToCompany.get(link.product_id)
    if (companyId === undefined) continue
    if (scopeCompanyId !== null && companyId !== scopeCompanyId) continue

    const company = companyMap.get(companyId)
    if (!company) continue

    const key = `${companyId}:${link.supplier_id}`
    if (connectionSet.has(key)) continue
    connectionSet.add(key)

    const facs = facilityMap.get(link.supplier_id)
    if (facs && facs.length > 0) {
      const f = closestFacility(facs, company)
      usedFacilityIds.add(f.id)
      arcs.push({
        id: `arc-${key}`,
        sourcePosition: [f.lng, f.lat],
        targetPosition: [company.lng, company.lat],
      })
    } else {
      const hq = fallbackMap.get(link.supplier_id)
      if (!hq) continue
      usedFallbackSupplierIds.add(link.supplier_id)
      arcs.push({
        id: `arc-${key}`,
        sourcePosition: [hq.lng, hq.lat],
        targetPosition: [company.lng, company.lat],
      })
    }
  }

  // Company nodes (cyan) — only those targeted by at least one arc
  const companiesInArcs = new Set(
    arcs.map((a) => Number(a.id.replace('arc-', '').split(':')[0]))
  )

  const companyNodes = typedCompanies
    .filter((c) => {
      if (scopeCompanyId !== null) return c.id === scopeCompanyId
      return companiesInArcs.has(c.id)
    })
    .map(
      (c): NetworkMapNode => ({
        id: `company-${c.id}`,
        name: c.name,
        kind: 'customer',
        position: [c.lng, c.lat],
      })
    )

  // Facility nodes (purple) — only those used as an arc source
  const addedFacilitySuppliers = new Set<number>()
  const facilityNodes: NetworkMapNode[] = []

  for (const [sid, facs] of facilityMap) {
    // In scoped mode: only include facilities used in arcs
    if (scopeCompanyId !== null) {
      const usedFacs = facs.filter((f) => usedFacilityIds.has(f.id))
      if (usedFacs.length === 0) continue
      for (const f of usedFacs) {
        const label =
          f.facility_name?.trim() ||
          fallbackMap.get(sid)?.name ||
          `Supplier ${sid}`
        const sublabel = [f.city, f.state].filter(Boolean).join(', ')
        facilityNodes.push({
          id: `facility-${f.id}`,
          name: sublabel ? `${label} (${sublabel})` : label,
          kind: 'supplier',
          position: [f.lng, f.lat],
        })
      }
    } else {
      // Unscoped: show only facilities that are arc sources
      const usedFacs = facs.filter((f) => usedFacilityIds.has(f.id))
      for (const f of usedFacs) {
        const label =
          f.facility_name?.trim() ||
          fallbackMap.get(sid)?.name ||
          `Supplier ${sid}`
        const sublabel = [f.city, f.state].filter(Boolean).join(', ')
        facilityNodes.push({
          id: `facility-${f.id}`,
          name: sublabel ? `${label} (${sublabel})` : label,
          kind: 'supplier',
          position: [f.lng, f.lat],
        })
      }
    }
    addedFacilitySuppliers.add(sid)
  }

  // HQ fallback nodes — only for suppliers that appear as arc sources
  const fallbackNodes = typedFallbacks
    .filter(
      (s) =>
        !addedFacilitySuppliers.has(s.id) && usedFallbackSupplierIds.has(s.id)
    )
    .map(
      (s): NetworkMapNode => ({
        id: `supplier-${s.id}`,
        name: s.name,
        kind: 'supplier',
        position: [s.lng, s.lat],
      })
    )

  const nodes: NetworkMapNode[] = [
    ...companyNodes,
    ...facilityNodes,
    ...fallbackNodes,
  ]

  return NextResponse.json({ nodes, arcs })
}
