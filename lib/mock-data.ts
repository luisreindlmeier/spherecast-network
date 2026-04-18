export type OpportunityStatus = 'active' | 'pending' | 'verified' | 'critical'
export type AgentStatus = 'running' | 'completed' | 'pending' | 'failed'
export type DecisionStatus = 'accepted' | 'rejected' | 'pending'

export interface Opportunity {
  id: string
  material: string
  customers: string[]
  suppliersFound: number
  volumeKg: number
  savingsEur: number
  confidenceScore: number
  status: OpportunityStatus
  category: string
}

export interface Supplier {
  id: string
  name: string
  country: string
  lat: number
  lng: number
  products: number
  categories: string[]
  rating: number
}

export interface Customer {
  id: string
  name: string
  materials: number
  activeContracts: number
  lat: number
  lng: number
}

export interface AgentTask {
  id: string
  title: string
  status: AgentStatus
  progress?: number
  startedAt: string
}

export interface EvidenceEntry {
  id: string
  opportunityId: string
  material: string
  decision: DecisionStatus
  dbMatch: { similarity: number; reasoning: string }
  externalEvidence: { source: string; text: string; tags: string[] }
  recommendation: string
  timestamp: string
}

export interface RawMaterial {
  id: string
  name: string
  category: string
  cas: string
  suppliersCount: number
  customersCount: number
  confidenceScore: number
}

export const opportunities: Opportunity[] = [
  {
    id: '1',
    material: 'Titanium Dioxide (CI 77891)',
    customers: ['Unilever', 'P&G', 'Henkel', 'BASF'],
    suppliersFound: 8,
    volumeKg: 245000,
    savingsEur: 420000,
    confidenceScore: 94,
    status: 'verified',
    category: 'Pigments',
  },
  {
    id: '2',
    material: 'Sodium Laureth Sulfate',
    customers: ['Henkel', 'Reckitt', 'Colgate'],
    suppliersFound: 5,
    volumeKg: 180000,
    savingsEur: 310000,
    confidenceScore: 88,
    status: 'active',
    category: 'Surfactants',
  },
  {
    id: '3',
    material: 'Fragrance Complex A-42',
    customers: ['P&G', 'Unilever'],
    suppliersFound: 3,
    volumeKg: 12000,
    savingsEur: 85000,
    confidenceScore: 76,
    status: 'pending',
    category: 'Fragrances',
  },
  {
    id: '4',
    material: 'Citric Acid (Anhydrous)',
    customers: ['Nestlé', 'Unilever', 'Henkel', 'Reckitt', 'BASF'],
    suppliersFound: 12,
    volumeKg: 520000,
    savingsEur: 680000,
    confidenceScore: 97,
    status: 'verified',
    category: 'Organic Acids',
  },
  {
    id: '5',
    material: 'Propylene Glycol USP',
    customers: ['Colgate', 'P&G'],
    suppliersFound: 6,
    volumeKg: 95000,
    savingsEur: 145000,
    confidenceScore: 91,
    status: 'active',
    category: 'Polyols',
  },
  {
    id: '6',
    material: 'Benzyl Alcohol',
    customers: ['Henkel', 'BASF'],
    suppliersFound: 4,
    volumeKg: 8500,
    savingsEur: 62000,
    confidenceScore: 65,
    status: 'pending',
    category: 'Aromatic Alcohols',
  },
  {
    id: '7',
    material: 'Cocamidopropyl Betaine',
    customers: ['Unilever', 'Colgate', 'P&G'],
    suppliersFound: 7,
    volumeKg: 67000,
    savingsEur: 195000,
    confidenceScore: 83,
    status: 'active',
    category: 'Surfactants',
  },
  {
    id: '8',
    material: 'Xanthan Gum E415',
    customers: ['Nestlé', 'Unilever'],
    suppliersFound: 3,
    volumeKg: 34000,
    savingsEur: 78000,
    confidenceScore: 79,
    status: 'pending',
    category: 'Hydrocolloids',
  },
  {
    id: '9',
    material: 'Methylchloroisothiazolinone',
    customers: ['Reckitt'],
    suppliersFound: 2,
    volumeKg: 1200,
    savingsEur: 28000,
    confidenceScore: 43,
    status: 'critical',
    category: 'Preservatives',
  },
  {
    id: '10',
    material: 'Stearic Acid C18',
    customers: ['P&G', 'Henkel', 'Colgate'],
    suppliersFound: 9,
    volumeKg: 112000,
    savingsEur: 230000,
    confidenceScore: 92,
    status: 'verified',
    category: 'Fatty Acids',
  },
  {
    id: '11',
    material: 'Silicone Fluid DC-200',
    customers: ['Unilever'],
    suppliersFound: 4,
    volumeKg: 5800,
    savingsEur: 41000,
    confidenceScore: 71,
    status: 'pending',
    category: 'Silicones',
  },
  {
    id: '12',
    material: 'Carrageenan E407',
    customers: ['Nestlé', 'Unilever', 'P&G'],
    suppliersFound: 5,
    volumeKg: 23000,
    savingsEur: 67000,
    confidenceScore: 87,
    status: 'active',
    category: 'Hydrocolloids',
  },
]

