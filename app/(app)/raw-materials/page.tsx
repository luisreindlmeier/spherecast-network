import PageHeader from '@/components/layout/PageHeader'
import MapSidebarToggle from '@/components/network-map/MapSidebarToggle'
import PageMapDrawer from '@/components/network-map/PageMapDrawer'
import { getRawMaterials } from '@/lib/queries'

export default async function RawMaterialsPage() {
  const materials = await getRawMaterials()

  return (
    <PageMapDrawer>
      <PageHeader
        eyebrow="Sourcing"
        title="Raw Materials"
        description="The ingredients you buy — with substitutes, specs and active suppliers."
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
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-secondary)',
            }}
          >
            {materials.length} raw materials
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr auto',
          }}
        >
          {materials.map((m, i) => (
            <div key={m.id} style={{ display: 'contents' }}>
              <div
                style={{
                  padding: '11px 8px 11px 16px',
                  fontFamily: 'var(--font-secondary)',
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                  whiteSpace: 'nowrap',
                }}
              >
                {m.sku}
              </div>
              <div
                style={{
                  padding: '11px 16px',
                  fontSize: 13,
                  color: 'var(--text-primary)',
                  borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                }}
              >
                {m.company?.name ?? '—'}
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
                {m.supplierCount > 0
                  ? `${m.supplierCount} supplier${m.supplierCount !== 1 ? 's' : ''}`
                  : '—'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageMapDrawer>
  )
}
