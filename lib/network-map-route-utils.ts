import type { NetworkMapNode } from '@/lib/network-map-data'
import type {
  GeoCompanyRow,
  GeoFacilityRow,
  GeoSupplierRow,
  ProductCompanyTypeRow,
  SupplierProductLinkRow,
} from '@/types/network-map-api'

export type GeoCompany = GeoCompanyRow
export type GeoFacility = GeoFacilityRow
export type GeoSupplier = GeoSupplierRow
export type ProductRow = ProductCompanyTypeRow
export type SupplierLinkRow = SupplierProductLinkRow

export function buildFacilityMap(
  facilities: GeoFacility[]
): Map<number, GeoFacility[]> {
  const facilityMap = new Map<number, GeoFacility[]>()

  for (const facility of facilities) {
    const current = facilityMap.get(facility.supplier_id) ?? []
    current.push(facility)
    facilityMap.set(facility.supplier_id, current)
  }

  return facilityMap
}

export function findClosestFacility(
  facilities: GeoFacility[],
  company: GeoCompany
): GeoFacility {
  let best = facilities[0]
  let bestDistance = Infinity

  for (const facility of facilities) {
    const distance =
      (facility.lat - company.lat) ** 2 + (facility.lng - company.lng) ** 2
    if (distance < bestDistance) {
      bestDistance = distance
      best = facility
    }
  }

  return best
}

function formatFacilityLabel(
  facility: GeoFacility,
  supplierId: number,
  fallbackSuppliers: Map<number, GeoSupplier>
): string {
  const baseLabel =
    facility.facility_name?.trim() ||
    fallbackSuppliers.get(supplierId)?.name ||
    `Supplier ${supplierId}`

  const location = [facility.city, facility.state].filter(Boolean).join(', ')
  return location ? `${baseLabel} (${location})` : baseLabel
}

export function buildFacilityNodes(
  facilityMap: Map<number, GeoFacility[]>,
  usedFacilityIds: Set<number>,
  fallbackSuppliers: Map<number, GeoSupplier>
): { nodes: NetworkMapNode[]; supplierIdsWithFacilities: Set<number> } {
  const supplierIdsWithFacilities = new Set<number>()
  const nodes: NetworkMapNode[] = []

  for (const [supplierId, facilities] of facilityMap) {
    const usedFacilities = facilities.filter((facility) =>
      usedFacilityIds.has(facility.id)
    )

    for (const facility of usedFacilities) {
      nodes.push({
        id: `facility-${facility.id}`,
        name: formatFacilityLabel(facility, supplierId, fallbackSuppliers),
        kind: 'supplier',
        position: [facility.lng, facility.lat],
        refId: supplierId,
      })
    }

    supplierIdsWithFacilities.add(supplierId)
  }

  return { nodes, supplierIdsWithFacilities }
}
