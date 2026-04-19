'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { FinishedGoodRow } from '@/lib/agnes-queries'
import SourceViewToggle, {
  type SourceViewMode,
} from '@/components/sourcing/SourceViewToggle'

interface Props {
  rows: FinishedGoodRow[]
}

export default function ProductsTable({ rows }: Props) {
  const [query, setQuery] = useState('')
  const [view, setView] = useState<SourceViewMode>('row')

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return rows
    return rows.filter(
      (r) =>
        r.sku.toLowerCase().includes(q) ||
        r.companyName.toLowerCase().includes(q)
    )
  }, [rows, query])

  return (
    <div className="data-table-card">
      <div className="data-table-toolbar">
        <input
          className="data-search"
          type="search"
          placeholder="Search by SKU or brand…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        <SourceViewToggle value={view} onChange={setView} />
        <span className="data-count">
          {filtered.length !== rows.length
            ? `${filtered.length} of ${rows.length}`
            : `${rows.length} products`}
        </span>
      </div>

      {view === 'row' && (
        <div className="data-table-head data-grid-products">
          <span>SKU</span>
          <span>Brand</span>
          <span className="data-col-right">Ingredients</span>
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
            No products match &ldquo;{query}&rdquo;
          </div>
        ) : view === 'row' ? (
          filtered.map((row) => (
            <div key={row.id} className="data-row data-grid-products">
              <Link
                href={`/products/${row.id}`}
                className="data-sku detail-link"
                onClick={(e) => e.stopPropagation()}
              >
                {row.sku}
              </Link>
              <Link
                href={`/companies/${row.companyId}`}
                className="data-name detail-link"
                onClick={(e) => e.stopPropagation()}
              >
                {row.companyName}
              </Link>
              <span className="data-col-right">
                {row.ingredientCount > 0 ? (
                  <span className="data-cell-num">{row.ingredientCount}</span>
                ) : (
                  <span className="data-cell-num data-cell-num-muted">—</span>
                )}
              </span>
            </div>
          ))
        ) : (
          filtered.map((row) => (
            <Link
              key={row.id}
              href={`/products/${row.id}`}
              className="data-source-tile"
            >
              <span className="data-sku">{row.sku}</span>
              <span className="data-source-tile-title">{row.companyName}</span>
              <div className="data-source-tile-meta">
                <span className="data-source-tile-meta-k">Ingredients</span>{' '}
                {row.ingredientCount > 0 ? (
                  <span className="data-cell-num">{row.ingredientCount}</span>
                ) : (
                  <span className="data-cell-num data-cell-num-muted">—</span>
                )}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
