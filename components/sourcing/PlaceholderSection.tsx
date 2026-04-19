import type { ReactNode } from 'react'

interface PlaceholderSectionProps {
  title: string
  description?: string
  icon?: ReactNode
}

export default function PlaceholderSection({
  title,
  description,
  icon,
}: PlaceholderSectionProps) {
  return (
    <div
      className="placeholder-section hardcoded-zone"
      data-hardcoded-label="HARDCODED COMING SOON"
    >
      <div className="placeholder-section-header">
        {icon && <span className="placeholder-section-icon">{icon}</span>}
        <span className="placeholder-section-title">{title}</span>
        <span className="placeholder-section-badge">Coming soon</span>
      </div>
      {description && <p className="placeholder-section-desc">{description}</p>}
      <div className="placeholder-section-bars">
        <div className="placeholder-bar" style={{ width: '72%' }} />
        <div className="placeholder-bar" style={{ width: '55%' }} />
        <div className="placeholder-bar" style={{ width: '40%' }} />
      </div>
    </div>
  )
}
