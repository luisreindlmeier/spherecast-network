'use client'

import { useEffect, useRef } from 'react'
import { suppliers, customers } from '@/lib/mock-data'

export default function SupplierMap() {
  const mapRef = useRef<HTMLDivElement>(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!mapRef.current || initializedRef.current) return
    initializedRef.current = true

    Promise.all([
      import('leaflet'),
      import('leaflet/dist/leaflet.css' as never) as Promise<unknown>,
    ]).then(([L]) => {
      if (!mapRef.current) return

      const map = L.map(mapRef.current, {
        center: [30, 10],
        zoom: 2,
        zoomControl: true,
        attributionControl: false,
      })

      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        {
          attribution: '© OpenStreetMap contributors © CARTO',
          subdomains: 'abcd',
          maxZoom: 19,
        }
      ).addTo(map)

      // Supplier markers
      suppliers.forEach((s) => {
        const marker = L.circleMarker([s.lat, s.lng], {
          radius: 7,
          fillColor: '#3b82f6',
          color: 'rgba(59,130,246,0.4)',
          weight: 6,
          opacity: 1,
          fillOpacity: 0.9,
        }).addTo(map)

        marker.bindTooltip(
          `<div style="background:#1c2030;border:0.5px solid rgba(255,255,255,0.13);border-radius:6px;padding:8px 10px;font-family:Inter,sans-serif;font-size:12px;color:#e8eaf0;min-width:160px">
            <div style="font-weight:600;margin-bottom:4px">${s.name}</div>
            <div style="color:#8b90a0;font-size:11px">${s.country} · ${s.products} products</div>
            <div style="color:#8b90a0;font-size:11px;margin-top:2px">${s.categories.slice(0, 2).join(', ')}</div>
          </div>`,
          { className: 'agnes-tooltip', sticky: false }
        )
      })

      // Customer markers
      customers.forEach((c) => {
        const marker = L.circleMarker([c.lat, c.lng], {
          radius: 7,
          fillColor: '#22c55e',
          color: 'rgba(34,197,94,0.4)',
          weight: 6,
          opacity: 1,
          fillOpacity: 0.9,
        }).addTo(map)

        marker.bindTooltip(
          `<div style="background:#1c2030;border:0.5px solid rgba(255,255,255,0.13);border-radius:6px;padding:8px 10px;font-family:Inter,sans-serif;font-size:12px;color:#e8eaf0;min-width:160px">
            <div style="font-weight:600;margin-bottom:4px">${c.name}</div>
            <div style="color:#8b90a0;font-size:11px">${c.materials} materials · ${c.activeContracts} contracts</div>
          </div>`,
          { className: 'agnes-tooltip', sticky: false }
        )
      })

      // Connection lines (first 3 supplier–customer pairs)
      suppliers.slice(0, 5).forEach((s) => {
        customers.slice(0, 3).forEach((c) => {
          L.polyline(
            [
              [s.lat, s.lng],
              [c.lat, c.lng],
            ],
            {
              color: 'rgba(59,130,246,0.18)',
              weight: 1,
            }
          ).addTo(map)
        })
      })
    })
  }, [])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        ref={mapRef}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      />
    </div>
  )
}
