'use client'

import { useMemo, useState, useCallback } from 'react'
import type { OpportunityRow } from '@/lib/agnes-queries'
import { postDecision } from '@/lib/agnes-client'
import { Mail, Clock } from 'lucide-react'

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

function buildMailtoUrl(row: OpportunityRow): string {
  const subject = encodeURIComponent(
    `Sourcing Opportunity: ${row.ingredientName} — Spherecast`
  )
  const body = encodeURIComponent(
    `Hi ${row.brandKey} team,\n\n` +
      `Spherecast has identified a sourcing opportunity for your ingredient portfolio.\n\n` +
      `Ingredient: ${row.ingredientName}\n` +
      `Category: ${row.category}\n` +
      `Current supplier: ${row.currentSupplier}\n` +
      `Recommended alternative: ${row.altSupplier}\n` +
      `Match confidence: ${Math.round(row.confidence * 100)}%\n` +
      `Risk level: ${row.risk}\n\n` +
      `This substitution has been assessed for functional fit and compliance. ` +
      `We'd love to walk you through the analysis and next steps.\n\n` +
      `Would you be open to a quick call this week?\n\n` +
      `Best,\nSpherescast Sourcing Team`
  )
  return `mailto:?subject=${subject}&body=${body}`
}

export default function CockpitOpportunityFeed({
  rows,
}: CockpitOpportunityFeedProps) {
  // ids that have been removed from the feed
  const [hidden, setHidden] = useState<Set<string>>(() => new Set())
  // ids that have been emailed and are awaiting confirmation
  const [pendingEmail, setPendingEmail] = useState<Set<string>>(() => new Set())
  // ids currently saving to backend
  const [saving, setSaving] = useState<Set<string>>(() => new Set())

  const visible = useMemo(
    () => rows.filter((o) => !hidden.has(o.id)).slice(0, 7),
    [rows, hidden]
  )

  const handleContact = useCallback(async (row: OpportunityRow) => {
    // open mailto in new tab
    window.open(buildMailtoUrl(row), '_blank')
    // persist pending status
    setSaving((prev) => new Set(prev).add(row.id))
    try {
      await postDecision({
        entityType: 'opportunity',
        entityId: row.rawMaterialId.toString(),
        entityLabel: `${row.ingredientName} → ${row.altSupplier}`,
        action: 'pending',
        reasoning: `Email drafted to ${row.brandKey}. Awaiting confirmation.`,
        userId: 'sourcing-agent',
      })
    } catch {
      // ignore — UI still advances
    } finally {
      setSaving((prev) => {
        const next = new Set(prev)
        next.delete(row.id)
        return next
      })
      setPendingEmail((prev) => new Set(prev).add(row.id))
    }
  }, [])

  const handleFinalize = useCallback(
    async (row: OpportunityRow, action: 'accepted' | 'rejected') => {
      setSaving((prev) => new Set(prev).add(row.id))
      try {
        await postDecision({
          entityType: 'opportunity',
          entityId: row.rawMaterialId.toString(),
          entityLabel: `${row.ingredientName} → ${row.altSupplier}`,
          action,
          reasoning:
            action === 'accepted'
              ? `Accepted after customer outreach. Confidence ${Math.round(row.confidence * 100)}%.`
              : `Rejected via cockpit.`,
          userId: 'sourcing-agent',
        })
      } catch {
        // ignore
      } finally {
        setHidden((prev) => new Set(prev).add(row.id))
        setSaving((prev) => {
          const next = new Set(prev)
          next.delete(row.id)
          return next
        })
      }
    },
    []
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
            {visible.map((row) => {
              const isPending = pendingEmail.has(row.id)
              const isSaving = saving.has(row.id)
              return (
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
                    {isPending ? (
                      <>
                        <span
                          className="data-badge data-badge-yellow flex items-center gap-1"
                          style={{ fontSize: 11 }}
                        >
                          <Clock size={10} />
                          Pending
                        </span>
                        <button
                          type="button"
                          className="btn btn-primary btn-compact"
                          disabled={isSaving}
                          onClick={() => handleFinalize(row, 'accepted')}
                        >
                          Accepted
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-compact"
                          disabled={isSaving}
                          onClick={() => handleFinalize(row, 'rejected')}
                        >
                          Reject
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn btn-primary btn-compact flex items-center gap-1"
                          disabled={isSaving}
                          onClick={() => handleContact(row)}
                        >
                          <Mail size={11} />
                          Contact
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-compact"
                          disabled={isSaving}
                          onClick={() => handleFinalize(row, 'rejected')}
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
