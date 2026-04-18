import PageHeader from '@/components/layout/PageHeader'
import MapSidebarToggle from '@/components/network-map/MapSidebarToggle'
import PageMapDrawer from '@/components/network-map/PageMapDrawer'
import { getSuppliers } from '@/lib/queries'

export default async function MySuppliersPage() {
  const suppliers = await getSuppliers()

  return (
    <PageMapDrawer>
      <PageHeader
        eyebrow="Sourcing · Suppliers"
        title="My Suppliers"
        description="Suppliers you already work with — active contracts, qualifications and open RFQs."
        actions={<MapSidebarToggle />}
      />

      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '10px 16px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-secondary)',
            }}
          >
            {suppliers.length} qualified suppliers
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
          }}
        >
          {suppliers.map((s, i) => (
            <div key={s.id} style={{ display: 'contents' }}>
              <div
                style={{
                  padding: '11px 16px',
                  fontSize: 13,
                  color: 'var(--text-primary)',
                  borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                }}
              >
                {s.name}
              </div>
              <div
                style={{
                  padding: '11px 16px',
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                  whiteSpace: 'nowrap',
                }}
              >
                {s.productCount} material{s.productCount !== 1 ? 's' : ''}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageMapDrawer>
  )
}
