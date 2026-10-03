import { expect, test } from 'bun:test'
import { optimizeSvg, defaultSvgOptions } from '../src/lib/svg-optimizer'
import { getSvgElementSnippet } from '../src/lib/iconify'

const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><!-- café --><g><path d="M 0.123456 0 L 24 24"/></g></svg>'

test('optimizes source while preserving bounds and currentColor and measuring UTF-8 bytes', () => {
  const result = optimizeSvg(svg)
  expect(result.svg).toContain('viewBox="0 0 24 24"')
  expect(result.svg).toContain('currentColor')
  expect(result.svg).not.toContain('<!--')
  expect(result.optimizedBytes).toBeLessThan(result.originalBytes)
  expect(result.originalBytes).toBe(new TextEncoder().encode(svg).byteLength)
  expect(result.savings).toBeGreaterThan(0)
})

test('dimension removal preserves responsive viewBox and precision controls output', () => {
  const precise = optimizeSvg(svg, { ...defaultSvgOptions, precision: 6, removeDimensions: true })
  expect(precise.svg).not.toContain('width=')
  expect(precise.svg).not.toContain('height=')
  expect(precise.svg).toContain('viewBox="0 0 24 24"')
  expect(precise.svg).toContain('.123456')
  const rounded = optimizeSvg(svg, { ...defaultSvgOptions, precision: 1 })
  expect(rounded.svg).not.toContain('.123456')
})

test('preserves animation references and optimizes rotated Iconify aliases', () => {
  const animated = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path id="spinner" d="M0 0h10v10H0z"><animate attributeName="opacity" values="0;1;0" dur="1s" begin="spinner.click" repeatCount="indefinite"/></path></svg>'
  const result = optimizeSvg(animated)
  expect(result.svg).toContain('id="spinner"')
  expect(result.svg).toContain('begin="spinner.click"')
  expect(result.svg).toContain('<animate')
  const alias = getSvgElementSnippet({ name: 'alias', sourceSetId: 'test', sourceHeight: 24, width: 16, height: 24, rotate: 1, hFlip: true, body: '<path d="M0 0L10 10"/>' })
  expect(optimizeSvg(alias).svg).toContain('viewBox="0 0 24 16"')
})

test('supports readable output and rejects malformed sources and invalid precision', () => {
  expect(optimizeSvg(svg, { ...defaultSvgOptions, pretty: true }).svg).toContain('\n')
  expect(() => optimizeSvg('')).toThrow('empty')
  expect(() => optimizeSvg('<svg><path></svg>')).toThrow()
  for (const precision of [-1, 7, 1.5, NaN]) expect(() => optimizeSvg(svg, { ...defaultSvgOptions, precision })).toThrow('Precision')
})
