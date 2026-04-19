'use client'

import { useEffect, useState } from 'react'
import type { IngredientProfile } from '@/lib/agnes-client'
import { getRawMaterialDetail } from '@/lib/agnes-queries'

type ProfileCache = Record<number, IngredientProfile | null>

export function useIngredientProfiles(materialIds: number[]) {
  const [profiles, setProfiles] = useState<ProfileCache>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const missing = materialIds.filter((id) => !(id in profiles))
    if (missing.length === 0) return

    setLoading(true)
    const fetchProfiles = async () => {
      const newProfiles: ProfileCache = { ...profiles }
      for (const id of missing) {
        try {
          const detail = await getRawMaterialDetail(id)
          newProfiles[id] = detail?.profile || null
        } catch {
          newProfiles[id] = null
        }
      }
      setProfiles(newProfiles)
      setLoading(false)
    }

    fetchProfiles()
  }, [materialIds, profiles])

  return { profiles, loading }
}
