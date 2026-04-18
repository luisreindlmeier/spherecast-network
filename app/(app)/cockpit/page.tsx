import CockpitAgentPanel from '@/components/cockpit/CockpitAgentPanel'
import CockpitPreviewMaps from '@/components/cockpit/CockpitPreviewMaps'
import CockpitOpportunityFeed from '@/components/cockpit/CockpitOpportunityFeed'
import PageHeader from '@/components/layout/PageHeader'
import { resolveCompanyScopeFilter } from '@/lib/company-scope-server'
import { getCockpitStats } from '@/lib/queries'

export default async function CockpitPage() {
  const scope = await resolveCompanyScopeFilter()
  const stats = await getCockpitStats(scope)

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Cockpit"
        description="Prioritized consolidation opportunities, verified supplier actions, and a live read on your sourcing network."
        actions={
          <>
            <button type="button" className="btn btn-ghost">
              Export
            </button>
            <button type="button" className="btn btn-primary">
              Run Agnes scan
            </button>
          </>
        }
      />

      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-label">Open opportunities</div>
          <div className="stat-value">23</div>
          <div className="stat-delta stat-delta-positive">↑ 3 new</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Verified</div>
          <div className="stat-value">8</div>
          <div className="stat-delta">Ready to act</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Est. savings</div>
          <div className="stat-value">$2.4M/yr</div>
          <div className="stat-delta">Est.</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Network</div>
          <div className="stat-value">{stats.companies} brands</div>
          <div className="stat-delta">{stats.suppliers} suppliers</div>
        </div>
      </div>

      <div className="cockpit-mid-grid">
        <CockpitOpportunityFeed />
        <CockpitAgentPanel />
      </div>

      <section
        className="cockpit-map-section"
        aria-label="Network map and similarity map previews"
      >
        <CockpitPreviewMaps />
      </section>
    </>
  )
}
