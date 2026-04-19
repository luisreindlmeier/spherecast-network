import PageHeader from '@/components/layout/PageHeader'
import CompaniesTable from '@/components/sourcing/CompaniesTable'
import { resolveCompanyScopeFilter } from '@/lib/company-scope-server'
import { getCompanies } from '@/lib/agnes-queries'

export default async function CompaniesPage() {
  const scope = await resolveCompanyScopeFilter()
  const companies = await getCompanies(scope)

  return (
    <>
      <PageHeader
        eyebrow="Sourcing"
        title="Companies"
        description="All brands in the Spherecast network — finished goods producers and raw material owners."
      />

      <CompaniesTable companies={companies} />
    </>
  )
}
