#!/usr/bin/env bun
/**
 * Interactive codegen: adds a nav item to src/lib/navs.ts and, for internal pages,
 * scaffolds src/pages/<Name>.btsx, exports it, and registers the route in src/router.ts.
 *
 *   bun run gen            # interactive
 *   bun run gen --dry-run  # show the diff without writing
 *   bun run gen --routes   # list page routes
 *   bun run gen --rm       # select and remove a page route (--remove also works)
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { icons } from '../../src/lib/icons/icons'
import { navGroups } from '../../src/lib/navs'
import { apply, isExternal, listRoutes, paths, plan, planCard, supportsCards, planRemovePage, root, toKebab, toPascal, type FileChange, type GenSpec } from './codegen'
import { CancelError, colors as c, confirm, select, text } from './prompts'

const dryRun = process.argv.includes('--dry-run')
const removeMode = process.argv.includes('--rm') || process.argv.includes('--remove')
const routesMode = process.argv.includes('--routes')
const NEW_GROUP = Symbol('new-group')

const allItems = navGroups.flatMap((g) => g.items)
const routerSrc = readFileSync(paths.router, 'utf8')
const pagesSrc = readFileSync(paths.pagesIndex, 'utf8')
const routePaths = [...routerSrc.matchAll(/path:\s*['"]([^'"]+)['"]/g)].map((m) => m[1])
const pageExports = (/export\s*\{([^}]*)\}/.exec(pagesSrc)?.[1] ?? '').split(',').map((s) => s.trim())

async function main() {
  if (removeMode && routesMode) throw new Error('Use either --routes or --rm/--remove')
  console.log(
    `\n${c.bold('launcher')} ${c.dim('· nav + route generator')}${dryRun ? c.yellow(' (dry run)') : ''}\n`
  )

  if (routesMode) {
    for (const route of listRoutes(routerSrc))
      console.log(`  ${c.cyan(route.path.padEnd(22))} ${route.component ?? c.dim('(custom route)')}`)
    console.log()
    return
  }

  if (removeMode) {
    const routes = listRoutes(routerSrc).filter((route) => route.component)
    if (!routes.length) throw new Error('No removable page routes found in router.ts')
    const path = await select({
      message: 'Which page route do you want to remove?',
      choices: routes.map((route) => ({ label: route.path, value: route.path, hint: route.component ?? undefined }))
    })
    const changes = planRemovePage(path)
    console.log()
    printDiff(changes)
    if (dryRun) {
      console.log(c.yellow('Dry run — no files written.\n'))
      return
    }
    if (!(await confirm({ message: `Remove ${path} and update ${changes.length} file(s)?`, initial: false }))) {
      console.log(c.dim('Nothing written.\n'))
      return
    }
    apply(changes)
    printChanges(changes)
    console.log(`\n${c.green('Done.')} Removed ${c.bold(path)}.\n`)
    return
  }

  const kind = await select({
    message: 'What are you adding?',
    choices: [
      { label: 'Page', value: 'page' as const, hint: '⤍  within the app' },
      { label: 'Link', value: 'link' as const, hint: '⤍  to another site' },
      { label: 'Card item', value: 'card' as const, hint: '⤍  within an existing nav route' }
    ]
  })

  if (kind === 'card') {
    await addCard()
    return
  }

  const label = await text({
    message: 'Label',
    placeholder: kind === 'page' ? '_ ' : '_ ',
    validate: (v) => (v ? undefined : 'Label is required')
  })

  const href = await text({
    message: kind === 'page' ? 'Route path' : 'URL',
    initial: kind === 'page' ? `/${toKebab(label)}` : 'https://',
    validate: (v) => {
      if (kind === 'page') {
        if (!v.startsWith('/')) return 'Route path must start with "/"'
        if (!/^\/[a-zA-Z0-9\-_/$.]*$/.test(v)) return 'Use letters, numbers, -, _, / or $params'
        if (routePaths.includes(v)) return `Route "${v}" already exists in router.ts`
      } else if (!isExternal(v) || v === 'https://') return 'Enter a full URL, e.g. https://example.com'
      if (allItems.some((i) => i.href === v)) return `A nav item already points to "${v}"`
    }
  })

  const groupChoice = await select<string | typeof NEW_GROUP>({
    message: 'Nav group',
    choices: [
      ...navGroups.map((g) => ({ label: g.title, value: g.title, hint: `${g.items.length} items` })),
      { label: '+ New group…', value: NEW_GROUP }
    ],
    initial: Math.max(
      0,
      navGroups.findIndex((g) => g.items.some((i) => !isExternal(i.href)) === (kind === 'page'))
    )
  })
  const newGroup = groupChoice === NEW_GROUP
  const group = newGroup
    ? await text({
        message: 'New group title',
        validate: (v) =>
          !v ? 'Title is required' : navGroups.some((g) => g.title === v) ? 'Group already exists' : undefined
      })
    : (groupChoice as string)
  const groupLabel = newGroup
    ? await text({ message: 'Group label (optional)' })
    : undefined

  const iconNames = Object.keys(icons) as (keyof typeof icons)[]
  const icon = await select({
    message: 'Icon',
    choices: iconNames.map((name) => ({ label: name, value: name })),
    initial: Math.max(0, iconNames.indexOf(kind === 'page' ? 'folder' : 'beast')),
    filterable: true
  })

  const short = await text({ message: 'Short label (optional)', initial: label })
  const description = await text({ message: 'Description', initial: kind === 'page' ? `My ${label}` : '' })
  const value = await text({
    message: 'Value (unique identifier)',
    initial: toKebab(label),
    validate: (v) => !v ? 'Value is required' : allItems.some((item) => item.value === v) ? 'Value already exists' : undefined
  })
  const disabled = await confirm({ message: 'Disable this nav item?', initial: false })
  const tags = (await text({ message: 'Tags (comma separated)', initial: label.toLowerCase() }))
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)

  let page: GenSpec['page'] = null
  if (kind === 'page') {
    const component = await text({
      message: 'Component name',
      initial: toPascal(label),
      validate: (v) => {
        if (!/^[A-Z][A-Za-z0-9]*$/.test(v)) return 'Use PascalCase, e.g. UserSettings'
        if (pageExports.includes(v)) return `"${v}" is already exported from src/pages`
      }
    })
    let createFile = true
    if (existsSync(paths.page(component))) {
      createFile = !(await confirm({ message: `src/pages/${component}.btsx exists. Reuse it?`, initial: true }))
      if (createFile) throw new Error(`Refusing to overwrite src/pages/${component}.btsx`)
    }
    page = { component, createFile }
  }

  const spec: GenSpec = {
    group,
    newGroup,
    ...(groupLabel ? { groupLabel } : {}),
    nav: { href, icon, label, ...(short ? { short } : {}), ...(description ? { description } : {}), ...(disabled ? { disabled } : {}), value, tags },
    page
  }
  const changes = plan(spec)

  console.log()
  printDiff(changes)

  if (dryRun) {
    console.log(c.yellow('Dry run — no files written.\n'))
    return
  }
  if (!(await confirm({ message: `Write ${changes.length} file(s)?` }))) {
    console.log(c.dim('Nothing written.\n'))
    return
  }
  apply(changes)
  printChanges(changes)
  console.log(`\n${c.green('Done.')}${page ? ` Visit ${c.bold(href)} in the dev server.` : ''}\n`)
}

async function addCard() {
  const routes = listRoutes(routerSrc)
  const parents = routes.filter((route) => route.component && allItems.some((item) => item.href === route.path)
    && existsSync(paths.page(route.component)) && supportsCards(readFileSync(paths.page(route.component), 'utf8')))
  if (!parents.length) throw new Error('No nav pages with card lists or generated placeholders found')
  const parent = await select({ message: 'Add cards to which nav route?', choices: parents.map((route) => ({ label: route.path, value: route.path })) })
  const title = await text({ message: 'Card title', validate: (v) => v ? undefined : 'Title is required' })
  const id = await text({ message: 'Card id', initial: toKebab(title), validate: (v) => v ? undefined : 'Id is required' })
  const description = await text({ message: 'Card description' })
  const createPage = await confirm({ message: 'Create a new page for this card?', initial: true })
  let page: GenSpec['page'] = null
  let href: string
  if (createPage) {
    href = await text({
      message: 'Child route path', initial: `${parent.replace(/\/$/, '')}/${toKebab(title)}`,
      validate: (v) => !/^\/[a-zA-Z0-9\-_/]*$/.test(v) ? 'Enter a concrete route starting with /'
        : routePaths.includes(v) ? 'Route already exists' : undefined
    })
    const component = await text({
      message: 'Component name', initial: toPascal(title),
      validate: (v) => !/^[A-Z][A-Za-z0-9]*$/.test(v) ? 'Use PascalCase'
        : pageExports.includes(v) ? 'Component is already exported' : undefined
    })
    let createFile = true
    if (existsSync(paths.page(component))) {
      createFile = !(await confirm({ message: `src/pages/${component}.btsx exists. Reuse it?`, initial: true }))
      if (createFile) throw new Error(`Refusing to overwrite src/pages/${component}.btsx`)
    }
    page = { component, createFile }
  } else {
    const destinations = routes.filter((route) => !route.path.includes('$') && route.path !== parent)
    if (!destinations.length) throw new Error('No existing destination routes available')
    href = await select({ message: 'Destination route', choices: destinations.map((route) => ({ label: route.path, value: route.path })), filterable: true })
  }
  const changes = planCard({ parent, card: { id, title, description, href }, page })
  console.log()
  printDiff(changes)
  if (dryRun) {
    console.log(c.yellow('Dry run — no files written.\n'))
    return
  }
  if (!(await confirm({ message: `Write ${changes.length} file(s)?` }))) {
    console.log(c.dim('Nothing written.\n'))
    return
  }
  apply(changes)
  printChanges(changes)
  console.log(`\n${c.green('Done.')} Visit ${c.bold(parent)} in the dev server.\n`)
}

function printChanges(changes: FileChange[]) {
  console.log()
  for (const ch of changes) {
    const verb = ch.after === null ? c.red('delete') : ch.before === null ? c.green('create') : c.cyan('update')
    console.log(`  ${verb} ${relative(root, ch.path)}`)
  }
}

function printDiff(changes: FileChange[]) {
  const dir = mkdtempSync(join(tmpdir(), 'beast-gen-'))
  try {
    for (const [i, ch] of changes.entries()) {
      const a = join(dir, `${i}.a`)
      const b = join(dir, `${i}.b`)
      writeFileSync(a, ch.before ?? '')
      writeFileSync(b, ch.after ?? '')
      const { stdout } = Bun.spawnSync(['git', 'diff', '--no-index', '--color=always', '--no-prefix', a, b])
      const body = stdout.toString().split('\n').slice(4).join('\n') // drop git's temp-file header
      const state = ch.after === null ? c.red('(delete)') : ch.before === null ? c.green('(new)') : ''
      console.log(`${c.bold(relative(root, ch.path))} ${state}`)
      console.log(body.trimEnd() + '\n')
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

main().catch((err) => {
  if (err instanceof CancelError) process.exit(130)
  console.error(`\n${c.red('✖')} ${err instanceof Error ? err.message : err}\n`)
  process.exit(1)
})
