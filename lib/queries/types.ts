export type {
  CompanyPickerRow,
  CompanyWithCounts,
  FinishedGoodRow,
  RawMaterialRow,
  SupplierRow,
} from '@/lib/agnes-queries'

export type {
  AgnesRawMaterialDetail as RawMaterialDetail,
  AgnesSupplierDetail as SupplierDetail,
  AgnesCompanyDetail as CompanyDetail,
  AgnesProductDetail as FinishedGoodDetail,
} from '@/lib/agnes-client'

export type FinishedGoodIngredientRow = {
  id: number
  sku: string
  companyName: string
  type: 'raw-material' | 'finished-good'
}
