'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Map, {
  type MapRef,
  NavigationControl,
  useControl,
} from 'react-map-gl/maplibre'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MapboxOverlay } from '@deck.gl/mapbox'
import { ArcLayer, ScatterplotLayer } from '@deck.gl/layers'
import type { Layer } from '@deck.gl/core'
import { cartoDarkMatterStyle } from '@/components/network-map/carto-dark-matter-style'
import type { NetworkMapArc, NetworkMapNode } from '@/lib/network-map-data'

function DeckGLOverlay({ layers }: { layers: Layer[] }) {
  const overlay = useControl<MapboxOverlay>(
    () => new MapboxOverlay({ interleaved: true, layers: [] })
  )
  overlay.setProps({ layers })
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

export type SupplierNetworkMapVariant = 'default' | 'preview'

export default function SupplierNetworkMap({
  companyId,
  variant = 'default',
}: {
  companyId: number | null
  variant?: SupplierNetworkMapVariant
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapRef>(null)

  const [bundle, setBundle] = useState<MapBundle | null>(null)
  const [status, setStatus] = useState<'loading' | 'live' | 'empty' | 'error'>(
    'loading'
  )

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
>>>>>>> 8f43fbe (fix: harden map data loading with timeouts)
      .then((data: unknown) => {
        if (cancelled) return
        if (
          !data ||
          typeof data !== 'object' ||
          !Array.isArray((data as MapBundle).nodes)
        ) {
          setStatus('error')
          return
        }
        const bundleData = data as MapBundle
        if (bundleData.nodes.length === 0) {
          setBundle(null)
          setStatus('empty')
        } else {
          setBundle(bundleData)
          setStatus('live')
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return
        if (error instanceof Error && error.name === 'AbortError') {
          if (timedOut) {
            setBundle(null)
            setStatus('error')
          }
          return
        }
        setBundle(null)
        setStatus('error')
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

  const layers = useMemo((): Layer[] => {
    if (!bundle) return []
    const { nodes, arcs } = bundle
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
        pickable: true,
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
  }, [bundle, variant])

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
  }, [status, bundle])

  const companyCount =
    bundle?.nodes.filter((n) => n.kind === 'customer').length ?? 0
  const supplierCount =
    bundle?.nodes.filter((n) => n.kind === 'supplier').length ?? 0
  const arcCount = bundle?.arcs.length ?? 0

  const isPreview = variant === 'preview'
  const viewState = isPreview ? previewViewState : initialViewState

  return (
    <div
      ref={rootRef}
      className={
        isPreview
          ? 'supplier-network-map-root supplier-network-map-root--preview'
          : 'supplier-network-map-root'
      }
    >
      <Map
        ref={mapRef}
        mapLib={maplibregl}
        mapStyle={cartoDarkMatterStyle}
        initialViewState={viewState}
        maxPitch={60}
        dragRotate={!isPreview}
        touchPitch={!isPreview}
        interactive={!isPreview}
        projection="mercator"
        reuseMaps
        attributionControl={false}
        maplibreLogo={false}
        style={{ width: '100%', height: '100%' }}
      >
        <DeckGLOverlay layers={layers} />
        {!isPreview && (
          <NavigationControl
            position="top-right"
            showZoom
            showCompass
            visualizePitch
          />
        )}
      </Map>

      {/* Status overlay */}
      {status === 'loading' && (
        <div className="map-overlay-status">Loading…</div>
      )}
      {status === 'empty' && (
        <div className="map-overlay-status">
          Geocoding pending — run
          <code
            style={{ margin: '0 4px', fontFamily: 'var(--font-secondary)' }}
          >
            pnpm tsx scripts/geocode-entities.ts
          </code>
        </div>
      )}
      {status === 'error' && (
        <div className="map-overlay-status">Failed to load map data</div>
      )}

      {/* Legend */}
      {status === 'live' && !isPreview && (
        <div className="map-legend">
          <div className="map-legend-row">
            <span
              className="map-legend-dot"
              style={{ background: 'rgb(103,232,249)' }}
            />
            <span>{companyCount} brands</span>
          </div>
          <div className="map-legend-row">
            <span
              className="map-legend-dot"
              style={{ background: 'rgb(167,139,250)' }}
            />
            <span>{supplierCount} suppliers</span>
          </div>
          <div className="map-legend-row">
            <span className="map-legend-line" />
            <span>{arcCount} connections</span>
          </div>
        </div>
      )}
    </div>
  )
}
