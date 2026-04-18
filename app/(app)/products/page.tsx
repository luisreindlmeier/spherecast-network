import PageHeader from '@/components/layout/PageHeader'
import MapSidebarToggle from '@/components/network-map/MapSidebarToggle'
import PageMapDrawer from '@/components/network-map/PageMapDrawer'
import { getFinishedGoods } from '@/lib/queries'

export default async function ProductsPage() {
  const products = await getFinishedGoods()

  return (
    <PageMapDrawer>
      <PageHeader
        eyebrow="Sourcing"
        title="Products"
        description="Your finished goods. Click a product to inspect its BOM and linked raw materials."
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
            {products.length} finished goods
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr auto auto',
          }}
        >
          {products.map((p, i) => (
            <div key={p.id} style={{ display: 'contents' }}>
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
                {p.sku}
              </div>
              <div
                style={{
                  padding: '11px 16px',
                  fontSize: 13,
                  color: 'var(--text-primary)',
                  borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                }}
              >
                {p.company?.name ?? '—'}
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
                finished good
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageMapDrawer>
  )
}
