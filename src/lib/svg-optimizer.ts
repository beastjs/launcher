import { optimize } from 'svgo/browser'

export interface SvgOptimizationOptions {
  precision: number
  multipass: boolean
  removeDimensions: boolean
  pretty: boolean
}
export const defaultSvgOptions: SvgOptimizationOptions = { precision: 3, multipass: true, removeDimensions: false, pretty: false }
export interface SvgOptimizationResult { svg: string; originalBytes: number; optimizedBytes: number; savings: number }
export interface SvgOptimizationRequest { id: number; svg: string; options: SvgOptimizationOptions }
export type SvgOptimizationResponse = { id: number; result: SvgOptimizationResult } | { id: number; error: string }

export function optimizeSvg(svg: string, options: SvgOptimizationOptions = defaultSvgOptions): SvgOptimizationResult {
  if (!svg.trim()) throw new Error('SVG source is empty.')
  if (!Number.isInteger(options.precision) || options.precision < 0 || options.precision > 6) throw new Error('Precision must be a whole number from 0 to 6.')
  const { data } = optimize(svg, {
    floatPrecision: options.precision,
    multipass: options.multipass,
    js2svg: { pretty: options.pretty, indent: 2 },
    // Keep IDs used by animations and external references, and preserve viewBox.
    plugins: [{ name: 'preset-default', params: { overrides: { cleanupIds: false } } }, ...(options.removeDimensions ? ['removeDimensions' as const] : [])],
  })
  const originalBytes = new TextEncoder().encode(svg).byteLength
  const optimizedBytes = new TextEncoder().encode(data).byteLength
  return { svg: data, originalBytes, optimizedBytes, savings: (1 - optimizedBytes / originalBytes) * 100 }
}
