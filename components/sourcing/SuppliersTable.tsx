'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { SupplierRow } from '@/lib/queries'
import SourceViewToggle, {
  type SourceViewMode,
} from '@/components/sourcing/SourceViewToggle'

interface Props {
  rows: SupplierRow[]
}

export default function SuppliersTable({ rows }: Props) {
  const [query, setQuery] = useState('')
  const [view, setView] = useState<SourceViewMode>('row')

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return q ? rows.filter((r) => r.name.toLowerCase().includes(q)) : rows
  }, [rows, query])

  return (
    <div className="data-table-card">
      <div className="data-table-toolbar">
        <input
          className="data-search"
          type="search"
          placeholder="Search supplier…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        <SourceViewToggle value={view} onChange={setView} />
        <span className="data-count">
          {filtered.length !== rows.length
            ? `${filtered.length} of ${rows.length}`
            : `${rows.length} suppliers`}
        </span>
      </div>

      {view === 'row' && (
        <div className="data-table-head data-grid-suppliers">
          <span>Supplier</span>
          <span className="data-col-right">Linked SKUs</span>
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
            No suppliers match &ldquo;{query}&rdquo;
          </div>
        ) : view === 'row' ? (
          filtered.map((row) => (
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
          ))
        ) : (
          filtered.map((row) => (
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
          ))
        )}
      </div>
    </div>
  )
}
