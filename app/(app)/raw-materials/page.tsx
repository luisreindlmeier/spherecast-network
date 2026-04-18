import PageHeader from '@/components/layout/PageHeader'
import MapSidebarToggle from '@/components/network-map/MapSidebarToggle'
import PageMapDrawer from '@/components/network-map/PageMapDrawer'
import RawMaterialsTable from '@/components/sourcing/RawMaterialsTable'
import { getRawMaterials } from '@/lib/queries'

export default async function RawMaterialsPage() {
  const rows = await getRawMaterials()

  const withSuppliers = rows.filter((r) => r.supplierCount > 0).length
  const noSuppliers = rows.filter((r) => r.supplierCount === 0).length
  const multiSuppliers = rows.filter((r) => r.supplierCount >= 2).length

  return (
    <PageMapDrawer>
      <PageHeader
        eyebrow="Sourcing"
        title="Raw Materials"
        description="All ingredients in the Spherecast network — supplier coverage, BOM usage, and consolidation potential."
        actions={<MapSidebarToggle />}
      />

      <div
        className="stat-row"
        style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}
      >
        <div className="stat-card">
          <div className="stat-label">Raw Materials</div>
          <div className="stat-value">{rows.length}</div>
          <div className="stat-delta">total in network</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Covered</div>
          <div className="stat-value" style={{ color: 'var(--accent-green)' }}>
            {withSuppliers}
          </div>
          <div className="stat-delta">have ≥1 supplier</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Multi-Supplier</div>
          <div className="stat-value" style={{ color: 'var(--accent-blue)' }}>
            {multiSuppliers}
          </div>
          <div className="stat-delta">≥2 suppliers</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Uncovered</div>
          <div
            className="stat-value"
            style={{
              color:
                noSuppliers > 0 ? 'var(--accent-red)' : 'var(--text-muted)',
            }}
          >
            {noSuppliers}
          </div>
          <div className="stat-delta">no supplier yet</div>
        </div>
      </div>

      <RawMaterialsTable rows={rows} />
    </PageMapDrawer>
  )
}
