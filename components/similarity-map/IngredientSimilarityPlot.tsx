'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import createPlotlyComponent from 'react-plotly.js/factory'
import type { Config, Data, Layout, PlotHoverEvent } from 'plotly.js'
// Prebuilt gl3d bundle only — full `plotly.js` pulls geo registry → maplibre CSS and breaks Turbopack.
import PlotlyGL from 'plotly.js/dist/plotly-gl3d'
import type { SimilarityPoint } from '@/app/api/similarity-map/route'

const Plot = createPlotlyComponent(PlotlyGL)

type IngredientCategory =
  | 'vitamins'
  | 'minerals'
  | 'proteins'
  | 'oils'
  | 'excipients'
  | 'carbohydrates'
  | 'botanicals'

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

const CATEGORY_COLORS: Record<IngredientCategory, string> = {
  vitamins: '#a78bfa',
  minerals: '#67e8f9',
  proteins: '#22c55e',
  oils: '#eab308',
  excipients: '#8a909f',
  carbohydrates: '#fb923c',
  botanicals: '#2dd4bf',
}

/** Wheel zoom factor per notch (closer to 1 = gentler). */
const WHEEL_ZOOM_STEP = 1.09

type TooltipInfo = {
  x: number
  y: number
  name: string
  category: IngredientCategory
  supplierName: string
  productId: string
}

type GraphDiv = HTMLElement & {
  layout: Partial<Layout>
  _fullLayout?: Partial<Layout>
}

function sizeForCount(count: number, minC: number, maxC: number): number {
  if (maxC <= minC) return 8
  return 4 + ((count - minC) / (maxC - minC)) * 14
}

function buildTraces(points: SimilarityPoint[]): Data[] {
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
        p.category,
        p.supplierName,
        p.productId,
      ]),
      hoverinfo: 'none' as const,
      marker: {
        size: catPoints.map((p) => sizeForCount(p.companyCount, minC, maxC)),
        color: CATEGORY_COLORS[category],
        line: { width: 0 },
        opacity: 0.92,
      },
    } satisfies Data
  }).filter((trace) => {
    const xs = trace.x
    return Array.isArray(xs) && xs.length > 0
  })
}

/** Minimal axes: no grid, no ticks, no x/y/z labels (gl3d defaults otherwise). */
const sceneAxis = {
  showbackground: false,
  showgrid: false,
  showline: false,
  zeroline: false,
  showticklabels: false,
  showaxeslabels: false,
  showspikes: false,
  ticks: '' as const,
  mirror: false,
  title: { text: '' },
} as const

const config: Partial<Config> = {
  displaylogo: false,
  displayModeBar: false,
  responsive: true,
  /* Custom wheel zoom on the shell (capture) — disable built-in to avoid double zoom */
  scrollZoom: false,
}

/**
 * From-centroid view direction: stronger z = camera starts higher (more
 * overview from above); x/y slightly reduced for a natural tilt.
 */
const CAMERA_VIEW_DIR = { x: 1.12, y: 1.22, z: 1.38 } as const
const CAMERA_VIEW_DIR_INV =
  1 / Math.hypot(CAMERA_VIEW_DIR.x, CAMERA_VIEW_DIR.y, CAMERA_VIEW_DIR.z)

/** Eye distance from the data centroid (larger = more zoomed out). */
const CAMERA_START_DISTANCE = 1.58

function meanUmapCenter(pts: readonly SimilarityPoint[]): {
  x: number
  y: number
  z: number
} {
  if (pts.length === 0) return { x: 0, y: 0, z: 0 }
  let sx = 0
  let sy = 0
  let sz = 0
  for (const p of pts) {
    sx += p.umap[0]
    sy += p.umap[1]
    sz += p.umap[2]
  }
  const n = pts.length
  return { x: sx / n, y: sy / n, z: sz / n }
}

