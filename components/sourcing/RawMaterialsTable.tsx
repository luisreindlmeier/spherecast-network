'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { RawMaterialRow } from '@/lib/agnes-queries'
import SourceViewToggle, {
  type SourceViewMode,
} from '@/components/sourcing/SourceViewToggle'

interface Props {
  rows: RawMaterialRow[]
}

type RawMaterialsSortKey = 'sku' | 'suppliers' | 'usage'

function RawMaterialsColHeader({
  label,
  value,
  sort,
  setSort,
}: {
  label: string
  value: RawMaterialsSortKey
  sort: RawMaterialsSortKey
  setSort: (v: RawMaterialsSortKey) => void
}) {
  return (
    <button
      className={`data-sort-btn${sort === value ? ' active' : ''}`}
      onClick={() => setSort(value)}
      type="button"
    >
      {label}
      {sort === value && <span className="data-sort-arrow">↓</span>}
    </button>
  )
}

export default function RawMaterialsTable({ rows }: Props) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<RawMaterialsSortKey>('sku')
  const [view, setView] = useState<SourceViewMode>('row')

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    const base = q
      ? rows.filter(
          (r) =>
            r.sku.toLowerCase().includes(q) ||
            r.companyName.toLowerCase().includes(q)
        )
      : rows

    return [...base].sort((a, b) => {
      if (sort === 'suppliers') return b.supplierCount - a.supplierCount
      if (sort === 'usage') return b.usedInProducts - a.usedInProducts
      return a.sku.localeCompare(b.sku)
    })
  }, [rows, query, sort])

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
            : `${rows.length} materials`}
        </span>
      </div>

      {view === 'row' && (
        <div className="data-table-head data-grid-materials">
          <RawMaterialsColHeader
            label="SKU"
            value="sku"
            sort={sort}
            setSort={setSort}
          />
          <span>Brand</span>
          <RawMaterialsColHeader
            label="Suppliers"
            value="suppliers"
            sort={sort}
            setSort={setSort}
          />
          <RawMaterialsColHeader
            label="Used in"
            value="usage"
            sort={sort}
            setSort={setSort}
          />
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
            No materials match &ldquo;{query}&rdquo;
          </div>
        ) : view === 'row' ? (
          filtered.map((row) => (
            <Link
              key={row.id}
              href={`/raw-materials/${row.id}`}
              className="data-row data-grid-materials"
              style={{ textDecoration: 'none' }}
            >
              <span className="data-sku">{row.sku}</span>
              <span className="data-name">{row.companyName}</span>
              <span className="data-col-right">
                <span className="data-cell-num">{row.supplierCount}</span>
              </span>
              <span className="data-col-right">
                {row.usedInProducts > 0 ? (
                  <span className="data-cell-num">{row.usedInProducts}</span>
                ) : (
                  <span className="data-cell-num data-cell-num-muted">—</span>
                )}
              </span>
            </Link>
          ))
        ) : (
          filtered.map((row) => (
            <Link
              key={row.id}
              href={`/raw-materials/${row.id}`}
              className="data-source-tile"
            >
              <span className="data-sku">{row.sku}</span>
              <span className="data-source-tile-title">{row.companyName}</span>
              <div className="data-source-tile-meta">
                <span>
                  <span className="data-source-tile-meta-k">Suppliers</span>{' '}
                  <span className="data-cell-num">{row.supplierCount}</span>
                </span>
                <span>
                  <span className="data-source-tile-meta-k">Used in</span>{' '}
                  {row.usedInProducts > 0 ? (
                    <span className="data-cell-num">{row.usedInProducts}</span>
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
