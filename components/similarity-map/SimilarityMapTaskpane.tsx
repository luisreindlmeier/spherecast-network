'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'
import type { IngredientCategory } from '@/components/similarity-map/similarity-map-categories'
import SimilarityMapMultiFilters from '@/components/similarity-map/SimilarityMapMultiFilters'
import { useCompanyScope } from '@/lib/company-scope-context'
import type { SimilarityPoint } from '@/types/similarity-map'

const IngredientSimilarityPlot = dynamic(
  () => import('@/components/similarity-map/IngredientSimilarityPlot'),
  {
    ssr: false,
    loading: () => (
      <div className="map-right-sidebar-map-loading map-right-sidebar-map-loading--plot">
        Loading 3D map...
      </div>
    ),
  }
)

/** Right sidebar similarity view with overlay filters (same placement as taskpane network map). */
export default function SimilarityMapTaskpane() {
  const { companyId } = useCompanyScope()
  const [points, setPoints] = useState<SimilarityPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategories, setSelectedCategories] = useState<
    IngredientCategory[]
  >([])
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    const abortController = new AbortController()

    async function loadPoints() {
      await Promise.resolve()
      if (cancelled) return

      setLoading(true)
      const timeoutId = window.setTimeout(() => {
        abortController.abort()
      }, 15000)

      try {
        const response = await fetch('/api/similarity-map', {
          credentials: 'same-origin',
          cache: 'no-store',
          signal: abortController.signal,
        })
        if (!response.ok) {
          const text = await response.text()
          throw new Error(text || `HTTP ${response.status}`)
        }
        const json = (await response.json()) as { points?: SimilarityPoint[] }
        if (!cancelled) {
          setPoints(json.points ?? [])
        }
      } catch {
        if (!cancelled) {
          setPoints([])
        }
      } finally {
        window.clearTimeout(timeoutId)
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadPoints()

    return () => {
      cancelled = true
      abortController.abort()
    }
  }, [companyId])

  const validSuppliers = useMemo(() => {
    return new Set(points.map((point) => point.supplierName))
  }, [points])

  const effectiveSelectedSuppliers = useMemo(() => {
    return selectedSuppliers.filter((supplier) => validSuppliers.has(supplier))
  }, [selectedSuppliers, validSuppliers])

  return (
    <div className="map-right-sidebar-similarity">
      {points.length > 0 ? (
        <SimilarityMapMultiFilters
          className="similarity-map-multi-filters--taskpane"
          dropdownAlign="start"
          points={points}
          selectedCategories={selectedCategories}
          selectedSuppliers={effectiveSelectedSuppliers}
          onCategoriesChange={setSelectedCategories}
          onSuppliersChange={setSelectedSuppliers}
        />
      ) : null}

      <IngredientSimilarityPlot
        key={companyId ?? 'all'}
        plotData={{ points, loading }}
        selectedCategories={selectedCategories}
        selectedSuppliers={effectiveSelectedSuppliers}
      />
    </div>
  )
}
