'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import {
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  ChevronRight,
  ExternalLink,
  ArrowLeft,
  TrendingDown,
  TrendingUp,
  Minus,
  Sparkles,
  BookOpen,
  FlaskConical,
  BarChart2,
  Truck,
} from 'lucide-react'
import type { AgnesAuditLogEntry, AgnesOpportunity } from '@/lib/agnes-client'
import {
  getRawMaterialDetail,
  getOpportunityForMaterial,
} from '@/lib/agnes-client'
import type { AgnesRawMaterialDetail } from '@/lib/agnes-client'

// ── badges ────────────────────────────────────────────────────────────────────

function ActionBadge({ action }: { action: string }) {
  if (action === 'accepted')
    return (
      <span className="data-badge data-badge-green decision-badge-flex">
        <CheckCircle2 size={10} /> Accepted
      </span>
    )
  if (action === 'rejected')
    return (
      <span className="data-badge data-badge-red decision-badge-flex">
        <XCircle size={10} /> Rejected
      </span>
    )
  return (
    <span className="data-badge data-badge-yellow decision-badge-flex">
      <Clock size={10} />
      {action.replace('_', ' ')}
    </span>
  )
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ScorePill({ value }: { value: number }) {
  const p = Math.round(value * 100)
  const cls =
    p >= 80
      ? 'decision-score-high'
      : p >= 50
        ? 'decision-score-mid'
        : 'decision-score-low'
  return <span className={`decision-score ${cls}`}>{p}%</span>
}

// ── detail panel ──────────────────────────────────────────────────────────────

interface DetailState {
  loading: boolean
  material: AgnesRawMaterialDetail | null
  opportunity: AgnesOpportunity | null
  error: string | null
}

function SourceButton({ url }: { url: string }) {
  let label: string
  try {
    label = new URL(url).hostname.replace(/^www\./, '')
  } catch {
    label = url
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="decision-source-btn"
    >
      {label}
      <ExternalLink size={11} />
    </a>
  )
}

function PlaceholderSource({ label }: { label: string }) {
  return (
    <span className="decision-source-btn decision-source-placeholder">
      {label}
      <ExternalLink size={11} />
    </span>
  )
}

function ComparisonRow({
  label,
  current,
  substitute,
  good,
}: {
  label: string
  current: React.ReactNode
  substitute: React.ReactNode
  good?: boolean
}) {
  return (
    <div className="decision-cmp-row">
      <div className="decision-cmp-label">{label}</div>
      <div className="decision-cmp-cell">{current}</div>
      <div
        className={`decision-cmp-cell${good ? ' decision-cmp-cell-good' : ''}`}
      >
        {substitute}
      </div>
    </div>
  )
}

function CertIcon({ value }: { value: boolean | null }) {
  if (value === true)
    return <CheckCircle2 size={13} className="decision-icon-yes" />
  if (value === false) return <XCircle size={13} className="decision-icon-no" />
  return <Minus size={13} className="decision-icon-neutral" />
}

function SectionSources({ urls }: { urls: string[] }) {
  if (urls.length === 0) return null
  return (
    <div className="decision-section-sources">
      {urls.map((url) => (
        <SourceButton key={url} url={url} />
      ))}
    </div>
  )
}

function DetailPanel({
  entry,
  detail,
  onBack,
}: {
  entry: AgnesAuditLogEntry
  detail: DetailState
  onBack: () => void
}) {
  const { loading, material, opportunity, error } = detail
  const sub = opportunity?.substitutes?.[0] ?? null
  const sources = material?.profile.enrichedSources ?? []

  return (
    <div className="decision-detail-root">
      <button className="decision-detail-back" onClick={onBack} type="button">
        <ArrowLeft size={13} /> Back to log
      </button>

      {/* Header */}
      <div className="decision-detail-header">
        <div className="decision-detail-title">
          {entry.entityLabel ?? entry.entityId}
        </div>
        <div className="decision-detail-meta-row">
          <ActionBadge action={entry.action} />
          <span className="decision-detail-meta">
            {fmtDate(entry.createdAt)}
            {entry.userId ? ` · ${entry.userId}` : ''}
          </span>
        </div>
        {entry.reasoning && (
          <p className="decision-detail-reasoning">{entry.reasoning}</p>
        )}
      </div>

      {loading && (
        <div className="decision-detail-loading">Loading analysis…</div>
      )}
      {error && <div className="decision-detail-error">{error}</div>}

      {!loading && material && (
        <>
          {/* Why it's better */}
          {opportunity?.explanation && (
            <div className="decision-why-block">
              <div className="decision-section-label">
                <Sparkles size={13} className="decision-icon-yes" />
                Why this substitute is recommended
              </div>
              <p className="decision-why-text">{opportunity.explanation}</p>
              <div className="decision-section-sources">
                <PlaceholderSource label="GRAS Database" />
                <PlaceholderSource label="FDA Ingredient List" />
                {sources.slice(0, 1).map((url) => (
                  <SourceButton key={url} url={url} />
                ))}
              </div>
            </div>
          )}

          {/* Match reasoning */}
          {(opportunity?.matchReasoning?.length ?? 0) > 0 && (
            <div className="decision-why-block">
              <div className="decision-section-label">
                <FlaskConical size={13} className="decision-icon-neutral" />
                Functional match analysis
              </div>
              <div className="decision-match-reasons">
                {opportunity?.matchReasoning?.map((r, i) => (
                  <div key={i} className="decision-match-reason-row">
                    <span className="decision-match-label">{r.label}</span>
                    <span className="decision-match-detail">{r.detail}</span>
                  </div>
                ))}
              </div>
              <div className="decision-section-sources">
                <PlaceholderSource label="PubChem" />
                <PlaceholderSource label="EFSA Panel Report" />
                {sources.slice(1, 2).map((url) => (
                  <SourceButton key={url} url={url} />
                ))}
              </div>
            </div>
          )}

          {/* Quantified comparison table */}
          {sub && (
            <div className="decision-why-block">
              <div className="decision-section-label">
                <BarChart2 size={13} className="decision-icon-neutral" />
                Quantified comparison
              </div>
              <div className="decision-cmp-root">
                <div className="decision-cmp-thead">
                  <div className="decision-cmp-th" />
                  <div className="decision-cmp-th decision-cmp-th-current">
                    Current
                  </div>
                  <div className="decision-cmp-th decision-cmp-th-rec">
                    Recommended ↑
                  </div>
                </div>

                <ComparisonRow
                  label="Ingredient"
                  current={
                    <span className="decision-cmp-name">{material.sku}</span>
                  }
                  substitute={
                    <span className="decision-cmp-name decision-cmp-name-rec">
                      {sub.name}
                    </span>
                  }
                />
                <ComparisonRow
                  label="Similarity Match"
                  current={
                    <span className="decision-score decision-score-baseline">
                      —
                    </span>
                  }
                  substitute={<ScorePill value={sub.similarity} />}
                  good={sub.similarity >= 0.7}
                />
                <ComparisonRow
                  label="Functional Fit"
                  current={
                    <span className="decision-score decision-score-baseline">
                      —
                    </span>
                  }
                  substitute={<ScorePill value={sub.functional_fit} />}
                  good={sub.functional_fit >= 0.7}
                />
                <ComparisonRow
                  label="Quality Score"
                  current={
                    <span className="decision-score decision-score-baseline">
                      —
                    </span>
                  }
                  substitute={<ScorePill value={sub.combined_score} />}
                  good={sub.combined_score >= 0.6}
                />
                <ComparisonRow
                  label="Compliance"
                  current={
                    <CheckCircle2 size={13} className="decision-icon-yes" />
                  }
                  substitute={
                    sub.compliance ? (
                      <CheckCircle2 size={13} className="decision-icon-yes" />
                    ) : (
                      <XCircle size={13} className="decision-icon-no" />
                    )
                  }
                  good={sub.compliance}
                />
                {sub.violations.length > 0 && (
                  <ComparisonRow
                    label="Violations"
                    current={
                      <span className="decision-score decision-score-high">
                        None
                      </span>
                    }
                    substitute={
                      <span className="decision-cmp-violations">
                        {sub.violations.join(', ')}
                      </span>
                    }
                  />
                )}
                <ComparisonRow
                  label="Vegan"
                  current={<CertIcon value={material.profile.vegan} />}
                  substitute={<CertIcon value={material.profile.vegan} />}
                />
                <ComparisonRow
                  label="Non-GMO"
                  current={<CertIcon value={material.profile.nonGmo} />}
                  substitute={<CertIcon value={material.profile.nonGmo} />}
                />
                <ComparisonRow
                  label="Allergens"
                  current={
                    material.profile.allergens.length === 0 ? (
                      <span className="decision-score decision-score-high">
                        None
                      </span>
                    ) : (
                      <span className="decision-cmp-violations">
                        {material.profile.allergens.join(', ')}
                      </span>
                    )
                  }
                  substitute={
                    <Minus size={13} className="decision-icon-neutral" />
                  }
                />
                <ComparisonRow
                  label="Available Suppliers"
                  current={
                    <span className="decision-score">
                      {material.suppliers.length}
                    </span>
                  }
                  substitute={
                    <span className="decision-score">
                      {sub.available_from.length}
                    </span>
                  }
                  good={sub.available_from.length >= material.suppliers.length}
                />
                {Number.isFinite(sub.co2_vs_original) &&
                  sub.co2_vs_original !== undefined && (
                    <ComparisonRow
                      label="CO₂ vs Baseline"
                      current={
                        <span className="decision-score decision-score-baseline">
                          baseline
                        </span>
                      }
                      substitute={
                        Math.abs(sub.co2_vs_original) < 0.02 ? (
                          <span className="decision-score decision-score-high">
                            ≈ same
                          </span>
                        ) : sub.co2_vs_original < 0 ? (
                          <span className="decision-co2-better">
                            <TrendingDown size={12} />
                            {Math.round(Math.abs(sub.co2_vs_original) * 100)}%
                            lower
                          </span>
                        ) : (
                          <span className="decision-co2-worse">
                            <TrendingUp size={12} />
                            {Math.round(sub.co2_vs_original * 100)}% higher
                          </span>
                        )
                      }
                      good={sub.co2_vs_original < 0}
                    />
                  )}
              </div>
              <div className="decision-section-sources">
                <PlaceholderSource label="Ecoinvent DB" />
                <PlaceholderSource label="Supplier Spec Sheet" />
                {sources.slice(2, 3).map((url) => (
                  <SourceButton key={url} url={url} />
                ))}
              </div>
            </div>
          )}

          {/* Sourcing actions */}
          {opportunity?.sourcingActions &&
            opportunity.sourcingActions.length > 0 && (
              <div className="decision-why-block">
                <div className="decision-section-label">
                  <Truck size={13} className="decision-icon-neutral" />
                  Sourcing actions
                </div>
                <ul className="decision-actions-list">
                  {opportunity.sourcingActions.map((a, i) => (
                    <li key={i} className="decision-action-item">
                      <span className="decision-action-dot" />
                      {a}
                    </li>
                  ))}
                </ul>
                <div className="decision-section-sources">
                  <PlaceholderSource label="Supplier Directory" />
                  <PlaceholderSource label="RFQ Template" />
                </div>
              </div>
            )}

          {/* All sources */}
          <div className="decision-why-block">
            <div className="decision-section-label">
              <BookOpen size={13} className="decision-icon-neutral" />
              All sources
            </div>
            <div className="decision-sources-row">
              {sources.map((url) => (
                <SourceButton key={url} url={url} />
              ))}
              {sources.length === 0 && (
                <>
                  <PlaceholderSource label="GRAS Database" />
                  <PlaceholderSource label="FDA Ingredient List" />
                  <PlaceholderSource label="PubChem" />
                </>
              )}
              <Link
                href={`/raw-materials/${material.id}`}
                className="decision-source-btn decision-source-btn-internal"
              >
                Raw material page <ChevronRight size={11} />
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

interface Props {
  entries: AgnesAuditLogEntry[]
  scopeCompanyId: number | null
}

export default function DecisionLogPanel({ entries, scopeCompanyId }: Props) {
  const [selected, setSelected] = useState<AgnesAuditLogEntry | null>(null)
  const [detail, setDetail] = useState<DetailState>({
    loading: false,
    material: null,
    opportunity: null,
    error: null,
  })

  const selectEntry = useCallback(
    async (entry: AgnesAuditLogEntry) => {
      setSelected(entry)
      const rawId = Number(entry.entityId)
      if (!Number.isFinite(rawId) || rawId <= 0) {
        setDetail({
          loading: false,
          material: null,
          opportunity: null,
          error: 'No linked raw material.',
        })
        return
      }
      setDetail({
        loading: true,
        material: null,
        opportunity: null,
        error: null,
      })
      try {
        const [mat, oppRes] = await Promise.all([
          getRawMaterialDetail(rawId),
          getOpportunityForMaterial(rawId, scopeCompanyId ?? undefined),
        ])
        setDetail({
          loading: false,
          material: mat,
          opportunity: oppRes.items?.[0] ?? null,
          error: mat ? null : 'Material not found.',
        })
      } catch (e) {
        setDetail({
          loading: false,
          material: null,
          opportunity: null,
          error: e instanceof Error ? e.message : 'Failed to load detail.',
        })
      }
    },
    [scopeCompanyId]
  )

  if (selected) {
    return (
      <DetailPanel
        entry={selected}
        detail={detail}
        onBack={() => setSelected(null)}
      />
    )
  }

  if (entries.length === 0) {
    return (
      <div className="detail-section detail-section-spaced">
        <div className="detail-empty">
          No decisions recorded yet. Accept or reject opportunities in the
          Cockpit to build your audit trail.
        </div>
      </div>
    )
  }

  return (
    <div className="detail-section detail-section-spaced">
      <div className="detail-section-header">
        <Zap size={14} />
        <span>Decision log</span>
        <span className="data-badge data-badge-muted detail-section-count">
          {entries.length} entr{entries.length !== 1 ? 'ies' : 'y'}
        </span>
      </div>
      <div className="detail-list">
        {entries.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className="detail-list-row detail-list-row-link decision-list-row"
            onClick={() => selectEntry(entry)}
          >
            <div className="decision-row-body">
              <span className="decision-row-label">
                {entry.entityLabel ?? entry.entityId}
              </span>
              <span className="decision-row-meta">
                {fmtDate(entry.createdAt)}
                {entry.userId ? ` · ${entry.userId}` : ''}
              </span>
              {entry.reasoning && (
                <span className="decision-row-reasoning">
                  {entry.reasoning}
                </span>
              )}
            </div>
            <div className="decision-row-badges">
              <span className="data-badge data-badge-muted">
                {entry.entityType}
              </span>
              <ActionBadge action={entry.action} />
              <ChevronRight size={14} className="decision-row-chevron" />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
