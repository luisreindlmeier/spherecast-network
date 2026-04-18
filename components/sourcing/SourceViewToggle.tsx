'use client'

import { LayoutGrid, LayoutList } from 'lucide-react'

export type SourceViewMode = 'row' | 'tiles'

interface SourceViewToggleProps {
  value: SourceViewMode
  onChange: (mode: SourceViewMode) => void
}

export default function SourceViewToggle({
  value,
  onChange,
}: SourceViewToggleProps) {
  return (
    <div className="source-view-toggle" role="group" aria-label="Layout">
      <button
        type="button"
        className="source-view-toggle-btn"
        data-active={value === 'row'}
        onClick={() => onChange('row')}
        aria-pressed={value === 'row'}
        title="Row view"
      >
        <LayoutList size={15} strokeWidth={1.75} aria-hidden />
      </button>
      <button
        type="button"
        className="source-view-toggle-btn"
        data-active={value === 'tiles'}
        onClick={() => onChange('tiles')}
        aria-pressed={value === 'tiles'}
        title="Tile view"
      >
        <LayoutGrid size={15} strokeWidth={1.75} aria-hidden />
      </button>
    </div>
  )
}
