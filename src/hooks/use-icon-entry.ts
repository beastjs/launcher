import { useEffect, useState } from 'octane'
import { fetchIconEntries } from './use-icon-cache'
import { validIconSetId, type IconEntry } from '../lib/iconify'

export function useIconEntry(iconSetId: string, iconName: string) {
  const [icon, setIcon] = useState<IconEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let cancelled = false
    setIcon(null)
    setError(null)
    setLoading(true)
    const load = async () => {
      try {
        if (!validIconSetId(iconSetId) || !validIconSetId(iconName)) throw new Error('Invalid icon ID.')
        const [entry] = await fetchIconEntries(iconSetId, [iconName])
        if (!entry) throw new Error('Icon not found.')
        if (!cancelled) setIcon(entry)
      } catch (failure) {
        if (!cancelled) setError(failure instanceof Error ? failure.message : 'Could not load icon.')
      } finally { if (!cancelled) setLoading(false) }
    }
    void load()
    return () => { cancelled = true }
  }, [iconSetId, iconName, revision])
  return { icon, loading, error, retry: () => setRevision(value => value + 1) }
}
