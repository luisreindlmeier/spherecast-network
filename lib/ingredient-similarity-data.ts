export type IngredientCategory =
  | 'vitamins'
  | 'minerals'
  | 'proteins'
  | 'oils'
  | 'excipients'
  | 'carbohydrates'
  | 'botanicals'

export interface IngredientSimilarityPoint {
  opportunityId: string
  name: string
  category: IngredientCategory
  /** Precomputed UMAP (3D) — axes are not interpretable */
  umap: readonly [number, number, number]
  companyCount: number
  topSuppliers: readonly string[]
}

export const INGREDIENT_CATEGORY_COLORS: Record<IngredientCategory, string> = {
  vitamins: '#a78bfa',
  minerals: '#67e8f9',
  proteins: '#22c55e',
  oils: '#eab308',
  excipients: '#8a909f',
  carbohydrates: '#fb923c',
  botanicals: '#2dd4bf',
}

/** Fictitious catalogue for the 3D similarity map */
export const INGREDIENT_SIMILARITY_POINTS: readonly IngredientSimilarityPoint[] =
  [
    {
      opportunityId: 'opp-ascorbic-acid',
      name: 'L-Ascorbic Acid',
      category: 'vitamins',
      umap: [2.4, -0.35, 1.05],
      companyCount: 38,
      topSuppliers: ['DSM Nutritional', 'Northeast Pharma', 'Vertellus'],
    },
    {
      opportunityId: 'opp-d3-cholecalciferol',
      name: 'Cholecalciferol (D3)',
      category: 'vitamins',
      umap: [2.55, -0.2, 0.92],
      companyCount: 22,
      topSuppliers: ['DSM', 'Fermenta', 'Zhejiang Garden'],
    },
    {
      opportunityId: 'opp-tocopherol-acetate',
      name: 'DL-α-Tocopheryl Acetate',
      category: 'vitamins',
      umap: [2.15, 0.1, 1.18],
      companyCount: 29,
      topSuppliers: ['BASF', 'ADM', 'Wilmar'],
    },
    {
      opportunityId: 'opp-niacinamide',
      name: 'Niacinamide',
      category: 'vitamins',
      umap: [2.5, 0.05, 0.88],
      companyCount: 41,
      topSuppliers: ['Lonza', 'Vertellus', 'Jubilant'],
    },
    {
      opportunityId: 'opp-magnesium-citrate',
      name: 'Magnesium Citrate Tribasic',
      category: 'minerals',
      umap: [-1.2, 2.1, -0.4],
      companyCount: 33,
      topSuppliers: ['Dr. Paul Lohmann', 'Jost', 'Gadot'],
    },
    {
      opportunityId: 'opp-zinc-bisglycinate',
      name: 'Zinc Bisglycinate',
      category: 'minerals',
      umap: [-1.35, 2.25, -0.55],
      companyCount: 19,
      topSuppliers: ['Albion', 'Balchem', 'Solgar'],
    },
    {
      opportunityId: 'opp-calcium-carbonate',
      name: 'Calcium Carbonate (Heavy)',
      category: 'minerals',
      umap: [-0.95, 1.85, -0.25],
      companyCount: 52,
      topSuppliers: ['Omya', 'Huber', 'Minerals Tech'],
    },
    {
      opportunityId: 'opp-ferrous-fumarate',
      name: 'Ferrous Fumarate',
      category: 'minerals',
      umap: [-1.5, 2.0, -0.7],
      companyCount: 16,
      topSuppliers: ['Salvavidas', 'Jost', 'Dr. Paul Lohmann'],
    },
    {
      opportunityId: 'opp-whey-protein-isolate',
      name: 'Whey Protein Isolate 90',
      category: 'proteins',
      umap: [0.2, -2.3, 0.6],
      companyCount: 27,
      topSuppliers: ['Glanbia', 'Lactalis', 'Arla'],
    },
    {
      opportunityId: 'opp-pea-protein-80',
      name: 'Pea Protein Isolate 80%',
      category: 'proteins',
      umap: [0.45, -2.15, 0.35],
      companyCount: 31,
      topSuppliers: ['Roquette', 'Cosucra', 'Ingredion'],
    },
    {
      opportunityId: 'opp-collagen-peptides',
      name: 'Bovine Collagen Peptides',
      category: 'proteins',
      umap: [0.1, -2.5, 0.85],
      companyCount: 24,
      topSuppliers: ['Gelita', 'Rousselot', 'Weishardt'],
    },
    {
      opportunityId: 'opp-mct-oil',
      name: 'MCT Oil C8/C10 60:40',
      category: 'oils',
      umap: [1.8, 1.2, -1.9],
      companyCount: 18,
      topSuppliers: ['Stepan', 'ABITEC', 'IOI Oleo'],
    },
    {
      opportunityId: 'opp-sunflower-lecithin',
      name: 'Sunflower Lecithin Liquid',
      category: 'oils',
      umap: [1.65, 1.45, -1.75],
      companyCount: 21,
      topSuppliers: ['Cargill', 'ADM', 'Lipoid'],
    },
    {
      opportunityId: 'opp-evening-primrose',
      name: 'Evening Primrose Oil 10% GLA',
      category: 'oils',
      umap: [1.95, 1.05, -2.05],
      companyCount: 12,
      topSuppliers: ['Henry Lamotte', 'Croda', 'BASF'],
    },
    {
      opportunityId: 'opp-microcrystalline-cellulose',
      name: 'Microcrystalline Cellulose PH 102',
      category: 'excipients',
      umap: [-2.4, -0.8, 1.6],
      companyCount: 47,
      topSuppliers: ['JRS Pharma', 'DFE Pharma', 'Mingtai'],
    },
    {
      opportunityId: 'opp-croscarmellose-sodium',
      name: 'Croscarmellose Sodium',
      category: 'excipients',
      umap: [-2.55, -0.65, 1.45],
      companyCount: 26,
      topSuppliers: ['JRS Pharma', 'DFE Pharma', 'Ashland'],
    },
    {
      opportunityId: 'opp-magnesium-stearate',
      name: 'Magnesium Stearate Vegetable',
      category: 'excipients',
      umap: [-2.2, -1.0, 1.7],
      companyCount: 44,
      topSuppliers: ['Peter Greven', 'FACI', 'Norac'],
    },
    {
      opportunityId: 'opp-hpmc-2910',
      name: 'Hypromellose 2910 E5',
      category: 'excipients',
      umap: [-2.35, -0.5, 1.85],
      companyCount: 20,
      topSuppliers: ['Ashland', 'Shin-Etsu', 'Colorcon'],
    },
    {
      opportunityId: 'opp-maltodextrin-de10',
      name: 'Maltodextrin DE 10–12',
      category: 'carbohydrates',
      umap: [0.6, 0.4, 2.2],
      companyCount: 36,
      topSuppliers: ['Ingredion', 'Tate & Lyle', 'Cargill'],
    },
    {
      opportunityId: 'opp-isomaltulose',
      name: 'Isomaltulose (Palatinose)',
      category: 'carbohydrates',
      umap: [0.75, 0.55, 2.05],
      companyCount: 14,
      topSuppliers: ['BENEO', 'Cargill', 'Tate & Lyle'],
    },
    {
      opportunityId: 'opp-resistance-starch',
      name: 'Resistant Starch RS4',
      category: 'carbohydrates',
      umap: [0.5, 0.25, 2.35],
      companyCount: 17,
      topSuppliers: ['Ingredion', 'MGP', 'Roquette'],
    },
    {
      opportunityId: 'opp-ashwagandha-extract',
      name: 'Ashwagandha Root Extract 5% Withanolides',
      category: 'botanicals',
      umap: [-0.3, -0.2, -2.2],
      companyCount: 23,
      topSuppliers: ['Sabinsa', 'Natreon', 'Ixoreal'],
    },
    {
      opportunityId: 'opp-ginkgo-biloba',
      name: 'Ginkgo Biloba Leaf Extract 24/6',
      category: 'botanicals',
      umap: [-0.15, -0.35, -2.05],
      companyCount: 15,
      topSuppliers: ['Indena', 'Euromed', 'Frutarom'],
    },
    {
      opportunityId: 'opp-green-tea-egcg',
      name: 'Green Tea Extract EGCG 50%',
      category: 'botanicals',
      umap: [-0.5, 0.05, -2.15],
      companyCount: 19,
      topSuppliers: ['Taiyo', 'Applied Food', 'Martin Bauer'],
    },
    {
      opportunityId: 'opp-cyanocobalamin',
      name: 'Cyanocobalamin 1% on Maltodextrin',
      category: 'vitamins',
      umap: [2.35, -0.5, 1.35],
      companyCount: 28,
      topSuppliers: ['DSM', 'BASF', 'Vertellus'],
    },
    {
      opportunityId: 'opp-silicon-dioxide',
      name: 'Colloidal Silicon Dioxide',
      category: 'excipients',
      umap: [-2.5, -1.2, 1.55],
      companyCount: 39,
      topSuppliers: ['Evonik', 'Wacker', 'Grace'],
    },
  ] as const

