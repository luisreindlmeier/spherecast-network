'use client'

import { useMemo, useState, useCallback } from 'react'
import type { OpportunityRow } from '@/lib/agnes-queries'
import { postDecision } from '@/lib/agnes-client'

type Confidence = 'high' | 'medium' | 'low'

type CockpitOpportunityFeedProps = {
  rows: OpportunityRow[]
}

function confidenceLabel(c: Confidence): string {
  if (c === 'high') return 'High'
  if (c === 'medium') return 'Medium'
  return 'Low'
}

function confidenceBand(value: number): Confidence {
  if (value >= 0.85) return 'high'
  if (value >= 0.65) return 'medium'
  return 'low'
}

export default function CockpitOpportunityFeed({
  rows,
}: CockpitOpportunityFeedProps) {
  const [hidden, setHidden] = useState<Set<string>>(() => new Set())
  const [pending, setPending] = useState<Set<string>>(() => new Set())

  const visible = useMemo(
    () => rows.filter((o) => !hidden.has(o.id)).slice(0, 7),
    [rows, hidden]
  )

  const handleDecision = useCallback(
    async (row: OpportunityRow, action: 'accepted' | 'rejected') => {
      if (pending.has(row.id)) return
      setPending((prev) => new Set(prev).add(row.id))
      try {
        await postDecision({
          entityType: 'opportunity',
          entityId: row.rawMaterialId.toString(),
          entityLabel: `${row.ingredientName} → ${row.altSupplier}`,
          action,
          reasoning:
            action === 'accepted'
              ? `Accepted via cockpit. Confidence ${Math.round(row.confidence * 100)}%.`
              : `Rejected via cockpit.`,
          userId: 'sourcing-agent',
        })
      } catch {
        // silently fail — decision is still dismissed from UI
      } finally {
        setHidden((prev) => new Set(prev).add(row.id))
        setPending((prev) => {
          const next = new Set(prev)
          next.delete(row.id)
          return next
        })
      }
    },
    [pending]
  )

  return (
    <section className="cockpit-panel" aria-labelledby="cockpit-opps-heading">
      <div className="cockpit-panel-header">
        <h2 className="cockpit-panel-title" id="cockpit-opps-heading">
          Opportunity feed
        </h2>
        <span className="cockpit-panel-hint">Top matches</span>
      </div>
      <div className="cockpit-panel-body">
        {visible.length === 0 ? (
          <p className="cockpit-empty-hint">
            No open opportunities in this view.
          </p>
        ) : (
          <ul className="cockpit-opp-list">
            {visible.map((row) => (
              <li key={row.id} className="cockpit-opp-row">
                <span
                  className={`cockpit-confidence cockpit-confidence--${confidenceBand(row.confidence)}`}
                >
                  {confidenceLabel(confidenceBand(row.confidence))}
                </span>
                <span className="cockpit-opp-ingredient">
                  {row.ingredientName}
                </span>
                <span className="cockpit-opp-brands cockpit-opp-row-brands">
                  {row.brandsDisplay}
                </span>
                <span className="cockpit-opp-supplier">
                  {row.currentSupplier}
                </span>
                <span className="cockpit-opp-impact">
                  {Math.round(row.confidence * 100)}%
                </span>
                <div className="cockpit-opp-actions cockpit-opp-row-actions">
                  <button
                    type="button"
                    className="btn btn-primary btn-compact"
                    disabled={pending.has(row.id)}
                    onClick={() => handleDecision(row, 'accepted')}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-compact"
                    disabled={pending.has(row.id)}
                    onClick={() => handleDecision(row, 'rejected')}
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
