import { useCallback, useEffect, useRef, useState } from 'octane'
import type { IconEntry, IconSet } from '../lib/iconify'
import { fetchAndCacheMetadata, fetchIconEntries } from './use-icon-cache'
export type { IconEntry } from '../lib/iconify'

interface Options { initialIconCount?: number; query?: string }
export function useIconMeta(iconSetId = 'proicons', options: Options = {}) {
  const initialCount = options.initialIconCount ?? 120
  const query = (options.query ?? '').trim().toLowerCase()
  const [metadata, setMetadata] = useState<IconSet | null>(null)
  const [icons, setIcons] = useState<IconEntry[]>([])
  const [loadingMeta, setLoadingMeta] = useState(true)
  const [loadingIcons, setLoadingIcons] = useState(false)
  const [loadingAll, setLoadingAll] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [limit, setLimit] = useState(initialCount)
  const [revision, setRevision] = useState(0)
  const generation = useRef(0)
  const matchingNames = metadata?.icons.filter(name => name.includes(query)) ?? []
  const hasMore = icons.length < matchingNames.length

  useEffect(() => { setLimit(initialCount) }, [iconSetId, query, initialCount])
  useEffect(() => {
    const token = ++generation.current
    setError(null)
    setLoadingMeta(true)
    setLoadingIcons(true)
    const load = async () => {
      try {
        const meta = await fetchAndCacheMetadata(iconSetId)
        if (token !== generation.current) return
        setMetadata(meta)
        setLoadingMeta(false)
        const names = meta.icons.filter(name => name.includes(query)).slice(0, limit)
        const entries = await fetchIconEntries(iconSetId, names)
        if (token === generation.current) setIcons(entries)
      } catch (failure) {
        if (token === generation.current) setError(failure instanceof Error ? failure.message : 'Could not load icons.')
      } finally {
        if (token === generation.current) { setLoadingMeta(false); setLoadingIcons(false); setLoadingAll(false) }
      }
    }
    void load()
    return () => { generation.current += 1 }
  }, [iconSetId, query, limit, revision])
  // Never show another collection's entries while its metadata is loading.
  useEffect(() => { setMetadata(null); setIcons([]) }, [iconSetId])
  useEffect(() => { setIcons([]) }, [query])
  const loadMore = useCallback(() => { if (!loadingIcons) setLimit(value => value + 120) }, [loadingIcons])
  const loadAll = useCallback(() => {
    if (!loadingIcons && metadata) { setLoadingAll(true); setLimit(metadata.icons.length) }
  }, [loadingIcons, metadata])
  const retry = useCallback(() => setRevision(value => value + 1), [])
  return { metadata, icons, loadingMeta, loadingIcons, loadingAll, error, hasMore, loadMore, loadAll, retry, totalMatches: matchingNames.length }
}
