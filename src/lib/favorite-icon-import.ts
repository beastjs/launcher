import { getSvgElementSnippet, type IconEntry } from './iconify'
import { svgSymbol } from './svg-symbol'
import type { CustomIcon } from './custom-icon-set'
import type { SvgOptimizationOptions, SvgOptimizationResponse } from './svg-optimizer'

/** Collection prefixes keep identically named favorites from colliding. */
export const favoriteListName = (icon: IconEntry) => `${icon.sourceSetId}-${icon.name}`

export async function prepareFavoriteIcons(icons: IconEntry[], options?: SvgOptimizationOptions): Promise<CustomIcon[]> {
  const worker = options ? new Worker(new URL('../workers/svg-optimizer.worker.ts', import.meta.url), { type: 'module' }) : null
  try {
    const prepared: CustomIcon[] = []
    for (const [id, icon] of icons.entries()) {
      let svg = getSvgElementSnippet(icon, icon.sourceHeight)
      if (worker) {
        svg = await new Promise<string>((resolve, reject) => {
          worker.onmessage = (event: MessageEvent<SvgOptimizationResponse>) => {
            if (event.data.id !== id) return
            if ('error' in event.data) reject(new Error(event.data.error))
            else resolve(event.data.result.svg)
          }
          worker.onerror = event => reject(new Error(event.message || 'Could not optimize favorites.'))
          worker.onmessageerror = () => reject(new Error('Could not read the optimized favorite.'))
          worker.postMessage({ id, svg, options })
        })
      }
      prepared.push({ name: favoriteListName(icon), svg, ...svgSymbol(svg) })
    }
    return prepared
  } finally { worker?.terminate() }
}
