'use client'

import { useEffect, useRef, useState } from 'react'
import { scatterPoints, categoryColors } from '@/lib/mock-data'

interface PlotDatum {
  x: number[]
  y: number[]
  z: number[]
  text: string[]
  marker: {
    color: string[]
    size: number
    opacity: number
    line: { color: string; width: number }
  }
  mode: string
  type: string
  name: string
  hovertemplate: string
}

import type * as PlotlyModule from 'plotly.js'
type PlotlyInstance = typeof PlotlyModule

export default function SimilarityScatter() {
  const ref = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!ref.current) return

    const categories = [...new Set(scatterPoints.map((p) => p.category))]

    const traces: PlotDatum[] = categories.map((cat) => {
      const pts = scatterPoints.filter((p) => p.category === cat)
      return {
        x: pts.map((p) => p.x),
        y: pts.map((p) => p.y),
        z: pts.map((p) => p.z),
        text: pts.map(
          (p) =>
            `${p.name}<br>Category: ${p.category}<br>Companies: ${p.companies}`
        ),
        marker: {
          color: pts.map(() => categoryColors[cat] ?? '#8b90a0'),
          size: 7,
          opacity: 0.85,
          line: { color: 'rgba(0,0,0,0.3)', width: 0.5 },
        },
        mode: 'markers',
        type: 'scatter3d',
        name: cat,
        hovertemplate: '%{text}<extra></extra>',
      }
    })

    const layout = {
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      font: { color: '#8b90a0', size: 11, family: 'Inter, sans-serif' },
      scene: {
        bgcolor: '#141720',
        xaxis: {
          gridcolor: 'rgba(255,255,255,0.06)',
          zerolinecolor: 'rgba(255,255,255,0.1)',
          title: '',
          showticklabels: false,
        },
        yaxis: {
          gridcolor: 'rgba(255,255,255,0.06)',
          zerolinecolor: 'rgba(255,255,255,0.1)',
          title: '',
          showticklabels: false,
        },
        zaxis: {
          gridcolor: 'rgba(255,255,255,0.06)',
          zerolinecolor: 'rgba(255,255,255,0.1)',
          title: '',
          showticklabels: false,
        },
      },
      margin: { l: 0, r: 0, t: 0, b: 0 },
      legend: {
        x: 0.02,
        y: 0.98,
        font: { size: 11, color: '#8b90a0' },
        bgcolor: 'rgba(20,23,32,0.8)',
        bordercolor: 'rgba(255,255,255,0.13)',
        borderwidth: 0.5,
      },
    }

    import('plotly.js').then((Plotly: PlotlyInstance) => {
      if (!ref.current) return
      Plotly.newPlot(ref.current, traces as never, layout as never, {
        displayModeBar: false,
        responsive: true,
      })
      setReady(true)
    })

    return () => {
      import('plotly.js').then((Plotly: PlotlyInstance) => {
        if (ref.current) Plotly.purge(ref.current)
      })
    }
  }, [])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {!ready && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-surface)',
            borderRadius: 8,
            fontSize: 13,
            color: 'var(--text-muted)',
          }}
        >
          Loading embedding space…
        </div>
      )}
      <div ref={ref} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
