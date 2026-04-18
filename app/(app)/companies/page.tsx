import PageHeader from '@/components/layout/PageHeader'
import { getCompanies } from '@/lib/queries'
import Link from 'next/link'

export default async function CompaniesPage() {
  const companies = await getCompanies()

  const withFg = companies.filter((c) => c.finishedGoods > 0).length
  const withRm = companies.filter((c) => c.rawMaterials > 0).length

  return (
    <>
      <PageHeader
        eyebrow="Sourcing"
        title="Companies"
        description="All brands in the Spherecast network — finished goods producers and raw material owners."
      />

      <div
        className="stat-row"
        style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}
      >
        <div className="stat-card">
          <div className="stat-label">Brands</div>
          <div className="stat-value">{companies.length}</div>
          <div className="stat-delta">total in network</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">With Finished Goods</div>
          <div className="stat-value">{withFg}</div>
          <div className="stat-delta">have BOMs</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">With Raw Materials</div>
          <div className="stat-value">{withRm}</div>
          <div className="stat-delta">own ingredients</div>
        </div>
      </div>

      <div className="data-table-card">
        <div className="data-table-head data-grid-companies">
          <span>Brand</span>
          <span className="data-col-right">Finished Goods</span>
          <span className="data-col-right">Raw Materials</span>
        </div>
        <div>
          {companies.map((c, i) => (
            <Link
              key={c.id}
              href={`/companies/${c.id}`}
              className="data-row data-grid-companies"
              style={{
                borderTop: i === 0 ? 'none' : undefined,
                textDecoration: 'none',
              }}
            >
              <span className="data-name">{c.name}</span>
              <span className="data-col-right">
                {c.finishedGoods > 0 ? (
                  <span className="data-badge data-badge-blue">
                    {c.finishedGoods}
                  </span>
                ) : (
                  <span className="data-badge data-badge-muted">—</span>
                )}
              </span>
              <span className="data-col-right">
                {c.rawMaterials > 0 ? (
                  <span className="data-badge data-badge-muted">
                    {c.rawMaterials}
                  </span>
                ) : (
                  <span className="data-badge data-badge-muted">—</span>
                )}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}
