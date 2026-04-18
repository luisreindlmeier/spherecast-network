export default function CockpitAgentPanel() {
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
          <li className="cockpit-agent-task">
            <span className="cockpit-agent-task-label">
              Scraping iHerb FG-iherb-10421…
            </span>
            <span className="cockpit-agent-status cockpit-agent-status--active">
              Active
            </span>
          </li>
          <li className="cockpit-agent-task">
            <span className="cockpit-agent-task-label">
              Comparing Vitamin D3 specs…
            </span>
            <span className="cockpit-agent-status cockpit-agent-status--active">
              Active
            </span>
          </li>
          <li className="cockpit-agent-task">
            <span className="cockpit-agent-task-label">
              FDA lookup Jost Chemical…
            </span>
            <span className="cockpit-agent-status cockpit-agent-status--done">
              Done ✓
            </span>
          </li>
        </ul>
      </div>
    </section>
  )
}
