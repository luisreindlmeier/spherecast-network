import { z } from 'zod'

export const MAP_SIDEBAR_WIDTH_STORAGE_KEY = 'spherecast-map-sidebar-width'

export const MAP_SIDEBAR_MIN_PX = 280
export const MAP_SIDEBAR_MAX_PX = 640
export const MAP_SIDEBAR_DEFAULT_PX = 400

const storedWidthSchema = z.coerce
  .number()
  .int()
  .min(MAP_SIDEBAR_MIN_PX)
  .max(MAP_SIDEBAR_MAX_PX)

export function clampMapSidebarWidthPx(width: number): number {
  return Math.min(
    MAP_SIDEBAR_MAX_PX,
    Math.max(MAP_SIDEBAR_MIN_PX, Math.round(width))
  )
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
  return parsed.success ? parsed.data : MAP_SIDEBAR_DEFAULT_PX
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
