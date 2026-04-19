import { notFound } from 'next/navigation'
import Link from 'next/link'
import PageHeader from '@/components/layout/PageHeader'
import { getCompanyDetail } from '@/lib/agnes-queries'
import { bomIngredientsLabel, skuListCount } from '@/lib/format-labels'
import {
  ArrowLeft,
  Package,
  Atom,
  MapPin,
  BarChart3,
  ShieldCheck,
} from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

export default async function CompanyDetailPage({ params }: Props) {
  const { id } = await params
  const company = await getCompanyDetail(Number(id))
  if (!company) notFound()

  const totalIngredients = company.finishedGoods.reduce(
    (s, g) => s + g.ingredientCount,
    0
  )
  const p = company.profile

  const hqParts = [p.hqCity, p.hqState, p.hqCountry].filter(Boolean)
  const hqLabel = hqParts.length > 0 ? hqParts.join(', ') : null

  return (
    <>
      <div className="detail-back">
        <Link href="/companies" className="detail-back-link">
          <ArrowLeft size={13} />
          Companies
        </Link>
      </div>

      <PageHeader
        eyebrow={
          p.type ? p.type.charAt(0).toUpperCase() + p.type.slice(1) : 'Brand'
        }
        title={company.name}
        description={`${company.finishedGoods.length} finished good${company.finishedGoods.length !== 1 ? 's' : ''} · ${company.rawMaterials.length} raw material${company.rawMaterials.length !== 1 ? 's' : ''} · ${totalIngredients} total BOM ingredients`}
      />

      {/* Stats */}
      <div
        className="stat-row"
        style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 28 }}
      >
        <div className="stat-card">
          <div className="stat-label">Finished Goods</div>
          <div className="stat-value">{company.finishedGoods.length}</div>
          <div className="stat-delta">in network</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Raw Materials</div>
          <div className="stat-value">{company.rawMaterials.length}</div>
          <div className="stat-delta">owned SKUs</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">BOM Ingredients</div>
          <div className="stat-value">{totalIngredients}</div>
          <div className="stat-delta">across all products</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Supplier Coverage</div>
          <div
            className="stat-value"
            style={{
              color:
                company.rawMaterials.length === 0
                  ? 'var(--text-muted)'
                  : company.rawMaterials.filter((m) => m.supplierCount > 0)
                        .length === company.rawMaterials.length
                    ? 'var(--accent-green)'
                    : 'var(--accent-yellow)',
            }}
          >
            {company.rawMaterials.length === 0
              ? '—'
              : `${company.rawMaterials.filter((m) => m.supplierCount > 0).length}/${company.rawMaterials.length}`}
          </div>
          <div className="stat-delta">materials covered</div>
        </div>
      </div>

      <div className="detail-grid">
        {/* Finished goods */}
        <div className="detail-section">
          <div className="detail-section-header">
            <Package size={14} />
            <span>Finished goods</span>
            <span className="data-badge data-badge-muted detail-section-count">
              {skuListCount(company.finishedGoods.length)}
            </span>
          </div>
          {company.finishedGoods.length === 0 ? (
            <div className="detail-empty">No finished goods</div>
          ) : (
            <div className="detail-list">
              {company.finishedGoods.map((g) => (
                <div key={g.id} className="detail-list-row">
                  <span className="data-sku">{g.sku}</span>
                  <span
                    className="detail-list-name"
                    style={{ color: 'var(--text-muted)', fontSize: 12 }}
                  >
                    finished good
                  </span>
                  {g.ingredientCount > 0 && (
                    <span className="data-badge data-badge-blue">
                      {bomIngredientsLabel(g.ingredientCount)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Raw materials */}
        <div className="detail-section">
          <div className="detail-section-header">
            <Atom size={14} />
            <span>Raw materials</span>
            <span className="data-badge data-badge-muted detail-section-count">
              {skuListCount(company.rawMaterials.length)}
            </span>
          </div>
          {company.rawMaterials.length === 0 ? (
            <div className="detail-empty">No raw materials</div>
          ) : (
            <div className="detail-list">
              {company.rawMaterials.map((m) => (
                <Link
                  key={m.id}
                  href={`/raw-materials/${m.id}`}
                  className="detail-list-row detail-list-row-link"
                >
                  <span className="data-sku">{m.sku}</span>
                  <span className="detail-list-name">
                    {m.usedInProducts > 0
                      ? `in ${m.usedInProducts} product${m.usedInProducts !== 1 ? 's' : ''}`
                      : '—'}
                  </span>
                  <span
                    className={`data-badge ${
                      m.supplierCount === 0
                        ? 'data-badge-red'
                        : m.supplierCount === 1
                          ? 'data-badge-yellow'
                          : 'data-badge-green'
                    }`}
                  >
                    {m.supplierCount} supplier{m.supplierCount !== 1 ? 's' : ''}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Company Profile */}
        <div className="detail-section">
          <div className="detail-section-header">
            <MapPin size={14} />
            <span>Company Profile</span>
          </div>
          <div className="flex flex-col gap-3 px-1 py-2">
            {hqLabel && (
              <div className="text-xs text-gray-500">
                <span className="font-medium text-gray-700">HQ:</span> {hqLabel}
              </div>
            )}
            {p.foundedYear && (
              <div className="text-xs text-gray-500">
                <span className="font-medium text-gray-700">Founded:</span>{' '}
                {p.foundedYear}
              </div>
            )}
            {p.revenueRange && (
              <div className="text-xs text-gray-500">
                <span className="font-medium text-gray-700">Revenue:</span>{' '}
                {p.revenueRange}
              </div>
            )}
            {p.channels.length > 0 && (
              <div className="text-xs text-gray-500">
                <span className="font-medium text-gray-700 block mb-1">
                  Channels:
                </span>
                <div className="flex flex-wrap gap-1">
                  {p.channels.map((ch) => (
                    <span key={ch} className="data-badge data-badge-muted">
                      {ch}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {!hqLabel &&
              !p.foundedYear &&
              !p.revenueRange &&
              p.channels.length === 0 && (
                <div className="detail-empty">No profile data on file</div>
              )}
          </div>
        </div>

        {/* Market Intelligence */}
        <div className="detail-section">
          <div className="detail-section-header">
            <BarChart3 size={14} />
            <span>Market Intelligence</span>
          </div>
          <div className="flex flex-col gap-3 px-1 py-2">
            {p.channels.length > 0 && (
              <div className="text-xs text-gray-500">
                <span className="font-medium text-gray-700">Distribution:</span>{' '}
                {p.channels.includes('DTC')
                  ? 'Direct-to-consumer + retail'
                  : 'Primarily retail'}
              </div>
            )}
            {p.type && (
              <div className="text-xs text-gray-500">
                <span className="font-medium text-gray-700">Type:</span>{' '}
                {p.type.charAt(0).toUpperCase() + p.type.slice(1)}
              </div>
            )}
            {p.revenueRange && (
              <div className="text-xs text-gray-500">
                <span className="font-medium text-gray-700">
                  Estimated revenue:
                </span>{' '}
                {p.revenueRange}
              </div>
            )}
            {!p.type && !p.revenueRange && p.channels.length === 0 && (
              <div className="detail-empty">Market data not yet available</div>
            )}
          </div>
        </div>

        {/* Certifications */}
        <div className="detail-section">
          <div className="detail-section-header">
            <ShieldCheck size={14} />
            <span>Certifications</span>
            {p.certifications.length > 0 && (
              <span className="data-badge data-badge-green detail-section-count">
                {p.certifications.length} cert
                {p.certifications.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          {p.certifications.length === 0 ? (
            <div className="detail-empty">No certification data on file</div>
          ) : (
            <div className="flex flex-wrap gap-1 px-1 py-2">
              {p.certifications.map((cert) => (
                <span key={cert} className="data-badge data-badge-green">
                  {cert}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
