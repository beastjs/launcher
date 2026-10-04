import { useCallback, useEffect, useState } from 'octane'
import { customIconListsStorageKey, customIconSetStorageKey, readCustomIconLists, type CustomIconLists } from '../lib/custom-icon-set'

const changedEvent = 'custom-icon-lists-changed'
function readLists() {
  return readCustomIconLists(localStorage.getItem(customIconListsStorageKey), localStorage.getItem(customIconSetStorageKey))
}

export function useCustomIconLists() {
  const [iconLists, setLists] = useState(() => {
    try { return readLists() } catch { return readCustomIconLists(null) }
  })
  const [storageError, setStorageError] = useState<string | null>(null)
  useEffect(() => {
    const refresh = () => { try { setLists(readLists()) } catch {} }
    const onStorage = (event: StorageEvent) => {
      if (event.key === customIconListsStorageKey || event.key === customIconSetStorageKey || event.key === null) refresh()
    }
    window.addEventListener(changedEvent, refresh)
    window.addEventListener('storage', onStorage)
    return () => { window.removeEventListener(changedEvent, refresh); window.removeEventListener('storage', onStorage) }
  }, [])
  const setIconLists = useCallback((update: CustomIconLists | ((current: CustomIconLists) => CustomIconLists)) => {
    // Read at save time so another picker or tab's changes are preserved.
    const current = readLists()
    const next = typeof update === 'function' ? update(current) : update
    try { localStorage.setItem(customIconListsStorageKey, JSON.stringify(next)) }
    catch { setStorageError('Could not save icon lists in this browser.'); throw new Error('Could not save icon lists in this browser.') }
    setLists(next)
    setStorageError(null)
    window.dispatchEvent(new Event(changedEvent))
  }, [])
  return { iconLists, setIconLists, storageError }
}
