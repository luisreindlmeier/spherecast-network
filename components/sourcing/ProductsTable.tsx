'use client'

import Link from 'next/link'
import { useCallback, useState } from 'react'
import type { FinishedGoodRow } from '@/lib/queries'
import type { SourceViewMode } from '@/components/sourcing/SourceViewToggle'
import SourcingTableShell from '@/components/sourcing/SourcingTableShell'
import { useTableQuery } from '@/components/sourcing/useTableQuery'

interface Props {
  rows: FinishedGoodRow[]
}

export default function ProductsTable({ rows }: Props) {
  const [view, setView] = useState<SourceViewMode>('row')

  const matchProduct = useCallback(
    (row: FinishedGoodRow, normalizedQuery: string) =>
      row.sku.toLowerCase().includes(normalizedQuery) ||
      row.companyName.toLowerCase().includes(normalizedQuery),
    []
  )

  const { query, setQuery, filtered, countLabel } = useTableQuery(
    rows,
    matchProduct
  )

  return (
    <SourcingTableShell
      ariaLabel="Products table"
      query={query}
      onQueryChange={setQuery}
      queryPlaceholder="Search by SKU or brand…"
      view={view}
      onViewChange={setView}
      countLabel={countLabel}
      countSuffix="products"
      head={
        <div className="data-table-head data-grid-products">
          <span>SKU</span>
          <span>Brand</span>
          <span className="data-col-right">Ingredients</span>
        </div>
      }
      isEmpty={filtered.length === 0}
      emptyMessage={`No products match "${query}"`}
      rowContent={
        <>
          {filtered.map((row) => (
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
          ))}
        </>
      }
      tileContent={
        <>
          {filtered.map((row) => (
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
          ))}
        </>
      }
    />
  )
}
