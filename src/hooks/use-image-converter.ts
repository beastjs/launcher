import { useCallback, useEffect, useRef, useState } from 'octane'
import { ImageConverter, type ConversionOptions } from '../lib/image-converter'
export type { ConversionOptions, ConversionResult } from '../lib/image-converter'

export const useImageConverter = () => {
  const [converting, setConverting] = useState(false)
  const converterRef = useRef<ImageConverter | null>(null)
  const mountedRef = useRef(true)

  const convert = useCallback((file: File, options: ConversionOptions) => {
    if (!mountedRef.current)
      return Promise.reject(new DOMException('Image converter is unmounted', 'AbortError'))
    if (!converterRef.current) {
      converterRef.current = new ImageConverter(
        () => new Worker(new URL('../workers/image-converter.worker.ts', import.meta.url), { type: 'module' }),
        busy => { if (mountedRef.current) setConverting(busy) },
      )
    }
    return converterRef.current.convert(file, options)
  }, [])
  const terminate = useCallback(() => converterRef.current?.terminate(), [])
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      converterRef.current?.terminate(false)
    }
  }, [])
  return { convert, terminate, converting }
}
