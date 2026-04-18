'use client'

import { useState } from 'react'
import { opportunities, evidenceEntries } from '@/lib/mock-data'
import type { Opportunity } from '@/lib/mock-data'
import StatusBadge from '@/components/agnes/StatusBadge'
import { ChevronDown, ChevronRight, CheckCircle, XCircle } from 'lucide-react'

function ConfidenceCell({ score }: { score: number }) {
  let bg: string, color: string, label: string
  if (score >= 90) {
    bg = 'rgba(34,197,94,0.25)'
    color = '#22c55e'
    label = 'Verified'
  } else if (score >= 70) {
    bg = 'rgba(234,179,8,0.25)'
    color = '#eab308'
    label = 'Pending'
  } else if (score >= 50) {
    bg = 'rgba(249,115,22,0.25)'
    color = '#f97316'
    label = 'Review'
  } else {
    bg = 'rgba(239,68,68,0.25)'
    color = '#ef4444'
    label = 'Uncertain'
  }
  return (
    <span
      style={{
        background: bg,
        color,
        borderRadius: 4,
        padding: '2px 8px',
        fontSize: 12,
        fontWeight: 500,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      {score}%<span style={{ fontSize: 11, opacity: 0.7 }}>{label}</span>
    </span>
  )
}

function EvidenceExpanded({ opp }: { opp: Opportunity }) {
  const entry = evidenceEntries.find((e) => e.opportunityId === opp.id)

  if (!entry) {
    return (
      <tr>
        <td
          colSpan={7}
          style={{ padding: '16px 20px', background: 'var(--bg-elevated)' }}
        >
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            No evidence trail generated yet. Agnes will process this on the next
            scan.
          </p>
        </td>
      </tr>
    )
  }

  return (
    <tr>
      <td
        colSpan={7}
        style={{ background: 'var(--bg-elevated)', padding: '0' }}
      >
        <div
          style={{
            padding: '16px 20px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 12,
          }}
        >
          {/* DB Match */}
          <div>
            <div className="section-label" style={{ marginBottom: 8 }}>
              Internal DB Match
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 600,
                  color:
                    entry.dbMatch.similarity >= 0.9 ? '#22c55e' : '#eab308',
                }}
              >
                {(entry.dbMatch.similarity * 100).toFixed(0)}%
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                embedding similarity
              </span>
            </div>
            <p
              style={{
                fontSize: 12,
                color: 'var(--text-primary)',
                lineHeight: 1.6,
              }}
            >
              {entry.dbMatch.reasoning}
            </p>
          </div>

          {/* External Evidence */}
          <div>
            <div className="section-label" style={{ marginBottom: 8 }}>
              External Evidence
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                marginBottom: 4,
              }}
            >
              {entry.externalEvidence.source}
            </div>
            <p
              style={{
                fontSize: 12,
                color: 'var(--text-primary)',
                lineHeight: 1.6,
                marginBottom: 8,
              }}
            >
              {entry.externalEvidence.text}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {entry.externalEvidence.tags.map((tag) => (
                <span key={tag} className="pill">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Agnes Recommendation */}
          <div>
            <div className="section-label" style={{ marginBottom: 8 }}>
              Agnes Recommendation
            </div>
            <div className="evidence-highlight">
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--text-primary)',
                  lineHeight: 1.6,
                }}
              >
                {entry.recommendation}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <CheckCircle size={13} /> Accept recommendation
              </button>
              <button
                className="btn-danger"
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <XCircle size={13} /> Reject
              </button>
            </div>
          </div>
        </div>
      </td>
    </tr>
  )
}

export default function OpportunitiesPage() {
  const [expanded, setExpanded] = useState<string | null>(null)

  const totalSavings = opportunities.reduce((s, o) => s + o.savingsEur, 0)

  return (
    <div style={{ maxWidth: 1280 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: 2,
            }}
          >
            Consolidation Opportunities
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {opportunities.length} opportunities · est. €
            {(totalSavings / 1e6).toFixed(1)}M annual savings
          </p>
        </div>
        <button className="btn-ghost">Export CSV</button>
      </div>

      <div className="card-lg" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: 28 }} />
            <col style={{ width: '28%' }} />
            <col />
            <col style={{ width: 80 }} />
            <col style={{ width: 80 }} />
            <col style={{ width: 110 }} />
            <col style={{ width: 90 }} />
          </colgroup>
          <thead>
            <tr>
              <th />
              <th>Material</th>
              <th>Customers</th>
              <th style={{ textAlign: 'right' }}>Volume</th>
              <th style={{ textAlign: 'right' }}>Savings</th>
              <th style={{ textAlign: 'center' }}>Confidence</th>
              <th style={{ textAlign: 'center' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {opportunities.map((opp) => (
              <>
                <tr
                  key={opp.id}
                  onClick={() =>
                    setExpanded(expanded === opp.id ? null : opp.id)
                  }
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <span
                      style={{
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {expanded === opp.id ? (
                        <ChevronDown size={14} />
                      ) : (
                        <ChevronRight size={14} />
                      )}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>
                      {opp.material}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {opp.category}
                    </div>
                  </td>
                  <td>
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 4,
                      }}
                    >
                      {opp.customers.slice(0, 3).map((c) => (
                        <span key={c} className="pill">
                          {c}
                        </span>
                      ))}
                      {opp.customers.length > 3 && (
                        <span
                          style={{
                            fontSize: 11,
                            color: 'var(--text-muted)',
                            padding: '3px 0',
                          }}
                        >
                          +{opp.customers.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', fontSize: 12 }}>
                    {(opp.volumeKg / 1000).toFixed(0)}t
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      fontSize: 12,
                      color: 'var(--accent-green)',
                      fontWeight: 500,
                    }}
                  >
                    €{(opp.savingsEur / 1000).toFixed(0)}k
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <ConfidenceCell score={opp.confidenceScore} />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <StatusBadge status={opp.status} />
                  </td>
                </tr>
                {expanded === opp.id && (
                  <EvidenceExpanded key={`ev-${opp.id}`} opp={opp} />
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