export const suppliers: Supplier[] = [
  {
    id: 's1',
    name: 'Evonik Industries',
    country: 'Germany',
    lat: 51.4557,
    lng: 7.0116,
    products: 43,
    categories: ['Surfactants', 'Silicones', 'Fatty Acids'],
    rating: 4.8,
  },
  {
    id: 's2',
    name: 'Dow Chemical',
    country: 'USA',
    lat: 43.6956,
    lng: -84.2369,
    products: 67,
    categories: ['Polyols', 'Silicones', 'Organic Acids'],
    rating: 4.6,
  },
  {
    id: 's3',
    name: 'Croda International',
    country: 'UK',
    lat: 53.8008,
    lng: -0.4335,
    products: 38,
    categories: ['Surfactants', 'Fatty Acids', 'Esters'],
    rating: 4.7,
  },
  {
    id: 's4',
    name: 'Huntsman Corp.',
    country: 'USA',
    lat: 29.7604,
    lng: -95.3698,
    products: 29,
    categories: ['Pigments', 'Surfactants'],
    rating: 4.3,
  },
  {
    id: 's5',
    name: 'Givaudan',
    country: 'Switzerland',
    lat: 46.2044,
    lng: 6.1432,
    products: 18,
    categories: ['Fragrances'],
    rating: 4.9,
  },
  {
    id: 's6',
    name: 'Solvay',
    country: 'Belgium',
    lat: 50.8503,
    lng: 4.3517,
    products: 52,
    categories: ['Organic Acids', 'Surfactants', 'Polyols'],
    rating: 4.5,
  },
  {
    id: 's7',
    name: 'BASF SE',
    country: 'Germany',
    lat: 49.4892,
    lng: 8.4673,
    products: 89,
    categories: ['Pigments', 'Organic Acids', 'Preservatives'],
    rating: 4.7,
  },
  {
    id: 's8',
    name: 'Clariant',
    country: 'Switzerland',
    lat: 47.5596,
    lng: 7.5886,
    products: 34,
    categories: ['Pigments', 'Surfactants', 'Preservatives'],
    rating: 4.4,
  },
  {
    id: 's9',
    name: 'Ashland',
    country: 'USA',
    lat: 38.3498,
    lng: -82.6357,
    products: 25,
    categories: ['Hydrocolloids', 'Polyols'],
    rating: 4.2,
  },
  {
    id: 's10',
    name: 'IFF (International Flavors)',
    country: 'USA',
    lat: 40.7128,
    lng: -74.006,
    products: 41,
    categories: ['Fragrances', 'Aromatic Alcohols'],
    rating: 4.6,
  },
]

