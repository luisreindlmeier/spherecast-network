'use client'

import dynamic from 'next/dynamic'
import { useCompanyScope } from '@/lib/company-scope-context'

const IngredientSimilarityPlot = dynamic(
  () => import('@/components/similarity-map/IngredientSimilarityPlot'),
  {
    ssr: false,
    loading: () => (
      <div className="similarity-map-shell">
        <div className="ingredient-similarity-plot-root ingredient-similarity-plot-loading">
          Loading 3D map…
        </div>
      </div>
    ),
  }
)

export default function SimilarityMapPlotSection() {
  const { companyId } = useCompanyScope()
  return <IngredientSimilarityPlot key={companyId ?? 'all'} />
}
