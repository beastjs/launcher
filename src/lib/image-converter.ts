export interface ConversionOptions {
  format: 'avif' | 'webp' | 'jpeg'
  quality?: number
  grayscale?: boolean
  maxWidth?: number
  maxHeight?: number
}
export interface ConversionResult {
  blob: Blob
  size: number
  format: string
  originalSize: number
  compressionRatio: number
  width: number
  height: number
}
export interface ConversionRequest extends ConversionOptions {
  id: number
  file: File
}
export type ConversionResponse = { id: number; blob: Blob; width: number; height: number } | { id: number; error: string }
interface Pending {
  originalSize: number
  resolve: (result: ConversionResult) => void
  reject: (error: Error) => void
}

export class ImageConverter {
  private worker: Worker | null = null
  private nextId = 0
  private pending = new Map<number, Pending>()

  constructor(private createWorker: () => Worker, private onBusyChange: (busy: boolean) => void) {}

  convert(file: File, options: ConversionOptions): Promise<ConversionResult> {
    if (!['avif', 'webp', 'jpeg'].includes(options.format))
      return Promise.reject(new Error('Unsupported image format'))
    if (!file.size) return Promise.reject(new Error('Image file is empty'))
    if (options.quality !== undefined && (!Number.isFinite(options.quality) || options.quality < 0 || options.quality > 1))
      return Promise.reject(new Error('Quality must be between 0 and 1'))
    for (const dimension of [options.maxWidth, options.maxHeight]) {
      if (dimension !== undefined && (!Number.isSafeInteger(dimension) || dimension < 1))
        return Promise.reject(new Error('Dimension limits must be positive whole numbers'))
    }
    return new Promise((resolve, reject) => {
      const id = this.nextId++
      try {
        if (!this.worker) {
          this.worker = this.createWorker()
          this.worker.addEventListener('message', this.onMessage)
          this.worker.addEventListener('error', this.onError)
          this.worker.addEventListener('messageerror', this.onMessageError)
        }
        this.pending.set(id, { originalSize: file.size, resolve, reject })
        if (this.pending.size === 1) this.onBusyChange(true)
        this.worker.postMessage({ ...options, id, file } satisfies ConversionRequest)
      } catch (error) {
        this.pending.delete(id)
        if (!this.pending.size) this.onBusyChange(false)
        reject(error instanceof Error ? error : new Error(String(error)))
      }
    })
  }

  terminate(notify = true, reason: Error = new DOMException('Image conversion cancelled', 'AbortError')) {
    if (this.worker) {
      this.worker.removeEventListener('message', this.onMessage)
      this.worker.removeEventListener('error', this.onError)
      this.worker.removeEventListener('messageerror', this.onMessageError)
      this.worker.terminate()
      this.worker = null
    }
    for (const request of this.pending.values()) request.reject(reason)
    this.pending.clear()
    if (notify) this.onBusyChange(false)
  }

  private onMessage = (event: MessageEvent<ConversionResponse>) => {
    const request = this.pending.get(event.data.id)
    if (!request) return
    this.pending.delete(event.data.id)
    if ('error' in event.data) request.reject(new Error(event.data.error))
    else {
      const { blob, width, height } = event.data
      request.resolve({ blob, size: blob.size, format: blob.type, originalSize: request.originalSize,
        compressionRatio: (1 - blob.size / request.originalSize) * 100, width, height })
    }
    if (!this.pending.size) this.onBusyChange(false)
  }
  private onError = (event: ErrorEvent) => {
    this.terminate(true, new Error(event.message || 'Image conversion worker failed'))
  }
  private onMessageError = () => {
    this.terminate(true, new Error('Could not read image conversion worker response'))
  }
}
