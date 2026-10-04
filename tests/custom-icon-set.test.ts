import { expect, test } from 'bun:test'
import { strFromU8, unzipSync } from 'fflate'
import { iconSetZip, iconSetTypeScript, readCustomIconSet, readCustomIconLists, createCustomIconList, type CustomIconSet } from '../src/lib/custom-icon-set'

const set: CustomIconSet = { name: 'my-icons', icons: [
  { name: 'search', svg: '<svg viewBox="0 0 24 24"><path d="M0 0h24"/></svg>', symbol: '<path d="M0 0h24"/>', viewBox: '0 0 24 24' },
  { name: 'arrow-left', svg: '<svg viewBox="0 0 32 32"><path d="M0 0h32"/></svg>', symbol: '<path d="M0 0h32"/>', viewBox: '0 0 32 32' },
] }

test('ZIP exports a named folder containing the original SVGs', () => {
  const files = unzipSync(iconSetZip(set))
  expect(Object.keys(files)).toEqual(['my-icons/arrow-left.svg', 'my-icons/search.svg'])
  expect(strFromU8(files['my-icons/search.svg'])).toBe(set.icons[0].svg)
  expect(strFromU8(files['my-icons/arrow-left.svg'])).toBe(set.icons[1].svg)
})

test('TypeScript export loads as a registry with exact symbols and independent viewBoxes', async () => {
  const code = iconSetTypeScript(set)
  const exported = await import(`data:text/javascript;base64,${Buffer.from(code.replace(' as const', '').replace(/export type IconName[^\n]+/, '')).toString('base64')}`)
  expect(exported.icons.search).toEqual({ symbol: set.icons[0].symbol, viewBox: '0 0 24 24', set: 'my-icons' })
  expect(exported.icons['arrow-left'].viewBox).toBe('0 0 32 32')
  expect(code).toContain('export type IconName = keyof typeof icons')
})

test('export rejects empty sets, duplicate names and paths outside the set folder', () => {
  for (const exportSet of [iconSetZip, iconSetTypeScript]) {
    expect(() => exportSet({ ...set, icons: [] })).toThrow('Add an icon')
    expect(() => exportSet({ ...set, name: '../outside' })).toThrow('set name')
    expect(() => exportSet({ ...set, icons: [{ ...set.icons[0], name: '../outside' }] })).toThrow('Invalid icon name')
    expect(() => exportSet({ ...set, icons: [set.icons[0], set.icons[0]] })).toThrow('Duplicate')
  }
})

test('stored sets round-trip and recover safely from invalid data', () => {
  expect(readCustomIconSet(JSON.stringify(set))).toEqual(set)
  for (const value of [null, 'invalid JSON', '{}', '{"name":"set","icons":null}']) expect(readCustomIconSet(value).icons).toEqual([])
  expect(readCustomIconSet(JSON.stringify({ ...set, icons: [null, set.icons[0], set.icons[0], { ...set.icons[1], name: '../bad' }] })).icons).toEqual([set.icons[0]])
})

test('single-set drafts migrate with all icons and new lists stay independent', () => {
  const migrated = readCustomIconLists(null, JSON.stringify(set))
  expect(migrated).toEqual({ lists: [set], selected: 'my-icons' })
  const updated = createCustomIconList(migrated, ' ui-icons ')
  expect(updated.selected).toBe('ui-icons')
  expect(updated.lists[0]).toEqual(set)
  expect(updated.lists[1]).toEqual({ name: 'ui-icons', icons: [] })
  expect(readCustomIconLists(JSON.stringify(updated))).toEqual(updated)
  expect(() => createCustomIconList(updated, 'ui-icons')).toThrow('already exists')
  expect(() => createCustomIconList(updated, '../bad')).toThrow('list name')
})

test('list storage repairs invalid selections and ignores duplicate lists', () => {
  const restored = readCustomIconLists(JSON.stringify({ lists: [set, set], selected: 'missing' }))
  expect(restored).toEqual({ lists: [set], selected: set.name })
  expect(readCustomIconLists('broken', JSON.stringify(set)).lists).toEqual([set])
})
