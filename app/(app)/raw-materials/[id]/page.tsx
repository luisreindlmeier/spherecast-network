import { notFound } from 'next/navigation'
import Link from 'next/link'
import PageHeader from '@/components/layout/PageHeader'
import PlaceholderSection from '@/components/sourcing/PlaceholderSection'
import {
  IngredientProfileBadges,
  IngredientConfidenceBar,
} from '@/components/sourcing/IngredientProfileBadges'
import SubstituteComparison from '@/components/sourcing/SubstituteComparison'
import {
  getRawMaterialDetail,
  getRawMaterials,
  getOpportunityDetail,
} from '@/lib/agnes-queries'
import { resolveCompanyScopeFilter } from '@/lib/company-scope-server'
import { productsUsedInLabel, suppliersCountLabel } from '@/lib/format-labels'
import {
  Package,
  Building2,
  ArrowLeft,
  Tag,
  ShieldCheck,
  Sparkles,
  ArrowRight,
} from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

export default async function RawMaterialDetailPage({ params }: Props) {
  const { id } = await params
  const scopeCompanyId = await resolveCompanyScopeFilter()

  const [material, opportunity] = await Promise.all([
    getRawMaterialDetail(Number(id)),
    scopeCompanyId != null
      ? getOpportunityDetail(Number(id), scopeCompanyId)
      : Promise.resolve(null),
  ])
  if (!material) notFound()

  // Look up substitute's full detail by SKU (to get its profile for the comparison table)
  let substituteDetail = null
  const bestSub = opportunity?.allSubstitutes[0]
  if (bestSub && bestSub.sku !== material.sku) {
    const allMaterials = await getRawMaterials(scopeCompanyId)
    const match = allMaterials.find((m) => m.sku === bestSub.sku)
    if (match) substituteDetail = await getRawMaterialDetail(match.id)
  }

  const isCurrentOptimal = opportunity != null && bestSub?.sku === material.sku

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

      {/* Scope chips — only when a company is selected */}
      {scopeCompanyId != null && (
        <div className="substitute-scope-chips">
          <span className="substitute-chip-current">Currently selected</span>
          {isCurrentOptimal ? (
            <span className="substitute-chip-optimal">
              <Sparkles size={11} />
              Optimal choice
            </span>
          ) : bestSub ? (
            substituteDetail ? (
              <Link
                href={`/raw-materials/${substituteDetail.id}`}
                className="substitute-chip-rec"
              >
                <Sparkles size={11} />
                Recommended substitute: {bestSub.name}
                <ArrowRight size={11} />
              </Link>
            ) : (
              <span className="substitute-chip-rec">
                <Sparkles size={11} />
                Recommended: {bestSub.name}
              </span>
            )
          ) : null}
        </div>
      )}

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
            <span className="data-badge data-badge-muted detail-section-count">
              {suppliersCountLabel(material.suppliers.length)}
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
                  <span className="data-badge data-badge-blue">Supplier</span>
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
            <span className="data-badge data-badge-muted detail-section-count">
              {productsUsedInLabel(material.foundIn.length)}
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

        {/* Ingredient profile */}
        <div className="detail-section">
          <div className="detail-section-header">
            <ShieldCheck size={14} />
            <span>Ingredient Profile</span>
            {material.profile.confidence !== null && (
              <span className="detail-section-count">
                <IngredientConfidenceBar
                  confidence={material.profile.confidence}
                />
              </span>
            )}
          </div>
          <div className="detail-profile-body">
            <IngredientProfileBadges profile={material.profile} />
            {material.profile.description && (
              <p className="detail-profile-desc">
                {material.profile.description}
              </p>
            )}
            {material.profile.synonyms.length > 0 && (
              <div className="detail-profile-meta">
                Also known as:{' '}
                <span className="detail-profile-meta-val">
                  {material.profile.synonyms.join(', ')}
                </span>
              </div>
            )}
            {material.profile.enrichedSources.length > 0 && (
              <div className="detail-profile-meta">
                Sources:{' '}
                <span className="detail-profile-meta-val">
                  {material.profile.enrichedSources.join(', ')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Placeholder: Pricing & Lead Time */}
        <PlaceholderSection
          title="Pricing & Lead Time"
          description="Historical price trends, MOQs, current spot price and average delivery window."
          icon={<Tag size={14} />}
        />
      </div>

      {/* Substitute comparison — only when scoped to a company */}
      {scopeCompanyId != null &&
        opportunity != null &&
        (isCurrentOptimal ? (
          <div className="substitute-optimal-banner">
            <Sparkles size={16} className="substitute-optimal-icon" />
            <div>
              <div className="substitute-optimal-title">
                Great — this is already the optimal choice
              </div>
              <div className="substitute-optimal-sub">
                Based on similarity, functional fit, and compliance data, no
                superior substitute was found for the currently selected company
                scope.
              </div>
            </div>
          </div>
        ) : (
          <SubstituteComparison
            material={material}
            opportunity={opportunity}
            substituteDetail={substituteDetail}
          />
        ))}
    </>
  )
}
