import type { ReactNode } from 'react'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  /** Inline next to the page title (e.g. map toggle) */
  titleActions?: ReactNode
  description?: string
  actions?: ReactNode
}

export default function PageHeader({
  eyebrow,
  title,
  titleActions,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <div className="page-eyebrow">{eyebrow}</div>}
        <div className="page-title-row">
          <h1 className="page-title">{title}</h1>
          {titleActions}
        </div>
        {description && <p className="page-description">{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  )
}