export const customers: Customer[] = [
  {
    id: 'c1',
    name: 'Unilever',
    materials: 234,
    activeContracts: 67,
    lat: 51.5074,
    lng: -0.1278,
  },
  {
    id: 'c2',
    name: 'P&G',
    materials: 189,
    activeContracts: 54,
    lat: 39.0997,
    lng: -84.512,
  },
  {
    id: 'c3',
    name: 'Henkel',
    materials: 156,
    activeContracts: 43,
    lat: 51.2217,
    lng: 6.7762,
  },
  {
    id: 'c4',
    name: 'Nestlé',
    materials: 143,
    activeContracts: 38,
    lat: 46.8182,
    lng: 8.2275,
  },
  {
    id: 'c5',
    name: 'Reckitt',
    materials: 98,
    activeContracts: 29,
    lat: 51.5203,
    lng: -0.0899,
  },
  {
    id: 'c6',
    name: 'Colgate-Palmolive',
    materials: 87,
    activeContracts: 24,
    lat: 40.7128,
    lng: -74.006,
  },
  {
    id: 'c7',
    name: 'BASF (Customer)',
    materials: 211,
    activeContracts: 61,
    lat: 49.4892,
    lng: 8.4673,
  },
]

export const agentTasks: AgentTask[] = [
  {
    id: 'a1',
    title: 'Scanning new supplier database for Titanium Dioxide alternatives',
    status: 'running',
    progress: 67,
    startedAt: '2026-04-18T13:45:00Z',
  },
  {
    id: 'a2',
    title: 'Embedding 23 new ingredient submissions',
    status: 'running',
    progress: 34,
    startedAt: '2026-04-18T14:02:00Z',
  },
  {
    id: 'a3',
    title: 'Compliance check: EU Regulation 2023/124 (23 materials)',
    status: 'completed',
    startedAt: '2026-04-18T12:30:00Z',
  },
  {
    id: 'a4',
    title: 'Updating similarity index for Fragrance Compounds',
    status: 'pending',
    startedAt: '2026-04-18T14:10:00Z',
  },
]

export const evidenceEntries: EvidenceEntry[] = [
  {
    id: 'e1',
    opportunityId: '1',
    material: 'Titanium Dioxide (CI 77891)',
    decision: 'accepted',
    dbMatch: {
      similarity: 0.96,
      reasoning:
        'Exact CAS match (13463-67-7) found in internal ingredient library. Same specification as used in 4 active Unilever formulations.',
    },
    externalEvidence: {
      source: 'ECHA Substance Registry',
      text: 'TiO2 listed under REACH Annex XVII Restriction 75 (use in spray applications prohibited since Feb 2022). Not applicable for current use case — pigment in solid forms.',
      tags: ['REACH compliant', 'Annex XVII checked', 'Spray restriction N/A'],
    },
    recommendation:
      'Consolidate TiO2 sourcing across all 4 customers through Huntsman Corp. or BASF SE. Estimated annual saving of €420,000 based on volume consolidation of 245t.',
    timestamp: '2026-04-18T11:23:00Z',
  },
  {
    id: 'e2',
    opportunityId: '4',
    material: 'Citric Acid (Anhydrous)',
    decision: 'accepted',
    dbMatch: {
      similarity: 0.98,
      reasoning:
        'CAS 77-92-9 with identical specification (anhydrous, >99.5% purity, food-grade E330) across all 5 customer submissions.',
    },
    externalEvidence: {
      source: 'Solvay Supplier Profile + Market Intel',
      text: 'Solvay and ADM both offer food-grade anhydrous citric acid at comparable purity. Volume discount bracket at 500t+ yields 12–18% unit cost reduction.',
      tags: [
        'E330 approved',
        'Food grade',
        'Volume discount available',
        'Two qualified sources',
      ],
    },
    recommendation:
      'Immediate consolidation opportunity. 5 customers currently buying from 9 different sources. Single-supplier negotiation with Solvay at 520t annual volume projected to save €680,000.',
    timestamp: '2026-04-18T10:15:00Z',
  },
  {
    id: 'e3',
    opportunityId: '9',
    material: 'Methylchloroisothiazolinone',
    decision: 'rejected',
    dbMatch: {
      similarity: 0.43,
      reasoning:
        'Low confidence: only 1 customer submission, concentration specification unclear (0.0015% vs 0.002% MCI/MI ratio).',
    },
    externalEvidence: {
      source: 'EU Cosmetics Regulation (EC) No 1223/2009',
      text: 'MCI/MI restricted to 0.0015% in rinse-off products since 2016. Specification ambiguity creates regulatory risk. Supplier qualification for single customer does not justify consolidation.',
      tags: ['Regulatory risk', 'Concentration unclear', 'Single customer'],
    },
    recommendation:
      'Do not consolidate at this time. Request clarification on concentration spec from Reckitt formulation team before proceeding.',
    timestamp: '2026-04-18T09:40:00Z',
  },
  {
    id: 'e4',
    opportunityId: '2',
    material: 'Sodium Laureth Sulfate',
    decision: 'pending',
    dbMatch: {
      similarity: 0.88,
      reasoning:
        'CAS 68585-34-2 confirmed across 3 submissions. EO degree varies (2EO vs 3EO) — requires specification alignment before proceeding.',
    },
    externalEvidence: {
      source: 'Croda International Product Catalog',
      text: 'Croda Empicol ESB3 and Evonik Texapon N70 both meet SLES 3EO spec at industrial scale. Estimated 8–12% savings at 180t consolidated volume.',
      tags: [
        'SLES 3EO preferred',
        'Two qualified sources',
        'Spec alignment needed',
      ],
    },
    recommendation:
      'Align EO degree specification with Henkel, Reckitt, Colgate formulation teams. Once confirmed, initiate dual-source RFQ with Croda and Evonik.',
    timestamp: '2026-04-18T08:55:00Z',
  },
]

