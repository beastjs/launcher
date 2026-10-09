import { expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { rspack, type Stats } from '@rspack/core'
import { checkRepoImports, isRepoPath, moduleSpecifiers, repoImportGuard } from './repo-imports'

const root = resolve(import.meta.dirname, '../..')

test('recognizes module references including types, re-exports, require and dynamic imports', () => {
  expect(moduleSpecifiers(`import type { A } from '../repos/a'; export * from '@/../repos/b';
    type B = import('../repos/c').B; const d = import('../repos/d');
    const e = require('../repos/e'); const text = "import '../repos/not-an-import'";`))
    .toEqual(['../repos/a', '@/../repos/b', '../repos/c', '../repos/d', '../repos/e'])
  expect(isRepoPath(resolve(root, 'repos/effect/src/index.ts'))).toBe(true)
  expect(isRepoPath(resolve(root, 'repos-other/index.ts'))).toBe(false)
  expect(isRepoPath(resolve(root, 'node_modules/effect/dist/index.js'))).toBe(false)
})

test('rejects vendored imports in project TS and Beast files but allows the installed package', () => {
  const dir = mkdtempSync(resolve(root, 'src/import-guard-test-'))
  const file = resolve(dir, 'Example.ts')
  try {
    writeFileSync(file, 'import { Schema } from "effect"')
    expect(() => checkRepoImports()).not.toThrow()
    for (const source of ['import type { A } from "../../repos/effect/a"', 'export * from "@/../repos/effect/a"']) {
      writeFileSync(file, source)
      expect(() => checkRepoImports()).toThrow('read-only references')
    }
    rmSync(file)
    writeFileSync(resolve(dir, 'Example.btsx'), 'import { Schema } from "../../repos/effect/packages/effect/src/Schema.ts"\n\nprops {}:{}\ndiv Training\n')
    expect(() => checkRepoImports()).toThrow('read-only references')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('Rspack rejects resolved vendored aliases and resource queries in a real build', async () => {
  const dir = mkdtempSync(resolve(tmpdir(), 'launcher-import-guard-'))
  const compile = (alias: string) => new Promise<Stats>((accept, reject) => {
    const compiler = rspack({
      mode: 'development',
      context: dir,
      entry: './main.js',
      resolve: { alias: { 'custom-alias': alias } },
      output: { path: resolve(dir, 'dist') },
      plugins: [repoImportGuard()],
    })
    compiler.run((error, stats) => {
      compiler.close(closeError => {
        if (error || closeError) reject(error ?? closeError)
        else if (stats) accept(stats)
        else reject(new Error('Rspack returned no build stats'))
      })
    })
  })
  try {
    writeFileSync(resolve(dir, 'main.js'), 'import "custom-alias"')
    const blocked = await compile(resolve(root, 'repos/effect/packages/effect/src/Schema.ts') + '?raw')
    expect(blocked.hasErrors()).toBe(true)
    expect(blocked.toString({ all: false, errors: true })).toContain('reference-only')

    writeFileSync(resolve(dir, 'allowed.js'), 'export const allowed = true')
    const allowed = await compile(resolve(dir, 'allowed.js'))
    expect(allowed.hasErrors()).toBe(false)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
