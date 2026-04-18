import { notFound } from 'next/navigation'
import Link from 'next/link'
import PageHeader from '@/components/layout/PageHeader'
import MapSidebarToggle from '@/components/network-map/MapSidebarToggle'
import PageMapDrawer from '@/components/network-map/PageMapDrawer'
import { getFinishedGoodDetail } from '@/lib/queries'
import { bomLinesCount } from '@/lib/format-labels'
import { ArrowLeft, Atom, Package } from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

export default async function FinishedGoodDetailPage({ params }: Props) {
  const { id } = await params
  const product = await getFinishedGoodDetail(Number(id))
  if (!product) notFound()

  return (
    <PageMapDrawer>
      <div className="detail-back">
        <Link href="/products" className="detail-back-link">
          <ArrowLeft size={13} />
          Products
        </Link>
      </div>

      <PageHeader
        eyebrow="Finished good"
        title={product.sku}
        description={`Owned by ${product.companyName} · ${product.ingredientCount} BOM ingredient${product.ingredientCount !== 1 ? 's' : ''}`}
        actions={<MapSidebarToggle />}
      />

      <div
        className="stat-row"
        style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: 28 }}
      >
        <div className="stat-card">
          <div className="stat-label">Brand</div>
          <div className="stat-value" style={{ fontSize: 18 }}>
            <Link
              href={`/companies/${product.companyId}`}
              className="detail-link"
            >
              {product.companyName}
            </Link>
          </div>
          <div className="stat-delta">product owner</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">BOM ingredients</div>
          <div className="stat-value">{product.ingredientCount}</div>
          <div className="stat-delta">raw materials and intermediates</div>
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-header">
          <Atom size={14} />
          <span>Ingredients</span>
          <span className="data-badge data-badge-muted detail-section-count">
            {bomLinesCount(product.ingredients.length)}
          </span>
        </div>
        {product.ingredients.length === 0 ? (
          <div className="detail-empty">
            No BOM is linked to this product yet.
          </div>
        ) : (
          <div className="detail-list">
            {product.ingredients.map((row) => {
              const href =
                row.type === 'finished-good'
                  ? `/products/${row.id}`
                  : `/raw-materials/${row.id}`
              return (
                <Link
                  key={row.id}
                  href={href}
                  className="detail-list-row detail-list-row-link"
                >
                  <Package size={13} aria-hidden style={{ flexShrink: 0 }} />
                  <span className="data-sku">{row.sku}</span>
                  <span className="detail-list-name">{row.companyName}</span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </PageMapDrawer>
  )
}
