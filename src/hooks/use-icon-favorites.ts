import { useCallback, useEffect, useMemo, useState } from 'octane'
import { favoritesStorageKey, iconKey, parseFavorites, toggleFavorite } from '../lib/icon-favorites'
import type { IconEntry } from '../lib/iconify'

const changedEvent = 'icon-favorites-changed'
function readFavorites() {
  try { return parseFavorites(localStorage.getItem(favoritesStorageKey)) } catch { return [] }
}

export function useIconFavorites() {
  const [favorites, setFavorites] = useState<IconEntry[]>(readFavorites)
  const [error, setError] = useState<string | null>(null)
  const keys = useMemo(() => new Set(favorites.map(iconKey)), [favorites])
  useEffect(() => {
    const refresh = () => setFavorites(readFavorites())
    const onStorage = (event: StorageEvent) => { if (event.key === favoritesStorageKey || event.key === null) refresh() }
    window.addEventListener(changedEvent, refresh)
    window.addEventListener('storage', onStorage)
    refresh()
    return () => { window.removeEventListener(changedEvent, refresh); window.removeEventListener('storage', onStorage) }
  }, [])
  const toggle = useCallback((icon: IconEntry) => {
    try {
      // Read the latest saved list so another tab's additions are preserved.
      const next = toggleFavorite(parseFavorites(localStorage.getItem(favoritesStorageKey)), icon)
      localStorage.setItem(favoritesStorageKey, JSON.stringify(next))
      setFavorites(next)
      setError(null)
      window.dispatchEvent(new Event(changedEvent))
    } catch { setError('Could not save favorites. Check that browser storage is available.') }
  }, [])
  return { favorites, keys, toggle, error }
}
