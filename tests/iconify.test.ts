import { afterEach, expect, test } from 'bun:test'
import { getIconData } from '@iconify/utils/lib/icon-set/get-icon'
import { normalizeCollection, getIconSymbolSnippet, getSvgElementSnippet, type IconEntry } from '../src/lib/iconify'
import { clearIconCache, fetchAndCacheMetadata, fetchIconEntries } from '../src/hooks/use-icon-cache'

const originalFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = originalFetch; clearIconCache() })
const collection = { prefix: 'test', total: 4, info: { name: 'Test', height: 16 }, uncategorized: ['a', 'hidden'], categories: { One: ['a', 'b'], Two: ['b', 'c'] }, hidden: ['hidden'] }

test('normalizes collection categories without duplicates or hidden icons', () => {
  expect(normalizeCollection(collection)).toMatchObject({ id: 'test', name: 'Test', icons: ['a', 'b', 'c'], total: 3, height: 16 })
  expect(() => normalizeCollection({ prefix: '../bad', total: 0 })).toThrow()
})
test('SVG and symbol exports preserve bounds, flips, rotations, and quoting', () => {
  const payload = { prefix: 'test', width: 16, height: 24, icons: { a: { body: '<path d="M0 0L1 1"/>' } }, aliases: { b: { parent: 'a', rotate: 1, hFlip: true } } }
  const icon: IconEntry = { ...getIconData(payload, 'b')!, name: 'b', sourceSetId: 'test', sourceHeight: 24 }
  const snippet = getIconSymbolSnippet(icon)
  const parsed = JSON.parse(`{${snippet}}`).b
  expect(parsed.viewBox).toBe('0 0 24 16')
  expect(parsed.symbol).toContain('transform=')
  expect(parsed.symbol).toContain('d="M0 0L1 1"')
  expect(getSvgElementSnippet(icon)).toContain('viewBox="0 0 24 16"')
})
test('deduplicates metadata requests and caches successful results', async () => {
  let calls = 0
  globalThis.fetch = (async () => { calls++; return Response.json(collection) }) as typeof fetch
  const [a, b] = await Promise.all([fetchAndCacheMetadata('test'), fetchAndCacheMetadata('test')])
  expect(a).toBe(b)
  await fetchAndCacheMetadata('test')
  expect(calls).toBe(1)
})
test('failed requests can retry and invalid IDs never hit the network', async () => {
  let calls = 0
  globalThis.fetch = (async () => { calls++; return calls === 1 ? new Response('Not found', { status: 404 }) : Response.json(collection) }) as typeof fetch
  await expect(fetchAndCacheMetadata('test')).rejects.toThrow('not found')
  expect((await fetchAndCacheMetadata('test')).name).toBe('Test')
  await expect(fetchAndCacheMetadata('../bad')).rejects.toThrow('set ID')
  expect(calls).toBe(2)
})
test('fetches icon aliases with inherited dimensions and caches entries', async () => {
  let iconCalls = 0
  globalThis.fetch = (async (url: string | URL | Request) => {
    if (String(url).includes('/collection?')) return Response.json(collection)
    iconCalls++
    return Response.json({ prefix: 'test', width: 16, height: 24, icons: { a: { body: '<path/>' } }, aliases: { b: { parent: 'a', rotate: 1 } } })
  }) as typeof fetch
  const [first, second] = await Promise.all([fetchIconEntries('test', ['a', 'b']), fetchIconEntries('test', ['a', 'b'])])
  expect(first).toEqual(second)
  expect(first[1]).toMatchObject({ name: 'b', width: 16, height: 24, rotate: 1 })
  await fetchIconEntries('test', ['b'])
  expect(iconCalls).toBe(1)
})
