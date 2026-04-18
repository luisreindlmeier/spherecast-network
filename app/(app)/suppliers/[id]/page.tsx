import { notFound } from 'next/navigation'
import Link from 'next/link'
import PageHeader from '@/components/layout/PageHeader'
import PlaceholderSection from '@/components/sourcing/PlaceholderSection'
import { getSupplierDetail } from '@/lib/queries'
import {
  ArrowLeft,
  Atom,
  Building2,
  Star,
  Phone,
  FileCheck,
} from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

export default async function SupplierDetailPage({ params }: Props) {
  const { id } = await params
  const supplier = await getSupplierDetail(Number(id))
  if (!supplier) notFound()

  return (
    <>
      <div className="detail-back">
        <Link href="/suppliers" className="detail-back-link">
          <ArrowLeft size={13} />
          Suppliers
        </Link>
      </div>

      <PageHeader
        eyebrow="Supplier"
        title={supplier.name}
        description={`Supplies ${supplier.materialCount} raw material${supplier.materialCount !== 1 ? 's' : ''} · reaches ${supplier.companiesReached} brand${supplier.companiesReached !== 1 ? 's' : ''}`}
      />

      {/* Stats */}
      <div
        className="stat-row"
        style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 28 }}
      >
        <div className="stat-card">
          <div className="stat-label">Materials Supplied</div>
          <div className="stat-value">{supplier.materialCount}</div>
          <div className="stat-delta">raw materials in portfolio</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Brands Reached</div>
          <div className="stat-value" style={{ color: 'var(--accent-blue)' }}>
            {supplier.companiesReached}
          </div>
          <div className="stat-delta">through BOMs</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">BOM Touchpoints</div>
          <div className="stat-value">
            {supplier.materials.reduce((s, m) => s + m.usedInProducts, 0)}
          </div>
          <div className="stat-delta">product appearances</div>
        </div>
      </div>

      <div className="detail-grid">
        {/* Materials Portfolio */}
        <div className="detail-section">
          <div className="detail-section-header">
            <Atom size={14} />
            <span>Materials portfolio</span>
            <span className="detail-section-count">
              {supplier.materials.length}
            </span>
          </div>
          {supplier.materials.length === 0 ? (
            <div className="detail-empty">No materials linked</div>
          ) : (
            <div className="detail-list">
              {supplier.materials.map((m) => (
                <Link
                  key={m.productId}
                  href={`/raw-materials/${m.productId}`}
                  className="detail-list-row detail-list-row-link"
                >
                  <span className="data-sku">{m.sku}</span>
                  <span className="detail-list-name">{m.companyName}</span>
                  {m.usedInProducts > 0 && (
                    <span className="data-badge data-badge-muted">
                      {m.usedInProducts} product
                      {m.usedInProducts !== 1 ? 's' : ''}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Brands reached */}
        <div className="detail-section">
          <div className="detail-section-header">
            <Building2 size={14} />
            <span>Brands reached</span>
            <span className="detail-section-count">
              {supplier.companies.length}
            </span>
          </div>
          {supplier.companies.length === 0 ? (
            <div className="detail-empty">No brands reached yet</div>
          ) : (
            <div className="detail-list">
              {supplier.companies.map((c) => (
                <Link
                  key={c.id}
                  href={`/companies/${c.id}`}
                  className="detail-list-row detail-list-row-link"
                >
                  <span className="detail-list-name">{c.name}</span>
                  <span className="data-badge data-badge-blue">
                    {c.productCount} material{c.productCount !== 1 ? 's' : ''}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Placeholder: Contact & Location */}
        <PlaceholderSection
          title="Contact & Location"
          description="Primary contact, headquarters, warehousing locations, and emergency contacts."
          icon={<Phone size={14} />}
        />

        {/* Placeholder: Certifications */}
        <PlaceholderSection
          title="Certifications"
          description="GMP, ISO, organic, Halal/Kosher, Non-GMO and other quality certifications."
          icon={<FileCheck size={14} />}
        />

        {/* Placeholder: Performance */}
        <PlaceholderSection
          title="Performance History"
          description="On-time delivery rate, quality rejection rate, and historical order volume."
          icon={<Star size={14} />}
        />
      </div>
    </>
  )
}
