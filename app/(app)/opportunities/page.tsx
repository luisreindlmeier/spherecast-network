import PageHeader from '@/components/layout/PageHeader'
import OpportunitiesWorkspace from '@/components/opportunities/OpportunitiesWorkspace'
import { resolveCompanyScopeFilter } from '@/lib/company-scope-server'
import { getOpportunities } from '@/lib/agnes-queries'

export default async function OpportunitiesPage() {
  const scope = await resolveCompanyScopeFilter()
  const rows = await getOpportunities(scope)

  return (
    <div className="opportunities-page">
      <PageHeader
        eyebrow="Network Intelligence"
        title="Opportunities"
        description="Ranked consolidation and sourcing opportunities from Agnes recommendations — filter the list and open a row to inspect full evidence."
      />
      <OpportunitiesWorkspace rows={rows} />
    </div>
  )
}
