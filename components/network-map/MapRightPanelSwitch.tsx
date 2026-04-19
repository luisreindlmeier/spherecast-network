'use client'

import { Map, Orbit, PanelRightClose } from 'lucide-react'
import {
  useMapSidebar,
  type MapRightPanel,
} from '@/components/network-map/map-sidebar-context'

const OPTIONS: {
  value: MapRightPanel
  label: string
  title: string
  Icon: typeof Map
}[] = [
  {
    value: 'off',
    label: 'Off',
    title: 'Hide right panel',
    Icon: PanelRightClose,
  },
  {
    value: 'network',
    label: 'Network',
    title: 'Supplier network map',
    Icon: Map,
  },
  {
    value: 'similarity',
    label: 'Similarity',
    title: '3D ingredient similarity map',
    Icon: Orbit,
  },
]

/** Segmented control for the global right taskpane (sourcing pages only). */
export default function MapRightPanelSwitch() {
  const { active, panel, setPanel } = useMapSidebar()

  if (!active) {
    return null
  }

  return (
    <div
      className="map-right-panel-switch"
      role="radiogroup"
      aria-label="Right panel"
    >
      {OPTIONS.map(({ value, label, title, Icon }) => {
        const selected = panel === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected ? 'true' : 'false'}
            aria-label={title}
            title={title}
            className={`map-right-panel-switch__btn${selected ? ' map-right-panel-switch__btn--selected' : ''}`}
            onClick={() => {
              setPanel(value)
            }}
          >
            <Icon
              className="map-right-panel-switch__icon"
              size={15}
              strokeWidth={1.75}
              aria-hidden
            />
            <span className="map-right-panel-switch__label" aria-hidden="true">
              {label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
