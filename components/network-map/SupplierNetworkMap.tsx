'use client'

import { useMemo } from 'react'
import Map, { NavigationControl, useControl } from 'react-map-gl/maplibre'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MapboxOverlay } from '@deck.gl/mapbox'
import { ArcLayer, ScatterplotLayer } from '@deck.gl/layers'
import type { Layer } from '@deck.gl/core'
import { cartoDarkMatterStyle } from '@/components/network-map/carto-dark-matter-style'
import {
  networkMapBundle,
  type NetworkMapArc,
  type NetworkMapNode,
} from '@/lib/network-map-data'

function DeckGLOverlay({ layers }: { layers: Layer[] }) {
  const overlay = useControl<MapboxOverlay>(
    () => new MapboxOverlay({ interleaved: true, layers: [] })
  )
  overlay.setProps({ layers })
  return null
}

const initialViewState = {
  longitude: 12,
  latitude: 50,
  zoom: 2.5,
  pitch: 45,
  bearing: -10,
}

/** Accent colors aligned with `app/globals.css` (cyan / purple / blue). */
const COLOR_CUSTOMER: [number, number, number, number] = [103, 232, 249, 235]
const COLOR_SUPPLIER: [number, number, number, number] = [167, 139, 250, 230]
const COLOR_ARC_SOURCE: [number, number, number, number] = [91, 141, 255, 90]
const COLOR_ARC_TARGET: [number, number, number, number] = [167, 139, 250, 90]

export default function SupplierNetworkMap() {
  const layers = useMemo((): Layer[] => {
    const nodes = networkMapBundle.nodes as NetworkMapNode[]
    const arcs = networkMapBundle.arcs as NetworkMapArc[]

    return [
      new ArcLayer<NetworkMapArc>({
        id: 'network-arcs',
        data: arcs,
        greatCircle: true,
        numSegments: 48,
        getSourcePosition: (d) => d.sourcePosition,
        getTargetPosition: (d) => d.targetPosition,
        getSourceColor: COLOR_ARC_SOURCE,
        getTargetColor: COLOR_ARC_TARGET,
        getWidth: 2.2,
        getHeight: 0.35,
      }),
      new ScatterplotLayer<NetworkMapNode>({
        id: 'network-nodes',
        data: nodes,
        pickable: true,
        radiusUnits: 'pixels',
        radiusMinPixels: 4,
        radiusMaxPixels: 14,
        lineWidthUnits: 'pixels',
        lineWidthMinPixels: 1,
        stroked: true,
        filled: true,
        getPosition: (d) => d.position,
        getRadius: (d) => (d.kind === 'customer' ? 9 : 6.5),
        getFillColor: (d) =>
          d.kind === 'customer' ? COLOR_CUSTOMER : COLOR_SUPPLIER,
        getLineColor: [232, 236, 240, 140],
        getLineWidth: 1,
      }),
    ]
  }, [])

  return (
    <div className="supplier-network-map-root">
      <Map
        mapLib={maplibregl}
        mapStyle={cartoDarkMatterStyle}
        initialViewState={initialViewState}
        maxPitch={60}
        dragRotate
        touchPitch
        reuseMaps
        style={{ width: '100%', height: '100%' }}
      >
        <DeckGLOverlay layers={layers} />
        <NavigationControl
          position="top-right"
          showZoom
          showCompass
          visualizePitch
        />
      </Map>
    </div>
  )
}
