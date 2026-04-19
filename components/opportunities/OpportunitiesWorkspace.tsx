'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { type OpportunityRow } from '@/lib/agnes-queries'

type OpportunitiesWorkspaceProps = {
  rows: OpportunityRow[]
}

function formatPct(conf: number): string {
  return `${Math.round(conf * 100)}%`
}

export default function OpportunitiesWorkspace({ rows }: OpportunitiesWorkspaceProps) {
  const router = useRouter()

  const filtered = useMemo(() => {
    return [...rows].sort((a, b) => b.confidence - a.confidence)
  }, [rows])

  return (
    <div className="opportunities-workspace">


      <div className="opportunities-table-shell">
        <div className="opportunities-table-scroll">
          <table className="opportunities-table">
            <thead>
              <tr>
                <th className="opportunities-th-num">Conf.</th>
                <th>Ingredient</th>
                <th>Brands</th>
                <th>Current sup.</th>
                <th>Alt. sup.</th>
                <th>
                  Risk <span aria-hidden>↓</span>
                </th>
                <th className="opportunities-th-action">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="opportunities-td-empty">
                    No opportunities match these filters.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <OpportunityTableRow
                    key={row.id}
                    row={row}
                    onOpen={() => router.push(`/opportunities/${row.id}`)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function OpportunityTableRow({
  row,
  onOpen,
}: {
  row: OpportunityRow
  onOpen: () => void
}) {
  return (
    <tr
      className="opportunities-tr"
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
      tabIndex={0}
      aria-label={`Open ${row.ingredientName} opportunity`}
    >
      <td className="opportunities-td-num">{formatPct(row.confidence)}</td>
      <td>
        <span className="opportunities-ing">{row.ingredientName}</span>
      </td>
      <td className="opportunities-td-muted">{row.brandsDisplay}</td>
      <td className="opportunities-td-muted">{row.currentSupplier}</td>
      <td className="opportunities-td-muted">{row.altSupplier}</td>
      <td className="opportunities-td-risk">{row.risk}</td>
      <td className="opportunities-td-action">
        <span className="opportunities-action-icon" aria-hidden>
          <ArrowRight size={16} strokeWidth={1.75} />
        </span>
      </td>
    </tr>
  )
}
