import { notFound } from 'next/navigation'
import Link from 'next/link'
import PageHeader from '@/components/layout/PageHeader'
import PlaceholderSection from '@/components/sourcing/PlaceholderSection'
import { getRawMaterialDetail } from '@/lib/queries'
import { FlaskConical, Package, Building2, ArrowLeft, Tag } from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

export default async function RawMaterialDetailPage({ params }: Props) {
  const { id } = await params
  const material = await getRawMaterialDetail(Number(id))
  if (!material) notFound()

  return (
    <>
      <div className="detail-back">
        <Link href="/raw-materials" className="detail-back-link">
          <ArrowLeft size={13} />
          Raw Materials
        </Link>
      </div>

      <PageHeader
        eyebrow="Raw Material"
        title={material.sku}
        description={`Owned by ${material.companyName} · ${material.supplierCount} supplier${material.supplierCount !== 1 ? 's' : ''} · used in ${material.usedInProducts} finished product${material.usedInProducts !== 1 ? 's' : ''}`}
      />

      {/* Stats */}
      <div
        className="stat-row"
        style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 28 }}
      >
        <div className="stat-card">
          <div className="stat-label">Brand</div>
          <div className="stat-value" style={{ fontSize: 18 }}>
            <Link
              href={`/companies/${material.companyId}`}
              className="detail-link"
            >
              {material.companyName}
            </Link>
          </div>
          <div className="stat-delta">product owner</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Suppliers</div>
          <div
            className="stat-value"
            style={{
              color:
                material.supplierCount === 0
                  ? 'var(--accent-red)'
                  : material.supplierCount === 1
                    ? 'var(--accent-yellow)'
                    : 'var(--accent-green)',
            }}
          >
            {material.supplierCount}
          </div>
          <div className="stat-delta">qualified</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Used in</div>
          <div className="stat-value">{material.usedInProducts}</div>
          <div className="stat-delta">finished products</div>
        </div>
      </div>

      <div className="detail-grid">
        {/* Suppliers */}
        <div className="detail-section">
          <div className="detail-section-header">
            <Building2 size={14} />
            <span>Supplied by</span>
            <span className="detail-section-count">
              {material.suppliers.length}
            </span>
          </div>
          {material.suppliers.length === 0 ? (
            <div className="detail-empty">No suppliers linked yet</div>
          ) : (
            <div className="detail-list">
              {material.suppliers.map((s) => (
                <Link
                  key={s.id}
                  href={`/suppliers/${s.id}`}
                  className="detail-list-row detail-list-row-link"
                >
                  <span className="detail-list-name">{s.name}</span>
                  <span className="data-badge data-badge-blue">supplier →</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Found in products */}
        <div className="detail-section">
          <div className="detail-section-header">
            <Package size={14} />
            <span>Found in finished goods</span>
            <span className="detail-section-count">
              {material.foundIn.length}
            </span>
          </div>
          {material.foundIn.length === 0 ? (
            <div className="detail-empty">Not referenced in any BOM</div>
          ) : (
            <div className="detail-list">
              {material.foundIn.map((p) => (
                <div key={p.productId} className="detail-list-row">
                  <span className="data-sku">{p.sku}</span>
                  <Link
                    href={`/companies/${material.companyId}`}
                    className="detail-list-name detail-link"
                  >
                    {p.companyName}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Placeholder: Specifications */}
        <PlaceholderSection
          title="Specifications"
          description="CAS number, INCI name, purity grade, particle size and regulatory status."
          icon={<FlaskConical size={14} />}
        />

        {/* Placeholder: Pricing & Lead Time */}
        <PlaceholderSection
          title="Pricing & Lead Time"
          description="Historical price trends, MOQs, current spot price and average delivery window."
          icon={<Tag size={14} />}
        />
      </div>
    </>
  )
}
