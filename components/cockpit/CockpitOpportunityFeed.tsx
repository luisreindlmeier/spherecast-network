'use client'

import { useMemo, useState } from 'react'
import type { OpportunityRow } from '@/lib/agnes-queries'

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

export default function CockpitOpportunityFeed({ rows }: CockpitOpportunityFeedProps) {
  const [hidden, setHidden] = useState<Set<string>>(() => new Set())

  const visible = useMemo(
    () => rows.filter((o) => !hidden.has(o.id)).slice(0, 7),
    [rows, hidden]
  )

  function dismiss(id: string) {
    setHidden((prev) => new Set(prev).add(id))
  }

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
                <span className="cockpit-opp-ingredient">{row.ingredientName}</span>
                <span className="cockpit-opp-brands cockpit-opp-row-brands">
                  {row.brandsDisplay}
                </span>
                <span className="cockpit-opp-supplier">{row.currentSupplier}</span>
                <span className="cockpit-opp-impact">
                  {Math.round(row.confidence * 100)}%
                </span>
                <div className="cockpit-opp-actions cockpit-opp-row-actions">
                  <button
                    type="button"
                    className="btn btn-primary btn-compact"
                    onClick={() => dismiss(row.id)}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-compact"
                    onClick={() => dismiss(row.id)}
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