function buildPlotLayout(points: readonly SimilarityPoint[]): Partial<Layout> {
  const c = meanUmapCenter(points)
  const step = CAMERA_START_DISTANCE * CAMERA_VIEW_DIR_INV
  return {
    autosize: true,
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    dragmode: 'orbit',
    margin: { t: 2, r: 2, b: 2, l: 2 },
    font: {
      family: 'Inter, system-ui, sans-serif',
      color: '#e8eaf0',
      size: 12,
    },
    scene: {
      bgcolor: '#141720',
      dragmode: 'orbit',
      /* Slightly widen x vs z so the projection uses horizontal space better. */
      aspectmode: 'manual',
      aspectratio: { x: 1.12, y: 1, z: 0.78 },
      domain: { x: [0, 1], y: [0, 1] },
      xaxis: { ...sceneAxis },
      yaxis: { ...sceneAxis },
      zaxis: { ...sceneAxis },
      camera: {
        center: { x: c.x, y: c.y, z: c.z },
        eye: {
          x: c.x + CAMERA_VIEW_DIR.x * step,
          y: c.y + CAMERA_VIEW_DIR.y * step,
          z: c.z + CAMERA_VIEW_DIR.z * step,
        },
        up: { x: 0, y: 0, z: 1 },
      },
    },
    showlegend: true,
    legend: {
      x: 0.99,
      y: 0.99,
      xanchor: 'right',
      yanchor: 'top',
      bgcolor: 'rgba(20, 23, 32, 0.82)',
      bordercolor: 'rgba(255,255,255,0.06)',
      borderwidth: 1,
      traceorder: 'normal',
    },
  }
}

function applyStrongWheelZoom(
  gd: GraphDiv,
  deltaY: number,
  points: readonly SimilarityPoint[]
) {
  const cam = gd._fullLayout?.scene?.camera ?? gd.layout?.scene?.camera
  if (cam === undefined) return
  const eye = cam.eye
  if (
    eye === undefined ||
    typeof eye.x !== 'number' ||
    typeof eye.y !== 'number' ||
    typeof eye.z !== 'number'
  ) {
    return
  }

  const layoutCenter = cam.center
  const center =
    layoutCenter !== undefined &&
    typeof layoutCenter.x === 'number' &&
    typeof layoutCenter.y === 'number' &&
    typeof layoutCenter.z === 'number'
      ? { x: layoutCenter.x, y: layoutCenter.y, z: layoutCenter.z }
      : meanUmapCenter(points)

  const vx = eye.x - center.x
  const vy = eye.y - center.y
  const vz = eye.z - center.z
  const dist = Math.hypot(vx, vy, vz)
  if (dist < 1e-6) return

  const factor = deltaY > 0 ? WHEEL_ZOOM_STEP : 1 / WHEEL_ZOOM_STEP
  const newDist = Math.min(Math.max(dist * factor, 0.08), 32)
  const s = newDist / dist

  const newEye = {
    x: center.x + vx * s,
    y: center.y + vy * s,
    z: center.z + vz * s,
  }

  /* Flat keys only: a nested `scene: { camera: … }` object replaces the whole
   * `scene` container and drops x/y/zaxis, so Plotly re-applies default grids
   * and x/y/z labels after zoom. */
  const eyePatch = {
    'scene.camera.eye.x': newEye.x,
    'scene.camera.eye.y': newEye.y,
    'scene.camera.eye.z': newEye.z,
  } as unknown as Partial<Layout>

  void PlotlyGL.relayout(gd, eyePatch)
}

