/**
 * Deterministic pseudo-random savings estimates for sourcing opportunities.
 * Seeded from ingredient name + SKU so values are stable across renders.
 */

function hashStr(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h
}

function lerp(min: number, max: number, t: number): number {
  return min + (max - min) * t
}

// Base price tiers $/kg by ingredient category
const CATEGORY_PRICE: Record<string, [number, number]> = {
  Emulsifier: [8, 28],
  Sweetener: [4, 18],
  Preservative: [12, 45],
  Colorant: [15, 60],
  Flavoring: [20, 80],
  Stabilizer: [6, 22],
  Thickener: [5, 18],
  Antioxidant: [10, 35],
  'Texturizing Agent': [7, 25],
  Humectant: [5, 20],
  default: [6, 30],
}

export type SavingsEstimate = {
  savingsLow: number
  savingsHigh: number
  minOrderKg: number
  costPerKgCurrent: number
  costPerKgAlt: number
  companiesCount: number
}

export function estimateSavings(
  ingredientName: string,
  sku: string,
  category: string,
  confidence: number,
  brandsAffected: readonly { name: string; productCount: number }[]
): SavingsEstimate {
  const seed = hashStr(ingredientName + sku)
  const t0 = (seed & 0xffff) / 0xffff
  const t1 = ((seed >> 8) & 0xff) / 255
  const t2 = ((seed >> 16) & 0xff) / 255
  const t3 = ((seed >> 24) & 0xff) / 255

  const range = CATEGORY_PRICE[category] ?? CATEGORY_PRICE.default
  const costPerKgCurrent = Math.round(lerp(range[0], range[1], t0) * 10) / 10

  // Savings % driven by confidence (8–22%) with small jitter
  const savingsPct = lerp(0.08, 0.22, confidence) * (0.85 + 0.3 * t2)
  const costPerKgAlt = Math.round(costPerKgCurrent * (1 - savingsPct) * 10) / 10

  // Annual volume: base on product count across brands, 200–2000 kg/yr
  const totalProducts = brandsAffected.reduce((s, b) => s + b.productCount, 0)
  const baseVol = Math.max(250, totalProducts * 90)
  const volumeKg = Math.round(lerp(baseVol * 0.6, baseVol * 1.4, t1) / 50) * 50

  const perKgSaving = costPerKgCurrent - costPerKgAlt
  const savingsLow = Math.max(
    1000,
    Math.round((perKgSaving * volumeKg * 0.7) / 1000) * 1000
  )
  const savingsHigh = Math.max(
    2000,
    Math.round((perKgSaving * volumeKg * 1.3) / 1000) * 1000
  )

  const minOrderKg = Math.round(lerp(200, 800, t3) / 50) * 50

  return {
    savingsLow,
    savingsHigh,
    minOrderKg,
    costPerKgCurrent,
    costPerKgAlt,
    companiesCount: brandsAffected.length,
  }
}

export function fmtSavingsRange(low: number, high: number): string {
  const fmt = (n: number) => (n >= 1000 ? `$${Math.round(n / 1000)}K` : `$${n}`)
  return `~${fmt(low)}–${fmt(high)}/yr`
}
