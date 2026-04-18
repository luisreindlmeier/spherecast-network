/** Short labels for count badges (English UI) */

export function suppliersCountLabel(count: number): string {
  if (count === 0) return 'No suppliers'
  if (count === 1) return '1 supplier'
  return `${count} suppliers`
}

export function bomIngredientsLabel(count: number): string {
  if (count === 0) return 'No ingredients'
  if (count === 1) return '1 ingredient'
  return `${count} ingredients`
}

/** Count of supplier ↔ raw-material SKU rows in `supplier_product` */
export function linkedSkusLabel(count: number): string {
  if (count === 0) return 'No linked SKUs'
  if (count === 1) return '1 linked SKU'
  return `${count} linked SKUs`
}

export function productsUsedInLabel(count: number): string {
  if (count === 0) return 'Not used'
  if (count === 1) return '1 product'
  return `${count} products`
}

export function skuListCount(count: number): string {
  if (count === 0) return 'No SKUs'
  if (count === 1) return '1 SKU'
  return `${count} SKUs`
}

export function brandsLinkedCount(count: number): string {
  if (count === 0) return 'No brands'
  if (count === 1) return '1 brand'
  return `${count} brands`
}

export function bomLinesCount(count: number): string {
  if (count === 0) return 'No lines'
  if (count === 1) return '1 BOM line'
  return `${count} BOM lines`
}
