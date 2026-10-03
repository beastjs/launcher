import type { ConversionRequest, ConversionResponse } from '../lib/image-converter'
import { constrainDimensions } from '../lib/image-dimensions'

async function convert({ id, file, format, quality = 0.8, grayscale = false, maxWidth, maxHeight }: ConversionRequest): Promise<ConversionResponse> {
  let bitmap: ImageBitmap | undefined
  let canvas: OffscreenCanvas | undefined
  try {
    bitmap = await createImageBitmap(file)
    const { width, height } = constrainDimensions(bitmap.width, bitmap.height, maxWidth, maxHeight)
    canvas = new OffscreenCanvas(width, height)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Failed to get canvas context')
    context.imageSmoothingQuality = 'high'
    const supportsFilter = 'filter' in context
    if (grayscale && supportsFilter) context.filter = 'grayscale(1)'
    context.drawImage(bitmap, 0, 0, width, height)
    // Some browsers do not implement OffscreenCanvas filters. Read pixels only
    // in that case, after resizing, so the fallback uses the smallest buffer.
    if (grayscale && (!supportsFilter || context.filter !== 'grayscale(1)')) {
      const pixels = context.getImageData(0, 0, width, height)
      for (let i = 0; i < pixels.data.length; i += 4) {
        const gray = Math.round(pixels.data[i] * 0.2126 + pixels.data[i + 1] * 0.7152 + pixels.data[i + 2] * 0.0722)
        pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = gray
      }
      context.putImageData(pixels, 0, 0)
    }
    bitmap.close()
    bitmap = undefined
    const mimeType = `image/${format}`
    const blob = await canvas.convertToBlob({ type: mimeType, quality })
    if (blob.type !== mimeType)
      throw new Error(`This browser cannot encode ${format.toUpperCase()} images (returned ${blob.type})`)
    return { id, blob, width, height }
  } catch (error) {
    return { id, error: error instanceof Error ? error.message : String(error) }
  } finally {
    bitmap?.close()
    if (canvas) { canvas.width = 0; canvas.height = 0 }
  }
}

// Serialize jobs so only one decoded image and canvas are live at a time.
let queue = Promise.resolve()
self.addEventListener('message', (event: MessageEvent<ConversionRequest>) => {
  const request = event.data
  queue = queue.then(async () => {
    self.postMessage(await convert(request))
  }).catch(() => {
    self.postMessage({ id: request.id, error: 'Failed to send conversion result' } satisfies ConversionResponse)
  })
})
