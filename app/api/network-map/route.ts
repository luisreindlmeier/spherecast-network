import { NextResponse } from 'next/server'
import { agnesGet } from '@/lib/agnes-server'

export const revalidate = 300

export async function GET() {
  const res = await agnesGet('/network-map')

  if (!res.ok) {
    return NextResponse.json({ nodes: [], arcs: [] })
  }

  const json = (await res.json()) as unknown
  return NextResponse.json(json)
}
