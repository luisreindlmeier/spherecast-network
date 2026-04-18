'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Plot from 'react-plotly.js'
import type { PlotMouseEvent } from 'plotly.js'
import type { Config, Data, Layout } from 'plotly.js'
import {
  INGREDIENT_SIMILARITY_POINTS,
  INGREDIENT_CATEGORY_COLORS,
  type IngredientCategory,
  type IngredientSimilarityPoint,
} from '@/lib/ingredient-similarity-data'

const CATEGORY_ORDER: readonly IngredientCategory[] = [
  'vitamins',
  'minerals',
  'proteins',
  'oils',
  'excipients',
  'carbohydrates',
  'botanicals',
] as const

const CATEGORY_LABEL: Record<IngredientCategory, string> = {
  vitamins: 'Vitamins',
  minerals: 'Minerals',
  proteins: 'Proteins',
  oils: 'Oils',
  excipients: 'Excipients',
  carbohydrates: 'Carbohydrates',
  botanicals: 'Botanicals',
}

function sizeForCompanyCount(
  count: number,
  minC: number,
  maxC: number
): number {
  if (maxC <= minC) return 10
  return 5 + ((count - minC) / (maxC - minC)) * 16
}

function buildTraces(points: readonly IngredientSimilarityPoint[]): Data[] {
  const counts = points.map((p) => p.companyCount)
  const minC = Math.min(...counts)
  const maxC = Math.max(...counts)

  return CATEGORY_ORDER.map((category) => {
    const catPoints = points.filter((p) => p.category === category)
    return {
      type: 'scatter3d',
      mode: 'markers',
      name: CATEGORY_LABEL[category],
      x: catPoints.map((p) => p.umap[0]),
      y: catPoints.map((p) => p.umap[1]),
      z: catPoints.map((p) => p.umap[2]),
      text: catPoints.map((p) => p.name),
      customdata: catPoints.map((p) => [
        p.companyCount,
        p.topSuppliers.join(' · '),
        p.opportunityId,
      ]),
      marker: {
        size: catPoints.map((p) =>
          sizeForCompanyCount(p.companyCount, minC, maxC)
        ),
        color: INGREDIENT_CATEGORY_COLORS[category],
        line: { width: 0 },
        opacity: 0.92,
      },
      hovertemplate:
        '<b>%{text}</b><br>Category: ' +
        CATEGORY_LABEL[category] +
        '<br>Companies: %{customdata[0]}<br>Top suppliers: %{customdata[1]}<extra></extra>',
    } satisfies Data
  }).filter((trace) => {
    const xs = trace.x
    return Array.isArray(xs) && xs.length > 0
  })
}

const sceneAxis = {
  showbackground: true,
  backgroundcolor: '#141720',
  gridcolor: 'rgba(255,255,255,0.06)',
  showticklabels: false,
  showspikes: false,
  title: { text: '' },
  zerolinecolor: 'rgba(255,255,255,0.06)',
} as const

const layout: Partial<Layout> = {
  paper_bgcolor: 'transparent',
  plot_bgcolor: 'transparent',
  margin: { t: 16, r: 8, b: 8, l: 8 },
  font: {
    family: 'Inter, system-ui, sans-serif',
    color: '#e8eaf0',
    size: 12,
  },
  hoverlabel: {
    bgcolor: 'rgba(30, 36, 44, 0.96)',
    bordercolor: 'rgba(255,255,255,0.08)',
    font: {
      family: 'Inter, system-ui, sans-serif',
      color: '#e8eaf0',
      size: 12,
    },
  },
  scene: {
    bgcolor: '#141720',
    xaxis: { ...sceneAxis },
    yaxis: { ...sceneAxis },
    zaxis: { ...sceneAxis },
    camera: {
      eye: { x: 1.35, y: 1.45, z: 0.85 },
    },
  },
  showlegend: true,
  legend: {
    x: 0.02,
    y: 0.98,
    xanchor: 'left',
    yanchor: 'top',
    bgcolor: 'rgba(20, 23, 32, 0.88)',
    bordercolor: 'rgba(255,255,255,0.06)',
    borderwidth: 1,
    traceorder: 'normal',
  },
}

const config: Partial<Config> = {
  displaylogo: false,
  responsive: true,
  modeBarButtonsToRemove: ['toImage'],
}

export default function IngredientSimilarityPlot() {
  const router = useRouter()
  const data = useMemo(() => buildTraces(INGREDIENT_SIMILARITY_POINTS), [])

  const handleClick = (ev: Readonly<PlotMouseEvent>) => {
    const pt = ev.points[0]
    if (!pt?.customdata) return
    const row = pt.customdata as unknown
    if (!Array.isArray(row) || typeof row[2] !== 'string') return
    router.push(`/opportunities/${encodeURIComponent(row[2])}`)
  }

  return (
    <div className="ingredient-similarity-plot-root">
      <Plot
        data={data}
        layout={layout}
        config={config}
        onClick={handleClick}
        useResizeHandler
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
}
