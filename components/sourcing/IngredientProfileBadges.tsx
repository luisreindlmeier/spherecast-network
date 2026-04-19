'use client'

import type { IngredientProfile } from '@/lib/agnes-client'

const FUNCTIONAL_CLASS_BADGE: Record<string, string> = {
  vitamin: 'data-badge data-badge-yellow',
  mineral: 'data-badge data-badge-yellow',
  protein: 'data-badge data-badge-blue',
  emulsifier: 'data-badge data-badge-muted',
  sweetener: 'data-badge data-badge-muted',
  preservative: 'data-badge data-badge-red',
  antioxidant: 'data-badge data-badge-green',
  thickener: 'data-badge data-badge-muted',
  flavor: 'data-badge data-badge-muted',
  colorant: 'data-badge data-badge-muted',
  enzyme: 'data-badge data-badge-blue',
  fat: 'data-badge data-badge-yellow',
  carbohydrate: 'data-badge data-badge-muted',
  fiber: 'data-badge data-badge-green',
  other: 'data-badge data-badge-muted',
}

function CertBadge({ value, label }: { value: boolean | null; label: string }) {
  if (value !== true) return null
  return <span className="data-badge data-badge-green">{label} ✓</span>
}

interface Props {
  profile: IngredientProfile
  compact?: boolean
}

export function IngredientProfileBadges({ profile, compact = false }: Props) {
  const hasAnyData =
    profile.functionalClass ||
    profile.allergens.length > 0 ||
    profile.vegan !== null ||
    profile.kosher !== null ||
    profile.halal !== null ||
    profile.nonGmo !== null

  if (!hasAnyData) {
    return <span className="data-cell-num data-cell-num-muted">—</span>
  }

  return (
    <div className="ingredient-profile-badges">
      {profile.functionalClass && (
        <span
          className={
            FUNCTIONAL_CLASS_BADGE[profile.functionalClass] ??
            'data-badge data-badge-muted'
          }
        >
          {profile.functionalClass}
        </span>
      )}

      {profile.eNumber && (
        <span className="data-badge data-badge-muted ingredient-profile-badge-mono">
          {profile.eNumber}
        </span>
      )}

      <CertBadge value={profile.vegan} label="Vegan" />
      <CertBadge value={profile.kosher} label="Kosher" />
      <CertBadge value={profile.halal} label="Halal" />
      <CertBadge value={profile.nonGmo} label="Non-GMO" />

      {!compact &&
        profile.allergens.map((a) => (
          <span key={a} className="data-badge data-badge-red">
            ⚠ {a}
          </span>
        ))}

      {compact && profile.allergens.length > 0 && (
        <span className="data-badge data-badge-red">
          ⚠ {profile.allergens.length}
        </span>
      )}
    </div>
  )
}

export function IngredientConfidenceBar({
  confidence,
}: {
  confidence: number | null
}) {
  if (confidence === null) return null
  const pct = Math.round(confidence * 100)
  const fillClass =
    pct >= 80
      ? 'ingredient-confidence-fill--high'
      : pct >= 50
        ? 'ingredient-confidence-fill--mid'
        : 'ingredient-confidence-fill--low'
  return (
    <div className="ingredient-confidence-bar">
      <div className="ingredient-confidence-track">
        <div
          className={`ingredient-confidence-fill ${fillClass}`}
          style={{ '--fill-width': `${pct}%` } as React.CSSProperties}
        />
      </div>
      <span className="ingredient-confidence-pct">{pct}%</span>
    </div>
  )
}
