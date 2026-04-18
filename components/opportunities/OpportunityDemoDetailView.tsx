import type { OpportunityRow } from '@/lib/opportunities-demo-data'

function formatPct(conf: number): string {
  return `${Math.round(conf * 100)}%`
}

export default function OpportunityDemoDetailView({
  row,
}: {
  row: OpportunityRow
}) {
  return (
    <div className="opportunities-detail-card">
      <div className="opportunities-detail-head">
        <div>
          <h2 className="opportunities-detail-title">
            {row.ingredientName}
            {row.ingredientScientific ? (
              <span className="opportunities-detail-sub">
                {' '}
                / {row.ingredientScientific}
              </span>
            ) : null}
          </h2>
        </div>
        <span className="opportunities-detail-conf">
          {formatPct(row.confidence)}
        </span>
      </div>

      <div className="opportunities-detail-body">
        <section className="opportunities-panel-section">
          <h3 className="opportunities-panel-h">Match reasoning</h3>
          <ul className="opportunities-panel-list">
            {row.matchReasoning.map((m) => (
              <li key={m.label}>
                <span className="opportunities-panel-k">{m.label}:</span>{' '}
                {m.detail}
              </li>
            ))}
          </ul>
        </section>

        <section className="opportunities-panel-section">
          <h3 className="opportunities-panel-h">Brands affected</h3>
          <ul className="opportunities-panel-list">
            {row.brandsAffected.map((b) => (
              <li key={b.name}>
                {b.name}{' '}
                <span className="opportunities-panel-muted">
                  ({b.productCount} product{b.productCount !== 1 ? 's' : ''})
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="opportunities-panel-section">
          <h3 className="opportunities-panel-h">Consolidation proposal</h3>
          <ul className="opportunities-panel-list opportunities-panel-prose">
            <li>{row.consolidation.via}</li>
            <li>{row.consolidation.combinedVolume}</li>
            <li>{row.consolidation.estimatedSavings}</li>
            <li>{row.consolidation.supplierRisk}</li>
          </ul>
        </section>
      </div>

      <div className="opportunities-detail-actions">
        <button type="button" className="btn btn-primary">
          Accept
        </button>
        <button type="button" className="btn btn-ghost">
          Reject
        </button>
        <button type="button" className="btn btn-ghost">
          More evidence
        </button>
      </div>
    </div>
  )
}
