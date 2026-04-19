import type { IngredientCategory } from '@/components/similarity-map/similarity-map-categories'

const CATEGORY_CENTERS: Record<IngredientCategory, [number, number, number]> = {
  vitamins: [2.5, -0.4, 1.0],
  minerals: [0.6, -1.6, 0.5],
  proteins: [0.4, 1.6, 0.0],
  oils: [-1.6, 0.4, -0.6],
  excipients: [0.5, 0.5, -1.8],
  carbohydrates: [-0.6, -1.0, 1.2],
  botanicals: [-1.2, 0.6, 0.6],
}

function seededRng(seed: number): () => number {
  let s = (seed * 1664525 + 1013904223) & 0xffffffff
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0x100000000
  }
}

function hashString(str: string): number {
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) & 0xffffffff
  }
  return Math.abs(h)
}

export function inferIngredientCategory(name: string): IngredientCategory {
  const n = name.toLowerCase()

  if (
    /\bvitamin\b|ascorb|cholecalciferol|tocopherol|retinyl|thiamine|riboflavin|niacin|pyridox|cyanocobalamin|folat|biotin|pantothen|beta.?carotene|calciferol|menaquinone|choline|inositol/.test(
      n
    )
  ) {
    return 'vitamins'
  }

  if (
    /\bzinc\b|\biron\b|\bcopper\b|\bchromium\b|\biodine\b|\bselenium\b|\bmolybdenum\b|\bboron\b|calcium carbonate|calcium citrate|calcium phosphate|magnesium oxide|magnesium citrate|magnesium glycinate|magnesium malate|ferrous|ferric|\bpotassium\b/.test(
      n
    )
  ) {
    return 'minerals'
  }

  if (/protein|whey|casein|collagen|gelatin|albumin|peptide/.test(n)) {
    return 'proteins'
  }

  if (
    /\boil\b|\bomega\b|fish oil|flaxseed|sunflower|safflower|\bmct\b|triglyceride|lecithin/.test(
      n
    )
  ) {
    return 'oils'
  }

  if (
    /dextrose|sucrose|\bglucose\b|\blactose\b|\bstarch\b|fructose|inulin|maltodextrin|fibersol|chicory fiber|prebiotic/.test(
      n
    )
  ) {
    return 'carbohydrates'
  }

  if (
    /extract|botanical|\bherb\b|\bberry\b|green tea|echinacea|elderberry|ashwagandha|rhodiola|valerian|ginkgo|panax|maca|\bturmeric\b|curcumin|resveratrol|quercetin|flavonoid|bioflavonoid|hesperidin|lycopene|\blutein\b|zeaxanthin|cranberry|bilberry|grapeseed/.test(
      n
    )
  ) {
    return 'botanicals'
  }

  return 'excipients'
}

export function computeSimilarityUmap(
  name: string,
  category: IngredientCategory,
  supplierId: number
): [number, number, number] {
  // Same ingredient name keeps the same cluster center across suppliers.
  const baseRng = seededRng(hashString(name))
  const center = CATEGORY_CENTERS[category]
  const spread = 0.65

  const base: [number, number, number] = [
    center[0] + (baseRng() - 0.5) * 2 * spread,
    center[1] + (baseRng() - 0.5) * 2 * spread,
    center[2] + (baseRng() - 0.5) * 2 * spread,
  ]

  // Supplier-specific jitter avoids overlapping points in the same cluster.
  const jitterRng = seededRng(hashString(name) ^ (supplierId * 2654435761))
  const jitter = 0.14

  return [
    parseFloat((base[0] + (jitterRng() - 0.5) * 2 * jitter).toFixed(3)),
    parseFloat((base[1] + (jitterRng() - 0.5) * 2 * jitter).toFixed(3)),
    parseFloat((base[2] + (jitterRng() - 0.5) * 2 * jitter).toFixed(3)),
  ]
}

export function parseIngredientNameFromSku(sku: string): string {
  // Expected format: RM-C{n}-ingredient-name-{8charhex}
  const parts = sku.split('-')
  if (parts.length < 4) {
    return sku
  }

  return parts
    .slice(2, -1)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
