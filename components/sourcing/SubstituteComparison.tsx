import Link from 'next/link'
import type {
  AgnesRawMaterialDetail,
  AgnesRecommendationSubstitute,
  IngredientProfile,
} from '@/lib/agnes-client'
import type { OpportunityDetail } from '@/lib/agnes-queries'
import { estimateSavings, fmtSavingsRange } from '@/lib/savings-estimate'
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  Minus,
  TrendingDown,
  TrendingUp,
  ArrowRight,
} from 'lucide-react'

function CertCell({ value }: { value: boolean | null }) {
  if (value === true)
    return <CheckCircle2 size={14} className="substitute-cmp-icon-yes" />
  if (value === false)
    return <XCircle size={14} className="substitute-cmp-icon-no" />
  return <Minus size={14} className="substitute-cmp-icon-neutral" />
}

function ScoreCell({
  value,
  baseline = false,
}: {
  value: number
  baseline?: boolean
}) {
  if (baseline)
    return (
      <span className="substitute-cmp-score substitute-cmp-score-baseline">
        —
      </span>
    )
  const pct = Math.round(value * 100)
  const cls =
    pct >= 80
      ? 'substitute-cmp-score-high'
      : pct >= 50
        ? 'substitute-cmp-score-mid'
        : 'substitute-cmp-score-low'
  return <span className={`substitute-cmp-score ${cls}`}>{pct}%</span>
}

function Co2Cell({ delta }: { delta: number | undefined }) {
  if (delta === undefined || delta === null || !Number.isFinite(delta))
    return <Minus size={14} className="substitute-cmp-icon-neutral" />
  if (Math.abs(delta) < 0.02)
    return (
      <span className="substitute-cmp-score substitute-cmp-score-high">
        ≈ same
      </span>
    )
  if (delta < 0)
    return (
      <span className="substitute-cmp-co2-better">
        <TrendingDown size={12} /> {Math.round(Math.abs(delta) * 100)}% lower
      </span>
    )
  return (
    <span className="substitute-cmp-co2-worse">
      <TrendingUp size={12} /> {Math.round(delta * 100)}% higher
    </span>
  )
}

function AllergenCell({ allergens }: { allergens: string[] }) {
  if (allergens.length === 0)
    return (
      <span className="substitute-cmp-score substitute-cmp-score-high">
        None
      </span>
    )
  return (
    <span className="substitute-cmp-allergens">{allergens.join(', ')}</span>
  )
}

interface Row {
  label: string
  current: React.ReactNode
  substitute: React.ReactNode
}

interface Props {
  material: AgnesRawMaterialDetail
  opportunity: OpportunityDetail
  substituteDetail: AgnesRawMaterialDetail | null
}

