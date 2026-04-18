export type OpportunityStatus = 'open' | 'in_review' | 'parked'

export interface OpportunityMatchLine {
  label: string
  detail: string
}

export interface OpportunityBrandAffected {
  name: string
  productCount: number
}

export interface OpportunityConsolidation {
  via: string
  combinedVolume: string
  estimatedSavings: string
  supplierRisk: string
}

export interface OpportunityRow {
  id: string
  /** 0–1 */
  confidence: number
  ingredientName: string
  ingredientScientific?: string
  brandsDisplay: string
  currentSupplier: string
  altSupplier: string
  risk: string
  /** Filter: primary brand key */
  brandKey: string
  category: string
  /** For supplier filter — main current supplier */
  supplierKey: string
  status: OpportunityStatus
  matchReasoning: readonly OpportunityMatchLine[]
  brandsAffected: readonly OpportunityBrandAffected[]
  consolidation: OpportunityConsolidation
}

export const OPPORTUNITY_BRAND_FILTERS = [
  'All',
  'One A Day',
  'Centrum',
  'NOW Foods',
  'Nature Made',
] as const

export const OPPORTUNITY_CATEGORY_FILTERS = [
  'All',
  'Vitamins',
  'Minerals',
  'Botanicals',
  'Oils',
] as const

export const OPPORTUNITY_STATUS_FILTERS: {
  value: OpportunityStatus | 'all'
  label: string
}[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_review', label: 'In review' },
  { value: 'parked', label: 'Parked' },
]

export const OPPORTUNITY_SUPPLIER_FILTERS = [
  'All',
  'Prinova',
  'Jost Chem.',
  'ADM',
  'Cargill',
  'PureBulk',
  'multiple',
] as const

export const DEMO_OPPORTUNITIES: readonly OpportunityRow[] = [
  {
    id: 'opp-d3-prinova',
    confidence: 0.96,
    ingredientName: 'Vitamin D3',
    ingredientScientific: 'Cholecalciferol',
    brandsDisplay: 'One A Day+2',
    currentSupplier: 'Prinova',
    altSupplier: 'PureBulk',
    risk: 'Single→Dual',
    brandKey: 'One A Day',
    category: 'Vitamins',
    supplierKey: 'Prinova',
    status: 'open',
    matchReasoning: [
      { label: 'Name similarity', detail: '0.96 (embedding)' },
      { label: 'Same supplier', detail: 'Prinova USA ✓' },
      { label: 'iHerb label', detail: 'identical spec ✓' },
      { label: 'FDA registered', detail: 'both facilities ✓' },
    ],
    brandsAffected: [
      { name: 'One A Day', productCount: 8 },
      { name: 'up&up', productCount: 3 },
      { name: 'Centrum', productCount: 2 },
    ],
    consolidation: {
      via: 'Via Agnes Network Warehouse Chicago',
      combinedVolume: 'Combined volume: 3×',
      estimatedSavings: 'Est. savings: −15% COGS',
      supplierRisk: 'Supplier risk: Single → Dual source',
    },
  },
  {
    id: 'opp-mg-citrate',
    confidence: 0.91,
    ingredientName: 'Magnesium Citrate',
    brandsDisplay: 'Centrum+1',
    currentSupplier: 'Jost Chem.',
    altSupplier: 'Jost+PB',
    risk: 'Low',
    brandKey: 'Centrum',
    category: 'Minerals',
    supplierKey: 'Jost Chem.',
    status: 'in_review',
    matchReasoning: [
      { label: 'Spec match', detail: 'tribasic hydrate grade ✓' },
      { label: 'Geography', detail: 'US + EU approved sites ✓' },
    ],
    brandsAffected: [
      { name: 'Centrum', productCount: 5 },
      { name: 'Caltrate', productCount: 2 },
    ],
    consolidation: {
      via: 'Via regional Jost hub + partner blend',
      combinedVolume: 'Combined volume: 1.8×',
      estimatedSavings: 'Est. savings: −8% COGS',
      supplierRisk: 'Supplier risk: Low — dual qualified',
    },
  },
  {
    id: 'opp-ascorbic',
    confidence: 0.84,
    ingredientName: 'Ascorbic Acid',
    brandsDisplay: 'NOW Foods+3',
    currentSupplier: 'multiple',
    altSupplier: 'consolidate',
    risk: 'Med',
    brandKey: 'NOW Foods',
    category: 'Vitamins',
    supplierKey: 'multiple',
    status: 'open',
    matchReasoning: [
      {
        label: 'Fragmentation',
        detail: '4 active suppliers on same SKU family',
      },
      { label: 'COA band', detail: 'USP overlap 98–102% ✓' },
    ],
    brandsAffected: [
      { name: 'NOW Foods', productCount: 12 },
      { name: 'Life Extension', productCount: 4 },
      { name: 'Solaray', productCount: 3 },
      { name: '21st Century', productCount: 2 },
    ],
    consolidation: {
      via: 'Via single USP micronized grade + frame agreement',
      combinedVolume: 'Combined volume: 2.4×',
      estimatedSavings: 'Est. savings: −12% COGS',
      supplierRisk: 'Supplier risk: Med — reduce tail vendors',
    },
  },
  {
    id: 'opp-safflower',
    confidence: 0.71,
    ingredientName: 'Safflower Oil',
    brandsDisplay: 'Nature Made+1',
    currentSupplier: 'ADM',
    altSupplier: 'Cargill',
    risk: 'Low',
    brandKey: 'Nature Made',
    category: 'Oils',
    supplierKey: 'ADM',
    status: 'parked',
    matchReasoning: [
      { label: 'Fatty acid profile', detail: 'within spec delta ✓' },
      { label: 'Cold chain', detail: 'partial overlap' },
    ],
    brandsAffected: [
      { name: 'Nature Made', productCount: 6 },
      { name: 'Kirkland', productCount: 2 },
    ],
    consolidation: {
      via: 'Via Cargill softgel oil program',
      combinedVolume: 'Combined volume: 1.3×',
      estimatedSavings: 'Est. savings: −5% COGS',
      supplierRisk: 'Supplier risk: Low',
    },
  },
] as const

export function getDemoOpportunityById(id: string): OpportunityRow | undefined {
  return DEMO_OPPORTUNITIES.find((o) => o.id === id)
}
