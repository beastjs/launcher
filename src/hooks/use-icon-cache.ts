import { getIconData } from '@iconify/utils/lib/icon-set/get-icon'
import { normalizeCollection, validIconSetId, type IconCollectionResponse, type IconCollections, type IconEntry, type IconifyIconsResponse, type IconSet } from '../lib/iconify'

const API = 'https://api.iconify.design'
const TTL = 5 * 60 * 1000
const MAX_SETS = 64
type CacheEntry<T> = { data: T; timestamp: number }
const metadata = new Map<string, CacheEntry<IconSet>>()
const icons = new Map<string, CacheEntry<Map<string, IconEntry>>>()
const pendingMetadata = new Map<string, Promise<IconSet>>()
const pendingIcons = new Map<string, Promise<IconEntry[]>>()
let collections: CacheEntry<IconCollections> | undefined
let pendingCollections: Promise<IconCollections> | undefined

function cached<T>(cache: Map<string, CacheEntry<T>>, id: string) {
  const entry = cache.get(id)
  if (!entry) return null
  if (Date.now() - entry.timestamp > TTL) { cache.delete(id); return null }
  return entry.data
}
function store<T>(cache: Map<string, CacheEntry<T>>, id: string, data: T) {
  cache.delete(id)
  cache.set(id, { data, timestamp: Date.now() })
  if (cache.size > MAX_SETS) cache.delete(cache.keys().next().value!)
}
async function json<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000) })
  if (!response.ok) throw new Error(response.status === 404 ? 'Icon set or icons not found.' : `Icon service returned ${response.status}. Please try again.`)
  return response.json()
}
export const getCachedMetadata = (id: string) => cached(metadata, id)
export const getCachedIcons = (id: string) => [...(cached(icons, id)?.values() ?? [])]

export async function fetchCollections(): Promise<IconCollections> {
  if (collections && Date.now() - collections.timestamp < TTL) return collections.data
  if (pendingCollections) return pendingCollections
  pendingCollections = json<IconCollections>(`${API}/collections`).then(data => {
    collections = { data, timestamp: Date.now() }
    return data
  }).finally(() => { pendingCollections = undefined })
  return pendingCollections
}
export async function fetchAndCacheMetadata(id: string): Promise<IconSet> {
  if (!validIconSetId(id)) throw new Error('Use an icon set ID such as lucide or svg-spinners.')
  const hit = getCachedMetadata(id)
  if (hit) return hit
  const pending = pendingMetadata.get(id)
  if (pending) return pending
  const request = json<IconCollectionResponse>(`${API}/collection?prefix=${encodeURIComponent(id)}&info=true`)
    .then(normalizeCollection).then(data => { store(metadata, id, data); return data })
    .finally(() => pendingMetadata.delete(id))
  pendingMetadata.set(id, request)
  return request
}

export async function fetchIconEntries(id: string, names: string[]): Promise<IconEntry[]> {
  const meta = await fetchAndCacheMetadata(id)
  const stored = cached(icons, id) ?? new Map<string, IconEntry>()
  const missing = [...new Set(names)].filter(name => !stored.has(name))
  // Small sequential batches keep URLs below the API limit and avoid request bursts.
  for (let start = 0; start < missing.length; start += 64) {
    const batch = missing.slice(start, start + 64)
    const key = `${id}:${batch.join(',')}`
    let request = pendingIcons.get(key)
    if (!request) {
      request = json<IconifyIconsResponse>(`${API}/${id}.json?icons=${encodeURIComponent(batch.join(','))}`)
        .then(data => batch.map(name => {
          const icon = getIconData(data, name)
          if (!icon) throw new Error(`Icon data is missing for ${id}:${name}. Please retry.`)
          return { ...icon, name, sourceSetId: id, sourceHeight: meta.height }
        })).finally(() => pendingIcons.delete(key))
      pendingIcons.set(key, request)
    }
    const entries = await request
    const current = cached(icons, id) ?? stored
    for (const entry of entries) { current.set(entry.name, entry); stored.set(entry.name, entry) }
    store(icons, id, current)
  }
  return names.map(name => stored.get(name)!).filter(Boolean)
}
export async function prefetchIconSet(id: string, length = 120) {
  const meta = await fetchAndCacheMetadata(id)
  await fetchIconEntries(id, meta.icons.slice(0, length))
}
export function clearIconCache() { metadata.clear(); icons.clear(); collections = undefined }