export default function IngredientSimilarityPlot() {
  const router = useRouter()
  const [points, setPoints] = useState<SimilarityPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastPointerRef = useRef({ x: 0, y: 0 })
  const pointsRef = useRef(points)
  const plotShellRef = useRef<HTMLDivElement>(null)
  const graphDivRef = useRef<GraphDiv | null>(null)
  const wheelCleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    pointsRef.current = points
  }, [points])

  useEffect(() => {
    fetch('/api/similarity-map', {
      credentials: 'same-origin',
      cache: 'no-store',
    })
      .then((r) => r.json())
      .then((json: { points?: SimilarityPoint[] }) => {
        setPoints(json.points ?? [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    return () => {
      wheelCleanupRef.current?.()
      wheelCleanupRef.current = null
    }
  }, [])

  const clearHideTimer = () => {
    if (hideTimer.current !== null) {
      clearTimeout(hideTimer.current)
      hideTimer.current = null
    }
  }

  const scheduleHide = (delay = 220) => {
    clearHideTimer()
    hideTimer.current = setTimeout(() => setTooltip(null), delay)
  }

  const handleHover = (ev: PlotHoverEvent) => {
    const pt = ev.points[0]
    if (!pt?.customdata) return
    const row = pt.customdata
    if (!Array.isArray(row)) return

    const dom = ev.event
    const x =
      dom !== undefined && typeof dom.clientX === 'number'
        ? dom.clientX
        : lastPointerRef.current.x
    const y =
      dom !== undefined && typeof dom.clientY === 'number'
        ? dom.clientY
        : lastPointerRef.current.y

    clearHideTimer()
    setTooltip({
      x,
      y,
      name: typeof pt.text === 'string' ? pt.text : String(pt.text ?? ''),
      category: row[0] as IngredientCategory,
      supplierName: typeof row[1] === 'string' ? row[1] : '',
      productId: typeof row[2] === 'string' ? row[2] : '',
    })
  }

  const handleUnhover = () => scheduleHide()

  const attachWheelZoom = (gd: GraphDiv) => {
    wheelCleanupRef.current?.()
    graphDivRef.current = gd
    const shell = plotShellRef.current
    if (!shell) return

    const onWheelCapture = (e: WheelEvent) => {
      const delta =
        Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX
      if (delta === 0) return
      e.preventDefault()
      e.stopPropagation()
      applyStrongWheelZoom(gd, delta, pointsRef.current)
    }

    shell.addEventListener('wheel', onWheelCapture, {
      capture: true,
      passive: false,
    })
    wheelCleanupRef.current = () => {
      shell.removeEventListener('wheel', onWheelCapture, { capture: true })
    }
  }

  const handlePlotPurge = () => {
    wheelCleanupRef.current?.()
    wheelCleanupRef.current = null
    graphDivRef.current = null
  }

  const traces = useMemo(() => buildTraces(points), [points])
  const plotLayout = useMemo(() => buildPlotLayout(points), [points])

  if (loading) {
    return (
      <div className="ingredient-similarity-plot-root ingredient-similarity-plot-loading">
        Loading 3D map…
      </div>
    )
  }

  return (
    <>
      <div
        ref={plotShellRef}
        className="ingredient-similarity-plot-root"
        onMouseMove={(e) => {
          lastPointerRef.current = { x: e.clientX, y: e.clientY }
        }}
      >
        <Plot
          data={traces}
          layout={plotLayout}
          config={config}
          onInitialized={(_figure, el) => {
            graphDivRef.current = el as GraphDiv
            attachWheelZoom(el as GraphDiv)
          }}
          onPurge={handlePlotPurge}
          onHover={handleHover}
          onUnhover={handleUnhover}
          useResizeHandler
          style={{ width: '100%', height: '100%' }}
        />
        <p className="similarity-map-zoom-hint">
          Scroll to zoom · drag to orbit
        </p>
      </div>

      {tooltip && (
        <div
          className="similarity-map-tooltip"
          style={
            {
              '--tip-x': `${tooltip.x + 16}px`,
              '--tip-y': `${tooltip.y - 8}px`,
            } as React.CSSProperties
          }
          onMouseEnter={clearHideTimer}
          onMouseLeave={() => scheduleHide(120)}
        >
          <div className="similarity-map-tooltip-name">{tooltip.name}</div>
          <div className="similarity-map-tooltip-meta">
            {CATEGORY_LABEL[tooltip.category]}
          </div>
          <div className="similarity-map-tooltip-supplier">
            {tooltip.supplierName}
          </div>
          <button
            className="similarity-map-tooltip-btn"
            onClick={() =>
              router.push(
                `/raw-materials/${encodeURIComponent(tooltip.productId)}`
              )
            }
          >
            View Raw Material →
          </button>
        </div>
      )}
    </>
  )
}
