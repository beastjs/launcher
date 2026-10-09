import { createContext, use, useMemo, useState } from 'octane'
import { useNavigate } from '@octanejs/tanstack-router'
import { useSvgOptimizer } from './use-svg-optimizer'
import { useBlobUrl } from './use-blob-url'
import { useCopy } from './use-copy'
import { useIconFavorites } from './use-icon-favorites'
import { useCustomIconLists } from './use-custom-icon-lists'
import { defaultSvgOptions } from '../lib/svg-optimizer'
import { svgSymbol } from '../lib/svg-symbol'
import { iconKey } from '../lib/icon-favorites'
import { favoriteListName, prepareFavoriteIcons } from '../lib/favorite-icon-import'
import { createCustomIconList, validCustomIconName, iconSetZip, iconSetTypeScript, type CustomIcon, type CustomIconSet } from '../lib/custom-icon-set'

export function useIconWorkspaceState() {
  const [source, setSource] = useState('')
  const [options, setOptions] = useState({ ...defaultSvgOptions, currentColor: true, viewBoxSize: 24 })
  const [autoOptimize, setAutoOptimize] = useState(true)
  const [manualRequest, setManualRequest] = useState<{ source: string; options: typeof options } | null>(null)
  const requestMatches = manualRequest?.source === source && JSON.stringify(manualRequest?.options) === JSON.stringify(options)
  const optimizerSource = autoOptimize || requestMatches ? source : ''
  const { result, error, working, retry } = useSvgOptimizer(optimizerSource.trim() ? optimizerSource : '', options)
  const optimize = () => { setManualRequest({ source, options: { ...options } }); retry() }
  const sourceBlob = useMemo(() => source.trim() ? new Blob([source], { type: 'image/svg+xml' }) : null, [source])
  const resultBlob = useMemo(() => result ? new Blob([result.svg], { type: 'image/svg+xml' }) : null, [result])
  const sourceUrl = useBlobUrl(sourceBlob)
  const resultUrl = useBlobUrl(resultBlob)
  const { copy, copiedName, error: copyError } = useCopy()
  const [pasteError, setPasteError] = useState<string | null>(null)
  const [pasting, setPasting] = useState(false)
  const paste = async () => {
    setPasting(true)
    setPasteError(null)
    try {
      if (!navigator.clipboard?.readText) throw new Error('Clipboard is unavailable. Paste directly into the source field.')
      const text = await navigator.clipboard.readText()
      if (!text.trim()) throw new Error('The clipboard is empty. Copy an SVG first.')
      setSource(text)
    } catch { setPasteError('Could not paste from the clipboard. Paste directly into the source field.') }
    finally { setPasting(false) }
  }
  const symbolData = useMemo(() => result ? svgSymbol(result.svg) : null, [result])
  const { iconLists, setIconLists, storageError } = useCustomIconLists()
  const navigate = useNavigate()
  const iconSet = iconLists.lists.find(list => list.name === iconLists.selected) ?? iconLists.lists[0]
  const setIconSet = (update: (current: CustomIconSet) => CustomIconSet) => {
    setIconLists(current => ({ ...current, lists: current.lists.map(list => list.name === current.selected ? update(list) : list) }))
  }
  const [newListName, setNewListName] = useState('')
  const [iconName, setIconName] = useState('')
  const [editingName, setEditingName] = useState<string | null>(null)
  const [setError, setSetError] = useState<string | null>(null)
  const [setMessage, setSetMessage] = useState<string | null>(null)
  const { favorites } = useIconFavorites()
  const [favoriteQuery, setFavoriteQuery] = useState('')
  const [selectedFavorites, setSelectedFavorites] = useState<string[]>([])
  const [importingFavorites, setImportingFavorites] = useState(false)
  const visibleFavorites = favorites.filter(icon => iconKey(icon).includes(favoriteQuery.trim().toLowerCase()))
  const pickedFavorites = favorites.filter(icon => selectedFavorites.includes(iconKey(icon)))
  const togglePickedFavorite = (key: string) => setSelectedFavorites(current => current.includes(key) ? current.filter(item => item !== key) : [...current, key])
  const addFavorites = async () => {
    const target = iconSet.name
    const pending = pickedFavorites.filter(icon => !iconSet.icons.some(item => item.name === favoriteListName(icon)))
    setImportingFavorites(true)
    setSetError(null)
    setSetMessage(null)
    try {
      const prepared = await prepareFavoriteIcons(pending, autoOptimize ? { ...options } : undefined)
      setIconLists(current => ({ ...current, lists: current.lists.map(list => list.name === target ? { ...list, icons: [...list.icons, ...prepared.filter(icon => !list.icons.some(item => item.name === icon.name))] } : list) }))
      setSelectedFavorites([])
      setSetMessage(`${prepared.length} ${prepared.length === 1 ? 'favorite' : 'favorites'} added to ${target}.${pickedFavorites.length > pending.length ? ' Favorites already in this list were skipped.' : ''}`)
    } catch (failure) { setSetError(failure instanceof Error ? failure.message : 'Could not add favorites.') }
    finally { setImportingFavorites(false) }
  }
  const selectList = (name: string) => {
    try {
      setIconLists(current => ({ ...current, selected: name }))
      setEditingName(null)
      setSetError(null)
      setSetMessage(null)
    } catch (failure) { setSetError(failure instanceof Error ? failure.message : 'Could not select list.') }
  }
  const createList = () => {
    setSetError(null)
    try {
      const name = newListName.trim()
      setIconLists(current => createCustomIconList(current, name))
      setNewListName('')
      setEditingName(null)
      setSetMessage(`${name} created. Add an SVG from the Optimizer tab or import favorites below.`)
    } catch (failure) { setSetError(failure instanceof Error ? failure.message : 'Could not create list.') }
  }
  const saveIcon = () => {
    if (!result || working || !symbolData) return
    const name = iconName.trim()
    setSetError(null)
    setSetMessage(null)
    if (!validCustomIconName(name)) { setSetError('Use lowercase letters, numbers, and dashes for the icon name.'); return }
    const icon: CustomIcon = { name, svg: result.svg, ...symbolData, ...(editingName ? { addedAt: iconSet.icons.find(item => item.name === editingName)?.addedAt ?? 0 } : {}) }
    try {
      setIconSet(current => {
        if (current.icons.some(item => item.name === name && item.name !== editingName)) throw new Error('This icon name is already in the set. Choose another name or edit that icon.')
        return { ...current, icons: [...current.icons.filter(item => item.name !== editingName), icon] }
      })
      setIconName('')
      setEditingName(null)
      setSetMessage(`${name} saved to ${iconSet.name}.`)
    } catch (failure) { setSetError(failure instanceof Error ? failure.message : 'Could not save icon.') }
  }
  const editIcon = (icon: CustomIcon) => {
    setSource(icon.svg)
    const size = Number(icon.viewBox.trim().split(/\s+/)[2])
    setOptions(current => ({ ...current, viewBoxSize: Number.isFinite(size) && size > 0 ? size : 24, currentColor: icon.svg.includes('currentColor') }))
    setIconName(icon.name)
    setEditingName(icon.name)
    setSetError(null)
    setSetMessage(null)
    void navigate({ to: '/icons/optimizer' })
  }
  const removeIcon = (name: string) => {
    setSetError(null)
    try {
      setIconSet(current => ({ ...current, icons: current.icons.filter(icon => icon.name !== name) }))
      if (editingName === name) { setEditingName(null); setIconName('') }
      setSetMessage(`${name} removed from your set.`)
    } catch (failure) { setSetError(failure instanceof Error ? failure.message : 'Could not remove icon.') }
  }
  const exportSet = (format: 'svg' | 'ts') => {
    setSetError(null)
    try {
      const set = { ...iconSet, name: iconSet.name.trim() }
      const blob = format === 'svg' ? new Blob([iconSetZip(set).slice().buffer], { type: 'application/zip' }) : new Blob([iconSetTypeScript(set)], { type: 'text/typescript;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${set.name}.${format === 'svg' ? 'zip' : 'ts'}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (failure) { setSetError(failure instanceof Error ? failure.message : 'Could not export this icon set.') }
  }

  return {
    source, setSource, options, setOptions, autoOptimize, setAutoOptimize, setManualRequest, result, error, working, optimize, sourceUrl, resultUrl, copy, copiedName, copyError, pasteError, setPasteError, pasting, paste, iconLists, selectList, newListName, setNewListName, setSetError, createList, iconName, setIconName, editingName, saveIcon, setEditingName, favorites, favoriteQuery, setFavoriteQuery, visibleFavorites, selectedFavorites, importingFavorites, togglePickedFavorite, pickedFavorites, addFavorites, setError, storageError, setMessage, iconSet, editIcon, removeIcon, exportSet
  }
}

export const IconWorkspaceContext = createContext<ReturnType<typeof useIconWorkspaceState> | null>(null)

export function useIconWorkspace() {
  const workspace = use(IconWorkspaceContext)
  if (!workspace) throw new Error('useIconWorkspace must be used within IconsLayout.')
  return workspace
}
