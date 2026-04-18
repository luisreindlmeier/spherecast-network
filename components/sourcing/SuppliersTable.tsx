'use client'

import { useState, useMemo } from 'react'
import type { SupplierRow } from '@/lib/queries'

interface Props {
  rows: SupplierRow[]
  maxMaterials: number
}

export default function SuppliersTable({ rows, maxMaterials }: Props) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return q ? rows.filter((r) => r.name.toLowerCase().includes(q)) : rows
  }, [rows, query])

  return (
    <div className="data-table-card">
      {/* Toolbar */}
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
        <span className="data-count">
          {filtered.length !== rows.length
            ? `${filtered.length} of ${rows.length}`
            : `${rows.length} suppliers`}
        </span>
      </div>

      {/* Header */}
      <div className="data-table-head data-grid-suppliers">
        <span>Supplier</span>
        <span>Materials supplied</span>
        <span className="data-col-right">Coverage</span>
      </div>

      {/* Rows */}
      <div className="data-table-body">
        {filtered.length === 0 ? (
          <div className="data-empty">
            No suppliers match &ldquo;{query}&rdquo;
          </div>
        ) : (
          filtered.map((row) => {
            const pct =
              maxMaterials > 0 ? (row.materialCount / maxMaterials) * 100 : 0
            return (
              <div key={row.id} className="data-row data-grid-suppliers">
                <span className="data-name">{row.name}</span>
                <span>
                  <span className="data-badge data-badge-blue">
                    {row.materialCount}
                  </span>
                </span>
                <span className="data-col-right">
                  <span className="data-coverage-bar">
                    <span
                      className="data-coverage-fill"
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </span>
                  <span className="data-coverage-label">
                    {Math.round(pct)}%
                  </span>
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
