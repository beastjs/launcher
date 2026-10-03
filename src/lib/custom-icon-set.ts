import { strToU8, zipSync } from 'fflate'

export interface CustomIcon { name: string; svg: string; symbol: string; viewBox: string }
export interface CustomIconSet { name: string; icons: CustomIcon[] }
export const customIconSetStorageKey = 'custom-icon-set-v1'
export const validCustomIconName = (name: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)

export function readCustomIconSet(value: string | null): CustomIconSet {
  const fallback: CustomIconSet = { name: 'my-icons', icons: [] }
  if (!value) return fallback
  try {
    const parsed: unknown = JSON.parse(value)
    if (!parsed || typeof parsed !== 'object' || !('name' in parsed) || !('icons' in parsed)) return fallback
    if (typeof parsed.name !== 'string' || !Array.isArray(parsed.icons)) return fallback
    const names = new Set<string>()
    const icons = parsed.icons.filter((icon): icon is CustomIcon => {
      if (!icon || typeof icon !== 'object' || typeof icon.name !== 'string' || !validCustomIconName(icon.name) || names.has(icon.name)) return false
      if (typeof icon.svg !== 'string' || typeof icon.symbol !== 'string' || typeof icon.viewBox !== 'string') return false
      names.add(icon.name)
      return true
    })
    return { name: parsed.name, icons }
  } catch { return fallback }
}

function sortedIcons(set: CustomIconSet): CustomIcon[] {
  if (!validCustomIconName(set.name)) throw new Error('Use lowercase letters, numbers, and dashes for the set name.')
  if (!set.icons.length) throw new Error('Add an icon before exporting.')
  const seen = new Set<string>()
  for (const icon of set.icons) {
    if (!validCustomIconName(icon.name)) throw new Error(`Invalid icon name: ${icon.name}`)
    if (seen.has(icon.name)) throw new Error(`Duplicate icon name: ${icon.name}`)
    seen.add(icon.name)
  }
  return [...set.icons].sort((a, b) => a.name.localeCompare(b.name))
}

export function iconSetTypeScript(set: CustomIconSet): string {
  const entries = sortedIcons(set).map(icon => `  ${JSON.stringify(icon.name)}: ${JSON.stringify({ symbol: icon.symbol, viewBox: icon.viewBox, set: set.name })},`)
  return `// Icon set: ${set.name}\nexport const icons = {\n${entries.join('\n')}\n} as const\n\nexport type IconName = keyof typeof icons\n`
}

export function iconSetZip(set: CustomIconSet): Uint8Array {
  return zipSync(Object.fromEntries(sortedIcons(set).map(icon => [`${set.name}/${icon.name}.svg`, strToU8(icon.svg)])))
}
