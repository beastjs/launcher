import { expect, test } from 'bun:test'
import { iconKey, parseFavorites, toggleFavorite } from '../src/lib/icon-favorites'
import type { IconEntry } from '../src/lib/iconify'

const icon: IconEntry = { name: 'star', sourceSetId: 'proicons', sourceHeight: 24, body: '<path d="M0 0L1 1"/>', width: 16, height: 24, rotate: 1, hFlip: true }

test('favorites distinguish matching names from different collections and toggle independently', () => {
  const other = { ...icon, sourceSetId: 'lucide' }
  const entries = toggleFavorite(toggleFavorite([], icon), other)
  expect(entries.map(iconKey)).toEqual(['proicons:star', 'lucide:star'])
  expect(toggleFavorite(entries, icon)).toEqual([other])
  expect(entries).toHaveLength(2)
})

test('favorites survive a storage round trip with alias transforms and dimensions', () => {
  expect(parseFavorites(JSON.stringify([icon]))).toEqual([icon])
})

test('invalid or obsolete storage cannot break the favorites page', () => {
  for (const data of [null, '', '{', '{}', 'null']) expect(parseFavorites(data)).toEqual([])
  expect(parseFavorites(JSON.stringify([null, {}, { ...icon, sourceSetId: '../bad' }, { ...icon, name: 'bad:name' }, { ...icon, body: 3 }, icon, icon]))).toEqual([icon])
  const sanitized = parseFavorites(JSON.stringify([{ ...icon, width: -1, height: '24', sourceHeight: -2, hFlip: 'yes' }]))[0]
  expect(sanitized.width).toBeUndefined()
  expect(sanitized.height).toBeUndefined()
  expect(sanitized.sourceHeight).toBe(24)
  expect(sanitized.hFlip).toBeUndefined()
})
