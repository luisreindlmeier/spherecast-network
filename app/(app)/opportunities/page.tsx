import PageHeader from '@/components/layout/PageHeader'
import OpportunitiesWorkspace from '@/components/opportunities/OpportunitiesWorkspace'

export default function OpportunitiesPage() {
  return (
    <div className="opportunities-page">
      <PageHeader
        eyebrow="Network Intelligence"
        title="Opportunities"
        description="Ranked consolidation and sourcing opportunities (demo data) — filter the list and open a row to view the full detail page."
      />
      <OpportunitiesWorkspace />
    </div>
  )
}
