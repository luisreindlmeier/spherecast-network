import type { Company } from '@/types/database'

export type CompanyPickerRow = { id: number; name: string }

export type FinishedGoodRow = {
  id: number
  sku: string
  company_id: number
  companyName: string
  ingredientCount: number
}

export type RawMaterialRow = {
  id: number
  sku: string
  company_id: number
  companyName: string
  supplierCount: number
  usedInProducts: number
}

export type SupplierRow = {
  id: number
  name: string
  /** Distinct raw-material SKUs linked via `supplier_product` (not volumes). */
  materialCount: number
}

export type CompanyWithCounts = Company & {
  finishedGoods: number
  rawMaterials: number
}

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
