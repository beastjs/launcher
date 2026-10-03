import { existsSync, readFileSync, realpathSync, readdirSync } from 'node:fs'
import { dirname, isAbsolute, relative, resolve } from 'node:path'
import ts from 'typescript'
import { compileBeast } from 'beast-tsrx'
import type { Plugin } from 'vite'

const root = resolve(import.meta.dirname, '../..')
const repos = resolve(root, 'repos')

export function isRepoPath(path: string): boolean {
  const clean = path.replace(/[?#].*$/, '')
  const targets = [resolve(clean), existsSync(clean) ? realpathSync(clean) : resolve(clean)]
  return targets.some((target) => {
    const rel = relative(repos, target)
    return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
  })
}

export function moduleSpecifiers(source: string): string[] {
  const file = ts.createSourceFile('input.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const found: string[] = []
  const visit = (node: ts.Node) => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier))
      found.push(node.moduleSpecifier.text)
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteralLike(node.argument.literal))
      found.push(node.argument.literal.text)
    if (ts.isExternalModuleReference(node) && node.expression && ts.isStringLiteralLike(node.expression))
      found.push(node.expression.text)
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
      && node.arguments[0] && ts.isStringLiteralLike(node.arguments[0])) found.push(node.arguments[0].text)
    ts.forEachChild(node, visit)
  }
  visit(file)
  return found
}

export function checkRepoImports(): void {
  const config = ts.readConfigFile(resolve(root, 'tsconfig.json'), ts.sys.readFile)
  const options = ts.parseJsonConfigFileContent(config.config, ts.sys, root).options
  const failures: string[] = []
  const scan = (path: string) => {
    if (!existsSync(path)) return
    if (isRepoPath(path)) return
    if (ts.sys.directoryExists(path)) {
      for (const entry of readdirSync(path)) scan(resolve(path, entry))
      return
    }
    if (!/\.(?:[cm]?[jt]sx?|btsx)$/.test(path)) return
    const raw = readFileSync(path, 'utf8')
    const source = path.endsWith('.btsx') ? compileBeast(raw, { filename: path }) : raw
    for (const specifier of moduleSpecifiers(source)) {
      const direct = specifier.startsWith('.') ? resolve(dirname(path), specifier)
        : specifier.startsWith('@/') ? resolve(root, 'src', specifier.slice(2))
        : specifier.startsWith('/@fs/') ? specifier.slice(4)
        : isAbsolute(specifier) ? specifier
        : /^(?:@?repos)(?:\/|$)/.test(specifier) ? resolve(repos, specifier.replace(/^@?repos\/?/, '')) : null
      const resolved = ts.resolveModuleName(specifier, path, options, ts.sys).resolvedModule?.resolvedFileName
      if ((direct && isRepoPath(direct)) || (resolved && isRepoPath(resolved)))
        failures.push(`${relative(root, path)}: ${specifier}`)
    }
  }
  for (const entry of ['src', 'scripts', 'tests', 'vite.config.ts']) scan(resolve(root, entry))
  if (failures.length) throw new Error(`Vendored repositories are read-only references; import installed packages instead:\n${failures.join('\n')}`)
}

export function repoImportGuard(): Plugin {
  return {
    name: 'launcher:repo-import-guard',
    enforce: 'pre',
    buildStart() { checkRepoImports() },
    async resolveId(source, importer, options) {
      const result = await this.resolve(source, importer, { ...options, skipSelf: true })
      if (result && isAbsolute(result.id) && isRepoPath(result.id))
        this.error(`Cannot import ${source}: repos/ is reference-only. Import an installed package instead.`)
      return result
    }
  }
}

if (import.meta.main) {
  checkRepoImports()
  console.log('No imports from vendored repositories.')
}
