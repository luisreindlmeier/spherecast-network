import { z } from 'zod'

export const MAP_SIDEBAR_WIDTH_STORAGE_KEY = 'spherecast-map-sidebar-width'

export const MAP_SIDEBAR_MIN_PX = 280
/** Upper clamp for stored width; effective max also scales with viewport (see clamp). */
export const MAP_SIDEBAR_MAX_PX = 800
export const MAP_SIDEBAR_DEFAULT_PX = 420

const storedWidthSchema = z.coerce
  .number()
  .int()
  .min(MAP_SIDEBAR_MIN_PX)
  .max(MAP_SIDEBAR_MAX_PX)

/** Cap width vs. viewport so the main column keeps enough room. */
export function maxMapSidebarWidthPx(): number {
  if (typeof window === 'undefined') {
    return MAP_SIDEBAR_MAX_PX
  }
  return Math.min(
    MAP_SIDEBAR_MAX_PX,
    Math.max(MAP_SIDEBAR_MIN_PX + 80, Math.floor(window.innerWidth * 0.62))
  )
}

export function clampMapSidebarWidthPx(width: number): number {
  const hi = maxMapSidebarWidthPx()
  return Math.min(hi, Math.max(MAP_SIDEBAR_MIN_PX, Math.round(width)))
}

/** Safe on the server (returns default when `window` is missing). */
export function readMapSidebarWidthPx(): number {
  if (typeof window === 'undefined') {
    return MAP_SIDEBAR_DEFAULT_PX
  }
  const raw = window.localStorage.getItem(MAP_SIDEBAR_WIDTH_STORAGE_KEY)
  if (raw === null) {
    return MAP_SIDEBAR_DEFAULT_PX
  }
  const parsed = storedWidthSchema.safeParse(raw)
  if (!parsed.success) {
    return clampMapSidebarWidthPx(MAP_SIDEBAR_DEFAULT_PX)
  }
  return clampMapSidebarWidthPx(parsed.data)
}

export function writeMapSidebarWidthPx(width: number): void {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem(
    MAP_SIDEBAR_WIDTH_STORAGE_KEY,
    String(clampMapSidebarWidthPx(width))
  )
}
