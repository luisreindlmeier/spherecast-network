'use client'

import { useState, useMemo } from 'react'
import type { RawMaterialRow } from '@/lib/queries'

interface Props {
  rows: RawMaterialRow[]
}

function supplierBadgeVariant(count: number) {
  if (count === 0) return 'data-badge-red'
  if (count === 1) return 'data-badge-yellow'
  if (count <= 3) return 'data-badge-blue'
  return 'data-badge-green'
}

export default function RawMaterialsTable({ rows }: Props) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<'sku' | 'suppliers' | 'usage'>('sku')

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

  function ColHeader({
    label,
    value,
  }: {
    label: string
    value: 'sku' | 'suppliers' | 'usage'
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
            : `${rows.length} materials`}
        </span>
      </div>

      {/* Header */}
      <div className="data-table-head data-grid-materials">
        <ColHeader label="SKU" value="sku" />
        <span>Brand</span>
        <ColHeader label="Suppliers" value="suppliers" />
        <ColHeader label="Used in" value="usage" />
      </div>

      {/* Rows */}
      <div className="data-table-body">
        {filtered.length === 0 ? (
          <div className="data-empty">
            No materials match &ldquo;{query}&rdquo;
          </div>
        ) : (
          filtered.map((row) => (
            <div key={row.id} className="data-row data-grid-materials">
              <span className="data-sku">{row.sku}</span>
              <span className="data-name">{row.companyName}</span>
              <span>
                <span
                  className={`data-badge ${supplierBadgeVariant(row.supplierCount)}`}
                >
                  {row.supplierCount}
                </span>
              </span>
              <span>
                {row.usedInProducts > 0 ? (
                  <span className="data-badge data-badge-muted">
                    {row.usedInProducts} product
                    {row.usedInProducts !== 1 ? 's' : ''}
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
