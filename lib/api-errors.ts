import { NextResponse } from 'next/server'
import type { PostgrestError } from '@supabase/supabase-js'

export function dbErrorResponse(
  routeName: string,
  ...errors: Array<PostgrestError | null>
) {
  const messages = errors
    .filter((error): error is PostgrestError => error !== null)
    .map((error) => error.message)

  console.error(`${routeName}: database query failed`, messages)

  return NextResponse.json(
    { error: 'DB error', route: routeName },
    { status: 500 }
  )
}
