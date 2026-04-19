'use client'

import Link from 'next/link'
import { useCallback, useState } from 'react'
import type { CompanyWithCounts } from '@/lib/agnes-queries'
import type { SourceViewMode } from '@/components/sourcing/SourceViewToggle'
import SourcingTableShell from '@/components/sourcing/SourcingTableShell'
import { useTableQuery } from '@/components/sourcing/useTableQuery'

interface Props {
  companies: CompanyWithCounts[]
}

export default function CompaniesTable({ companies }: Props) {
  const [view, setView] = useState<SourceViewMode>('row')

  const matchCompany = useCallback(
    (company: CompanyWithCounts, normalizedQuery: string) =>
      company.name.toLowerCase().includes(normalizedQuery),
    []
  )

  const { query, setQuery, filtered, countLabel } = useTableQuery(
    companies,
    matchCompany
  )

  return (
    <SourcingTableShell
      ariaLabel="Companies table"
      query={query}
      onQueryChange={setQuery}
      queryPlaceholder="Search brands…"
      view={view}
      onViewChange={setView}
      countLabel={countLabel}
      countSuffix="brands"
      head={
        <div className="data-table-head data-grid-companies">
          <span>Brand</span>
          <span className="data-col-right">Finished Goods</span>
          <span className="data-col-right">Raw Materials</span>
        </div>
      }
      isEmpty={filtered.length === 0}
      emptyMessage={`No brands match "${query}"`}
      rowContent={
        <>
          {filtered.map((company, index) => (
            <Link
              key={company.id}
              href={`/companies/${company.id}`}
              className="data-row data-grid-companies"
              style={{
                borderTop: index === 0 ? 'none' : undefined,
                textDecoration: 'none',
              }}
            >
              <span className="data-name">{company.name}</span>
              <span className="data-col-right">
                {company.finishedGoods > 0 ? (
                  <span className="data-cell-num">{company.finishedGoods}</span>
                ) : (
                  <span className="data-cell-num data-cell-num-muted">—</span>
                )}
              </span>
              <span className="data-col-right">
                {company.rawMaterials > 0 ? (
                  <span className="data-cell-num">{company.rawMaterials}</span>
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
          {filtered.map((company) => (
            <Link
              key={company.id}
              href={`/companies/${company.id}`}
              className="data-source-tile"
            >
              <span className="data-source-tile-label">Brand</span>
              <span className="data-source-tile-title">{company.name}</span>
              <div className="data-source-tile-meta">
                <span>
                  <span className="data-source-tile-meta-k">FG</span>{' '}
                  {company.finishedGoods > 0 ? (
                    <span className="data-cell-num">
                      {company.finishedGoods}
                    </span>
                  ) : (
                    <span className="data-cell-num data-cell-num-muted">—</span>
                  )}
                </span>
                <span>
                  <span className="data-source-tile-meta-k">RM</span>{' '}
                  {company.rawMaterials > 0 ? (
                    <span className="data-cell-num">
                      {company.rawMaterials}
                    </span>
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
