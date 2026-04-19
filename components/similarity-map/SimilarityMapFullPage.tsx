'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import type { SimilarityPoint } from '@/app/api/similarity-map/route'
import type { IngredientCategory } from '@/components/similarity-map/similarity-map-categories'
import SimilarityMapMultiFilters from '@/components/similarity-map/SimilarityMapMultiFilters'
import { useCompanyScope } from '@/lib/company-scope-context'

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
  const [selectedCategories, setSelectedCategories] = useState<
    IngredientCategory[]
  >([])
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    const abortController = new AbortController()
    const timeoutId = window.setTimeout(() => {
      abortController.abort()
    }, 15000)

    setLoading(true)
    void fetch('/api/similarity-map', {
      credentials: 'same-origin',
      cache: 'no-store',
      signal: abortController.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const text = await response.text()
          throw new Error(text || `HTTP ${response.status}`)
        }
        return response.json() as Promise<{ points?: SimilarityPoint[] }>
      })
      .then((json) => {
        if (!cancelled) {
          setPoints(json.points ?? [])
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error(error)
        }
      })
      .finally(() => {
        window.clearTimeout(timeoutId)
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
      abortController.abort()
    }
  }, [companyId])

  useEffect(() => {
    setSelectedSuppliers((prev) => {
      if (prev.length === 0) return prev
      const valid = new Set(points.map((p) => p.supplierName))
      const next = prev.filter((s) => valid.has(s))
      return next.length === prev.length ? prev : next
    })
  }, [points])

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
              selectedSuppliers={selectedSuppliers}
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
        selectedSuppliers={selectedSuppliers}
      />
    </>
  )
}
