import { NextResponse } from 'next/server'
import { resolveCompanyScopeFilter } from '@/lib/company-scope-server'
import { createServerClient } from '@/lib/supabase-server'
import { dbErrorResponse } from '@/lib/api-errors'
import type { NetworkMapNode, NetworkMapArc } from '@/lib/network-map-data'
import {
  buildFacilityMap,
  buildFacilityNodes,
  findClosestFacility,
  type GeoCompany,
  type GeoFacility,
  type GeoSupplier,
  type ProductRow,
  type SupplierLinkRow,
} from '@/lib/network-map-route-utils'

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
    return dbErrorResponse('network-map', cErr, fErr, sfErr, pErr, slErr)
  }

  const typedCompanies = (companies ?? []) as GeoCompany[]
  const typedFacilities = (facilities ?? []) as GeoFacility[]
  const typedFallbacks = (supplierFallbacks ?? []) as GeoSupplier[]
  const typedProducts = (products ?? []) as ProductRow[]
  const typedLinks = (supplierLinks ?? []) as SupplierLinkRow[]

  const facilityMap = buildFacilityMap(typedFacilities)

  // HQ fallback lookup
  const fallbackMap = new Map(typedFallbacks.map((s) => [s.id, s]))

  // product_id → company_id (raw materials only)
  const rawMaterialToCompany = new Map<number, number>()
  for (const p of typedProducts) {
    if (p.type === 'raw-material') rawMaterialToCompany.set(p.id, p.company_id)
  }

  // company lookup
  const companyMap = new Map(typedCompanies.map((c) => [c.id, c]))

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
      const f = findClosestFacility(facs, company)
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

  const { nodes: facilityNodes, supplierIdsWithFacilities } =
    buildFacilityNodes(facilityMap, usedFacilityIds, fallbackMap)

  // HQ fallback nodes — only for suppliers that appear as arc sources
  const fallbackNodes = typedFallbacks
    .filter(
      (s) =>
        !supplierIdsWithFacilities.has(s.id) && usedFallbackSupplierIds.has(s.id)
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
