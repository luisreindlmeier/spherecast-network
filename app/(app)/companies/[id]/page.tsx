import { notFound } from 'next/navigation'
import Link from 'next/link'
import PageHeader from '@/components/layout/PageHeader'
import PlaceholderSection from '@/components/sourcing/PlaceholderSection'
import { getCompanyDetail } from '@/lib/agnes-queries'
import { bomIngredientsLabel, skuListCount } from '@/lib/format-labels'
import {
  ArrowLeft,
  Package,
  Atom,
  FileText,
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

  return (
    <>
      <div className="detail-back">
        <Link href="/companies" className="detail-back-link">
          <ArrowLeft size={13} />
          Companies
        </Link>
      </div>

      <PageHeader
        eyebrow="Brand"
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

        {/* Placeholder: Company Info */}
        <PlaceholderSection
          title="Company Profile"
          description="Founding year, headquarters, revenue range, employee count, and company type."
          icon={<FileText size={14} />}
        />

        {/* Placeholder: Market Intelligence */}
        <PlaceholderSection
          title="Market Intelligence"
          description="Market share, growth trend, channel distribution (DTC vs retail), and iHerb ranking."
          icon={<BarChart3 size={14} />}
        />

        {/* Placeholder: Compliance */}
        <PlaceholderSection
          title="Compliance & Certifications"
          description="FDA, NSF, USP, cGMP status, third-party testing policies, and recall history."
          icon={<ShieldCheck size={14} />}
        />
      </div>
    </>
  )
}
