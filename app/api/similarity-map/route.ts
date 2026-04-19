import { NextResponse } from 'next/server'
import { resolveCompanyScopeFilter } from '@/lib/company-scope-server'
import { agnesGet } from '@/lib/agnes-server'

export const dynamic = 'force-dynamic'

type IngredientCategory =
  | 'vitamins'
  | 'minerals'
  | 'proteins'
  | 'oils'
  | 'excipients'
  | 'carbohydrates'
  | 'botanicals'

export type SimilarityPoint = {
  /** Unique id: "rm-{productId}-sup-{supplierId}" */
  id: string
  name: string
  category: IngredientCategory
  supplierName: string
  umap: [number, number, number]
  /** How many companies have any product with this ingredient name */
  companyCount: number
  /** First product ID with this ingredient name — used for navigation */
  productId: string
}

function inferCategory(name: string): IngredientCategory {
  const n = name.toLowerCase()
  if (
    /\bvitamin\b|ascorb|cholecalciferol|tocopherol|retinyl|thiamine|riboflavin|niacin|pyridox|cyanocobalamin|folat|biotin|pantothen|beta.?carotene|calciferol|menaquinone|choline|inositol/.test(
      n
    )
  )
    return 'vitamins'
  if (
    /\bzinc\b|\biron\b|\bcopper\b|\bchromium\b|\biodine\b|\bselenium\b|\bmolybdenum\b|\bboron\b|calcium carbonate|calcium citrate|calcium phosphate|magnesium oxide|magnesium citrate|magnesium glycinate|magnesium malate|ferrous|ferric|\bpotassium\b/.test(
      n
    )
  )
    return 'minerals'
  if (/protein|whey|casein|collagen|gelatin|albumin|peptide/.test(n))
    return 'proteins'
  if (
    /\boil\b|\bomega\b|fish oil|flaxseed|sunflower|safflower|\bmct\b|triglyceride|lecithin/.test(
      n
    )
  )
    return 'oils'
  if (
    /dextrose|sucrose|\bglucose\b|\blactose\b|\bstarch\b|fructose|inulin|maltodextrin|fibersol|chicory fiber|prebiotic/.test(
      n
    )
  )
    return 'carbohydrates'
  if (
    /extract|botanical|\bherb\b|\bberry\b|green tea|echinacea|elderberry|ashwagandha|rhodiola|valerian|ginkgo|panax|maca|\bturmeric\b|curcumin|resveratrol|quercetin|flavonoid|bioflavonoid|hesperidin|lycopene|\blutein\b|zeaxanthin|cranberry|bilberry|grapeseed/.test(
      n
    )
  )
    return 'botanicals'
  return 'excipients'
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

const CATEGORY_CENTERS: Record<IngredientCategory, [number, number, number]> = {
  vitamins: [2.5, -0.4, 1.0],
  minerals: [0.6, -1.6, 0.5],
  proteins: [0.4, 1.6, 0.0],
  oils: [-1.6, 0.4, -0.6],
  excipients: [0.5, 0.5, -1.8],
  carbohydrates: [-0.6, -1.0, 1.2],
  botanicals: [-1.2, 0.6, 0.6],
}

function computeUmap(
  name: string,
  category: IngredientCategory,
  supplierId: number
): [number, number, number] {
  const baseRng = seededRng(hashString(name))
  const c = CATEGORY_CENTERS[category]
  const spread = 0.65
  const base: [number, number, number] = [
    c[0] + (baseRng() - 0.5) * 2 * spread,
    c[1] + (baseRng() - 0.5) * 2 * spread,
    c[2] + (baseRng() - 0.5) * 2 * spread,
  ]

  const jitterRng = seededRng(hashString(name) ^ (supplierId * 2654435761))
  const jitter = 0.14
  return [
    parseFloat((base[0] + (jitterRng() - 0.5) * 2 * jitter).toFixed(3)),
    parseFloat((base[1] + (jitterRng() - 0.5) * 2 * jitter).toFixed(3)),
    parseFloat((base[2] + (jitterRng() - 0.5) * 2 * jitter).toFixed(3)),
  ]
}

function parseIngredientName(sku: string): string {
  const parts = sku.split('-')
  if (parts.length < 4) return sku
  const withoutPrefix = parts.slice(2)
  const withoutHash = withoutPrefix.slice(0, -1)
  return withoutHash
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export async function GET() {
  const scopeCompanyId = await resolveCompanyScopeFilter()
  const p = new URLSearchParams()
  if (scopeCompanyId != null) p.set('scope_company_id', String(scopeCompanyId))

  const res = await agnesGet('/similarity-map-data', p)
  if (!res.ok) return NextResponse.json({ error: 'upstream error' }, { status: 502 })

  const data = await res.json() as {
    products: { id: number; sku: string; company_id: number }[]
    supplier_links: { supplier_id: number; product_id: number }[]
    suppliers: { id: number; name: string }[]
    boms: { id: number; produced_product_id: number }[]
    bom_components: { bom_id: number; consumed_product_id: number }[]
    finished_goods: { id: number; company_id: number }[]
  }

  const rawMaterials = data.products
  const links = data.supplier_links
  const suppliers = data.suppliers
  const boms = data.boms
  const comps = data.bom_components
  const fgs = data.finished_goods

  const supplierMap = new Map(suppliers.map((s) => [s.id, s.name]))

  let rmIdsUsedByScopeCompany: Set<number> | null = null
  if (scopeCompanyId !== null) {
    const fgProductIds = new Set(
      fgs.filter((fg) => fg.company_id === scopeCompanyId).map((fg) => fg.id)
    )
    const bomIdsForCompany = new Set<number>()
    for (const bom of boms) {
      if (fgProductIds.has(bom.produced_product_id)) {
        bomIdsForCompany.add(bom.id)
      }
    }
    const rmIds = new Set<number>()
    for (const comp of comps) {
      if (bomIdsForCompany.has(comp.bom_id)) {
        rmIds.add(comp.consumed_product_id)
      }
    }
    rmIdsUsedByScopeCompany = rmIds
  }

  const productName = new Map<number, string>()
  for (const rm of rawMaterials) {
    const name = parseIngredientName(rm.sku)
    productName.set(rm.id, name)
  }

  const nameToCompanies = new Map<string, Set<number>>()
  for (const rm of rawMaterials) {
    const name = productName.get(rm.id)
    if (!name) continue
    const set = nameToCompanies.get(name) ?? new Set()
    set.add(rm.company_id)
    nameToCompanies.set(name, set)
  }

  const seen = new Set<string>()
  const points: SimilarityPoint[] = []

  for (const link of links) {
    if (
      rmIdsUsedByScopeCompany !== null &&
      !rmIdsUsedByScopeCompany.has(link.product_id)
    ) {
      continue
    }

    const name = productName.get(link.product_id)
    if (!name) continue

    const key = `${name}||${link.supplier_id}`
    if (seen.has(key)) continue
    seen.add(key)

    const category = inferCategory(name)
    const supplierName =
      supplierMap.get(link.supplier_id) ?? `Supplier ${link.supplier_id}`
    const umap = computeUmap(name, category, link.supplier_id)
    const companyCount = nameToCompanies.get(name)?.size ?? 0
    const productId = String(link.product_id)

    points.push({
      id: `rm-${link.product_id}-sup-${link.supplier_id}`,
      name,
      category,
      supplierName,
      umap,
      companyCount,
      productId,
    })
  }

  return NextResponse.json({ points })
}
