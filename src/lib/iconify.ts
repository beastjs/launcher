import { iconToSVG } from '@iconify/utils/lib/svg/build'
import type { getIconData } from '@iconify/utils/lib/icon-set/get-icon'

export type IconifyIconsResponse = Parameters<typeof getIconData>[0]
export type IconifyIcon = Parameters<typeof iconToSVG>[0]
export type IconEntry = IconifyIcon & { name: string; sourceSetId: string; sourceHeight: number }
export interface IconSet {
  id: string
  name: string
  total: number
  version?: string
  author?: { name: string; url?: string }
  license?: { title: string; spdx?: string; url?: string }
  samples: string[]
  height: number
  category?: string
  icons: string[]
}
export type IconCollections = Record<string, Partial<Omit<IconSet, 'id' | 'icons'>>>
export interface IconCollectionResponse {
  prefix: string
  total: number
  title?: string
  info?: Partial<Omit<IconSet, 'id' | 'icons'>>
  uncategorized?: string[]
  categories?: Record<string, string[]>
  hidden?: string[]
}
export const validIconSetId = (id: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)
export function normalizeCollection(data: IconCollectionResponse): IconSet {
  if (!data || !validIconSetId(data.prefix) || (!data.uncategorized && !data.categories))
    throw new Error('Invalid icon collection response')
  const hidden = new Set(data.hidden ?? [])
  const icons = [...new Set([...(data.uncategorized ?? []), ...Object.values(data.categories ?? {}).flat()])]
    .filter(name => !hidden.has(name)).sort()
  return { ...data.info, id: data.prefix, name: data.info?.name ?? data.title ?? data.prefix,
    total: icons.length, height: data.info?.height ?? 24, samples: data.info?.samples ?? [], icons }
}
export function getIconSymbolSnippet(icon: IconEntry) {
  const svg = iconToSVG(icon)
  return `${JSON.stringify(icon.name)}: ${JSON.stringify({ symbol: svg.body, viewBox: svg.attributes.viewBox, set: icon.sourceSetId }, null, 2)}`
}
export function getSvgElementSnippet(icon: IconEntry, size = 32) {
  const svg = iconToSVG(icon, { width: size, height: size })
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${svg.attributes.viewBox}" width="${size}" height="${size}" fill="currentColor">${svg.body}</svg>`
}
