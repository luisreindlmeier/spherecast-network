'use client'

import type { ReactNode } from 'react'
import SourceViewToggle, {
  type SourceViewMode,
} from '@/components/sourcing/SourceViewToggle'

type SourcingTableShellProps = {
  ariaLabel: string
  query: string
  onQueryChange: (value: string) => void
  queryPlaceholder: string
  view: SourceViewMode
  onViewChange: (mode: SourceViewMode) => void
  countLabel: string
  countSuffix: string
  head?: ReactNode
  isEmpty: boolean
  emptyMessage: string
  rowContent: ReactNode
  tileContent: ReactNode
}

export default function SourcingTableShell({
  ariaLabel,
  query,
  onQueryChange,
  queryPlaceholder,
  view,
  onViewChange,
  countLabel,
  countSuffix,
  head,
  isEmpty,
  emptyMessage,
  rowContent,
  tileContent,
}: SourcingTableShellProps) {
  return (
    <div className="data-table-card" role="region" aria-label={ariaLabel}>
      <div className="data-table-toolbar">
        <input
          className="data-search"
          type="search"
          placeholder={queryPlaceholder}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          autoComplete="off"
          spellCheck={false}
          aria-label={queryPlaceholder}
        />
        <SourceViewToggle value={view} onChange={onViewChange} />
        <span className="data-count" aria-live="polite">
          {`${countLabel} ${countSuffix}`}
        </span>
      </div>

      {view === 'row' && head}

      <div
        className={
          view === 'tiles'
            ? 'data-table-body data-table-body--tiles'
            : 'data-table-body'
        }
      >
        {isEmpty ? (
          <div className="data-empty">{emptyMessage}</div>
        ) : view === 'row' ? (
          rowContent
        ) : (
          tileContent
        )}
      </div>
    </div>
  )
}
