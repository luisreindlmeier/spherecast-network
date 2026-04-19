'use client'

import { useMemo, useState } from 'react'

export function useTableQuery<T>(
  rows: T[],
  predicate: (row: T, normalizedQuery: string) => boolean
) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const normalizedQuery = query.toLowerCase().trim()
    if (!normalizedQuery) {
      return rows
    }
    return rows.filter((row) => predicate(row, normalizedQuery))
  }, [rows, query, predicate])

  const countLabel =
    filtered.length !== rows.length
      ? `${filtered.length} of ${rows.length}`
      : `${rows.length}`

  return {
    query,
    setQuery,
    filtered,
    countLabel,
  }
}
