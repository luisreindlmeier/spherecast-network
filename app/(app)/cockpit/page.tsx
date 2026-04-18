import PageHeader from '@/components/layout/PageHeader'
import DummyBlock from '@/components/layout/DummyBlock'

const stats = [
  { label: 'Finished Goods', value: '22', delta: 'tracked in BOMs' },
  { label: 'Raw Materials', value: '149', delta: 'across 8 categories' },
  { label: 'Open Opportunities', value: '12', delta: '€2.4M est. savings' },
  { label: 'Supplier Matches', value: '87', delta: 'last 30 days' },
]

export default function CockpitPage() {
  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Cockpit"
        description="Your raw material intelligence at a glance — opportunities, supplier signals and network consolidation health."
        actions={
          <>
            <button className="btn btn-ghost">Export</button>
            <button className="btn btn-primary">Run Agnes Scan</button>
          </>
        }
      />

      <div className="stat-row">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-delta">{s.delta}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
        }}
      >
        <DummyBlock title="Recent signals" hint="last 24h" />
        <DummyBlock title="Pending approvals" hint="3 awaiting review" />
      </div>
    </>
  )
}
