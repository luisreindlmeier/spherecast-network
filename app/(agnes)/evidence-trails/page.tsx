import { evidenceEntries } from '@/lib/mock-data'
import StatusBadge from '@/components/agnes/StatusBadge'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'

const decisionIcon = {
  accepted: <CheckCircle size={14} color="#22c55e" />,
  rejected: <XCircle size={14} color="#ef4444" />,
  pending: <AlertCircle size={14} color="#eab308" />,
}

export default function EvidenceTrailsPage() {
  return (
    <div style={{ maxWidth: 1024 }}>
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontSize: 20,
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: 2,
          }}
        >
          Evidence Trails
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Full audit log of all Agnes recommendations and decisions
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {evidenceEntries.map((entry) => (
          <div
            key={entry.id}
            className="card-lg"
            style={{ padding: 0, overflow: 'hidden' }}
          >
            {/* Header */}
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '0.5px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              {decisionIcon[entry.decision]}
              <div style={{ flex: 1 }}>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                  }}
                >
                  {entry.material}
                </span>
              </div>
              <StatusBadge status={entry.decision} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {new Date(entry.timestamp).toLocaleString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            {/* Body */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 0,
              }}
            >
              {/* DB Match */}
              <div
                style={{
                  padding: '14px 16px',
                  borderRight: '0.5px solid var(--border)',
                }}
              >
                <div className="section-label" style={{ marginBottom: 8 }}>
                  Internal DB Match
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 6,
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 22,
                      fontWeight: 600,
                      color:
                        entry.dbMatch.similarity >= 0.9
                          ? '#22c55e'
                          : entry.dbMatch.similarity >= 0.7
                            ? '#eab308'
                            : '#ef4444',
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
              <div
                style={{
                  padding: '14px 16px',
                  borderRight: '0.5px solid var(--border)',
                }}
              >
                <div className="section-label" style={{ marginBottom: 8 }}>
                  External Evidence
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    marginBottom: 6,
                  }}
                >
                  {entry.externalEvidence.source}
                </div>
                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--text-primary)',
                    lineHeight: 1.6,
                    marginBottom: 10,
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

              {/* Recommendation */}
              <div style={{ padding: '14px 16px' }}>
                <div className="section-label" style={{ marginBottom: 8 }}>
                  Agnes Recommendation
                </div>
                <div
                  className="evidence-highlight"
                  style={{ marginBottom: 12 }}
                >
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
                {entry.decision === 'pending' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn-primary"
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <CheckCircle size={13} /> Accept
                    </button>
                    <button
                      className="btn-danger"
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <XCircle size={13} /> Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
