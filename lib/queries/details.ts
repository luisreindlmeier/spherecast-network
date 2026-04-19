import { createServerClient } from '@/lib/supabase-server'
import type { Company, Product, Supplier } from '@/types/database'
import { throwIfError } from '@/lib/queries/shared'
import type {
  CompanyDetail,
  FinishedGoodDetail,
  FinishedGoodIngredientRow,
  RawMaterialDetail,
  SupplierDetail,
} from '@/lib/queries/types'

type ProductWithCompanyName = Product & {
  company: Pick<Company, 'name'> | null
}

type SupplierLink = {
  supplier_id: number
  product_id: number
}

type BomComponentRow = {
  bom_id: number
  consumed_product_id: number
}

type BomRow = {
  id: number
  produced_product_id: number
}

function buildUsageMapByConsumedProduct(
  components: BomComponentRow[],
  bomToProducedProductId: Map<number, number>
): Map<number, Set<number>> {
  const usageMap = new Map<number, Set<number>>()

  for (const component of components) {
    const producedProductId = bomToProducedProductId.get(component.bom_id)
    if (producedProductId === undefined) {
      continue
    }

    if (!usageMap.has(component.consumed_product_id)) {
      usageMap.set(component.consumed_product_id, new Set())
    }

    usageMap.get(component.consumed_product_id)?.add(producedProductId)
  }

  return usageMap
}

function buildEmptyFinishedGoodDetail(product: ProductWithCompanyName): FinishedGoodDetail {
  return {
    id: product.id,
    sku: product.sku,
    companyId: product.company_id,
    companyName: product.company?.name ?? '—',
    ingredientCount: 0,
    ingredients: [],
  }
}

function toFinishedGoodIngredientRows(
  rows: Array<ProductWithCompanyName>
): FinishedGoodIngredientRow[] {
  return rows
    .map((row) => ({
      id: row.id,
      sku: row.sku,
      companyName: row.company?.name ?? '—',
      type: row.type,
    }))
    .sort((left, right) => left.sku.localeCompare(right.sku))
}

export async function getRawMaterialDetail(
  id: number
): Promise<RawMaterialDetail | null> {
  const db = createServerClient()

  const [
    { data: product, error: productError },
    { data: supplierLinks, error: supplierLinksError },
    { data: allSuppliers, error: suppliersError },
    { data: bomComponents, error: componentsError },
    { data: allBoms, error: bomsError },
    { data: allProducts, error: productsError },
    { data: allCompanies, error: companiesError },
  ] = await Promise.all([
    db.from('product').select('*, company(name)').eq('id', id).single(),
    db.from('supplier_product').select('*').eq('product_id', id),
    db.from('supplier').select('*'),
    db.from('bom_component').select('*').eq('consumed_product_id', id),
    db.from('bom').select('*'),
    db.from('product').select('*'),
    db.from('company').select('*'),
  ])

  if (productError || !product) {
    return null
  }

  throwIfError(supplierLinksError, 'getRawMaterialDetail.supplierLinks')
  throwIfError(suppliersError, 'getRawMaterialDetail.suppliers')
  throwIfError(componentsError, 'getRawMaterialDetail.bomComponents')
  throwIfError(bomsError, 'getRawMaterialDetail.boms')
  throwIfError(productsError, 'getRawMaterialDetail.products')
  throwIfError(companiesError, 'getRawMaterialDetail.companies')

  const typedProduct = product as ProductWithCompanyName

  const typedSupplierLinks = (supplierLinks ?? []) as SupplierLink[]

  const typedSuppliers = (allSuppliers ?? []) as Supplier[]
  const typedBomComponents = (bomComponents ?? []) as BomComponentRow[]
  const typedBoms = (allBoms ?? []) as BomRow[]
  const typedProducts = (allProducts ?? []) as Product[]
  const typedCompanies = (allCompanies ?? []) as Company[]

  const supplierMap = new Map(typedSuppliers.map((supplier) => [supplier.id, supplier]))
  const bomToProductMap = new Map(
    typedBoms.map((bom) => [bom.id, bom.produced_product_id])
  )
  const productMap = new Map(typedProducts.map((row) => [row.id, row]))
  const companyMap = new Map(typedCompanies.map((company) => [company.id, company]))

  const suppliers = typedSupplierLinks
    .map((link) => supplierMap.get(link.supplier_id))
    .filter((supplier): supplier is Supplier => supplier !== undefined)
    .sort((left, right) => left.name.localeCompare(right.name))

  const foundIn = typedBomComponents
    .map((component) => {
      const producedProductId = bomToProductMap.get(component.bom_id)
      if (producedProductId === undefined) {
        return null
      }

      const producedProduct = productMap.get(producedProductId)
      if (!producedProduct) {
        return null
      }

      const company = companyMap.get(producedProduct.company_id)
      return {
        productId: producedProduct.id,
        sku: producedProduct.sku,
        companyName: company?.name ?? '—',
      }
    })
    .filter(
      (
        row
      ): row is { productId: number; sku: string; companyName: string } =>
        row !== null
    )
    .sort((left, right) => left.sku.localeCompare(right.sku))

  return {
    id: typedProduct.id,
    sku: typedProduct.sku,
    companyId: typedProduct.company_id,
    companyName: typedProduct.company?.name ?? '—',
    supplierCount: suppliers.length,
    usedInProducts: foundIn.length,
    suppliers,
    foundIn,
  }
}

