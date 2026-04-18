import PageHeader from '@/components/layout/PageHeader'
import MapSidebarToggle from '@/components/network-map/MapSidebarToggle'
import PageMapDrawer from '@/components/network-map/PageMapDrawer'
import SuppliersTable from '@/components/sourcing/SuppliersTable'
import { getSuppliers } from '@/lib/queries'

export default async function MySuppliersPage() {
  const rows = await getSuppliers()

  const maxMaterials = Math.max(...rows.map((r) => r.materialCount), 1)
  const totalLinks = rows.reduce((s, r) => s + r.materialCount, 0)
  const avgMaterials =
    rows.length > 0 ? Math.round(totalLinks / rows.length) : 0

  return (
    <PageMapDrawer>
      <PageHeader
        eyebrow="Sourcing · Suppliers"
        title="My Suppliers"
        description="All qualified suppliers in the Spherecast network — material coverage and sourcing breadth."
        actions={<MapSidebarToggle />}
      />

      <div
        className="stat-row"
        style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}
      >
        <div className="stat-card">
          <div className="stat-label">Suppliers</div>
          <div className="stat-value">{rows.length}</div>
          <div className="stat-delta">qualified</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Material Links</div>
          <div className="stat-value">{totalLinks.toLocaleString()}</div>
          <div className="stat-delta">total pairings</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg per Supplier</div>
          <div className="stat-value">{avgMaterials}</div>
          <div className="stat-delta">materials supplied</div>
        </div>
      </div>

      <SuppliersTable rows={rows} maxMaterials={maxMaterials} />
    </PageMapDrawer>
  )
}
