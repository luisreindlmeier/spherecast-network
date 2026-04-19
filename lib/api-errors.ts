import { NextResponse } from 'next/server'

export function dbErrorResponse(
  routeName: string,
  ...errors: Array<Error | null | undefined | unknown>
) {
  const messages = errors
    .filter((error) => error !== null && error !== undefined)
    .map((error) => (error instanceof Error ? error.message : String(error)))

  console.error(`${routeName}: query failed`, messages)

  return NextResponse.json(
    { error: 'API/DB error', route: routeName },
    { status: 500 }
  )
}
