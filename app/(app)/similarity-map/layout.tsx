import type { ReactNode } from 'react'

export default function SimilarityMapLayout({
  children,
}: {
  children: ReactNode
}) {
  return <div className="similarity-map-page-root">{children}</div>
}
