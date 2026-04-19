import type { OpportunityRow } from '@/lib/agnes-queries'

type CockpitAgentPanelProps = {
  rows: OpportunityRow[]
}

function toTaskLabel(row: OpportunityRow): string {
  return `Evaluating ${row.ingredientName} via ${row.altSupplier}`
}

export default function CockpitAgentPanel({ rows }: CockpitAgentPanelProps) {
  const tasks = rows.slice(0, 3)

  return (
    <section className="cockpit-panel" aria-labelledby="cockpit-agent-heading">
      <div className="cockpit-panel-header">
        <h2 className="cockpit-panel-title" id="cockpit-agent-heading">
          Agnes agent
        </h2>
        <span className="cockpit-panel-hint">Live tasks</span>
      </div>
      <div className="cockpit-panel-body">
        <ul className="cockpit-agent-list">
          {tasks.length === 0 ? (
            <li className="cockpit-agent-task">
              <span className="cockpit-agent-task-label">
                No active recommendation jobs in this scope.
              </span>
              <span className="cockpit-agent-status cockpit-agent-status--done">
                Idle
              </span>
            </li>
          ) : (
            tasks.map((row, index) => (
              <li key={row.id} className="cockpit-agent-task">
                <span className="cockpit-agent-task-label">
                  {toTaskLabel(row)}
                </span>
                <span
                  className={`cockpit-agent-status ${index < 2 ? 'cockpit-agent-status--active' : 'cockpit-agent-status--done'}`}
                >
                  {index < 2 ? 'Active' : 'Queued'}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
    </section>
  )
}
