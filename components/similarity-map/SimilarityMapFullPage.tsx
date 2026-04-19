'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import type { IngredientCategory } from '@/components/similarity-map/similarity-map-categories'
import SimilarityMapMultiFilters from '@/components/similarity-map/SimilarityMapMultiFilters'
import { useCompanyScope } from '@/lib/company-scope-context'
import type { SimilarityPoint } from '@/types/similarity-map'

const IngredientSimilarityPlot = dynamic(
  () => import('@/components/similarity-map/IngredientSimilarityPlot'),
  {
    ssr: false,
    loading: () => (
      <div className="similarity-map-shell similarity-map-shell--plot-only">
        <div className="ingredient-similarity-plot-root ingredient-similarity-plot-loading">
          Loading 3D map…
        </div>
      </div>
    ),
  }
)

export default function SimilarityMapFullPage() {
  const { companyId } = useCompanyScope()
  const [points, setPoints] = useState<SimilarityPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedCategories, setSelectedCategories] = useState<
    IngredientCategory[]
  >([])
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false

    async function loadPoints() {
      // Yield once so state updates happen asynchronously, not in effect body.
      await Promise.resolve()
      if (cancelled) return

      setLoading(true)
      setLoadError(null)

      try {
        const response = await fetch('/api/similarity-map', {
          credentials: 'same-origin',
          cache: 'no-store',
        })
        if (!response.ok) {
          const text = await response.text()
          throw new Error(text || `HTTP ${response.status}`)
        }
        const json = (await response.json()) as { points?: SimilarityPoint[] }

        if (!cancelled) {
          setPoints(json.points ?? [])
        }
      } catch (error) {
        console.error(error)
        if (!cancelled) {
          setLoadError('Failed to load similarity-map data.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadPoints()

    return () => {
      cancelled = true
    }
  }, [companyId])

  const validSuppliers = useMemo(() => {
    return new Set(points.map((point) => point.supplierName))
  }, [points])

  const effectiveSelectedSuppliers = useMemo(() => {
    return selectedSuppliers.filter((supplier) => validSuppliers.has(supplier))
  }, [selectedSuppliers, validSuppliers])

  const noData = !loading && points.length === 0 && loadError === null

  return (
    <>
      <div className="page-network-map-intro">
        <PageHeader
          eyebrow="Network Intelligence"
          title="Similarity Map"
          description="Interactive UMAP (3D) over ingredient embeddings — scroll or pinch to zoom, drag to orbit. Dot size reflects how many companies use the material; each dot is one supplier for that ingredient."
          descriptionAside={
            <SimilarityMapMultiFilters
              points={points}
              selectedCategories={selectedCategories}
              selectedSuppliers={effectiveSelectedSuppliers}
              onCategoriesChange={setSelectedCategories}
              onSuppliersChange={setSelectedSuppliers}
            />
          }
        />
      </div>
      <IngredientSimilarityPlot
        key={companyId ?? 'all'}
        plotData={{ points, loading }}
        selectedCategories={selectedCategories}
        selectedSuppliers={effectiveSelectedSuppliers}
      />
      {loadError ? (
        <div className="similarity-map-empty-state" role="status">
          {loadError}
        </div>
      ) : null}
      {noData ? (
        <div className="similarity-map-empty-state" role="status">
          {companyId === null
            ? 'No similarity points available yet.'
            : 'No similarity points found for the selected company scope.'}
        </div>
      ) : null}
    </>
  )
}
