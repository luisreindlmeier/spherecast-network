'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import createPlotlyComponent from 'react-plotly.js/factory'
import type { Config, Data, Layout, PlotHoverEvent } from 'plotly.js'
// Prebuilt gl3d bundle only — full `plotly.js` pulls geo registry → maplibre CSS and breaks Turbopack.
import PlotlyGL from 'plotly.js/dist/plotly-gl3d'
import {
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  type IngredientCategory,
} from '@/components/similarity-map/similarity-map-categories'
import type { SimilarityPoint } from '@/types/similarity-map'

const Plot = createPlotlyComponent(PlotlyGL)

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

/** Log `scene.camera` on relayout / relayouting. `.env.local`: `NEXT_PUBLIC_SIMILARITY_MAP_CAMERA_DEBUG=true` (or `1` / `yes`), then restart `pnpm dev`. */
function isSimilarityCameraDebugEnabled(): boolean {
  const v =
    process.env.NEXT_PUBLIC_SIMILARITY_MAP_CAMERA_DEBUG?.trim().toLowerCase()
  if (v === undefined || v === '') return false
  return v === 'true' || v === '1' || v === 'yes'
}

const CAMERA_DEBUG_LOG = isSimilarityCameraDebugEnabled()

function logSimilarityCameraDebugBanner() {
  if (typeof window === 'undefined') return
  const raw = process.env.NEXT_PUBLIC_SIMILARITY_MAP_CAMERA_DEBUG
  if (CAMERA_DEBUG_LOG) {
    console.info(
      '[SimilarityMap camera] Debug ON — logs appear when you orbit/zoom and after the first camera sync.'
    )
    return
  }
  console.info(
    '[SimilarityMap camera] Debug OFF — add NEXT_PUBLIC_SIMILARITY_MAP_CAMERA_DEBUG=true (or 1) to .env.local and restart the dev server to log coordinates. Current value:',
    raw === undefined ? '(unset)' : JSON.stringify(raw)
  )
}

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

/** Marker radius in px: stronger spread by `companyCount` (more companies → larger). */
function sizeForCount(count: number, minC: number, maxC: number): number {
  if (maxC <= minC) return 18
  const minSize = 6
  const maxSize = 30
  return minSize + ((count - minC) / (maxC - minC)) * (maxSize - minSize)
}

