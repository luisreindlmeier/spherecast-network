import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Spherecast',
  description: 'Raw material intelligence & consolidation network',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
