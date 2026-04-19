import PageHeader from '@/components/layout/PageHeader'
import { getAuditLog } from '@/lib/agnes-queries'
import { resolveCompanyScopeFilter } from '@/lib/company-scope-server'
import DecisionLogPanel from '@/components/decisions/DecisionLogPanel'

export default async function EvidenceTrailsPage() {
  const [entries, scopeCompanyId] = await Promise.all([
    getAuditLog(undefined, undefined, 50),
    resolveCompanyScopeFilter(),
  ])

  return (
    <>
      <PageHeader
        eyebrow="Sourcing"
        title="Evidence Trails"
        description="Full audit log of every decision Agnes made — what it saw, what it reasoned, what you accepted or rejected."
      />
      <DecisionLogPanel entries={entries} scopeCompanyId={scopeCompanyId} />
    </>
  )
}
