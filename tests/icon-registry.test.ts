import { expect, test } from 'bun:test'
import { readdir, readFile } from 'node:fs/promises'
import { icons, iconMarkup } from '../src/lib/icons/icons'
import { buildIcons } from '../scripts/build-icons'

test('generated icon registry matches its SVG sources', async () => {
  expect(await readFile('src/lib/icons/icons.ts', 'utf8')).toBe(
    await buildIcons('src/lib/icons/svg', 'src/lib/icons/icons.ts'),
  )
})

test('literal icon names used by the app exist and render', async () => {
  let checked = 0
  async function walk(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = `${directory}/${entry.name}`
      if (entry.isDirectory()) await walk(file)
      else if (/\.(ts|btsx)$/.test(entry.name)) {
        const source = await readFile(file, 'utf8')
        for (const [, name] of source.matchAll(/\b(?:Icon\(name|icon)\s*=\s*\{?\s*['"]([^'"]+)['"]/g)) {
          expect(Object.hasOwn(icons, name), `${file}: missing icon "${name}"`).toBe(true)
          expect(iconMarkup(name as keyof typeof icons, 'test')).not.toBeEmpty()
          checked++
        }
      }
    }
  }
  await walk('src')
  expect(checked).toBeGreaterThan(0)
})
