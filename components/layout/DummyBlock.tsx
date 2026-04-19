import type { ReactNode } from 'react'

interface DummyBlockProps {
  title: string
  hint?: string
  children?: ReactNode
}

export default function DummyBlock({ title, hint, children }: DummyBlockProps) {
  return (
    <section
      className="dummy-block hardcoded-zone"
      data-hardcoded-label="HARDCODED PLACEHOLDER"
    >
      <div className="dummy-block-header">
        <span className="dummy-block-title">{title}</span>
        {hint && <span className="dummy-block-hint">{hint}</span>}
      </div>
      <div className="dummy-block-body">
        {children ?? (
          <div className="dummy-placeholder">
            <div className="dummy-bar w-80" />
            <div className="dummy-bar w-60" />
            <div className="dummy-bar w-40" />
          </div>
        )}
      </div>
    </section>
  )
}
