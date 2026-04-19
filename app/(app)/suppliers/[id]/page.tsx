import { notFound } from 'next/navigation'
import Link from 'next/link'
import PageHeader from '@/components/layout/PageHeader'
import { getSupplierDetail, getSupplierPerformance } from '@/lib/agnes-queries'
import {
  brandsLinkedCount,
  linkedSkusLabel,
  productsUsedInLabel,
} from '@/lib/format-labels'
import {
  ArrowLeft,
  Atom,
  Building2,
  Star,
  MapPin,
  FileCheck,
  BadgeCheck,
} from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

export default async function SupplierDetailPage({ params }: Props) {
  const { id } = await params
  const [supplier, performance] = await Promise.all([
    getSupplierDetail(Number(id)),
    getSupplierPerformance(Number(id)),
  ])
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
        description={`${supplier.materialCount} linked raw-material SKU${supplier.materialCount !== 1 ? 's' : ''} · reaches ${supplier.companiesReached} brand${supplier.companiesReached !== 1 ? 's' : ''}`}
      />

      {/* Stats */}
      <div
        className="stat-row"
        style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 28 }}
      >
        <div className="stat-card">
          <div className="stat-label">Linked SKUs</div>
          <div className="stat-value">{supplier.materialCount}</div>
          <div className="stat-delta">SKU links in database</div>
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
            <span>Linked raw materials</span>
            <span className="data-badge data-badge-muted detail-section-count">
              {linkedSkusLabel(supplier.materials.length)}
            </span>
          </div>
          {supplier.materials.length === 0 ? (
            <div className="detail-empty">No linked SKUs yet</div>
          ) : (
            <div className="detail-list">
              {supplier.materials.map((m) => (
                <Link
                  key={m.productId}
                  href={`/raw-materials/${m.productId}`}
                  className="detail-list-row detail-list-row-link"
                >
                  <span className="detail-list-name">{m.ingredientName}</span>
                  <span className="data-name">{m.companyName}</span>
                  {m.usedInProducts > 0 && (
                    <span className="data-badge data-badge-muted">
                      {productsUsedInLabel(m.usedInProducts)}
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
            <span className="data-badge data-badge-muted detail-section-count">
              {brandsLinkedCount(supplier.companies.length)}
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
                    {linkedSkusLabel(c.productCount)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Facilities */}
        <div className="detail-section">
          <div className="detail-section-header">
            <MapPin size={14} />
            <span>Manufacturing facilities</span>
            <span className="data-badge data-badge-muted detail-section-count">
              {supplier.facilities.length === 0
                ? 'none on record'
                : `${supplier.facilities.length} location${supplier.facilities.length !== 1 ? 's' : ''}`}
            </span>
          </div>
          {supplier.facilities.length === 0 ? (
            <div className="detail-empty">No facility records on file</div>
          ) : (
            <div className="detail-list">
              {supplier.facilities.map((f) => (
                <div key={f.id} className="detail-list-row">
                  <span className="detail-list-name">{f.name}</span>
                  <span className="data-name">
                    {[f.city, f.state, f.country].filter(Boolean).join(', ')}
                  </span>
                  {f.fdaRegNumber && (
                    <span className="data-badge data-badge-muted">
                      FDA {f.fdaRegNumber}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rating & Certifications */}
        <div className="detail-section">
          <div className="detail-section-header">
            {supplier.rating ? (
              <BadgeCheck size={14} />
            ) : (
              <FileCheck size={14} />
            )}
            <span>Certifications</span>
            {supplier.rating && (
              <span className="data-badge data-badge-green detail-section-count">
                Rank #{supplier.rating.rank}
              </span>
            )}
          </div>
          {supplier.rating ? (
            <div className="flex flex-col gap-3 px-1 py-2">
              <div className="text-xs text-gray-500">
                <span className="font-medium text-gray-700">Segment:</span>{' '}
                {supplier.rating.segment}
              </div>
              {supplier.rating.revenueBn && (
                <div className="text-xs text-gray-500">
                  <span className="font-medium text-gray-700">Revenue:</span>{' '}
                  {supplier.rating.revenueBn}B USD (est.)
                </div>
              )}
              <div className="flex flex-wrap gap-1 mt-1">
                {supplier.rating.certifications.map((cert) => (
                  <span key={cert} className="data-badge data-badge-green">
                    {cert}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="detail-empty">No certification data on file</div>
          )}
        </div>

        {/* Performance History */}
        <div className="detail-section">
          <div className="detail-section-header">
            <Star size={14} />
            <span>Performance History</span>
            {performance && performance.auditScore >= 4.5 && (
              <span className="data-badge data-badge-green detail-section-count">
                Excellent
              </span>
            )}
          </div>
          {performance ? (
            <div className="flex flex-col gap-3 px-1 py-2">
              <div className="flex gap-4 flex-wrap">
                <div className="text-xs text-gray-500">
                  <span className="font-medium text-gray-700">
                    On-time rate:
                  </span>{' '}
                  <span
                    style={{
                      color:
                        performance.onTimeRate >= 0.95
                          ? 'var(--accent-green)'
                          : performance.onTimeRate >= 0.88
                            ? 'var(--accent-yellow)'
                            : 'var(--accent-red)',
                    }}
                  >
                    {(performance.onTimeRate * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  <span className="font-medium text-gray-700">
                    Rejection rate:
                  </span>{' '}
                  <span
                    style={{
                      color:
                        performance.rejectionRate <= 0.01
                          ? 'var(--accent-green)'
                          : performance.rejectionRate <= 0.025
                            ? 'var(--accent-yellow)'
                            : 'var(--accent-red)',
                    }}
                  >
                    {(performance.rejectionRate * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  <span className="font-medium text-gray-700">
                    Avg lead time:
                  </span>{' '}
                  {performance.avgLeadDays}d
                </div>
                <div className="text-xs text-gray-500">
                  <span className="font-medium text-gray-700">
                    Audit score:
                  </span>{' '}
                  {performance.auditScore.toFixed(1)}/5.0
                </div>
              </div>
              {performance.lastAuditDate && (
                <div className="text-xs text-gray-400">
                  Last audit: {performance.lastAuditDate}
                </div>
              )}
            </div>
          ) : (
            <div className="detail-empty">No performance data on file</div>
          )}
        </div>
      </div>
    </>
  )
}
