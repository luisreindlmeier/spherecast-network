'use client'

import type { IngredientProfile } from '@/lib/agnes-client'

const ALLERGEN_LABELS: Record<string, string> = {
  milk: 'Milk',
  eggs: 'Eggs',
  fish: 'Fish',
  shellfish: 'Shellfish',
  'tree-nuts': 'Tree Nuts',
  peanuts: 'Peanuts',
  wheat: 'Wheat',
  soybeans: 'Soy',
  sesame: 'Sesame',
}

const FUNCTIONAL_CLASS_COLORS: Record<string, string> = {
  vitamin: 'bg-yellow-100 text-yellow-800',
  mineral: 'bg-orange-100 text-orange-800',
  protein: 'bg-blue-100 text-blue-800',
  emulsifier: 'bg-purple-100 text-purple-800',
  sweetener: 'bg-pink-100 text-pink-800',
  preservative: 'bg-red-100 text-red-800',
  antioxidant: 'bg-green-100 text-green-800',
  thickener: 'bg-teal-100 text-teal-800',
  flavor: 'bg-indigo-100 text-indigo-800',
  colorant: 'bg-rose-100 text-rose-800',
  enzyme: 'bg-cyan-100 text-cyan-800',
  fat: 'bg-amber-100 text-amber-800',
  carbohydrate: 'bg-lime-100 text-lime-800',
  fiber: 'bg-emerald-100 text-emerald-800',
  other: 'bg-gray-100 text-gray-700',
}

function Badge({
  children,
  className,
}: {
  children: React.ReactNode
  className: string
}) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  )
}

function CertBadge({ value, label }: { value: boolean | null; label: string }) {
  if (value === null) return null
  return value ? (
    <Badge className="bg-green-100 text-green-800">{label}</Badge>
  ) : (
    <Badge className="bg-gray-100 text-gray-500 line-through opacity-60">
      {label}
    </Badge>
  )
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
    return (
      <span className="text-xs text-gray-400 italic">Not yet enriched</span>
    )
  }

  return (
    <div className="flex flex-wrap gap-1">
      {profile.functionalClass && (
        <Badge
          className={
            FUNCTIONAL_CLASS_COLORS[profile.functionalClass] ??
            FUNCTIONAL_CLASS_COLORS.other
          }
        >
          {profile.functionalClass}
        </Badge>
      )}

      {profile.eNumber && (
        <Badge className="bg-slate-100 text-slate-700 font-mono">
          {profile.eNumber}
        </Badge>
      )}

      <CertBadge value={profile.vegan} label="Vegan" />
      <CertBadge value={profile.kosher} label="Kosher" />
      <CertBadge value={profile.halal} label="Halal" />
      <CertBadge value={profile.nonGmo} label="Non-GMO" />

      {!compact &&
        profile.allergens.map((a) => (
          <Badge
            key={a}
            className="bg-red-50 text-red-700 border border-red-200"
          >
            ⚠ {ALLERGEN_LABELS[a] ?? a}
          </Badge>
        ))}

      {compact && profile.allergens.length > 0 && (
        <Badge className="bg-red-50 text-red-700 border border-red-200">
          ⚠ {profile.allergens.length} allergen
          {profile.allergens.length > 1 ? 's' : ''}
        </Badge>
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
  const color =
    pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 rounded-full bg-gray-200 overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-500">{pct}% confidence</span>
    </div>
  )
}
