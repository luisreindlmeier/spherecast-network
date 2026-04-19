'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import {
  type OpportunityRow,
  type OpportunityStatus,
} from '@/lib/agnes-queries'

type OpportunitiesWorkspaceProps = {
  rows: OpportunityRow[]
}

const STATUS_OPTIONS: { value: OpportunityStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_review', label: 'In review' },
]

type MinConf = 'all' | '0.5' | '0.7' | '0.8' | '0.9'

const MIN_CONF_OPTIONS: { value: MinConf; label: string }[] = [
  { value: 'all', label: 'All levels' },
  { value: '0.9', label: '90%+' },
  { value: '0.8', label: '80%+' },
  { value: '0.7', label: '70%+' },
  { value: '0.5', label: '50%+' },
]

function withAll(values: string[]): string[] {
  return ['All', ...values]
}

function toUniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b))
}

function formatPct(conf: number): string {
  return `${Math.round(conf * 100)}%`
}

export default function OpportunitiesWorkspace({ rows }: OpportunitiesWorkspaceProps) {
  const router = useRouter()

  const brandOptions = useMemo(
    () => withAll(toUniqueSorted(rows.map((row) => row.brandKey))),
    [rows]
  )
  const categoryOptions = useMemo(
    () => withAll(toUniqueSorted(rows.map((row) => row.category))),
    [rows]
  )
  const supplierOptions = useMemo(
    () => withAll(toUniqueSorted(rows.map((row) => row.supplierKey))),
    [rows]
  )

  const [brand, setBrand] = useState<string>('All')
  const [category, setCategory] = useState<string>('All')
  const [minConf, setMinConf] = useState<MinConf>('all')
  const [supplier, setSupplier] = useState<string>('All')
  const [status, setStatus] = useState<OpportunityStatus | 'all'>('all')

  const filtered = useMemo(() => {
    return rows
      .filter((row) => {
        if (brand !== 'All' && row.brandKey !== brand) return false
        if (category !== 'All' && row.category !== category) return false
        if (status !== 'all' && row.status !== status) return false
        if (supplier !== 'All' && row.supplierKey !== supplier) return false
        if (minConf !== 'all') {
          const floor = Number(minConf)
          if (row.confidence < floor) return false
        }
        return true
      })
      .sort((a, b) => b.confidence - a.confidence)
  }, [rows, brand, category, minConf, supplier, status])

  return (
    <div className="opportunities-workspace">
      <div className="opportunities-filters">
        <label className="opportunities-filter">
          <span className="opportunities-filter-label">Brand</span>
          <select
            className="opportunities-filter-select"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            aria-label="Filter by brand"
          >
            {brandOptions.map((b) => (
              <option key={b} value={b}>
                {b === 'All' ? 'All brands' : b}
              </option>
            ))}
          </select>
        </label>
        <label className="opportunities-filter">
          <span className="opportunities-filter-label">Category</span>
          <select
            className="opportunities-filter-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Filter by category"
          >
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c === 'All' ? 'All categories' : c}
              </option>
            ))}
          </select>
        </label>
        <label className="opportunities-filter">
          <span className="opportunities-filter-label">Confidence</span>
          <select
            className="opportunities-filter-select"
            value={minConf}
            onChange={(e) => setMinConf(e.target.value as MinConf)}
            aria-label="Minimum confidence"
          >
            {MIN_CONF_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="opportunities-filter">
          <span className="opportunities-filter-label">Supplier</span>
          <select
            className="opportunities-filter-select"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            aria-label="Filter by supplier"
          >
            {supplierOptions.map((s) => (
              <option key={s} value={s}>
                {s === 'All' ? 'All suppliers' : s}
              </option>
            ))}
          </select>
        </label>
        <label className="opportunities-filter">
          <span className="opportunities-filter-label">Status</span>
          <select
            className="opportunities-filter-select"
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as OpportunityStatus | 'all')
            }
            aria-label="Filter by status"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

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
