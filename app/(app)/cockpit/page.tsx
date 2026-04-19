import CockpitAgentPanel from '@/components/cockpit/CockpitAgentPanel'
import CockpitPreviewMaps from '@/components/cockpit/CockpitPreviewMaps'
import CockpitOpportunityFeed from '@/components/cockpit/CockpitOpportunityFeed'
import PageHeader from '@/components/layout/PageHeader'
import { resolveCompanyScopeFilter } from '@/lib/company-scope-server'
import { getCockpitStats, getOpportunities } from '@/lib/agnes-queries'

export default async function CockpitPage() {
  const scope = await resolveCompanyScopeFilter()
  const [stats, opportunities] = await Promise.all([
    getCockpitStats(scope).catch((error) => {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`[cockpit-page] stats fallback: ${message}`)
      return { finishedGoods: 0, rawMaterials: 0, suppliers: 0, companies: 0 }
    }),
    getOpportunities(scope).catch((error) => {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`[cockpit-page] opportunities fallback: ${message}`)
      return []
    }),
  ])

  const openCount = opportunities.filter((row) => row.status === 'open').length
  const inReviewCount = opportunities.filter(
    (row) => row.status === 'in_review'
  ).length
  const withCo2Signal = opportunities.filter((row) =>
    row.consolidation.estimatedSavings.includes('CO2 delta:')
  ).length

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
          <div className="stat-value">{openCount}</div>
          <div className="stat-delta stat-delta-positive">
            {opportunities.length} ranked in scope
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Verified</div>
          <div className="stat-value">{inReviewCount}</div>
          <div className="stat-delta">In review</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Impact signal</div>
          <div className="stat-value">{withCo2Signal}</div>
          <div className="stat-delta">Rows with CO2 delta</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Network</div>
          <div className="stat-value">{stats.companies} brands</div>
          <div className="stat-delta">{stats.suppliers} suppliers</div>
        </div>
      </div>

      <div className="cockpit-mid-grid">
        <CockpitOpportunityFeed rows={opportunities} />
        <CockpitAgentPanel rows={opportunities} />
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
