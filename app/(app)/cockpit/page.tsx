import PageHeader from '@/components/layout/PageHeader'
import DummyBlock from '@/components/layout/DummyBlock'
import { getCockpitStats } from '@/lib/queries'

export default async function CockpitPage() {
  const stats = await getCockpitStats()

  const statCards = [
    {
      label: 'Finished Goods',
      value: String(stats.finishedGoods),
      delta: 'tracked in BOMs',
    },
    {
      label: 'Raw Materials',
      value: String(stats.rawMaterials),
      delta: 'across all BOMs',
    },
    {
      label: 'Brands',
      value: String(stats.companies),
      delta: 'in network',
    },
    {
      label: 'Suppliers',
      value: String(stats.suppliers),
      delta: 'qualified',
    },
  ]

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
        {statCards.map((s) => (
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
