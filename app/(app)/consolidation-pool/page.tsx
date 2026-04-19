import PageHeader from '@/components/layout/PageHeader'
import { getConsolidationPool } from '@/lib/agnes-queries'
import { Layers, Building2, Package } from 'lucide-react'

function formatIngredientName(raw: string): string {
  return raw
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export default async function ConsolidationPoolPage() {
  const pool = await getConsolidationPool()

  return (
    <>
      <PageHeader
        eyebrow="Spherecast Only"
        title="Consolidation Pool"
        description="Cross-customer demand pooled by material. Identify consolidation leverage across the network."
      />

      {pool.length === 0 ? (
        <div className="detail-section" style={{ marginTop: 24 }}>
          <div className="detail-empty">
            No consolidation opportunities found. Run the build_index script to
            index ingredients first.
          </div>
        </div>
      ) : (
        <>
          <div
            className="stat-row"
            style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 28 }}
          >
            <div className="stat-card">
              <div className="stat-label">Pooled Ingredients</div>
              <div className="stat-value">{pool.length}</div>
              <div className="stat-delta">shared across brands</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Max Brands on Single SKU</div>
              <div
                className="stat-value"
                style={{ color: 'var(--accent-blue)' }}
              >
                {Math.max(...pool.map((p) => p.companies_involved))}
              </div>
              <div className="stat-delta">simultaneous buyers</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Avg Brands / Ingredient</div>
              <div
                className="stat-value"
                style={{ color: 'var(--accent-green)' }}
              >
                {(
                  pool.reduce((s, p) => s + p.companies_involved, 0) /
                  pool.length
                ).toFixed(1)}
              </div>
              <div className="stat-delta">consolidation potential</div>
            </div>
          </div>

          <div className="detail-section">
            <div className="detail-section-header">
              <Layers size={14} />
              <span>Pooled volume by ingredient</span>
              <span className="data-badge data-badge-muted detail-section-count">
                {pool.length} ingredients
              </span>
            </div>
            <div className="detail-list">
              {pool.map((item) => (
                <div key={item.ingredient_name} className="detail-list-row">
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="detail-list-name font-medium">
                        {formatIngredientName(item.ingredient_name)}
                      </span>
                      <span className="data-badge data-badge-blue flex items-center gap-1">
                        <Building2 size={9} />
                        {item.companies_involved} brand
                        {item.companies_involved !== 1 ? 's' : ''}
                      </span>
                      <span className="data-badge data-badge-muted flex items-center gap-1">
                        <Package size={9} />
                        {item.total_skus} SKU{item.total_skus !== 1 ? 's' : ''}
                      </span>
                      {item.unique_supplier_count > 0 && (
                        <span
                          className={`data-badge ${item.unique_supplier_count === 1 ? 'data-badge-yellow' : 'data-badge-green'}`}
                        >
                          {item.unique_supplier_count} supplier
                          {item.unique_supplier_count !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">
                      {item.company_names.slice(0, 6).join(' · ')}
                      {item.company_names.length > 6
                        ? ` +${item.company_names.length - 6} more`
                        : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  )
}