function buildTraces(points: SimilarityPoint[]): Data[] {
  if (points.length === 0) return []
  const counts = points.map((p) => p.companyCount)
  const minC = Math.min(...counts)
  const maxC = Math.max(...counts)

  const pointsByCategory = new Map<IngredientCategory, SimilarityPoint[]>()
  for (const point of points) {
    const current = pointsByCategory.get(point.category) ?? []
    current.push(point)
    pointsByCategory.set(point.category, current)
  }

  return CATEGORY_ORDER.map((category) => {
    const catPoints = pointsByCategory.get(category) ?? []
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
 * Hand-tuned default `scene.camera` (paste from `[SimilarityMap camera] flat relayout keys`).
 * Use center + eye + up exactly — Plotly’s `up` is not always (0,0,1) after orbit/roll.
 */
const DEFAULT_SCENE_CAMERA_CENTER = {
  x: 0.3810515789473685,
  y: 0.05621723684210525,
  z: -0.5309910526315795,
} as const

const DEFAULT_SCENE_CAMERA_EYE = {
  x: -0.5212435171662714,
  y: -0.10633712736845063,
  z: 0.7869940070653132,
} as const

const DEFAULT_SCENE_CAMERA_UP = {
  x: -0.3849968674540849,
  y: -0.8463940134804687,
  z: -0.36796003314893666,
} as const

/** Arithmetic mean — used as zoom fallback when layout has no camera.center. */
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

function pointSetSignature(pts: readonly SimilarityPoint[]): string {
  if (pts.length === 0) return '0'
  if (pts.length <= 48) return `${pts.length}:${pts.map((p) => p.id).join('|')}`
  const mid = pts[Math.floor(pts.length / 2)]!
  return `${pts.length}:${pts[0]!.id}:${mid.id}:${pts[pts.length - 1]!.id}`
}

type SceneCamera = {
  center: { x: number; y: number; z: number }
  eye: { x: number; y: number; z: number }
  up: { x: number; y: number; z: number }
}

type SceneCameraFlatPatch = {
  'scene.camera.center.x': number
  'scene.camera.center.y': number
  'scene.camera.center.z': number
  'scene.camera.eye.x': number
  'scene.camera.eye.y': number
  'scene.camera.eye.z': number
  'scene.camera.up.x': number
  'scene.camera.up.y': number
  'scene.camera.up.z': number
}

type SceneCameraEyeFlatPatch = {
  'scene.camera.eye.x': number
  'scene.camera.eye.y': number
  'scene.camera.eye.z': number
}

function computeSceneCamera(points: readonly SimilarityPoint[]): SceneCamera {
  if (points.length === 0) {
    return {
      center: { x: 0, y: 0, z: 0 },
      eye: { x: 0, y: 0, z: 1 },
      up: { x: 0, y: 0, z: 1 },
    }
  }
  const c = DEFAULT_SCENE_CAMERA_CENTER
  const e = DEFAULT_SCENE_CAMERA_EYE
  const u = DEFAULT_SCENE_CAMERA_UP
  return {
    center: { x: c.x, y: c.y, z: c.z },
    eye: { x: e.x, y: e.y, z: e.z },
    up: { x: u.x, y: u.y, z: u.z },
  }
}

/** Flat keys only — nested `scene: { camera }` would replace the whole scene. */
function buildSceneCameraFlatPatch(
  points: readonly SimilarityPoint[]
): Partial<Layout> {
  const cam = computeSceneCamera(points)
  const patch: SceneCameraFlatPatch = {
    'scene.camera.center.x': cam.center.x,
    'scene.camera.center.y': cam.center.y,
    'scene.camera.center.z': cam.center.z,
    'scene.camera.eye.x': cam.eye.x,
    'scene.camera.eye.y': cam.eye.y,
    'scene.camera.eye.z': cam.eye.z,
    'scene.camera.up.x': cam.up.x,
    'scene.camera.up.y': cam.up.y,
    'scene.camera.up.z': cam.up.z,
  }

  return patch as Partial<Layout>
}

function buildPlotLayout(points: readonly SimilarityPoint[]): Partial<Layout> {
  const cam = computeSceneCamera(points)
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
      /* Match axis proportions to real UMAP ranges — avoids skewed projection
       * that pushed the cloud to a corner with manual aspectratio. */
      aspectmode: 'data',
      domain: { x: [0, 1], y: [0, 1] },
      xaxis: { ...sceneAxis },
      yaxis: { ...sceneAxis },
      zaxis: { ...sceneAxis },
      camera: {
        center: cam.center,
        eye: cam.eye,
        up: cam.up,
      },
    },
    showlegend: false,
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
  const eyePatch: SceneCameraEyeFlatPatch = {
    'scene.camera.eye.x': newEye.x,
    'scene.camera.eye.y': newEye.y,
    'scene.camera.eye.z': newEye.z,
  }

  void PlotlyGL.relayout(gd, eyePatch as Partial<Layout>)
}

/**
 * gl3d applies camera before dataScale is final; the first `plotly_afterplot`
 * fires before react-plotly binds `onAfterPlot`. Re-apply camera with flat keys
 * after layout settles; only when the point set changes (not wheel/orbit).
 */
function trySyncSceneCamera(
  gd: GraphDiv,
  points: readonly SimilarityPoint[],
  appliedSigRef: { current: string | null }
) {
  if (points.length === 0) return
  const sig = pointSetSignature(points)
  if (appliedSigRef.current === sig) return
  appliedSigRef.current = sig
  void PlotlyGL.relayout(gd, buildSceneCameraFlatPatch(points))
}

type PlotlyGraphDivEvents = GraphDiv & {
  on: (ev: string, fn: () => void) => void
  removeListener: (ev: string, fn: () => void) => void
}

let cameraDebugRafId = 0

function logSimilaritySceneCameraNow(gd: GraphDiv) {
  const cam = gd._fullLayout?.scene?.camera ?? gd.layout?.scene?.camera
  if (cam === undefined) return
  const c = cam.center
  const e = cam.eye
  if (
    c === undefined ||
    e === undefined ||
    typeof c.x !== 'number' ||
    typeof c.y !== 'number' ||
    typeof c.z !== 'number' ||
    typeof e.x !== 'number' ||
    typeof e.y !== 'number' ||
    typeof e.z !== 'number'
  ) {
    return
  }

  const vx = e.x - c.x
  const vy = e.y - c.y
  const vz = e.z - c.z
  const dist = Math.hypot(vx, vy, vz)
  const rawUp = cam.up
  const up = {
    x: rawUp !== undefined && typeof rawUp.x === 'number' ? rawUp.x : 0,
    y: rawUp !== undefined && typeof rawUp.y === 'number' ? rawUp.y : 0,
    z: rawUp !== undefined && typeof rawUp.z === 'number' ? rawUp.z : 1,
  }

  const snap = {
    'scene.camera.center': { x: c.x, y: c.y, z: c.z },
    'scene.camera.eye': { x: e.x, y: e.y, z: e.z },
    'scene.camera.up': up,
  }

  console.log(
    '[SimilarityMap camera] snapshot\n' + JSON.stringify(snap, null, 2)
  )

  console.log(
    '[SimilarityMap camera] copy into code: prefer the "flat relayout keys" JSON below — it includes `up` after roll. Legacy eye−center hint:\n' +
      `const CAMERA_START_DISTANCE = ${dist.toFixed(6)}\n` +
      `return { x: ${vx.toFixed(6)}, y: ${vy.toFixed(6)}, z: ${vz.toFixed(6)} }\n` +
      `// center: { x: ${c.x.toFixed(6)}, y: ${c.y.toFixed(6)}, z: ${c.z.toFixed(6)} }`
  )

  const flat = {
    'scene.camera.center.x': c.x,
    'scene.camera.center.y': c.y,
    'scene.camera.center.z': c.z,
    'scene.camera.eye.x': e.x,
    'scene.camera.eye.y': e.y,
    'scene.camera.eye.z': e.z,
    'scene.camera.up.x': up.x,
    'scene.camera.up.y': up.y,
    'scene.camera.up.z': up.z,
  }
  console.log(
    '[SimilarityMap camera] flat relayout keys\n' +
      JSON.stringify(flat, null, 2)
  )
}

function scheduleSimilarityCameraDebugLog(gd: GraphDiv) {
  if (!CAMERA_DEBUG_LOG) return
  if (cameraDebugRafId !== 0) cancelAnimationFrame(cameraDebugRafId)
  cameraDebugRafId = requestAnimationFrame(() => {
    cameraDebugRafId = 0
    logSimilaritySceneCameraNow(gd)
  })
}

/** Subscribe to Plotly camera updates; call returned fn on purge / unmount. */
function attachSimilarityCameraDebugLog(
  gd: GraphDiv
): (() => void) | undefined {
  if (!CAMERA_DEBUG_LOG) return undefined
  const el = gd as PlotlyGraphDivEvents
  const onRelayout = () => {
    logSimilaritySceneCameraNow(gd)
  }
  const onRelayouting = () => {
    scheduleSimilarityCameraDebugLog(gd)
  }
  el.on('plotly_relayout', onRelayout)
  el.on('plotly_relayouting', onRelayouting)
  return () => {
    if (cameraDebugRafId !== 0) {
      cancelAnimationFrame(cameraDebugRafId)
      cameraDebugRafId = 0
    }
    el.removeListener('plotly_relayout', onRelayout)
    el.removeListener('plotly_relayouting', onRelayouting)
  }
}

type IngredientSimilarityPlotProps = {
  /** When set, skips internal fetch (full page passes API result + loading). */
  plotData?: { points: readonly SimilarityPoint[]; loading: boolean }
  /** Empty = all categories. Otherwise only these categories. */
  selectedCategories?: readonly IngredientCategory[]
  /** Empty = all suppliers. Otherwise only these supplier names. */
  selectedSuppliers?: readonly string[]
}

export default function IngredientSimilarityPlot({
  plotData,
  selectedCategories = [],
  selectedSuppliers = [],
}: IngredientSimilarityPlotProps) {
  const router = useRouter()
  const [internalPoints, setInternalPoints] = useState<SimilarityPoint[]>([])
  const [internalLoading, setInternalLoading] = useState(true)
  const [internalError, setInternalError] = useState<string | null>(null)

  const parentMode = plotData !== undefined
  const points: readonly SimilarityPoint[] = parentMode
    ? plotData.points
    : internalPoints
  const loading = parentMode ? plotData.loading : internalLoading
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastPointerRef = useRef({ x: 0, y: 0 })
  const pointsRef = useRef(points)
  const plotShellRef = useRef<HTMLDivElement>(null)
  const graphDivRef = useRef<GraphDiv | null>(null)
  const wheelCleanupRef = useRef<(() => void) | null>(null)
  const cameraDebugCleanupRef = useRef<(() => void) | null>(null)
  const plotResizeObserverCleanupRef = useRef<(() => void) | null>(null)
  const appliedCameraSigRef = useRef<string | null>(null)

  useLayoutEffect(() => {
    pointsRef.current = points
  }, [points])

  useEffect(() => {
    if (parentMode) return
    const abortController = new AbortController()
    let timedOut = false
    const timeoutId = window.setTimeout(() => {
      timedOut = true
      abortController.abort()
    }, 15000)

    void fetch('/api/similarity-map', {
      credentials: 'same-origin',
      cache: 'no-store',
      signal: abortController.signal,
    })
      .then(async (r) => {
        if (!r.ok) {
          const text = await r.text()
          throw new Error(text || `HTTP ${r.status}`)
        }
        return r.json() as Promise<{ points?: SimilarityPoint[] }>
      })
      .then((json) => {
        setInternalPoints(json.points ?? [])
        setInternalError(null)
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === 'AbortError') {
          if (timedOut) {
            setInternalError('Timed out while loading similarity map data.')
          }
          return
        }
        console.error(error)
        setInternalError('Failed to load similarity map data.')
      })
      .finally(() => {
        window.clearTimeout(timeoutId)
        setInternalLoading(false)
      })

    return () => {
      window.clearTimeout(timeoutId)
      abortController.abort()
    }
  }, [parentMode])

  useEffect(() => {
    return () => {
      wheelCleanupRef.current?.()
      wheelCleanupRef.current = null
      cameraDebugCleanupRef.current?.()
      cameraDebugCleanupRef.current = null
      plotResizeObserverCleanupRef.current?.()
      plotResizeObserverCleanupRef.current = null
    }
  }, [])

  const clearHideTimer = () => {
    if (hideTimer.current !== null) {
      clearTimeout(hideTimer.current)
      hideTimer.current = null
    }
  }

  const scheduleHide = (delay = 300) => {
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
    appliedCameraSigRef.current = null
    wheelCleanupRef.current?.()
    wheelCleanupRef.current = null
    cameraDebugCleanupRef.current?.()
    cameraDebugCleanupRef.current = null
    plotResizeObserverCleanupRef.current?.()
    plotResizeObserverCleanupRef.current = null
    graphDivRef.current = null
  }

  const filteredPoints = useMemo(() => {
    return points.filter((p) => {
      if (
        selectedCategories.length > 0 &&
        !selectedCategories.includes(p.category)
      )
        return false
      if (
        selectedSuppliers.length > 0 &&
        !selectedSuppliers.includes(p.supplierName)
      )
        return false
      return true
    })
  }, [points, selectedCategories, selectedSuppliers])

  const traces = useMemo(() => buildTraces(filteredPoints), [filteredPoints])
  const plotLayout = useMemo(() => buildPlotLayout(points), [points])

  const filterNoMatch =
    filteredPoints.length === 0 && points.length > 0 && !loading

  if (loading) {
    return (
      <div className="similarity-map-shell similarity-map-shell--plot-only">
        <div className="ingredient-similarity-plot-root ingredient-similarity-plot-loading">
          Loading 3D map…
        </div>
      </div>
    )
  }

  if (!parentMode && internalError) {
    return (
      <div className="similarity-map-shell similarity-map-shell--plot-only">
        <div className="similarity-map-filter-empty">{internalError}</div>
      </div>
    )
  }

  return (
    <>
      <div className="similarity-map-shell similarity-map-shell--plot-only">
        <div
          ref={plotShellRef}
          className="ingredient-similarity-plot-root"
          onMouseMove={(e) => {
            lastPointerRef.current = { x: e.clientX, y: e.clientY }
          }}
        >
          {filterNoMatch ? (
            <div className="similarity-map-filter-empty">
              No ingredients match the selected filters.
            </div>
          ) : (
            <Plot
              data={traces}
              layout={plotLayout}
              config={config}
              onInitialized={(_figure, el) => {
                const gd = el as GraphDiv
                graphDivRef.current = gd
                logSimilarityCameraDebugBanner()
                attachWheelZoom(gd)
                cameraDebugCleanupRef.current?.()
                cameraDebugCleanupRef.current =
                  attachSimilarityCameraDebugLog(gd) ?? null
                plotResizeObserverCleanupRef.current?.()
                plotResizeObserverCleanupRef.current = null
                const shell = plotShellRef.current
                if (shell !== null && typeof ResizeObserver !== 'undefined') {
                  const ro = new ResizeObserver(() => {
                    const g = graphDivRef.current
                    if (g !== null) {
                      void PlotlyGL.Plots.resize(g)
                    }
                  })
                  ro.observe(shell)
                  plotResizeObserverCleanupRef.current = () => {
                    ro.disconnect()
                  }
                }
                requestAnimationFrame(() => {
                  requestAnimationFrame(() => {
                    trySyncSceneCamera(
                      gd,
                      pointsRef.current,
                      appliedCameraSigRef
                    )
                    if (CAMERA_DEBUG_LOG) logSimilaritySceneCameraNow(gd)
                    void PlotlyGL.Plots.resize(gd)
                  })
                })
              }}
              onAfterPlot={() => {
                const gd = graphDivRef.current
                if (gd === null) return
                trySyncSceneCamera(gd, pointsRef.current, appliedCameraSigRef)
              }}
              onPurge={handlePlotPurge}
              onHover={handleHover}
              onUnhover={handleUnhover}
              useResizeHandler
              style={{ width: '100%', height: '100%' }}
            />
          )}
          {!filterNoMatch ? (
            <p className="similarity-map-zoom-hint">
              Scroll to zoom · drag to orbit
            </p>
          ) : null}
        </div>
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
          onMouseMove={clearHideTimer}
          onMouseLeave={() => scheduleHide(300)}
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
