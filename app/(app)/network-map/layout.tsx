import type { ReactNode } from 'react'

export default function NetworkMapLayout({
  children,
}: {
  children: ReactNode
}) {
  return <div className="network-map-page-root">{children}</div>
}
