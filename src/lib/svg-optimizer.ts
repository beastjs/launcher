import { optimize } from 'svgo/browser'
import type { CustomPlugin, XastElement } from 'svgo'

export interface SvgOptimizationOptions {
  precision: number
  multipass: boolean
  removeDimensions: boolean
  pretty: boolean
  currentColor?: boolean
  viewBoxSize?: number
}
export const defaultSvgOptions: SvgOptimizationOptions = { precision: 3, multipass: true, removeDimensions: false, pretty: false }
export interface SvgOptimizationResult { svg: string; originalBytes: number; optimizedBytes: number; savings: number }
export interface SvgOptimizationRequest { id: number; svg: string; options: SvgOptimizationOptions }
export type SvgOptimizationResponse = { id: number; result: SvgOptimizationResult } | { id: number; error: string }

export function optimizeSvg(svg: string, options: SvgOptimizationOptions = defaultSvgOptions): SvgOptimizationResult {
  if (!svg.trim()) throw new Error('SVG source is empty.')
  if (!Number.isInteger(options.precision) || options.precision < 0 || options.precision > 6) throw new Error('Precision must be a whole number from 0 to 6.')
  if (options.viewBoxSize !== undefined && (!Number.isFinite(options.viewBoxSize) || options.viewBoxSize <= 0)) throw new Error('ViewBox size must be a positive number.')
  let normalized = false
  const normalizeViewBox: CustomPlugin = {
    name: 'normalizeViewBox',
    fn: () => ({ element: { enter(node, parent) {
      if (parent.type === 'root' && node.name !== 'svg') throw new Error('Paste a complete SVG with an <svg> root element.')
      if (normalized || node.name !== 'svg' || parent.type !== 'root' || options.viewBoxSize === undefined) return
      normalized = true
      const bounds = node.attributes.viewBox?.trim().split(/[\s,]+/).map(Number)
        ?? [0, 0, Number(node.attributes.width?.replace(/px$/, '')), Number(node.attributes.height?.replace(/px$/, ''))]
      if (bounds.length !== 4 || bounds.some(value => !Number.isFinite(value)) || bounds[2] <= 0 || bounds[3] <= 0) throw new Error('SVG needs a valid viewBox or numeric width and height to resize its grid.')
      const [x, y, width, height] = bounds
      const side = Math.max(width, height)
      const size = options.viewBoxSize
      const scale = size / side
      const dx = (side - width) / 2 - x
      const dy = (side - height) / 2 - y
      // Wrap the artwork so transforms and animations keep their own coordinates.
      const transform = `scale(${scale}) translate(${dx} ${dy})`
      const group: XastElement = { type: 'element', name: 'g', attributes: { transform }, children: node.children }
      node.children = [group]
      node.attributes.viewBox = `0 0 ${size} ${size}`
    } } }),
  }
  const defaultCurrentColor: CustomPlugin = {
    name: 'defaultCurrentColor',
    fn: () => ({ element: { enter(node, parent) {
      if (node.name === 'svg' && parent.type === 'root' && node.attributes.fill === undefined) node.attributes.fill = 'currentColor'
    } } }),
  }
  const { data } = optimize(svg, {
    floatPrecision: options.precision,
    multipass: options.multipass,
    js2svg: { pretty: options.pretty, indent: 2 },
    // Keep IDs used by animations and external references, and preserve viewBox.
    plugins: [
      normalizeViewBox,
      { name: 'preset-default', params: { overrides: {
        cleanupIds: false,
        ...(options.currentColor ? { convertColors: { currentColor: /^(?!none$|currentColor$|transparent$|inherit$|url\()/i } } : {}),
      } } },
      ...(options.currentColor ? [defaultCurrentColor] : []),
      ...(options.removeDimensions ? ['removeDimensions' as const] : []),
    ],
  })
  const originalBytes = new TextEncoder().encode(svg).byteLength
  const optimizedBytes = new TextEncoder().encode(data).byteLength
  return { svg: data, originalBytes, optimizedBytes, savings: (1 - optimizedBytes / originalBytes) * 100 }
}
