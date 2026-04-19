export type GeoCompanyRow = {
  id: number
  name: string
  lat: number
  lng: number
}

export type GeoFacilityRow = {
  id: number
  supplier_id: number
  facility_name: string | null
  city: string | null
  state: string | null
  lat: number
  lng: number
}

export type GeoSupplierRow = {
  id: number
  name: string
  lat: number
  lng: number
}

export type ProductCompanyTypeRow = {
  id: number
  company_id: number
  type: string
}

export type SupplierProductLinkRow = {
  supplier_id: number
  product_id: number
}
