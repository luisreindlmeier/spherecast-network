import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'
import type { SupplierNetworkMapProps } from '@/components/network-map/SupplierNetworkMap'

export function createSupplierNetworkMapDynamic(
  loadingClassName: string,
  loadingLabel = 'Loading map…'
): ComponentType<SupplierNetworkMapProps> {
  return dynamic(() => import('@/components/network-map/SupplierNetworkMap'), {
    ssr: false,
    loading: () => <div className={loadingClassName}>{loadingLabel}</div>,
  })
}