export const rawMaterials: RawMaterial[] = [
  {
    id: 'rm1',
    name: 'Titanium Dioxide (CI 77891)',
    category: 'Pigments',
    cas: '13463-67-7',
    suppliersCount: 8,
    customersCount: 4,
    confidenceScore: 94,
  },
  {
    id: 'rm2',
    name: 'Sodium Laureth Sulfate',
    category: 'Surfactants',
    cas: '68585-34-2',
    suppliersCount: 5,
    customersCount: 3,
    confidenceScore: 88,
  },
  {
    id: 'rm3',
    name: 'Citric Acid (Anhydrous)',
    category: 'Organic Acids',
    cas: '77-92-9',
    suppliersCount: 12,
    customersCount: 5,
    confidenceScore: 97,
  },
  {
    id: 'rm4',
    name: 'Propylene Glycol USP',
    category: 'Polyols',
    cas: '57-55-6',
    suppliersCount: 6,
    customersCount: 2,
    confidenceScore: 91,
  },
  {
    id: 'rm5',
    name: 'Stearic Acid C18',
    category: 'Fatty Acids',
    cas: '57-11-4',
    suppliersCount: 9,
    customersCount: 3,
    confidenceScore: 92,
  },
  {
    id: 'rm6',
    name: 'Fragrance Complex A-42',
    category: 'Fragrances',
    cas: 'N/A',
    suppliersCount: 3,
    customersCount: 2,
    confidenceScore: 76,
  },
  {
    id: 'rm7',
    name: 'Benzyl Alcohol',
    category: 'Aromatic Alcohols',
    cas: '100-51-6',
    suppliersCount: 4,
    customersCount: 2,
    confidenceScore: 65,
  },
  {
    id: 'rm8',
    name: 'Cocamidopropyl Betaine',
    category: 'Surfactants',
    cas: '61789-40-0',
    suppliersCount: 7,
    customersCount: 3,
    confidenceScore: 83,
  },
  {
    id: 'rm9',
    name: 'Xanthan Gum E415',
    category: 'Hydrocolloids',
    cas: '11138-66-2',
    suppliersCount: 3,
    customersCount: 2,
    confidenceScore: 79,
  },
  {
    id: 'rm10',
    name: 'Methylchloroisothiazolinone',
    category: 'Preservatives',
    cas: '26172-55-4',
    suppliersCount: 2,
    customersCount: 1,
    confidenceScore: 43,
  },
  {
    id: 'rm11',
    name: 'Silicone Fluid DC-200',
    category: 'Silicones',
    cas: '63148-62-9',
    suppliersCount: 4,
    customersCount: 1,
    confidenceScore: 71,
  },
  {
    id: 'rm12',
    name: 'Carrageenan E407',
    category: 'Hydrocolloids',
    cas: '9000-07-1',
    suppliersCount: 5,
    customersCount: 3,
    confidenceScore: 87,
  },
  {
    id: 'rm13',
    name: 'Sodium Benzoate E211',
    category: 'Preservatives',
    cas: '532-32-1',
    suppliersCount: 8,
    customersCount: 4,
    confidenceScore: 89,
  },
  {
    id: 'rm14',
    name: 'Glycerin USP/BP',
    category: 'Polyols',
    cas: '56-81-5',
    suppliersCount: 11,
    customersCount: 5,
    confidenceScore: 95,
  },
  {
    id: 'rm15',
    name: 'Lactic Acid 90%',
    category: 'Organic Acids',
    cas: '50-21-5',
    suppliersCount: 6,
    customersCount: 3,
    confidenceScore: 86,
  },
  {
    id: 'rm16',
    name: 'Sodium Hydroxide (Caustic Soda)',
    category: 'Inorganic Bases',
    cas: '1310-73-2',
    suppliersCount: 14,
    customersCount: 6,
    confidenceScore: 98,
  },
  {
    id: 'rm17',
    name: 'Hydroxyethyl Cellulose',
    category: 'Hydrocolloids',
    cas: '9004-62-0',
    suppliersCount: 4,
    customersCount: 3,
    confidenceScore: 82,
  },
  {
    id: 'rm18',
    name: 'Phenoxyethanol',
    category: 'Preservatives',
    cas: '122-99-6',
    suppliersCount: 7,
    customersCount: 4,
    confidenceScore: 90,
  },
  {
    id: 'rm19',
    name: 'Sodium Chloride (Food Grade)',
    category: 'Inorganic Salts',
    cas: '7647-14-5',
    suppliersCount: 18,
    customersCount: 5,
    confidenceScore: 99,
  },
  {
    id: 'rm20',
    name: 'Polysorbate 80',
    category: 'Emulsifiers',
    cas: '9005-65-6',
    suppliersCount: 6,
    customersCount: 4,
    confidenceScore: 85,
  },
]