export interface OpportunityDetail {
  opportunityId: string
  title: string
  category: IngredientCategory
  companyCount: number
  topSuppliers: readonly string[]
  summary: string
}

const DETAILS: Record<string, OpportunityDetail> = {
  'opp-ascorbic-acid': {
    opportunityId: 'opp-ascorbic-acid',
    title: 'L-Ascorbic Acid',
    category: 'vitamins',
    companyCount: 38,
    topSuppliers: ['DSM Nutritional', 'Northeast Pharma', 'Vertellus'],
    summary:
      'High-overlap vitamin C grades across EU and APAC formulators — consolidation potential on COA harmonization and dual sourcing.',
  },
  'opp-d3-cholecalciferol': {
    opportunityId: 'opp-d3-cholecalciferol',
    title: 'Cholecalciferol (D3)',
    category: 'vitamins',
    companyCount: 22,
    topSuppliers: ['DSM', 'Fermenta', 'Zhejiang Garden'],
    summary:
      'Oil vs powder matrix variants cluster separately in embedding space; review beadlet specification for tablet lines.',
  },
  'opp-tocopherol-acetate': {
    opportunityId: 'opp-tocopherol-acetate',
    title: 'DL-α-Tocopheryl Acetate',
    category: 'vitamins',
    companyCount: 29,
    topSuppliers: ['BASF', 'ADM', 'Wilmar'],
    summary:
      'Synthetic vs natural-origin claims drive BOM forks — align label claims before supplier rationalization.',
  },
  'opp-niacinamide': {
    opportunityId: 'opp-niacinamide',
    title: 'Niacinamide',
    category: 'vitamins',
    companyCount: 41,
    topSuppliers: ['Lonza', 'Vertellus', 'Jubilant'],
    summary:
      'Cosmeceutical and nutraceutical demand overlap; check residual nicotinic acid limits for sensitive SKUs.',
  },
  'opp-magnesium-citrate': {
    opportunityId: 'opp-magnesium-citrate',
    title: 'Magnesium Citrate Tribasic',
    category: 'minerals',
    companyCount: 33,
    topSuppliers: ['Dr. Paul Lohmann', 'Jost', 'Gadot'],
    summary:
      'Hydrate form and bulk density variance affects capsule fill — opportunity to standardize on one tribasic spec.',
  },
  'opp-zinc-bisglycinate': {
    opportunityId: 'opp-zinc-bisglycinate',
    title: 'Zinc Bisglycinate',
    category: 'minerals',
    companyCount: 19,
    topSuppliers: ['Albion', 'Balchem', 'Solgar'],
    summary:
      'Chelate grades show tight supplier concentration; negotiate frame agreement on elemental zinc assay bands.',
  },
  'opp-calcium-carbonate': {
    opportunityId: 'opp-calcium-carbonate',
    title: 'Calcium Carbonate (Heavy)',
    category: 'minerals',
    companyCount: 52,
    topSuppliers: ['Omya', 'Huber', 'Minerals Tech'],
    summary:
      'Ubiquitous mineral with fragmented particle size specs — map PSD to compression profiles for consolidation.',
  },
  'opp-ferrous-fumarate': {
    opportunityId: 'opp-ferrous-fumarate',
    title: 'Ferrous Fumarate',
    category: 'minerals',
    companyCount: 16,
    topSuppliers: ['Salvavidas', 'Jost', 'Dr. Paul Lohmann'],
    summary:
      'Iron salts are compliance-heavy; align elemental iron declaration and microbial limits across regions.',
  },
  'opp-whey-protein-isolate': {
    opportunityId: 'opp-whey-protein-isolate',
    title: 'Whey Protein Isolate 90',
    category: 'proteins',
    companyCount: 27,
    topSuppliers: ['Glanbia', 'Lactalis', 'Arla'],
    summary:
      'Instantiation and agglomeration drive sensory differences — benchmark solubility curves before dual approval.',
  },
  'opp-pea-protein-80': {
    opportunityId: 'opp-pea-protein-80',
    title: 'Pea Protein Isolate 80%',
    category: 'proteins',
    companyCount: 31,
    topSuppliers: ['Roquette', 'Cosucra', 'Ingredion'],
    summary:
      'Off-flavor masking correlates with supplier process; pilot two pea bases on shared UHT beverage platform.',
  },
  'opp-collagen-peptides': {
    opportunityId: 'opp-collagen-peptides',
    title: 'Bovine Collagen Peptides',
    category: 'proteins',
    companyCount: 24,
    topSuppliers: ['Gelita', 'Rousselot', 'Weishardt'],
    summary:
      'Peptide MW distribution affects mouthfeel; harmonize analytical method (SEC) across QA labs.',
  },
  'opp-mct-oil': {
    opportunityId: 'opp-mct-oil',
    title: 'MCT Oil C8/C10 60:40',
    category: 'oils',
    companyCount: 18,
    topSuppliers: ['Stepan', 'ABITEC', 'IOI Oleo'],
    summary:
      'C8 purity and oxidation stability split the market — align Iodine Value and Peroxide Value targets.',
  },
  'opp-sunflower-lecithin': {
    opportunityId: 'opp-sunflower-lecithin',
    title: 'Sunflower Lecithin Liquid',
    category: 'oils',
    companyCount: 21,
    topSuppliers: ['Cargill', 'ADM', 'Lipoid'],
    summary:
      'Non-GMO sunflower vs soy substitution wave; verify acetone-insoluble matter specs for chocolate applications.',
  },
  'opp-evening-primrose': {
    opportunityId: 'opp-evening-primrose',
    title: 'Evening Primrose Oil 10% GLA',
    category: 'oils',
    companyCount: 12,
    topSuppliers: ['Henry Lamotte', 'Croda', 'BASF'],
    summary:
      'Specialty PUFA with long lead times — opportunity to lock rolling forecasts with primary refiner.',
  },
  'opp-microcrystalline-cellulose': {
    opportunityId: 'opp-microcrystalline-cellulose',
    title: 'Microcrystalline Cellulose PH 102',
    category: 'excipients',
    companyCount: 47,
    topSuppliers: ['JRS Pharma', 'DFE Pharma', 'Mingtai'],
    summary:
      'PH grade proliferation drives inventory SKUs — rationalize to PH 102 + PH 200 for tablet suite.',
  },
  'opp-croscarmellose-sodium': {
    opportunityId: 'opp-croscarmellose-sodium',
    title: 'Croscarmellose Sodium',
    category: 'excipients',
    companyCount: 26,
    topSuppliers: ['JRS Pharma', 'DFE Pharma', 'Ashland'],
    summary:
      'Superdisintegrant performance is compression-speed sensitive; align disintegration method (USP <701>).',
  },
  'opp-magnesium-stearate': {
    opportunityId: 'opp-magnesium-stearate',
    title: 'Magnesium Stearate Vegetable',
    category: 'excipients',
    companyCount: 44,
    topSuppliers: ['Peter Greven', 'FACI', 'Norac'],
    summary:
      'Lubricant film thickness affects dissolution tail — map stearate vendor to press force setpoints.',
  },
  'opp-hpmc-2910': {
    opportunityId: 'opp-hpmc-2910',
    title: 'Hypromellose 2910 E5',
    category: 'excipients',
    companyCount: 20,
    topSuppliers: ['Ashland', 'Shin-Etsu', 'Colorcon'],
    summary:
      'Viscosity grade E5 vs E15 confusion in BOMs — clean up coating vs binder usage in master data.',
  },
  'opp-maltodextrin-de10': {
    opportunityId: 'opp-maltodextrin-de10',
    title: 'Maltodextrin DE 10–12',
    category: 'carbohydrates',
    companyCount: 36,
    topSuppliers: ['Ingredion', 'Tate & Lyle', 'Cargill'],
    summary:
      'Carrier for spray-dried actives — align DE range and dextrose equivalent testing across plants.',
  },
  'opp-isomaltulose': {
    opportunityId: 'opp-isomaltulose',
    title: 'Isomaltulose (Palatinose)',
    category: 'carbohydrates',
    companyCount: 14,
    topSuppliers: ['BENEO', 'Cargill', 'Tate & Lyle'],
    summary:
      'Low-GI positioning requires consistent analytical GI testing narrative for regulatory dossiers.',
  },
  'opp-resistance-starch': {
    opportunityId: 'opp-resistance-starch',
    title: 'Resistant Starch RS4',
    category: 'carbohydrates',
    companyCount: 17,
    topSuppliers: ['Ingredion', 'MGP', 'Roquette'],
    summary:
      'Fiber claims depend on RS type and jurisdiction — pair technical marketing with legal review.',
  },
  'opp-ashwagandha-extract': {
    opportunityId: 'opp-ashwagandha-extract',
    title: 'Ashwagandha Root Extract 5% Withanolides',
    category: 'botanicals',
    companyCount: 23,
    topSuppliers: ['Sabinsa', 'Natreon', 'Ixoreal'],
    summary:
      'Withanolide profile and solvent residue limits vary — consolidate on one extract monograph for EU.',
  },
  'opp-ginkgo-biloba': {
    opportunityId: 'opp-ginkgo-biloba',
    title: 'Ginkgo Biloba Leaf Extract 24/6',
    category: 'botanicals',
    companyCount: 15,
    topSuppliers: ['Indena', 'Euromed', 'Frutarom'],
    summary:
      'Ginkgolic acid caps are strict — dual-source with harmonized HPLC identity method.',
  },
  'opp-green-tea-egcg': {
    opportunityId: 'opp-green-tea-egcg',
    title: 'Green Tea Extract EGCG 50%',
    category: 'botanicals',
    companyCount: 19,
    topSuppliers: ['Taiyo', 'Applied Food', 'Martin Bauer'],
    summary:
      'Catechin degradation in storage clusters suppliers in embedding space; tighten packaging OTR specs.',
  },
  'opp-cyanocobalamin': {
    opportunityId: 'opp-cyanocobalamin',
    title: 'Cyanocobalamin 1% on Maltodextrin',
    category: 'vitamins',
    companyCount: 28,
    topSuppliers: ['DSM', 'BASF', 'Vertellus'],
    summary:
      'Dilution on carrier drives assay drift — align potency overage policy across SKUs.',
  },
  'opp-silicon-dioxide': {
    opportunityId: 'opp-silicon-dioxide',
    title: 'Colloidal Silicon Dioxide',
    category: 'excipients',
    companyCount: 39,
    topSuppliers: ['Evonik', 'Wacker', 'Grace'],
    summary:
      'Aerosil-equivalent grades differ in tapped density — opportunity to reduce glidant SKU count.',
  },
}

export function getOpportunityDetail(
  opportunityId: string
): OpportunityDetail | undefined {
  return DETAILS[opportunityId]
}

export const KNOWN_OPPORTUNITY_IDS = Object.keys(DETAILS) as readonly string[]
