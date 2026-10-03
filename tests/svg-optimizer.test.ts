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

test('currentColor converts paint while preserving none and gradient references', () => {
  const source = '<svg viewBox="0 0 24 24" fill="none" stroke="red"><defs><linearGradient id="paint"><stop stop-color="blue"/></linearGradient></defs><path fill="url(#paint)" d="M0 0h10v10H0z"/></svg>'
  const themed = optimizeSvg(source, { ...defaultSvgOptions, currentColor: true }).svg
  expect(themed).toContain('fill="none"')
  expect(themed).toContain('stroke="currentColor"')
  expect(themed).toContain('url(#paint)')
  expect(optimizeSvg(source, { ...defaultSvgOptions, currentColor: false }).svg).toContain('stroke="red"')
  expect(optimizeSvg('<svg viewBox="0 0 24 24"><path d="M0 0h10v10H0z"/></svg>', { ...defaultSvgOptions, currentColor: true }).svg).toContain('fill="currentColor"')
})

test('normalizes offset rectangular art to a chosen square without clipping', () => {
  const source = '<svg viewBox="10 20 12 6"><path d="M10 20h12v6H10z"/></svg>'
  const result = optimizeSvg(source, { ...defaultSvgOptions, viewBoxSize: 24 }).svg
  expect(result).toContain('viewBox="0 0 24 24"')
  expect(result).toContain('M0 6h24v12H0z')
  expect(optimizeSvg(source, { ...defaultSvgOptions, viewBoxSize: 48 }).svg).toContain('viewBox="0 0 48 48"')
  const withoutBounds = '<svg width="12" height="12"><path d="M0 0h12v12H0z"/></svg>'
  expect(optimizeSvg(withoutBounds, { ...defaultSvgOptions, viewBoxSize: 24 }).svg).toContain('viewBox="0 0 24 24"')
  for (const viewBoxSize of [0, -1, NaN, Infinity]) expect(() => optimizeSvg(source, { ...defaultSvgOptions, viewBoxSize })).toThrow('positive')
  expect(() => optimizeSvg('<svg><path d="M0 0h12v12H0z"/></svg>', { ...defaultSvgOptions, viewBoxSize: 24 })).toThrow('valid viewBox')
})
