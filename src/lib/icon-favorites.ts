import { validIconSetId, type IconEntry } from './iconify'

export const favoritesStorageKey = 'icon-favorites-v1'
export const iconKey = (icon: Pick<IconEntry, 'sourceSetId' | 'name'>) => `${icon.sourceSetId}:${icon.name}`

export function parseFavorites(value: string | null): IconEntry[] {
  try {
    const data: unknown = JSON.parse(value ?? '[]')
    if (!Array.isArray(data)) return []
    const entries = new Map<string, IconEntry>()
    for (const item of data) {
      if (!item || typeof item !== 'object' || typeof item.name !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.name) || typeof item.sourceSetId !== 'string' || !validIconSetId(item.sourceSetId) || typeof item.body !== 'string') continue
      const icon: IconEntry = { name: item.name, sourceSetId: item.sourceSetId, body: item.body, sourceHeight: typeof item.sourceHeight === 'number' && item.sourceHeight > 0 ? item.sourceHeight : 24 }
      for (const key of ['width', 'height', 'left', 'top', 'rotate'] as const) {
        if (typeof item[key] === 'number' && Number.isFinite(item[key]) && (!['width', 'height'].includes(key) || item[key] > 0)) icon[key] = item[key]
      }
      for (const key of ['hFlip', 'vFlip'] as const) if (typeof item[key] === 'boolean') icon[key] = item[key]
      entries.set(iconKey(icon), icon)
    }
    return [...entries.values()]
  } catch { return [] }
}

export function toggleFavorite(entries: IconEntry[], icon: IconEntry): IconEntry[] {
  const key = iconKey(icon)
  return entries.some(entry => iconKey(entry) === key)
    ? entries.filter(entry => iconKey(entry) !== key)
    : [...entries, icon]
}
