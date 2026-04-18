'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { CompanyWithCounts } from '@/lib/queries'
import SourceViewToggle, {
  type SourceViewMode,
} from '@/components/sourcing/SourceViewToggle'

interface Props {
  companies: CompanyWithCounts[]
}

export default function CompaniesTable({ companies }: Props) {
  const [query, setQuery] = useState('')
  const [view, setView] = useState<SourceViewMode>('row')

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return companies
    return companies.filter((c) => c.name.toLowerCase().includes(q))
  }, [companies, query])

  return (
    <div className="data-table-card">
      <div className="data-table-toolbar">
        <input
          className="data-search"
          type="search"
          placeholder="Search brands…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        <SourceViewToggle value={view} onChange={setView} />
        <span className="data-count">
          {filtered.length !== companies.length
            ? `${filtered.length} of ${companies.length}`
            : `${companies.length} brands`}
        </span>
      </div>

      {view === 'row' && (
        <div className="data-table-head data-grid-companies">
          <span>Brand</span>
          <span className="data-col-right">Finished Goods</span>
          <span className="data-col-right">Raw Materials</span>
        </div>
      )}

      <div
        className={
          view === 'tiles'
            ? 'data-table-body data-table-body--tiles'
            : 'data-table-body'
        }
      >
        {filtered.length === 0 ? (
          <div className="data-empty">
            No brands match &ldquo;{query}&rdquo;
          </div>
        ) : view === 'row' ? (
          filtered.map((c, i) => (
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
                  <span className="data-cell-num">{c.finishedGoods}</span>
                ) : (
                  <span className="data-cell-num data-cell-num-muted">—</span>
                )}
              </span>
              <span className="data-col-right">
                {c.rawMaterials > 0 ? (
                  <span className="data-cell-num">{c.rawMaterials}</span>
                ) : (
                  <span className="data-cell-num data-cell-num-muted">—</span>
                )}
              </span>
            </Link>
          ))
        ) : (
          filtered.map((c) => (
            <Link
              key={c.id}
              href={`/companies/${c.id}`}
              className="data-source-tile"
            >
              <span className="data-source-tile-label">Brand</span>
              <span className="data-source-tile-title">{c.name}</span>
              <div className="data-source-tile-meta">
                <span>
                  <span className="data-source-tile-meta-k">FG</span>{' '}
                  {c.finishedGoods > 0 ? (
                    <span className="data-cell-num">{c.finishedGoods}</span>
                  ) : (
                    <span className="data-cell-num data-cell-num-muted">—</span>
                  )}
                </span>
                <span>
                  <span className="data-source-tile-meta-k">RM</span>{' '}
                  {c.rawMaterials > 0 ? (
                    <span className="data-cell-num">{c.rawMaterials}</span>
                  ) : (
                    <span className="data-cell-num data-cell-num-muted">—</span>
                  )}
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
