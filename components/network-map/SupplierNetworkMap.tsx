'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Check, ChevronDown } from 'lucide-react'
import Map, {
  type MapRef,
  NavigationControl,
  useControl,
} from 'react-map-gl/maplibre'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MapboxOverlay } from '@deck.gl/mapbox'
import { ArcLayer, ScatterplotLayer } from '@deck.gl/layers'
import type { Layer, PickingInfo } from '@deck.gl/core'
import { DropdownMenu } from 'radix-ui'
import { cartoDarkMatterStyle } from '@/components/network-map/carto-dark-matter-style'
import type { NetworkMapArc, NetworkMapNode } from '@/lib/network-map-data'

type TooltipInfo = {
  x: number
  y: number
  node: NetworkMapNode
}

function DeckGLOverlay({
  layers,
  onHover,
}: {
  layers: Layer[]
  onHover?: (info: PickingInfo) => void
}) {
  const overlay = useControl<MapboxOverlay>(
    () => new MapboxOverlay({ interleaved: true, layers: [] })
  )
  overlay.setProps({ layers, onHover })
  return null
}

const initialViewState = {
  longitude: -30,
  latitude: 30,
  zoom: 1.8,
  pitch: 40,
  bearing: -8,
}

/** Cockpit tiles use a wide, shallow frame (≈2:1). Mercator + modest pitch keeps Deck.gl aligned with the basemap. */
const previewViewState = {
  longitude: -52,
  latitude: 52,
  zoom: 1.08,
  pitch: 12,
  bearing: -6,
}

/** Accent colors aligned with `app/globals.css`. */
const COLOR_COMPANY: [number, number, number, number] = [103, 232, 249, 230] // cyan
const COLOR_SUPPLIER: [number, number, number, number] = [167, 139, 250, 225] // purple
const COLOR_ARC_SRC: [number, number, number, number] = [167, 139, 250, 80] // purple dim
const COLOR_ARC_TGT: [number, number, number, number] = [103, 232, 249, 80] // cyan dim

type MapBundle = { nodes: NetworkMapNode[]; arcs: NetworkMapArc[] }
type NetworkMapCategory = 'brand' | 'supplier'

export type SupplierNetworkMapVariant = 'default' | 'preview' | 'taskpane'

const taskpaneViewState = {
  longitude: -32,
  latitude: 34,
  zoom: 1.75,
  pitch: 10,
  bearing: -8,
}

export type SupplierNetworkMapProps = {
  companyId: number | null
  variant?: SupplierNetworkMapVariant
  /** Controlled filter state — when provided, internal state is ignored. */
  selectedCategories?: NetworkMapCategory[]
  onCategoriesChange?: (next: NetworkMapCategory[]) => void
  selectedSuppliers?: string[]
  onSuppliersChange?: (next: string[]) => void
}

