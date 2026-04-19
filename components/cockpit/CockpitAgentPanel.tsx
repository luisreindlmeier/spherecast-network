import type { OpportunityRow } from '@/lib/agnes-queries'
import type { AgnesAuditLogEntry } from '@/lib/agnes-client'

type CockpitAgentPanelProps = {
  rows: OpportunityRow[]
  recentDecisions: AgnesAuditLogEntry[]
}

type TaskItem = {
  key: string
  label: string
  status: 'active' | 'pending' | 'done' | 'rejected' | 'queued'
}

function statusLabel(s: TaskItem['status']): string {
  if (s === 'active') return 'Active'
  if (s === 'pending') return 'Pending'
  if (s === 'done') return 'Confirmed'
  if (s === 'rejected') return 'Passed'
  return 'Queued'
}

function statusClass(s: TaskItem['status']): string {
  if (s === 'active') return 'cockpit-agent-status--active'
  if (s === 'pending') return 'cockpit-agent-status--pending'
  if (s === 'done') return 'cockpit-agent-status--done'
  if (s === 'rejected') return 'cockpit-agent-status--rejected'
  return 'cockpit-agent-status--queued'
}

function decisionToTask(d: AgnesAuditLogEntry): TaskItem {
  const label = d.entityLabel ?? `Opportunity #${d.entityId}`
  if (d.action === 'pending') {
    return {
      key: `decision-${d.id}`,
      label: `Outreach sent — ${label}`,
      status: 'pending',
    }
  }
  if (d.action === 'accepted') {
    return {
      key: `decision-${d.id}`,
      label: `Confirmed — ${label}`,
      status: 'done',
    }
  }
  if (d.action === 'rejected') {
    return {
      key: `decision-${d.id}`,
      label: `Passed on ${label}`,
      status: 'rejected',
    }
  }
  return {
    key: `decision-${d.id}`,
    label,
    status: 'active',
  }
}

export default function CockpitAgentPanel({
  rows,
  recentDecisions,
}: CockpitAgentPanelProps) {
  // Decisions that have already been actioned (ids already decided)
  const decidedIds = new Set(recentDecisions.map((d) => d.entityId))

  // Up to 2 queued evaluations from opportunities not yet decided
  const queued: TaskItem[] = rows
    .filter((r) => !decidedIds.has(r.rawMaterialId.toString()))
    .slice(0, 2)
    .map((r, i) => ({
      key: `opp-${r.id}`,
      label: `Evaluating ${r.ingredientName} → ${r.altSupplier}`,
      status: i === 0 ? 'active' : 'queued',
    }))

  // Recent decisions (newest first, up to 3)
  const decided: TaskItem[] = recentDecisions.slice(0, 3).map(decisionToTask)

  const tasks: TaskItem[] = [...decided, ...queued].slice(0, 5)

  return (
    <section className="cockpit-panel" aria-labelledby="cockpit-agent-heading">
      <div className="cockpit-panel-header">
        <h2 className="cockpit-panel-title" id="cockpit-agent-heading">
          Agnes agent
        </h2>
        <span className="cockpit-panel-hint">Activity</span>
      </div>
      <div className="cockpit-panel-body">
        <ul className="cockpit-agent-list">
          {tasks.length === 0 ? (
            <li className="cockpit-agent-task">
              <span className="cockpit-agent-task-label">
                No active tasks in this scope.
              </span>
              <span className="cockpit-agent-status cockpit-agent-status--done">
                Idle
              </span>
            </li>
          ) : (
            tasks.map((task) => (
              <li key={task.key} className="cockpit-agent-task">
                <span className="cockpit-agent-task-label">{task.label}</span>
                <span
                  className={`cockpit-agent-status ${statusClass(task.status)}`}
                >
                  {statusLabel(task.status)}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
    </section>
  )
}
