'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useCompanyScope } from '@/lib/company-scope-context'

const SupplierNetworkMap = dynamic(
  () => import('@/components/network-map/SupplierNetworkMap'),
  {
    ssr: false,
    loading: () => (
      <div className="cockpit-preview-map-loading">Loading map…</div>
    ),
  }
)

const IngredientSimilarityPlot = dynamic(
  () => import('@/components/similarity-map/IngredientSimilarityPlot'),
  {
    ssr: false,
    loading: () => (
      <div className="cockpit-preview-map-loading cockpit-preview-map-loading--plot">
        Loading 3D map…
      </div>
    ),
  }
)

export default function CockpitPreviewMaps() {
  const { companyId } = useCompanyScope()

  return (
    <div className="cockpit-preview-maps">
      <Link
        href="/network-map"
        className="cockpit-preview-map-link"
        aria-label="Open full network map"
      >
        <div className="cockpit-preview-map-frame">
          <SupplierNetworkMap
            key={companyId ?? 'all'}
            companyId={companyId}
            variant="preview"
          />
        </div>
        <span className="cockpit-mini-map-hit" aria-hidden />
        <div className="cockpit-mini-map-overlay cockpit-mini-map-overlay--dual">
          <span className="cockpit-preview-map-in-title">Network map</span>
          <span className="cockpit-mini-map-cta">Open full network map →</span>
        </div>
      </Link>
      <Link
        href="/similarity-map"
        className="cockpit-preview-map-link"
        aria-label="Open full similarity map"
      >
        <div className="cockpit-preview-map-frame cockpit-preview-map-frame--similarity">
          <IngredientSimilarityPlot key={companyId ?? 'all'} />
        </div>
        <span className="cockpit-mini-map-hit" aria-hidden />
        <div className="cockpit-mini-map-overlay cockpit-mini-map-overlay--dual">
          <span className="cockpit-preview-map-in-title">Similarity map</span>
          <span className="cockpit-mini-map-cta">Open similarity map →</span>
        </div>
      </Link>
    </div>
  )
}
