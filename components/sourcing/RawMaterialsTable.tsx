'use client'

import Link from 'next/link'
import { useCallback, useMemo, useState } from 'react'
import type { RawMaterialRow } from '@/lib/agnes-queries'
import type { SourceViewMode } from '@/components/sourcing/SourceViewToggle'
import { IngredientProfileBadges } from '@/components/sourcing/IngredientProfileBadges'
import SourcingTableShell from '@/components/sourcing/SourcingTableShell'
import { useTableQuery } from '@/components/sourcing/useTableQuery'
import { useIngredientProfiles } from '@/components/sourcing/useIngredientProfiles'

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
  const [sort, setSort] = useState<RawMaterialsSortKey>('sku')
  const [view, setView] = useState<SourceViewMode>('row')

  const matchRawMaterial = useCallback(
    (row: RawMaterialRow, normalizedQuery: string) =>
      row.sku.toLowerCase().includes(normalizedQuery) ||
      row.companyName.toLowerCase().includes(normalizedQuery),
    []
  )

  const {
    query,
    setQuery,
    filtered: filteredWithoutSort,
    countLabel,
  } = useTableQuery(rows, matchRawMaterial)

  const filtered = useMemo(() => {
    return [...filteredWithoutSort].sort((a, b) => {
      if (sort === 'suppliers') return b.supplierCount - a.supplierCount
      if (sort === 'usage') return b.usedInProducts - a.usedInProducts
      return a.sku.localeCompare(b.sku)
    })
  }, [filteredWithoutSort, sort])

  const materialIds = useMemo(() => filtered.map((r) => r.id), [filtered])
  const { profiles } = useIngredientProfiles(materialIds)

  const filteredWithProfiles = useMemo(
    () =>
      filtered.map((row) => ({
        ...row,
        profile: profiles[row.id],
      })),
    [filtered, profiles]
  )

  return (
    <SourcingTableShell
      ariaLabel="Raw materials table"
      query={query}
      onQueryChange={setQuery}
      queryPlaceholder="Search by SKU or brand…"
      view={view}
      onViewChange={setView}
      countLabel={countLabel}
      countSuffix="materials"
      head={
        <div className="data-table-head data-grid-materials-with-profile">
          <RawMaterialsColHeader
            label="SKU"
            value="sku"
            sort={sort}
            setSort={setSort}
          />
          <span>Brand</span>
          <span>Profile</span>
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
      }
      isEmpty={filtered.length === 0}
      emptyMessage={`No materials match "${query}"`}
      rowContent={
        <>
          {filteredWithProfiles.map((row) => (
            <Link
              key={row.id}
              href={`/raw-materials/${row.id}`}
              className="data-row data-grid-materials-with-profile"
              style={{ textDecoration: 'none' }}
            >
              <span className="data-sku">{row.sku}</span>
              <span className="data-name">{row.companyName}</span>
              <div
                className="text-xs overflow-hidden"
                style={{ minHeight: '24px' }}
              >
                {row.profile ? (
                  <IngredientProfileBadges profile={row.profile} compact />
                ) : (
                  <span className="text-gray-500 italic">—</span>
                )}
              </div>
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
          ))}
        </>
      }
      tileContent={
        <>
          {filteredWithProfiles.map((row) => (
            <Link
              key={row.id}
              href={`/raw-materials/${row.id}`}
              className="data-source-tile"
            >
              <span className="data-sku">{row.sku}</span>
              <span className="data-source-tile-title">{row.companyName}</span>
              {row.profile && (
                <div className="mt-2 mb-2">
                  <IngredientProfileBadges profile={row.profile} compact />
                </div>
              )}
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
          ))}
        </>
      }
    />
  )
}
