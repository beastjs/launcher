import { optimizeSvg, type SvgOptimizationRequest, type SvgOptimizationResponse } from '../lib/svg-optimizer'

self.onmessage = (event: MessageEvent<SvgOptimizationRequest>) => {
  const { id, svg, options } = event.data
  try { self.postMessage({ id, result: optimizeSvg(svg, options) } satisfies SvgOptimizationResponse) }
  catch (error) { self.postMessage({ id, error: error instanceof Error ? error.message : 'Could not optimize SVG.' } satisfies SvgOptimizationResponse) }
}
