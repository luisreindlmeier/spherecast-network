import PageHeader from '@/components/layout/PageHeader'
import DummyBlock from '@/components/layout/DummyBlock'
import MapSidebarToggle from '@/components/network-map/MapSidebarToggle'
import PageMapDrawer from '@/components/network-map/PageMapDrawer'

const products = [
  { sku: 'NF-D3-5000', name: 'Vitamin D3 Softgel', ingredients: 4 },
  { sku: 'NF-MAG-400', name: 'Magnesium Glycinate', ingredients: 3 },
  { sku: 'NF-OMG-1000', name: 'Omega-3 Fish Oil', ingredients: 5 },
  { sku: 'NF-B12-1000', name: 'Methyl-B12 Lozenge', ingredients: 4 },
  { sku: 'NF-ASH-600', name: 'Ashwagandha Extract', ingredients: 3 },
]

export default function ProductsPage() {
  return (
    <PageMapDrawer>
      <PageHeader
        eyebrow="Sourcing"
        title="Products"
        titleActions={<MapSidebarToggle />}
        description="Your finished goods. Click a product to inspect its BOM and linked raw materials."
      />

      <DummyBlock title="22 finished goods" hint="showing 5 of 22">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr auto',
            rowGap: 0,
          }}
        >
          {products.map((p, i) => (
            <div key={p.sku} style={{ display: 'contents' }}>
              <div
                style={{
                  padding: '12px 0 12px 4px',
                  fontFamily: 'var(--font-secondary)',
                  fontSize: 11.5,
                  color: 'var(--text-muted)',
                  borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                }}
              >
                {p.sku}
              </div>
              <div
                style={{
                  padding: '12px 16px',
                  fontSize: 13,
                  color: 'var(--text-primary)',
                  borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                }}
              >
                {p.name}
              </div>
              <div
                style={{
                  padding: '12px 4px',
                  fontSize: 11.5,
                  color: 'var(--text-muted)',
                  borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                }}
              >
                {p.ingredients} ingredients
              </div>
            </div>
          ))}
        </div>
      </DummyBlock>
    </PageMapDrawer>
  )
}
