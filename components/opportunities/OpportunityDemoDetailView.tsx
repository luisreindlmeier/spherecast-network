import type {
  OpportunityDetail,
  OpportunityMatchLine,
} from '@/lib/agnes-queries'

function formatPct(conf: number): string {
  return `${Math.round(conf * 100)}%`
}

function buildSubstituteLines(
  detail: OpportunityDetail
): OpportunityMatchLine[] {
  const first = detail.allSubstitutes[0]
  if (!first) return detail.row.matchReasoning as OpportunityMatchLine[]

  return [
    { label: 'Similarity', detail: formatPct(first.similarity) },
    { label: 'Functional fit', detail: formatPct(first.functional_fit) },
    {
      label: 'Compliance',
      detail: first.compliance
        ? 'Pass'
        : `Review (${first.violations.join(', ') || 'violations'})`,
    },
    {
      label: 'Supplier options',
      detail:
        first.available_from.length > 0
          ? first.available_from.slice(0, 3).join(' · ')
          : 'No supplier metadata',
    },
  ]
}

export default function OpportunityDetailView({
  detail,
}: {
  detail: OpportunityDetail
}) {
  const row = detail.row
  const lines = buildSubstituteLines(detail)

  return (
    <div className="opportunities-detail-card">
      <div className="opportunities-detail-head">
        <div>
          <h2 className="opportunities-detail-title">
            {row.ingredientName}
            <span className="opportunities-detail-sub">
              {' '}
              / {row.rawMaterialSku}
            </span>
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
            {lines.map((m) => (
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
            {detail.explanation ? <li>{detail.explanation}</li> : null}
            {detail.sourcingActions.slice(0, 3).map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </section>
      </div>

      <div className="opportunities-detail-actions">
        <button type="button" className="btn btn-ghost" disabled>
          Action hooks pending
        </button>
      </div>
    </div>
  )
}