export default function SupplierNetworkMap({
  companyId,
  variant = 'default',
  selectedCategories: controlledCategories,
  onCategoriesChange: onControlledCategoriesChange,
  selectedSuppliers: controlledSuppliers,
  onSuppliersChange: onControlledSuppliersChange,
}: SupplierNetworkMapProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapRef>(null)

  const [bundle, setBundle] = useState<MapBundle | null>(null)
  const [status, setStatus] = useState<'loading' | 'live' | 'empty' | 'error'>(
    'loading'
  )
  const [errorDetail, setErrorDetail] = useState<string | null>(null)
  const [internalCategories, setInternalCategories] = useState<
    NetworkMapCategory[]
  >([])
  const [internalSuppliers, setInternalSuppliers] = useState<string[]>([])

  const isControlled = controlledCategories !== undefined
  const selectedSuppliers = useMemo(
    () => (isControlled ? (controlledSuppliers ?? []) : internalSuppliers),
    [isControlled, controlledSuppliers, internalSuppliers]
  )
  const selectedCategories = useMemo(
    () => (isControlled ? controlledCategories : internalCategories),
    [isControlled, controlledCategories, internalCategories]
  )

  const setSelectedCategories = isControlled
    ? (onControlledCategoriesChange ?? (() => {}))
    : setInternalCategories
  const setSelectedSuppliers = isControlled
    ? (onControlledSuppliersChange ?? (() => {}))
    : setInternalSuppliers
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null)
  
  const router = useRouter()
  const hideTimer = useRef<NodeJS.Timeout | null>(null)
  
  const clearHideTimer = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current)
      hideTimer.current = null
    }
  }

  const scheduleHide = (delay = 200) => {
    clearHideTimer()
    hideTimer.current = setTimeout(() => setTooltip(null), delay)
  }

  const portalNode = typeof document !== 'undefined'
      ? document.getElementById('network-map-filters-portal')
      : null

  useEffect(() => {
    let cancelled = false
    let timedOut = false
    const abortController = new AbortController()
    const timeoutId = window.setTimeout(() => {
      timedOut = true
      abortController.abort()
    }, 15000)

    fetch('/api/network-map', {
      credentials: 'same-origin',
      signal: abortController.signal,
    })
      .then(async (r) => {
        if (!r.ok) {
          const text = await r.text()
          throw new Error(text || `HTTP ${r.status}`)
        }
        return r.json()
      })
      .then((data: unknown) => {
        if (cancelled) return
        if (
          !data ||
          typeof data !== 'object' ||
          !Array.isArray((data as MapBundle).nodes)
        ) {
          setBundle(null)
          setStatus('error')
          setErrorDetail('network-map response shape invalid')
          return
        }
        const bundleData = data as MapBundle
        if (bundleData.nodes.length === 0) {
          setBundle(null)
          setStatus('empty')
          return
        }
        setBundle(bundleData)
        setErrorDetail(null)
        setStatus('live')
      })
      .catch((error: unknown) => {
        if (cancelled) return
        if (error instanceof Error && error.name === 'AbortError') {
          if (timedOut) {
            setBundle(null)
            setStatus('error')
            setErrorDetail('Timed out while loading /api/network-map')
          }
          return
        }
        setBundle(null)
        setStatus('error')
        setErrorDetail('API request failed for /api/network-map')
      })
      .finally(() => {
        window.clearTimeout(timeoutId)
      })

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
      abortController.abort()
    }
  }, [companyId])

  const categoryOptions = useMemo(
    () =>
      [
        { key: 'brand', label: 'Brand' },
        { key: 'supplier', label: 'Supplier' },
      ] as const,
    []
  )

  const supplierOptions = useMemo(() => {
    if (!bundle) return []
    return bundle.nodes
      .filter((node) => node.kind === 'supplier')
      .map((node) => node.name.trim())
      .filter((name) => name !== '')
      .filter((name, index, all) => all.indexOf(name) === index)
      .sort((a, b) => a.localeCompare(b))
  }, [bundle])

  const effectiveCategories = useMemo(() => {
    return selectedCategories.filter(
      (category) => category === 'brand' || category === 'supplier'
    )
  }, [selectedCategories])

  const effectiveSuppliers = useMemo(() => {
    const available = new Set(supplierOptions)
    return selectedSuppliers.filter((supplier) => available.has(supplier))
  }, [selectedSuppliers, supplierOptions])

  const filteredBundle = useMemo((): MapBundle | null => {
    if (!bundle) return null

    const supplierFilter = new Set(effectiveSuppliers)
    const categoryFilter = new Set(effectiveCategories)

    const hasSupplierFilter = supplierFilter.size > 0
    const hasCategoryFilter = categoryFilter.size > 0

    if (!hasSupplierFilter && !hasCategoryFilter) return bundle

    const nodeByPosition = new globalThis.Map<string, NetworkMapNode[]>()
    for (const node of bundle.nodes) {
      const key = `${node.position[0]},${node.position[1]}`
      const existing = nodeByPosition.get(key)
      if (existing) {
        existing.push(node)
      } else {
        nodeByPosition.set(key, [node])
      }
    }

    const matchesCategory = (node: NetworkMapNode): boolean => {
      if (!hasCategoryFilter) return true
      if (node.kind === 'customer') return categoryFilter.has('brand')
      return categoryFilter.has('supplier')
    }

    const matchesSupplier = (node: NetworkMapNode): boolean => {
      if (!hasSupplierFilter) return true
      if (node.kind !== 'supplier') return true
      return supplierFilter.has(node.name)
    }

    const filteredArcs = bundle.arcs.filter((arc) => {
      const sourceNodes =
        nodeByPosition.get(`${arc.sourcePosition[0]},${arc.sourcePosition[1]}`) ??
        []
      const targetNodes =
        nodeByPosition.get(`${arc.targetPosition[0]},${arc.targetPosition[1]}`) ??
        []
      const endpoints = [...sourceNodes, ...targetNodes]

      if (endpoints.length === 0) return false

      const categoryOk = hasCategoryFilter
        ? endpoints.some((node) => matchesCategory(node))
        : true

      const supplierOk = hasSupplierFilter
        ? endpoints.some(
            (node) => node.kind === 'supplier' && supplierFilter.has(node.name)
          )
        : true

      return categoryOk && supplierOk
    })

    const connectedPositionKeys = new Set<string>()
    for (const arc of filteredArcs) {
      connectedPositionKeys.add(`${arc.sourcePosition[0]},${arc.sourcePosition[1]}`)
      connectedPositionKeys.add(`${arc.targetPosition[0]},${arc.targetPosition[1]}`)
    }

    const filteredNodes = bundle.nodes.filter((node) => {
      if (!matchesCategory(node)) return false
      if (!matchesSupplier(node)) return false
      if (connectedPositionKeys.size === 0) return true
      return connectedPositionKeys.has(`${node.position[0]},${node.position[1]}`)
    })

    return { nodes: filteredNodes, arcs: filteredArcs }
  }, [bundle, effectiveCategories, effectiveSuppliers])

  const layers = useMemo((): Layer[] => {
    if (!filteredBundle) return []
    const { nodes, arcs } = filteredBundle
    const preview = variant === 'preview'

    return [
      new ArcLayer<NetworkMapArc>({
        id: 'network-arcs',
        data: arcs,
        greatCircle: true,
        numSegments: 64,
        getSourcePosition: (d) => d.sourcePosition,
        getTargetPosition: (d) => d.targetPosition,
        getSourceColor: COLOR_ARC_SRC,
        getTargetColor: COLOR_ARC_TGT,
        getWidth: preview ? 2.4 : 1.6,
        getHeight: 0.3,
      }),
      new ScatterplotLayer<NetworkMapNode>({
        id: 'network-nodes',
        data: nodes,
        pickable: !preview,
        radiusUnits: 'pixels',
        radiusMinPixels: preview ? 4 : 3,
        radiusMaxPixels: preview ? 11 : 12,
        lineWidthUnits: 'pixels',
        lineWidthMinPixels: 1,
        stroked: true,
        filled: true,
        getPosition: (d) => d.position,
        getRadius: (d) =>
          d.kind === 'customer' ? (preview ? 7 : 8) : preview ? 5 : 5.5,
        getFillColor: (d) =>
          d.kind === 'customer' ? COLOR_COMPANY : COLOR_SUPPLIER,
        getLineColor: [232, 236, 240, 100],
        getLineWidth: 1,
      }),
    ]
  }, [filteredBundle, variant])

  useEffect(() => {
    const el = rootRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => mapRef.current?.resize())
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useLayoutEffect(() => {
    if (status !== 'live' && status !== 'empty' && status !== 'error') return
    const resize = () => mapRef.current?.resize()
    resize()
    const t = window.setTimeout(resize, 120)
    window.addEventListener('resize', resize)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('resize', resize)
    }
  }, [status, filteredBundle])

  const companyCount =
    filteredBundle?.nodes.filter((n) => n.kind === 'customer').length ?? 0
  const supplierCount =
    filteredBundle?.nodes.filter((n) => n.kind === 'supplier').length ?? 0
  const arcCount = filteredBundle?.arcs.length ?? 0

  const isPreview = variant === 'preview'
  const isTaskpane = variant === 'taskpane'
  const viewState = isPreview
    ? previewViewState
    : isTaskpane
      ? taskpaneViewState
      : initialViewState

  const categorySummary =
    effectiveCategories.length === 0
      ? 'All categories'
      : effectiveCategories
          .map(
            (category) =>
              categoryOptions.find((option) => option.key === category)?.label ??
              category
          )
          .join(', ')

  const supplierSummary =
    effectiveSuppliers.length === 0
      ? 'All suppliers'
      : effectiveSuppliers.length === 1
        ? effectiveSuppliers[0]
        : `${effectiveSuppliers[0]} +${effectiveSuppliers.length - 1}`

  return (
    <div
      ref={rootRef}
      className={
        isPreview
          ? 'supplier-network-map-root supplier-network-map-root--preview'
          : 'supplier-network-map-root'
      }
    >
      {status === 'live' && !isPreview ? (
        (() => {
          const content = (
            <div
              className={(portalNode && !isTaskpane) ? 'similarity-map-multi-filters' : `network-map-filters${isTaskpane ? ' network-map-filters--taskpane' : ''}`}
              role="toolbar"
              aria-label="Map filters"
            >
              <div className="opportunities-filter">
                <span className="opportunities-filter-label">Category</span>
                <DropdownMenu.Root modal={false}>
                  <DropdownMenu.Trigger
                    type="button"
                    className="app-top-nav-select-trigger similarity-map-multi-filter-trigger"
                    aria-label="Kategorien filtern"
                  >
                    <span>{categorySummary}</span>
                    <ChevronDown
                      size={14}
                      className="app-top-nav-select-chevron"
                      aria-hidden
                    />
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      className="app-top-nav-select-content similarity-map-multi-filter-content"
                      sideOffset={4}
                      align="start"
                    >
                      {categoryOptions.map((option) => (
                        <DropdownMenu.CheckboxItem
                          key={option.key}
                          className="app-top-nav-select-item similarity-map-multi-filter-item"
                          checked={effectiveCategories.includes(option.key)}
                          onCheckedChange={(checked) => {
                            const next = new Set(selectedCategories)
                            if (checked === true) next.add(option.key)
                            else next.delete(option.key)
                            setSelectedCategories(Array.from(next))
                          }}
                          onSelect={(event) => event.preventDefault()}
                        >
                          <span className="similarity-map-multi-filter-item-text">
                            {option.label}
                          </span>
                          <DropdownMenu.ItemIndicator className="app-top-nav-select-check">
                            <Check size={14} aria-hidden />
                          </DropdownMenu.ItemIndicator>
                        </DropdownMenu.CheckboxItem>
                      ))}
                      <DropdownMenu.Separator className="similarity-map-multi-filter-sep" />
                      <DropdownMenu.Item
                        className="app-top-nav-select-item similarity-map-multi-filter-clear"
                        onSelect={(event) => {
                          event.preventDefault()
                          setSelectedCategories([])
                        }}
                      >
                        Clear category filter
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </div>

              <div className="opportunities-filter">
                <span className="opportunities-filter-label">Supplier</span>
                <DropdownMenu.Root modal={false}>
                  <DropdownMenu.Trigger
                    type="button"
                    className="app-top-nav-select-trigger similarity-map-multi-filter-trigger"
                    aria-label="Lieferanten filtern"
                  >
                    <span>{supplierSummary}</span>
                    <ChevronDown
                      size={14}
                      className="app-top-nav-select-chevron"
                      aria-hidden
                    />
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      className="app-top-nav-select-content similarity-map-multi-filter-content similarity-map-multi-filter-content--scroll"
                      sideOffset={4}
                      align="start"
                    >
                      {supplierOptions.map((supplier) => (
                        <DropdownMenu.CheckboxItem
                          key={supplier}
                          className="app-top-nav-select-item similarity-map-multi-filter-item"
                          checked={effectiveSuppliers.includes(supplier)}
                          onCheckedChange={(checked) => {
                            const next = new Set(selectedSuppliers)
                            if (checked === true) next.add(supplier)
                            else next.delete(supplier)
                            setSelectedSuppliers(Array.from(next))
                          }}
                          onSelect={(event) => event.preventDefault()}
                        >
                          <span className="similarity-map-multi-filter-item-text">
                            {supplier}
                          </span>
                          <DropdownMenu.ItemIndicator className="app-top-nav-select-check">
                            <Check size={14} aria-hidden />
                          </DropdownMenu.ItemIndicator>
                        </DropdownMenu.CheckboxItem>
                      ))}
                      <DropdownMenu.Separator className="similarity-map-multi-filter-sep" />
                      <DropdownMenu.Item
                        className="app-top-nav-select-item similarity-map-multi-filter-clear"
                        onSelect={(event) => {
                          event.preventDefault()
                          setSelectedSuppliers([])
                        }}
                      >
                        Clear supplier filter
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </div>
            </div>
          )

          if (portalNode && !isTaskpane) {
            return createPortal(content, portalNode)
          }
          return content
        })()
      ) : null}

      <Map
        ref={mapRef}
        mapLib={maplibregl}
        mapStyle={cartoDarkMatterStyle}
        initialViewState={viewState}
        maxPitch={60}
        dragPan={!isPreview}
        dragRotate={!isPreview}
        scrollZoom={!isPreview}
        doubleClickZoom={!isPreview}
        touchZoomRotate={!isPreview}
        touchPitch={!isPreview}
        keyboard={!isPreview}
        interactive={!isPreview}
        cooperativeGestures={false}
        projection="mercator"
        reuseMaps
        attributionControl={false}
        maplibreLogo={false}
        style={{ width: '100%', height: '100%' }}
      >
        <DeckGLOverlay
          layers={layers}
          onHover={(info: PickingInfo) => {
            if (isPreview) return
            const node = info.object as NetworkMapNode | undefined
            if (node && info.x !== undefined && info.y !== undefined) {
              const rect = rootRef.current?.getBoundingClientRect()
              const offsetX = rect ? rect.left : 0
              const offsetY = rect ? rect.top : 0
              clearHideTimer()
              setTooltip({ x: info.x + offsetX, y: info.y + offsetY, node })
            } else {
              scheduleHide(150)
            }
          }}
        />
        {!isPreview && (
          <NavigationControl
            position="top-right"
            showZoom
            showCompass
            visualizePitch
          />
        )}
      </Map>

      {status === 'loading' && <div className="map-overlay-status">Loading…</div>}
      {status === 'empty' && (
        <div className="map-overlay-status">
          {companyId === null ? (
            <>
              Geocoding pending - run
              <code className="map-overlay-code">
                pnpm tsx scripts/geocode-entities.ts
              </code>
            </>
          ) : (
            'No network links found for the selected company scope.'
          )}
        </div>
      )}
      {status === 'error' && (
        <div className="map-overlay-status">
          Failed to load map data
          {errorDetail ? ` (${errorDetail})` : ''}
        </div>
      )}

      {status === 'live' && filteredBundle && filteredBundle.nodes.length === 0 && (
        <div className="map-overlay-status">No nodes match the selected filters.</div>
      )}

      {status === 'live' && !isPreview && (
        <div className="map-legend">
          <div className="map-legend-row">
            <span className="map-legend-dot map-legend-dot-company" />
            <span>{companyCount} brands</span>
          </div>
          <div className="map-legend-row">
            <span className="map-legend-dot map-legend-dot-supplier" />
            <span>{supplierCount} suppliers</span>
          </div>
          <div className="map-legend-row">
            <span className="map-legend-line" />
            <span>{arcCount} connections</span>
          </div>
        </div>
      )}

      {tooltip && (
        <div
          className="similarity-map-tooltip"
          style={{
            '--tip-x': `${tooltip.x + 16}px`,
            '--tip-y': `${tooltip.y - 8}px`,
          } as React.CSSProperties}
          onMouseEnter={clearHideTimer}
          onMouseLeave={() => scheduleHide(150)}
        >
          <div className="similarity-map-tooltip-name">{tooltip.node.name}</div>
          <div className="similarity-map-tooltip-meta">
            {tooltip.node.kind === 'customer' ? 'Brand' : 'Supplier'}
          </div>
          <button
            className="similarity-map-tooltip-btn"
            onClick={() =>
              router.push(
                tooltip.node.kind === 'customer'
                  ? `/companies/${tooltip.node.refId}`
                  : `/suppliers/${tooltip.node.refId}`
              )
            }
          >
            {tooltip.node.kind === 'customer' ? 'View Brand →' : 'View Supplier →'}
          </button>
        </div>
      )}
    </div>
  )
}
