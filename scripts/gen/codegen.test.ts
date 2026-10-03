import { expect, test } from 'bun:test'
import { listRoutes, plan, planRemovePage, removeNavRoute, removePagesExport, removeRouterRoute, renderNavItem, updateNavs, updateRouter, type NavSpec } from './codegen'
import { readFileSync } from 'node:fs'

const nav: NavSpec = {
  href: '/settings', icon: 'folder', label: 'Settings', value: 'settings', tags: []
}

const evaluateNavs = (source: string) => {
  const js = new Bun.Transpiler({ loader: 'ts' }).transformSync(source)
    .replace(/^import .*$/gm, '').replace(/\bexport /g, '')
  return new Function(`${js}\nreturn navGroups`)()
}

test('adds and removes a page in the actual Vite router while preserving existing routes', () => {
  const source = readFileSync(new URL('../../src/router.ts', import.meta.url), 'utf8')
  const before = listRoutes(source)
  const updated = updateRouter(source, 'Settings', '/settings')
  expect(listRoutes(updated)).toEqual([
    ...before,
    { path: '/settings', routeVar: 'settingsRoute', component: 'Settings' }
  ])
  expect(updated).toMatch(/rootRoute\.addChildren\(\[[\s\S]*settingsRoute/)
  expect(updated).toContain("import('./pages/Settings.btsx')")
  const restored = removeRouterRoute(updated, listRoutes(updated).at(-1)!)
  expect(listRoutes(restored)).toEqual(before)
  expect(restored).not.toContain('settingsRoute')
  expect(restored).toContain('notFoundComponent:')
})

test('plans page creation and removal without changing project files', () => {
  const changes = plan({ group: 'Workspace', newGroup: false, nav, page: { component: 'Settings', createFile: true } })
  expect(changes).toHaveLength(4)
  expect(changes.find((change) => change.path.endsWith('/Settings.btsx'))?.before).toBeNull()
  expect(changes.find((change) => change.path.endsWith('/Settings.btsx'))?.after).toContain('PageHolder(href="/settings")')
  const removal = planRemovePage('/converters')
  expect(removal).toHaveLength(4)
  expect(removal.find((change) => change.path.endsWith('/Converters.btsx'))?.after).toBeNull()
  expect(listRoutes(readFileSync(new URL('../../src/router.ts', import.meta.url), 'utf8')).some((route) => route.path === '/converters')).toBe(true)
})

test('renders the current NavItem shape with optional fields omitted or preserved', () => {
  expect(new Function(`return (${renderNavItem(nav)})`)()).toEqual(nav)
  const full: NavSpec = { ...nav, short: "It's short\nand readable", description: '', disabled: false }
  expect(new Function(`return (${renderNavItem(full)})`)()).toEqual(full)
  expect(new Function(`return (${renderNavItem({ ...nav, disabled: true })})`)().disabled).toBe(true)
})

test('updates a group with a label between its title and items', () => {
  const source = `export const navGroups: NavGroup[] = [
  {
    title: 'Workspace',
    label: 'Work',
    items: []
  }
]`
  const updated = updateNavs(source, { group: 'Workspace', newGroup: false, nav, page: null })
  expect(evaluateNavs(updated)).toEqual([{ title: 'Workspace', label: 'Work', items: [nav] }])
})

test('adds a labeled group to the real navigation source without changing existing groups', () => {
  const source = readFileSync(new URL('../../src/lib/navs.ts', import.meta.url), 'utf8')
  const before = evaluateNavs(source)
  const updated = updateNavs(source, { group: 'Tools', groupLabel: 'Utilities', newGroup: true, nav, page: null })
  expect(evaluateNavs(updated)).toEqual([...before, { title: 'Tools', label: 'Utilities', items: [nav] }])
  const existing = updateNavs(source, { group: 'Workspace', newGroup: false, nav, page: null })
  expect(evaluateNavs(existing)).toEqual(before.map((group: { title: string; items: NavSpec[] }) =>
    group.title === 'Workspace' ? { ...group, items: [...group.items, nav] } : group
  ))
})

test('lists and removes a lazy page route', () => {
  const router = `const rootRoute = createRootRoute({ component: App })
const homeRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: lazyRouteComponent(() => import('./pages/Home.btsx')) })
const deckRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/deck-builder',
  component: lazyRouteComponent(() => import('./pages/DeckBuilder.btsx'))
})
const routeTree = rootRoute.addChildren([homeRoute, deckRoute])
`
  const routes = listRoutes(router)
  expect(routes).toEqual([
    { path: '/', routeVar: 'homeRoute', component: 'Home' },
    { path: '/deck-builder', routeVar: 'deckRoute', component: 'DeckBuilder' }
  ])
  const updated = removeRouterRoute(router, routes[1])
  expect(updated).toContain('rootRoute.addChildren([homeRoute])')
  expect(updated).not.toContain('deckRoute')
  expect(updated).not.toContain('DeckBuilder.btsx')
})

test('removes a nav item and its group when empty', () => {
  const navs = `export const navGroups: NavGroup[] = [
  {
    title: 'Workspace',
    items: [
      { href: '/', label: 'Home' },
      { href: '/deck-builder', label: 'Deck Builder' }
    ]
  },
  {
    title: 'Tools',
    items: [
      { href: '/only', label: 'Only' }
    ]
  }
]
`
  const withoutDeck = removeNavRoute(navs, '/deck-builder')
  expect(withoutDeck).toContain("{ href: '/', label: 'Home' }")
  expect(withoutDeck).not.toContain('/deck-builder')
  expect(withoutDeck).not.toContain("'Home' },")
  const withoutTools = removeNavRoute(withoutDeck, '/only')
  expect(withoutTools).not.toContain("title: 'Tools'")
  expect(withoutTools).toContain("title: 'Workspace'")
})

test('removes the first item without changing the remaining nav entries', () => {
  const navs = `export const navGroups = [
  {
    title: 'Workspace',
    items: [
      { href: '/', label: 'Home' },
      { href: '/documents', label: 'Documents' },
      { href: '/projects', label: 'Projects' }
    ]
  }
]
`
  const updated = removeNavRoute(navs, '/')
  expect(updated).not.toContain("href: '/'")
  expect(updated).toContain("{ href: '/documents', label: 'Documents' },")
  expect(updated).toContain("{ href: '/projects', label: 'Projects' }")
})

test('removes the page import and export', () => {
  const index = `import Home from './Home.btsx'
import DeckBuilder from './DeckBuilder.btsx'
export { Home, DeckBuilder }
`
  expect(removePagesExport(index, 'DeckBuilder')).toBe(`import Home from './Home.btsx'
export { Home }
`)
})

const { planCard, updateCards, supportsCards, renderCardPage } = await import('./codegen')
const { compileBeast } = await import('beast-tsrx')
const card = { id: 'audio', title: "Audio's formats", description: 'Convert\nformats', href: '/converters/audio' }

test('appends and compiles converter cards while preserving the existing card', () => {
  const source = readFileSync(new URL('../../src/pages/Converters.btsx', import.meta.url), 'utf8')
  const updated = updateCards(source, card)
  const array = /const converters = (\[[\s\S]*?\])/.exec(updated)![1]
  const items = new Function(`return (${array})`)()
  expect(items).toHaveLength(2)
  expect(items[0].href).toBe('/converters/image')
  expect(items[1]).toEqual(card)
  expect(() => compileBeast(updated, { filename: 'Converters.btsx' })).not.toThrow()
  expect(() => updateCards(updated, { ...card, href: '/other' })).toThrow('already exists')
  expect(() => updateCards(updated, { ...card, id: 'other' })).toThrow('already exists')
  expect(() => updateCards('module\n  const cards = [{ id: "audio", href: "/other" }]\nHyperList(data={cards})', card)).toThrow('already exists')
})

test('plans cards with a new child page or an existing route without touching sidebar navigation', () => {
  const changes = planCard({ parent: '/converters', card, page: { component: 'AudioConverter', createFile: true } })
  expect(changes).toHaveLength(4)
  expect(changes.some((change) => change.path.endsWith('/navs.ts'))).toBe(false)
  const router = changes.find((change) => change.path.endsWith('/router.ts'))!
  expect(listRoutes(router.after!).at(-1)?.path).toBe(card.href)
  const existing = planCard({ parent: '/converters', card: { ...card, href: '/icons' }, page: null })
  expect(existing).toHaveLength(1)
  expect(() => planCard({ parent: '/converters', card, page: null })).toThrow('existing destination')
  expect(() => planCard({ parent: '/icons', card, page: null })).toThrow('does not support cards')
})

test('generated placeholders become compilable card grids and custom pages are preserved', () => {
  expect(supportsCards('import PageHolder from "@/components/PageHolder.btsx"\n\nprops {}:{}\nPageHolder(href="/gym")\n')).toBe(true)
  expect(supportsCards('import PageHolder from "@/components/PageHolder.btsx"\nmodule\n  const custom = 1\nprops {}:{}\nPageHolder(href="/gym")')).toBe(false)
  const page = updateCards(renderCardPage('Gym'), card)
  expect(() => compileBeast(page, { filename: 'Gym.btsx' })).not.toThrow()
  expect(page).toContain('data={cards}')
  expect(page).toContain('Audio')
})
