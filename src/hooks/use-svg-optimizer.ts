import { useEffect, useRef, useState } from 'octane'
import type { SvgOptimizationOptions, SvgOptimizationRequest, SvgOptimizationResponse, SvgOptimizationResult } from '../lib/svg-optimizer'

export function useSvgOptimizer(svg: string, { precision, multipass, removeDimensions, pretty, currentColor, viewBoxSize }: SvgOptimizationOptions) {
  const [result, setResult] = useState<SvgOptimizationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [working, setWorking] = useState(false)
  const [revision, setRevision] = useState(0)
  const workerRef = useRef<Worker | null>(null)
  const nextId = useRef(0)
  useEffect(() => {
    let cancelled = false
    const id = ++nextId.current
    setResult(null)
    setError(null)
    setWorking(!!svg)
    if (!svg) return
    const timer = setTimeout(() => {
      try {
        const worker = workerRef.current ?? (workerRef.current = new Worker(new URL('../workers/svg-optimizer.worker.ts', import.meta.url), { type: 'module' }))
        worker.onmessage = (event: MessageEvent<SvgOptimizationResponse>) => {
          if (cancelled || event.data.id !== id) return
          if ('error' in event.data) setError(event.data.error)
          else setResult(event.data.result)
          setWorking(false)
        }
        const failed = (message: string) => {
          worker.terminate()
          workerRef.current = null
          if (!cancelled) { setError(message); setWorking(false) }
        }
        worker.onerror = event => failed(event.message || 'SVG optimizer could not start. Please retry.')
        worker.onmessageerror = () => failed('Could not read the optimized SVG. Please retry.')
        worker.postMessage({ id, svg, options: { precision, multipass, removeDimensions, pretty, currentColor, viewBoxSize } } satisfies SvgOptimizationRequest)
      } catch (failure) {
        workerRef.current?.terminate()
        workerRef.current = null
        if (!cancelled) { setError(failure instanceof Error ? failure.message : 'Could not optimize SVG.'); setWorking(false) }
      }
    }, 150)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [svg, precision, multipass, removeDimensions, pretty, currentColor, viewBoxSize, revision])
  useEffect(() => () => { workerRef.current?.terminate(); workerRef.current = null }, [])
  return { result, error, working, retry: () => setRevision(value => value + 1) }
}
