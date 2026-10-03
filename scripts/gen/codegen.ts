import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type { NavGroup, NavItem } from '../../src/lib/navs'

export const root = resolve(import.meta.dirname, '../..')
export const paths = {
  navs: join(root, 'src/lib/navs.ts'),
  router: join(root, 'src/router.ts'),
  pagesIndex: join(root, 'src/pages/index.ts'),
  page: (name: string) => join(root, `src/pages/${name}.btsx`)
}

export type NavSpec = NavItem

export type GenSpec = {
  group: string
  newGroup: boolean
  groupLabel?: NavGroup['label']
  nav: NavSpec
  /** null for external links: no page or route is generated */
  page: { component: string; createFile: boolean } | null
}

export type FileChange = { path: string; before: string | null; after: string | null }
export type RouteInfo = { path: string; routeVar: string; component: string | null }

// ── naming helpers ──────────────────────────────────────────────────────────

const words = (s: string) =>
  s
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
export const toPascal = (s: string) =>
  words(s)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join('')
export const toCamel = (s: string) => {
  const p = toPascal(s)
  return p && p[0].toLowerCase() + p.slice(1)
}
export const toKebab = (s: string) =>
  words(s)
    .map((w) => w.toLowerCase())
    .join('-')
export const isExternal = (href: string) => /^[a-z][a-z0-9+.-]*:/i.test(href)

// ── source helpers ──────────────────────────────────────────────────────────

const q = (s: string) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r/g, '\\r').replace(/\n/g, '\\n')}'`
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Index of the bracket that closes the one at `open`, skipping string literals. */
function matchBracket(src: string, open: number): number {
  const pairs: Record<string, string> = { '[': ']', '{': '}', '(': ')' }
  const stack: string[] = []
  for (let i = open; i < src.length; i++) {
    const ch = src[i]
    if (ch === "'" || ch === '"' || ch === '`') {
      for (i++; i < src.length && src[i] !== ch; i++) if (src[i] === '\\') i++
      continue
    }
    if (pairs[ch]) stack.push(pairs[ch])
    else if (ch === stack[stack.length - 1]) {
      stack.pop()
      if (!stack.length) return i
    }
  }
  throw new Error(`Unbalanced bracket at offset ${open}`)
}

/** Insert `entry` as the last element of the array literal whose `[` is at `open`. */
function appendToArray(src: string, open: number, entry: string, indent: string): string {
  const close = matchBracket(src, open)
  const inner = src.slice(open + 1, close)
  const closingIndent = indent.slice(2)
  if (!inner.trim()) return `${src.slice(0, open + 1)}\n${indent}${entry}\n${closingIndent}${src.slice(close)}`
  const lastEnd = open + 1 + inner.trimEnd().replace(/,$/, '').length
  return `${src.slice(0, lastEnd)},\n${indent}${entry}${src.slice(lastEnd, close).replace(/^,/, '')}${src.slice(close)}`
}

function indentBlock(block: string, indent: string) {
  return block
    .split('\n')
    .map((line, i) => (i === 0 ? line : indent + line))
    .join('\n')
}

function arrayObjects(src: string, open: number): { start: number; end: number }[] {
  const close = matchBracket(src, open)
  const objects: { start: number; end: number }[] = []
  for (let i = open + 1; i < close; i++) {
    if (/\s|,/.test(src[i])) continue
    if (src[i] !== '{') throw new Error(`Expected object in array at offset ${i}`)
    const end = matchBracket(src, i)
    objects.push({ start: i, end })
    i = end
  }
  return objects
}

function removeArrayObject(src: string, objects: { start: number; end: number }[], index: number): string {
  const entry = objects[index]
  if (!entry) throw new Error('Array entry not found')
  if (index < objects.length - 1) {
    const start = src.lastIndexOf('\n', entry.start) + 1
    const end = src.lastIndexOf('\n', objects[index + 1].start) + 1
    return src.slice(0, start) + src.slice(end)
  }
  if (index > 0) return src.slice(0, objects[index - 1].end + 1) + src.slice(entry.end + 1)
  return src.slice(0, entry.start) + src.slice(entry.end + 1)
}

