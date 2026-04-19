import PageHeader from '@/components/layout/PageHeader'
import { getAuditLog } from '@/lib/agnes-queries'
import { CheckCircle, XCircle, Clock, Zap } from 'lucide-react'

function ActionBadge({ action }: { action: string }) {
  if (action === 'accepted') {
    return (
      <span className="data-badge data-badge-green flex items-center gap-1">
        <CheckCircle size={10} />
        Accepted
      </span>
    )
  }
  if (action === 'rejected') {
    return (
      <span className="data-badge data-badge-red flex items-center gap-1">
        <XCircle size={10} />
        Rejected
      </span>
    )
  }
  return (
    <span className="data-badge data-badge-yellow flex items-center gap-1">
      <Clock size={10} />
      {action.replace('_', ' ')}
    </span>
  )
}

function EntityTypeBadge({ type }: { type: string }) {
  return (
    <span className="data-badge data-badge-muted" style={{ fontSize: 10 }}>
      {type}
    </span>
  )
}

export default async function EvidenceTrailsPage() {
  const entries = await getAuditLog(undefined, undefined, 50)

  return (
    <>
      <PageHeader
        eyebrow="Sourcing"
        title="Evidence Trails"
        description="Full audit log of every decision Agnes made — what it saw, what it reasoned, what you accepted or rejected."
      />

      {entries.length === 0 ? (
        <div className="detail-section" style={{ marginTop: 24 }}>
          <div className="detail-empty">
            No decisions recorded yet. Accept or reject opportunities in the
            Cockpit to build your audit trail.
          </div>
        </div>
      ) : (
        <div className="detail-section" style={{ marginTop: 24 }}>
          <div className="detail-section-header">
            <Zap size={14} />
            <span>Decision log</span>
            <span className="data-badge data-badge-muted detail-section-count">
              {entries.length} entr{entries.length !== 1 ? 'ies' : 'y'}
            </span>
          </div>
          <div className="detail-list">
            {entries.map((entry) => (
              <div key={entry.id} className="detail-list-row">
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="detail-list-name font-medium">
                      {entry.entityLabel ?? entry.entityId}
                    </span>
                    <EntityTypeBadge type={entry.entityType} />
                    <ActionBadge action={entry.action} />
                  </div>
                  {entry.reasoning && (
                    <p className="text-xs text-gray-500 leading-relaxed">
                      {entry.reasoning}
                    </p>
                  )}
                  <span className="text-xs text-gray-400">
                    {entry.createdAt}
                    {entry.userId ? ` · ${entry.userId}` : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
