'use client'

import dynamic from 'next/dynamic'

const IngredientSimilarityPlot = dynamic(
  () => import('@/components/similarity-map/IngredientSimilarityPlot'),
  {
    ssr: false,
    loading: () => (
      <div
        className="ingredient-similarity-plot-root"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: 13,
        }}
      >
        Loading 3D map…
      </div>
    ),
  }
)

export default function SimilarityMapPlotSection() {
  return <IngredientSimilarityPlot />
}