export async function getSupplierDetail(
  id: number
): Promise<SupplierDetail | null> {
  const db = createServerClient()

  const [
    { data: supplier, error: supplierError },
    { data: supplierLinks, error: linksError },
    { data: allProducts, error: productsError },
    { data: allCompanies, error: companiesError },
    { data: allBomComponents, error: componentsError },
    { data: allBoms, error: bomsError },
  ] = await Promise.all([
    db.from('supplier').select('*').eq('id', id).single(),
    db.from('supplier_product').select('*').eq('supplier_id', id),
    db.from('product').select('*, company(name)'),
    db.from('company').select('*'),
    db.from('bom_component').select('*'),
    db.from('bom').select('*'),
  ])

  if (supplierError || !supplier) {
    return null
  }

  throwIfError(linksError, 'getSupplierDetail.supplierLinks')
  throwIfError(productsError, 'getSupplierDetail.products')
  throwIfError(companiesError, 'getSupplierDetail.companies')
  throwIfError(componentsError, 'getSupplierDetail.bomComponents')
  throwIfError(bomsError, 'getSupplierDetail.boms')

  const typedSupplier = supplier as Supplier
  const typedLinks = (supplierLinks ?? []) as SupplierLink[]
  const typedProducts = (allProducts ?? []) as ProductWithCompanyName[]
  const typedCompanies = (allCompanies ?? []) as Company[]
  const typedComponents = (allBomComponents ?? []) as BomComponentRow[]
  const typedBoms = (allBoms ?? []) as BomRow[]

  const productMap = new Map(typedProducts.map((product) => [product.id, product]))
  const companyMap = new Map(typedCompanies.map((company) => [company.id, company]))
  const bomToProducedProductMap = new Map(
    typedBoms.map((bom) => [bom.id, bom.produced_product_id])
  )

  const usageMap = buildUsageMapByConsumedProduct(
    typedComponents,
    bomToProducedProductMap
  )

  const suppliedProductIds = new Set(typedLinks.map((row) => row.product_id))

  const materials = typedLinks
    .map((row) => {
      const product = productMap.get(row.product_id)
      if (!product) {
        return null
      }

      return {
        productId: product.id,
        sku: product.sku,
        companyName: product.company?.name ?? '—',
        usedInProducts: usageMap.get(product.id)?.size ?? 0,
      }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((left, right) => left.sku.localeCompare(right.sku))

  const reachedCompanyIds = new Set<number>()
  for (const productId of suppliedProductIds) {
    const usedInSet = usageMap.get(productId)
    if (!usedInSet) {
      continue
    }

    for (const producedId of usedInSet) {
      const product = productMap.get(producedId)
      if (product) {
        reachedCompanyIds.add(product.company_id)
      }
    }
  }

  const companies = [...reachedCompanyIds]
    .map((companyId) => {
      const company = companyMap.get(companyId)
      if (!company) {
        return null
      }

      const productCount = [...suppliedProductIds].filter((productId) => {
        const usedInSet = usageMap.get(productId)
        if (!usedInSet) {
          return false
        }

        for (const producedId of usedInSet) {
          const product = productMap.get(producedId)
          if (product?.company_id === companyId) {
            return true
          }
        }

        return false
      }).length

      return {
        id: company.id,
        name: company.name,
        productCount,
      }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((left, right) => right.productCount - left.productCount)

  return {
    id: typedSupplier.id,
    name: typedSupplier.name,
    materialCount: materials.length,
    companiesReached: companies.length,
    materials,
    companies,
  }
}

export async function getCompanyDetail(
  id: number
): Promise<CompanyDetail | null> {
  const db = createServerClient()

  const [
    { data: company, error: companyError },
    { data: products, error: productsError },
    { data: allBoms, error: bomsError },
    { data: allBomComponents, error: componentsError },
    { data: allSupplierLinks, error: linksError },
  ] = await Promise.all([
    db.from('company').select('*').eq('id', id).single(),
    db.from('product').select('*').eq('company_id', id),
    db.from('bom').select('*'),
    db.from('bom_component').select('*'),
    db.from('supplier_product').select('*'),
  ])

  if (companyError || !company) {
    return null
  }

  throwIfError(productsError, 'getCompanyDetail.products')
  throwIfError(bomsError, 'getCompanyDetail.boms')
  throwIfError(componentsError, 'getCompanyDetail.bomComponents')
  throwIfError(linksError, 'getCompanyDetail.supplierLinks')

  const typedCompany = company as Company
  const typedProducts = (products ?? []) as Product[]
  const typedBoms = (allBoms ?? []) as BomRow[]
  const typedComponents = (allBomComponents ?? []) as BomComponentRow[]
  const typedSupplierLinks = (allSupplierLinks ?? []) as SupplierLink[]

  const producedProductToBomMap = new Map(
    typedBoms.map((bom) => [bom.produced_product_id, bom.id])
  )

  const bomIngredientCountMap = new Map<number, number>()
  for (const component of typedComponents) {
    bomIngredientCountMap.set(
      component.bom_id,
      (bomIngredientCountMap.get(component.bom_id) ?? 0) + 1
    )
  }

  const supplierCountByProductId = new Map<number, number>()
  for (const link of typedSupplierLinks) {
    supplierCountByProductId.set(
      link.product_id,
      (supplierCountByProductId.get(link.product_id) ?? 0) + 1
    )
  }

  const usageMap = new Map<number, Set<number>>()
  for (const component of typedComponents) {
    if (!usageMap.has(component.consumed_product_id)) {
      usageMap.set(component.consumed_product_id, new Set())
    }

    usageMap.get(component.consumed_product_id)?.add(component.bom_id)
  }

  const finishedGoods = typedProducts
    .filter((product) => product.type === 'finished-good')
    .map((product) => {
      const bomId = producedProductToBomMap.get(product.id)
      return {
        id: product.id,
        sku: product.sku,
        ingredientCount:
          bomId !== undefined ? (bomIngredientCountMap.get(bomId) ?? 0) : 0,
      }
    })
    .sort((left, right) => left.sku.localeCompare(right.sku))

  const rawMaterials = typedProducts
    .filter((product) => product.type === 'raw-material')
    .map((product) => ({
      id: product.id,
      sku: product.sku,
      supplierCount: supplierCountByProductId.get(product.id) ?? 0,
      usedInProducts: usageMap.get(product.id)?.size ?? 0,
    }))
    .sort((left, right) => left.sku.localeCompare(right.sku))

  return {
    id: typedCompany.id,
    name: typedCompany.name,
    finishedGoods,
    rawMaterials,
  }
}

export async function getFinishedGoodDetail(
  id: number
): Promise<FinishedGoodDetail | null> {
  const db = createServerClient()

  const { data: product, error: productError } = await db
    .from('product')
    .select('*, company(name)')
    .eq('id', id)
    .single()

  if (productError || !product) {
    return null
  }

  const typedProduct = product as ProductWithCompanyName

  if (typedProduct.type !== 'finished-good') {
    return null
  }

  const { data: bom, error: bomError } = await db
    .from('bom')
    .select('id')
    .eq('produced_product_id', id)
    .maybeSingle()

  throwIfError(bomError, 'getFinishedGoodDetail.bom')

  if (!bom) {
    return buildEmptyFinishedGoodDetail(typedProduct)
  }

  const bomId = (bom as { id: number }).id

  const { data: components, error: componentsError } = await db
    .from('bom_component')
    .select('consumed_product_id')
    .eq('bom_id', bomId)

  throwIfError(componentsError, 'getFinishedGoodDetail.components')

  const consumedIds = [
    ...new Set(
      (components ?? []).map(
        (component) =>
          (component as { consumed_product_id: number }).consumed_product_id
      )
    ),
  ]

  if (consumedIds.length === 0) {
    return buildEmptyFinishedGoodDetail(typedProduct)
  }

  const { data: consumedRows, error: consumedRowsError } = await db
    .from('product')
    .select('id, sku, type, company(name)')
    .in('id', consumedIds)

  throwIfError(consumedRowsError, 'getFinishedGoodDetail.consumedRows')

  const ingredients = toFinishedGoodIngredientRows(
    (consumedRows ?? []) as ProductWithCompanyName[]
  )

  return {
    id: typedProduct.id,
    sku: typedProduct.sku,
    companyId: typedProduct.company_id,
    companyName: typedProduct.company?.name ?? '—',
    ingredientCount: ingredients.length,
    ingredients,
  }
}
