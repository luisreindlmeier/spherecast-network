import { NextResponse } from 'next/server'
import { agnesGet } from '@/lib/agnes-server'

export const revalidate = 300 // 5 min cache

export async function GET() {
  const res = await agnesGet('/network-map')
  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to fetch network map from Agnes' }, { status: 500 })
  }
  const data = await res.json()
  return NextResponse.json(data)
}
