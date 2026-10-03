import { expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
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

test('Vite rejects resolved vendored paths, including aliases', async () => {
  const plugin = repoImportGuard()
  const hook = plugin.resolveId as Function
  const context = {
    resolve: async () => ({ id: resolve(root, 'repos/effect/packages/effect/src/Schema.ts') }),
    error(message: string) { throw new Error(message) }
  }
  await expect(hook.call(context, 'custom-alias', resolve(root, 'src/main.ts'), {})).rejects.toThrow('reference-only')
})
