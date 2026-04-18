import PageHeader from '@/components/layout/PageHeader'
import MapSidebarToggle from '@/components/network-map/MapSidebarToggle'
import PageMapDrawer from '@/components/network-map/PageMapDrawer'
import ProductsTable from '@/components/sourcing/ProductsTable'
import { getFinishedGoods } from '@/lib/queries'

export default async function ProductsPage() {
  const rows = await getFinishedGoods()

  const withBom = rows.filter((r) => r.ingredientCount > 0).length
  const totalIngredients = rows.reduce((s, r) => s + r.ingredientCount, 0)

  return (
    <PageMapDrawer>
      <PageHeader
        eyebrow="Sourcing"
        title="Products"
        description="All finished goods in the Spherecast network — click a product to inspect its BOM and linked raw materials."
        actions={<MapSidebarToggle />}
      />

      <div
        className="stat-row"
        style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}
      >
        <div className="stat-card">
          <div className="stat-label">Finished Goods</div>
          <div className="stat-value">{rows.length}</div>
          <div className="stat-delta">total in network</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">With BOM</div>
          <div className="stat-value">{withBom}</div>
          <div className="stat-delta">have ingredient data</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Ingredients</div>
          <div className="stat-value">{totalIngredients.toLocaleString()}</div>
          <div className="stat-delta">across all BOMs</div>
        </div>
      </div>

      <ProductsTable rows={rows} />
    </PageMapDrawer>
  )
}
