'use client'

import Link from 'next/link'
import { useCallback, useState } from 'react'
import type { SupplierRow } from '@/lib/agnes-queries'
import type { SourceViewMode } from '@/components/sourcing/SourceViewToggle'
import SourcingTableShell from '@/components/sourcing/SourcingTableShell'
import { useTableQuery } from '@/components/sourcing/useTableQuery'

interface Props {
  rows: SupplierRow[]
}

export default function SuppliersTable({ rows }: Props) {
  const [view, setView] = useState<SourceViewMode>('row')

  const matchSupplier = useCallback(
    (supplier: SupplierRow, normalizedQuery: string) =>
      supplier.name.toLowerCase().includes(normalizedQuery),
    []
  )

  const { query, setQuery, filtered, countLabel } = useTableQuery(
    rows,
    matchSupplier
  )

  return (
    <SourcingTableShell
      ariaLabel="Suppliers table"
      query={query}
      onQueryChange={setQuery}
      queryPlaceholder="Search supplier…"
      view={view}
      onViewChange={setView}
      countLabel={countLabel}
      countSuffix="suppliers"
      head={
        <div className="data-table-head data-grid-suppliers">
          <span>Supplier</span>
          <span className="data-col-right">Linked SKUs</span>
        </div>
      }
      isEmpty={filtered.length === 0}
      emptyMessage={`No suppliers match "${query}"`}
      rowContent={
        <>
          {filtered.map((row) => (
            <Link
              key={row.id}
              href={`/suppliers/${row.id}`}
              className="data-row data-grid-suppliers"
              style={{ textDecoration: 'none' }}
            >
              <span className="data-name">{row.name}</span>
              <span className="data-col-right">
                <span className="data-cell-num">{row.materialCount}</span>
              </span>
            </Link>
          ))}
        </>
      }
      tileContent={
        <>
          {filtered.map((row) => (
            <Link
              key={row.id}
              href={`/suppliers/${row.id}`}
              className="data-source-tile"
            >
              <span className="data-source-tile-label">Supplier</span>
              <span className="data-source-tile-title">{row.name}</span>
              <div className="data-source-tile-meta">
                <span className="data-source-tile-meta-k">Linked SKUs</span>{' '}
                <span className="data-cell-num">{row.materialCount}</span>
              </div>
            </Link>
          ))}
        </>
      }
    />
  )
}