export function listRoutes(src: string): RouteInfo[] {
  const routes: RouteInfo[] = []
  for (const match of src.matchAll(/^const\s+(\w+)\s*=\s*createRoute\(/gm)) {
    const end = matchBracket(src, match.index + match[0].length - 1)
    const body = src.slice(match.index, end + 1)
    const path = /\bpath:\s*(['"])(.*?)\1/.exec(body)?.[2]
    if (!path) continue
    const component = /\blazyRouteComponent\(\s*\(\)\s*=>\s*import\(\s*['"]\.\/pages\/([A-Za-z][A-Za-z0-9]*)\.btsx['"]\s*\)\s*\)/.exec(body)?.[1] ?? null
    routes.push({ path, routeVar: match[1], component })
  }
  return routes
}

export function removeNavRoute(src: string, path: string): string {
  const declaration = /export const navGroups\s*(?::[^=]+)?=\s*\[/.exec(src)
  if (!declaration) throw new Error('Could not find `navGroups` in navs.ts')
  const groups = arrayObjects(src, declaration.index + declaration[0].length - 1)
  for (const [groupIndex, group] of groups.entries()) {
    const itemsMatch = /\bitems:\s*\[/.exec(src.slice(group.start, group.end + 1))
    if (!itemsMatch) continue
    const itemsOpen = group.start + itemsMatch.index + itemsMatch[0].length - 1
    const items = arrayObjects(src, itemsOpen)
    const itemIndex = items.findIndex(({ start, end }) => {
      const href = /\bhref:\s*(['"])(.*?)\1/.exec(src.slice(start, end + 1))?.[2]
      return href === path
    })
    if (itemIndex < 0) continue
    return items.length === 1
      ? removeArrayObject(src, groups, groupIndex)
      : removeArrayObject(src, items, itemIndex)
  }
  throw new Error(`Could not find nav item for "${path}" in navs.ts`)
}

export function removeRouterRoute(src: string, route: RouteInfo): string {
  const declaration = new RegExp(`^const\\s+${escapeRe(route.routeVar)}\\s*=\\s*createRoute\\(`, 'm').exec(src)
  if (!declaration) throw new Error(`Could not find ${route.routeVar} in router.ts`)
  const end = matchBracket(src, declaration.index + declaration[0].length - 1)
  const lineEnd = src.indexOf('\n', end)
  src = src.slice(0, declaration.index) + src.slice(lineEnd < 0 ? end + 1 : lineEnd + 1)

  const children = /rootRoute\.addChildren\(\s*\[/.exec(src)
  if (!children) throw new Error('Could not find `rootRoute.addChildren([...])` in router.ts')
  const open = children.index + children[0].length - 1
  const close = matchBracket(src, open)
  const vars = src.slice(open + 1, close).split(',').map((name) => name.trim()).filter(Boolean)
  if (!vars.includes(route.routeVar)) throw new Error(`${route.routeVar} is not registered in router.ts`)
  return src.slice(0, open + 1) + vars.filter((name) => name !== route.routeVar).join(', ') + src.slice(close)
}

export function removePagesExport(src: string, component: string): string {
  const importLine = new RegExp(`^import\\s+${escapeRe(component)}\\s+from\\s+['"]\\./${escapeRe(component)}\\.btsx['"]\\s*\\n?`, 'm')
  src = src.replace(importLine, '')
  const exp = /export\s*\{([^}]*)\}/.exec(src)
  if (!exp) return src
  const names = exp[1].split(',').map((name) => name.trim()).filter(Boolean)
  if (!names.includes(component)) return src
  const remaining = names.filter((name) => name !== component)
  return remaining.length
    ? src.replace(exp[0], `export { ${remaining.join(', ')} }`)
    : src.replace(exp[0], '').trimEnd() + '\n'
}

// ── generators ──────────────────────────────────────────────────────────────

export function renderNavItem(nav: NavSpec): string {
  return [
    '{',
    `  href: ${q(nav.href)},`,
    `  icon: ${q(nav.icon)},`,
    `  label: ${q(nav.label)},`,
    ...(nav.short !== undefined ? [`  short: ${q(nav.short)},`] : []),
    ...(nav.description !== undefined ? [`  description: ${q(nav.description)},`] : []),
    ...(nav.disabled !== undefined ? [`  disabled: ${nav.disabled},`] : []),
    `  value: ${q(nav.value)},`,
    `  tags: [${nav.tags.map(q).join(', ')}]`,
    '}'
  ].join('\n')
}

export function updateNavs(src: string, spec: GenSpec): string {
  const item = renderNavItem(spec.nav)
  const declaration = src.match(/export const navGroups\s*(?::[^=]+)?=\s*\[/)
  if (!declaration || declaration.index === undefined) throw new Error('Could not find `navGroups` in navs.ts')

  if (spec.newGroup) {
    const groupLabel = spec.groupLabel !== undefined ? `\n  label: ${q(spec.groupLabel)},` : ''
    const group = `{\n  title: ${q(spec.group)},${groupLabel}\n  items: [\n    ${indentBlock(item, '    ')}\n  ]\n}`
    return appendToArray(src, declaration.index + declaration[0].length - 1, indentBlock(group, '  '), '  ')
  }

  const groups = arrayObjects(src, declaration.index + declaration[0].length - 1)
  const title = new RegExp(`\\btitle:\\s*(['"])${escapeRe(spec.group)}\\1`)
  for (const group of groups) {
    const body = src.slice(group.start, group.end + 1)
    if (!title.test(body)) continue
    const items = /\bitems:\s*\[/.exec(body)
    if (!items) throw new Error(`Could not find items in nav group "${spec.group}"`)
    return appendToArray(src, group.start + items.index + items[0].length - 1, indentBlock(item, '      '), '      ')
  }
  throw new Error(`Could not find nav group "${spec.group}" in navs.ts`)
}

export function updateRouter(src: string, component: string, path: string): string {
  const routeVar = `${toCamel(component)}Route`
  if (new RegExp(`\\bconst ${routeVar}\\b`).test(src))
    throw new Error(`Route \`${routeVar}\` already exists in router.ts`)

  // Keep generated pages lazy, like the existing routes in router.ts.
  if (!/\blazyRouteComponent\b/.test(src))
    throw new Error('Could not find `lazyRouteComponent` in router.ts')

  // 1. declare the route after the last createRoute(...)
  const routeLine = `const ${routeVar} = createRoute({ getParentRoute: () => rootRoute, path: ${q(path)}, component: lazyRouteComponent(() => import('./pages/${component}.btsx')) })`
  const decls = [...src.matchAll(/^const \w+ = createRoute\(/gm)]
  const last = decls[decls.length - 1]
  if (!last || last.index === undefined) throw new Error('Could not find any `createRoute(...)` in router.ts')
  const lastEnd = matchBracket(src, last.index + last[0].length - 1)
  const lineEnd = src.indexOf('\n', lastEnd)
  src = `${src.slice(0, lineEnd)}\n${routeLine}${src.slice(lineEnd)}`

  // 2. register it in the route tree
  const children = /rootRoute\.addChildren\(\s*\[/.exec(src)
  if (!children) throw new Error('Could not find `rootRoute.addChildren([...])` in router.ts')
  const open = children.index + children[0].length - 1
  const close = matchBracket(src, open)
  const list = src
    .slice(open + 1, close)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  list.push(routeVar)
  return `${src.slice(0, open + 1)}${list.join(', ')}${src.slice(close)}`
}

export function updatePagesIndex(src: string, component: string): string {
  const importLine = `import ${component} from './${component}.btsx'`
  if (!src.includes(importLine)) {
    const imports = [...src.matchAll(/^import .*$/gm)]
    const last = imports[imports.length - 1]
    const at = last?.index !== undefined ? last.index + last[0].length : 0
    src = `${src.slice(0, at)}${at ? '\n' : ''}${importLine}${at ? '' : '\n'}${src.slice(at)}`
  }
  const exp = /export\s*\{([^}]*)\}/.exec(src)
  if (!exp) return `${src.trimEnd()}\nexport { ${component} }\n`
  const names = exp[1]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (!names.includes(component)) names.push(component)
  return src.replace(exp[0], `export { ${names.join(', ')} }`)
}

export function renderPage(href: string): string {
  return `import PageHolder from "@/components/PageHolder.btsx"\n\nprops {}:{}\nPageHolder(href=${JSON.stringify(href)})\n`
}

// ── plan / apply ────────────────────────────────────────────────────────────

const read = (path: string) => (existsSync(path) ? readFileSync(path, 'utf8') : null)

export function plan(spec: GenSpec): FileChange[] {
  const changes: FileChange[] = []
  const edit = (path: string, fn: (src: string) => string) => {
    const before = read(path)
    if (before === null) throw new Error(`Missing file: ${path}`)
    changes.push({ path, before, after: fn(before) })
  }

  edit(paths.navs, (src) => updateNavs(src, spec))

  if (spec.page) {
    const { component, createFile } = spec.page
    if (createFile) {
      const file = paths.page(component)
      if (existsSync(file)) throw new Error(`Page already exists: ${file}`)
      changes.push({ path: file, before: null, after: renderPage(spec.nav.href) })
    }
    edit(paths.pagesIndex, (src) => updatePagesIndex(src, component))
    edit(paths.router, (src) => updateRouter(src, component, spec.nav.href))
  }
  return changes
}

export function planRemovePage(path: string): FileChange[] {
  const routerBefore = read(paths.router)
  if (routerBefore === null) throw new Error(`Missing file: ${paths.router}`)
  const route = listRoutes(routerBefore).find((entry) => entry.path === path)
  if (!route) throw new Error(`Route "${path}" was not found in router.ts`)
  if (!route.component) throw new Error(`Route "${path}" does not use a supported page component`)
  if (listRoutes(routerBefore).some((entry) => entry.path !== path && entry.component === route.component))
    throw new Error(`${route.component}.btsx is used by another route`)

  const navBefore = read(paths.navs)
  const indexBefore = read(paths.pagesIndex)
  const pagePath = paths.page(route.component)
  const pageBefore = read(pagePath)
  if (navBefore === null || indexBefore === null || pageBefore === null)
    throw new Error(`Missing nav, pages index, or page file for "${path}"`)

  const navAfter = removeNavRoute(navBefore, path)
  const indexAfter = removePagesExport(indexBefore, route.component)
  const routerAfter = removeRouterRoute(routerBefore, route)
  const changes: FileChange[] = [
    { path: paths.navs, before: navBefore, after: navAfter },
    { path: paths.router, before: routerBefore, after: routerAfter },
    { path: pagePath, before: pageBefore, after: null }
  ]
  if (indexAfter !== indexBefore)
    changes.splice(2, 0, { path: paths.pagesIndex, before: indexBefore, after: indexAfter })
  return changes
}

export function apply(changes: FileChange[]) {
  for (const { path, before } of changes) {
    if (read(path) !== before) throw new Error(`File changed since preview: ${path}`)
  }
  for (const { path, after } of changes) {
    if (after === null) unlinkSync(path)
    else writeFileSync(path, after)
  }
}
