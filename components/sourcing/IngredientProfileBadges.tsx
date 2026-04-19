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

const COMPACT_MAX = 4

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

  type Badge = { key: string; node: React.ReactNode }
  const badges: Badge[] = []

  if (profile.functionalClass) {
    badges.push({
      key: 'fc',
      node: (
        <span
          className={
            FUNCTIONAL_CLASS_BADGE[profile.functionalClass] ??
            'data-badge data-badge-muted'
          }
        >
          {profile.functionalClass}
        </span>
      ),
    })
  }

  if (profile.eNumber) {
    badges.push({
      key: 'en',
      node: (
        <span className="data-badge data-badge-muted ingredient-profile-badge-mono">
          {profile.eNumber}
        </span>
      ),
    })
  }

  if (profile.vegan === true)
    badges.push({
      key: 'vegan',
      node: <span className="data-badge data-badge-green">Vegan ✓</span>,
    })
  if (profile.kosher === true)
    badges.push({
      key: 'kosher',
      node: <span className="data-badge data-badge-green">Kosher ✓</span>,
    })
  if (profile.halal === true)
    badges.push({
      key: 'halal',
      node: <span className="data-badge data-badge-green">Halal ✓</span>,
    })
  if (profile.nonGmo === true)
    badges.push({
      key: 'nongmo',
      node: <span className="data-badge data-badge-green">Non-GMO ✓</span>,
    })

  if (compact) {
    if (profile.allergens.length > 0) {
      badges.push({
        key: 'allergens',
        node: (
          <span className="data-badge data-badge-red">
            ⚠ {profile.allergens.length}
          </span>
        ),
      })
    }
  } else {
    profile.allergens.forEach((a) => {
      badges.push({
        key: `a-${a}`,
        node: <span className="data-badge data-badge-red">⚠ {a}</span>,
      })
    })
  }

  const visible = compact ? badges.slice(0, COMPACT_MAX) : badges
  const overflow = compact ? badges.length - COMPACT_MAX : 0

  return (
    <div className="ingredient-profile-badges">
      {visible.map((b) => (
        <span key={b.key}>{b.node}</span>
      ))}
      {overflow > 0 && (
        <span className="ingredient-profile-overflow">+{overflow} more</span>
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