export default function SubstituteComparison({
  material,
  opportunity,
  substituteDetail,
}: Props) {
  const sub: AgnesRecommendationSubstitute = opportunity.allSubstitutes[0]
  if (!sub) return null

  const subProfile: IngredientProfile | null = substituteDetail?.profile ?? null
  const isCurrentOptimal = sub.sku === material.sku

  const savings = estimateSavings(
    opportunity.row.ingredientName,
    opportunity.row.rawMaterialSku,
    opportunity.row.category,
    opportunity.row.confidence,
    opportunity.row.brandsAffected
  )

  const rows: Row[] = [
    {
      label: 'Similarity Match',
      current: <ScoreCell value={1} baseline />,
      substitute: <ScoreCell value={sub.similarity} />,
    },
    {
      label: 'Functional Fit',
      current: <ScoreCell value={1} baseline />,
      substitute: <ScoreCell value={sub.functional_fit} />,
    },
    {
      label: 'Quality Score',
      current: <ScoreCell value={1} baseline />,
      substitute: <ScoreCell value={sub.combined_score} />,
    },
    {
      label: 'Regulatory Compliance',
      current: <CheckCircle2 size={14} className="substitute-cmp-icon-yes" />,
      substitute: sub.compliance ? (
        <CheckCircle2 size={14} className="substitute-cmp-icon-yes" />
      ) : (
        <XCircle size={14} className="substitute-cmp-icon-no" />
      ),
    },
    ...(sub.violations.length > 0
      ? [
          {
            label: 'Violations',
            current: (
              <span className="substitute-cmp-score substitute-cmp-score-high">
                None
              </span>
            ),
            substitute: (
              <span className="substitute-cmp-allergens">
                {sub.violations.join(', ')}
              </span>
            ),
          },
        ]
      : []),
    {
      label: 'Vegan',
      current: <CertCell value={material.profile.vegan} />,
      substitute: subProfile ? (
        <CertCell value={subProfile.vegan} />
      ) : (
        <Minus size={14} className="substitute-cmp-icon-neutral" />
      ),
    },
    {
      label: 'Kosher',
      current: <CertCell value={material.profile.kosher} />,
      substitute: subProfile ? (
        <CertCell value={subProfile.kosher} />
      ) : (
        <Minus size={14} className="substitute-cmp-icon-neutral" />
      ),
    },
    {
      label: 'Halal',
      current: <CertCell value={material.profile.halal} />,
      substitute: subProfile ? (
        <CertCell value={subProfile.halal} />
      ) : (
        <Minus size={14} className="substitute-cmp-icon-neutral" />
      ),
    },
    {
      label: 'Non-GMO',
      current: <CertCell value={material.profile.nonGmo} />,
      substitute: subProfile ? (
        <CertCell value={subProfile.nonGmo} />
      ) : (
        <Minus size={14} className="substitute-cmp-icon-neutral" />
      ),
    },
    {
      label: 'Allergens',
      current: <AllergenCell allergens={material.profile.allergens} />,
      substitute: subProfile ? (
        <AllergenCell allergens={subProfile.allergens} />
      ) : (
        <Minus size={14} className="substitute-cmp-icon-neutral" />
      ),
    },
    {
      label: 'Qualified Suppliers',
      current: (
        <span className="substitute-cmp-score">
          {material.suppliers.length}
        </span>
      ),
      substitute: (
        <span className="substitute-cmp-score">
          {sub.available_from.length}
        </span>
      ),
    },
    {
      label: 'CO₂ Impact',
      current: (
        <span className="substitute-cmp-score substitute-cmp-score-baseline">
          baseline
        </span>
      ),
      substitute: <Co2Cell delta={sub.co2_vs_original} />,
    },
    {
      label: 'Est. Cost/kg',
      current: (
        <span className="substitute-cmp-score">
          ${savings.costPerKgCurrent.toFixed(1)}
        </span>
      ),
      substitute: (
        <span className="substitute-cmp-score substitute-cmp-score-high">
          ${savings.costPerKgAlt.toFixed(1)}
        </span>
      ),
    },
    {
      label: 'Est. Annual Savings',
      current: (
        <span className="substitute-cmp-score substitute-cmp-score-baseline">
          —
        </span>
      ),
      substitute: (
        <span className="substitute-cmp-savings-highlight">
          {fmtSavingsRange(savings.savingsLow, savings.savingsHigh)}
        </span>
      ),
    },
    {
      label: 'Min. Order for Savings',
      current: (
        <span className="substitute-cmp-score substitute-cmp-score-baseline">
          —
        </span>
      ),
      substitute: (
        <span className="substitute-cmp-score">{savings.minOrderKg} kg</span>
      ),
    },
    {
      label: 'Companies That Benefit',
      current: (
        <span className="substitute-cmp-score substitute-cmp-score-baseline">
          —
        </span>
      ),
      substitute: (
        <span className="substitute-cmp-score">
          {opportunity.row.brandsAffected.length > 0
            ? opportunity.row.brandsAffected.map((b) => b.name).join(', ')
            : `${savings.companiesCount} brand${savings.companiesCount !== 1 ? 's' : ''}`}
        </span>
      ),
    },
  ]

  if (isCurrentOptimal) {
    return (
      <div className="substitute-optimal-banner">
        <Sparkles size={16} className="substitute-optimal-icon" />
        <div>
          <div className="substitute-optimal-title">
            Great choice — already optimal
          </div>
          <div className="substitute-optimal-sub">
            This material scores highest across similarity, functional fit, and
            compliance in our data. No superior substitute found.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="substitute-cmp-root">
      {/* Header */}
      <div className="substitute-cmp-header">
        <div className="substitute-cmp-header-label">Substitute Comparison</div>
        <div className="substitute-cmp-sub-link-row">
          <span className="data-badge data-badge-green">Recommended</span>
          {substituteDetail ? (
            <Link
              href={`/raw-materials/${substituteDetail.id}`}
              className="substitute-cmp-sub-link"
            >
              {sub.name}
              <ArrowRight size={11} />
            </Link>
          ) : (
            <span className="substitute-cmp-sub-name">{sub.name}</span>
          )}
          <span className="data-badge data-badge-muted substitute-cmp-sku">
            {sub.sku}
          </span>
        </div>
        {opportunity.explanation && (
          <p className="substitute-cmp-explanation">
            {opportunity.explanation}
          </p>
        )}
      </div>

      {/* Table */}
      <div className="substitute-cmp-table">
        {/* Column header row */}
        <div className="substitute-cmp-thead">
          <div className="substitute-cmp-th substitute-cmp-th-area" />
          <div className="substitute-cmp-th substitute-cmp-th-current">
            Current
          </div>
          <div className="substitute-cmp-th substitute-cmp-th-rec substitute-cmp-col-rec-first">
            Recommended ↑
          </div>
        </div>

        {rows.map((row, i) => {
          const isLast = i === rows.length - 1
          return (
            <div key={row.label} className="substitute-cmp-row">
              <div className="substitute-cmp-td-label">{row.label}</div>
              <div className="substitute-cmp-td substitute-cmp-col-current">
                {row.current}
              </div>
              <div
                className={`substitute-cmp-td substitute-cmp-col-rec${isLast ? ' substitute-cmp-col-rec-last' : ''}`}
              >
                {row.substitute}
              </div>
            </div>
          )
        })}
      </div>

      {/* Sourcing actions */}
      {opportunity.sourcingActions.length > 0 && (
        <div className="substitute-cmp-actions">
          <div className="substitute-cmp-actions-label">Sourcing Actions</div>
          <ul className="substitute-cmp-actions-list">
            {opportunity.sourcingActions.map((a, i) => (
              <li key={i} className="substitute-cmp-action-item">
                <span className="substitute-cmp-action-dot" />
                {a}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
