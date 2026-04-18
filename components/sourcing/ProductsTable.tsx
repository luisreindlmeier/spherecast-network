'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'
import type { FinishedGoodRow } from '@/lib/queries'

interface Props {
  rows: FinishedGoodRow[]
}

export default function ProductsTable({ rows }: Props) {
  const [query, setQuery] = useState('')

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
      {/* Toolbar */}
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
        <span className="data-count">
          {filtered.length !== rows.length
            ? `${filtered.length} of ${rows.length}`
            : `${rows.length} products`}
        </span>
      </div>

      {/* Header */}
      <div className="data-table-head data-grid-products">
        <span>SKU</span>
        <span>Brand</span>
        <span className="data-col-right">Ingredients</span>
      </div>

      {/* Rows */}
      <div className="data-table-body">
        {filtered.length === 0 ? (
          <div className="data-empty">
            No products match &ldquo;{query}&rdquo;
          </div>
        ) : (
          filtered.map((row) => (
            <div key={row.id} className="data-row data-grid-products">
              <span className="data-sku">{row.sku}</span>
              <Link
                href={`/companies/${row.company_id}`}
                className="data-name detail-link"
                onClick={(e) => e.stopPropagation()}
              >
                {row.companyName}
              </Link>
              <span className="data-col-right">
                {row.ingredientCount > 0 ? (
                  <span className="data-badge data-badge-blue">
                    {row.ingredientCount}
                  </span>
                ) : (
                  <span className="data-badge data-badge-muted">—</span>
                )}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