export const demandTrendData = [
  { month: 'Oct', actual: 220, baseline: 210, target: 230, consensus: 225 },
  { month: 'Nov', actual: 235, baseline: 215, target: 235, consensus: 230 },
  { month: 'Dec', actual: 245, baseline: 218, target: 240, consensus: 238 },
  { month: 'Jan', actual: 252, baseline: 222, target: 245, consensus: 248 },
  { month: 'Feb', actual: 248, baseline: 225, target: 250, consensus: 252 },
  { month: 'Mar', actual: 261, baseline: 228, target: 255, consensus: 257 },
  { month: 'Apr', actual: 268, baseline: 231, target: 260, consensus: null },
  { month: 'May', actual: null, baseline: 234, target: 265, consensus: null },
  { month: 'Jun', actual: null, baseline: 237, target: 270, consensus: null },
]

export const scatterPoints = [
  {
    x: 2.1,
    y: 3.4,
    z: 1.2,
    name: 'Sodium Laureth Sulfate',
    category: 'Surfactants',
    companies: 3,
  },
  {
    x: 2.4,
    y: 3.1,
    z: 1.5,
    name: 'SLES 2EO',
    category: 'Surfactants',
    companies: 2,
  },
  {
    x: 2.2,
    y: 3.6,
    z: 0.9,
    name: 'Cocamidopropyl Betaine',
    category: 'Surfactants',
    companies: 3,
  },
  {
    x: 1.9,
    y: 3.3,
    z: 1.3,
    name: 'Sodium Lauryl Sulfate',
    category: 'Surfactants',
    companies: 4,
  },
  {
    x: -1.5,
    y: -2.3,
    z: 0.8,
    name: 'Titanium Dioxide CI 77891',
    category: 'Pigments',
    companies: 4,
  },
  {
    x: -1.2,
    y: -2.6,
    z: 0.6,
    name: 'Iron Oxide Black CI 77499',
    category: 'Pigments',
    companies: 2,
  },
  {
    x: -1.8,
    y: -2.1,
    z: 1.0,
    name: 'Iron Oxide Red CI 77491',
    category: 'Pigments',
    companies: 2,
  },
  {
    x: 4.2,
    y: -1.3,
    z: 2.1,
    name: 'Citric Acid Anhydrous',
    category: 'Organic Acids',
    companies: 5,
  },
  {
    x: 4.5,
    y: -1.1,
    z: 2.3,
    name: 'Lactic Acid 90%',
    category: 'Organic Acids',
    companies: 3,
  },
  {
    x: 3.9,
    y: -1.5,
    z: 1.9,
    name: 'Malic Acid',
    category: 'Organic Acids',
    companies: 2,
  },
  {
    x: -3.2,
    y: 1.4,
    z: -0.8,
    name: 'Fragrance Complex A-42',
    category: 'Fragrances',
    companies: 2,
  },
  {
    x: -3.5,
    y: 1.2,
    z: -1.1,
    name: 'Benzyl Alcohol',
    category: 'Aromatic Alcohols',
    companies: 2,
  },
  {
    x: -3.1,
    y: 1.7,
    z: -0.6,
    name: 'Linalool',
    category: 'Fragrances',
    companies: 3,
  },
  {
    x: 0.5,
    y: -4.2,
    z: -1.5,
    name: 'Propylene Glycol USP',
    category: 'Polyols',
    companies: 2,
  },
  {
    x: 0.3,
    y: -4.5,
    z: -1.2,
    name: 'Glycerin USP',
    category: 'Polyols',
    companies: 5,
  },
  {
    x: 0.7,
    y: -3.9,
    z: -1.7,
    name: 'Butylene Glycol',
    category: 'Polyols',
    companies: 3,
  },
  {
    x: -0.8,
    y: 0.9,
    z: -3.4,
    name: 'Methylchloroisothiazolinone',
    category: 'Preservatives',
    companies: 1,
  },
  {
    x: -0.5,
    y: 1.1,
    z: -3.1,
    name: 'Sodium Benzoate',
    category: 'Preservatives',
    companies: 4,
  },
  {
    x: -1.0,
    y: 0.7,
    z: -3.7,
    name: 'Phenoxyethanol',
    category: 'Preservatives',
    companies: 4,
  },
  {
    x: 1.8,
    y: 1.8,
    z: 3.2,
    name: 'Xanthan Gum E415',
    category: 'Hydrocolloids',
    companies: 2,
  },
  {
    x: 2.0,
    y: 1.5,
    z: 3.5,
    name: 'Carrageenan E407',
    category: 'Hydrocolloids',
    companies: 3,
  },
  {
    x: 1.6,
    y: 2.1,
    z: 2.9,
    name: 'Guar Gum',
    category: 'Hydrocolloids',
    companies: 2,
  },
]

export const categoryColors: Record<string, string> = {
  Surfactants: '#3b82f6',
  Pigments: '#a855f7',
  'Organic Acids': '#22c55e',
  Fragrances: '#f97316',
  'Aromatic Alcohols': '#eab308',
  Polyols: '#06b6d4',
  Preservatives: '#ef4444',
  Hydrocolloids: '#8b5cf6',
}
