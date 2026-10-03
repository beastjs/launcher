import { expect, test } from 'bun:test'
import { ImageConverter, type ConversionRequest, type ConversionResponse } from '../src/lib/image-converter'

class FakeWorker extends EventTarget {
  requests: ConversionRequest[] = []
  stopped = false
  failPost = false
  postMessage(request: ConversionRequest) {
    if (this.failPost) throw new Error('Cannot post')
    this.requests.push(request)
  }
  terminate() { this.stopped = true }
  respond(data: { id: number; blob: Blob } | { id: number; error: string }) {
    const response: ConversionResponse = 'blob' in data ? { ...data, width: 32, height: 16 } : data
    this.dispatchEvent(new MessageEvent('message', { data: response }))
  }
}
const file = (size: number) => new File([new Uint8Array(size)], 'image.png', { type: 'image/png' })
const setup = () => {
  const workers: FakeWorker[] = []
  const busy: boolean[] = []
  const converter = new ImageConverter(() => {
    const worker = new FakeWorker()
    workers.push(worker)
    return worker as unknown as Worker
  }, value => busy.push(value))
  return { converter, workers, busy }
}

test('correlates overlapping responses and stays busy until all jobs settle', async () => {
  const { converter, workers, busy } = setup()
  const first = converter.convert(file(100), { format: 'webp' })
  const second = converter.convert(file(200), { format: 'jpeg' })
  const worker = workers[0]
  const jpeg = new Blob(['jpeg'], { type: 'image/jpeg' })
  worker.respond({ id: worker.requests[1].id, blob: jpeg })
  expect(await second).toMatchObject({ blob: jpeg, originalSize: 200, format: 'image/jpeg', compressionRatio: 98 })
  expect(busy).toEqual([true])
  worker.respond({ id: worker.requests[0].id, blob: new Blob(['webp'], { type: 'image/webp' }) })
  expect((await first).originalSize).toBe(100)
  expect(busy).toEqual([true, false])
})

test('termination rejects pending work and permits a fresh worker', async () => {
  const { converter, workers } = setup()
  const result = converter.convert(file(10), { format: 'webp' }).catch(error => error)
  converter.terminate()
  expect((await result).name).toBe('AbortError')
  expect(workers[0].stopped).toBe(true)
  const next = converter.convert(file(10), { format: 'webp' })
  expect(workers).toHaveLength(2)
  workers[1].respond({ id: workers[1].requests[0].id, blob: new Blob(['a'], { type: 'image/webp' }) })
  await next
})

test('worker failures reject every pending request and reset the worker', async () => {
  const { converter, workers, busy } = setup()
  const first = converter.convert(file(10), { format: 'webp' }).catch(error => error)
  const second = converter.convert(file(10), { format: 'jpeg' }).catch(error => error)
  workers[0].dispatchEvent(new Event('messageerror'))
  expect((await first).message).toContain('Could not read')
  expect((await second).message).toContain('Could not read')
  expect(workers[0].stopped).toBe(true)
  expect(busy.at(-1)).toBe(false)
})

test('validation and synchronous failures never leave the converter busy', async () => {
  const { converter, workers, busy } = setup()
  await expect(converter.convert(file(0), { format: 'webp' })).rejects.toThrow('empty')
  await expect(converter.convert(file(10), { format: 'webp', quality: NaN })).rejects.toThrow('Quality')
  expect(workers).toHaveLength(0)
  const failed = new ImageConverter(() => { throw new Error('Startup failed') }, value => busy.push(value))
  await expect(failed.convert(file(10), { format: 'webp' })).rejects.toThrow('Startup failed')
  const worker = new FakeWorker()
  worker.failPost = true
  const posting = new ImageConverter(() => worker as unknown as Worker, value => busy.push(value))
  await expect(posting.convert(file(10), { format: 'webp' })).rejects.toThrow('Cannot post')
  expect(busy.at(-1)).toBe(false)
})

test('encoding errors reject only their matching request', async () => {
  const { converter, workers } = setup()
  const failed = converter.convert(file(10), { format: 'avif' }).catch(error => error)
  const success = converter.convert(file(10), { format: 'webp' })
  workers[0].respond({ id: workers[0].requests[0].id, error: 'Unsupported AVIF' })
  workers[0].respond({ id: workers[0].requests[1].id, blob: new Blob(['a'], { type: 'image/webp' }) })
  expect((await failed).message).toBe('Unsupported AVIF')
  expect((await success).format).toBe('image/webp')
})

test('validates dimension limits and forwards batch settings to the worker', async () => {
  const { converter, workers } = setup()
  for (const maxWidth of [0, -1, 1.5, Infinity, NaN]) {
    await expect(converter.convert(file(10), { format: 'webp', maxWidth })).rejects.toThrow('Dimension')
  }
  expect(workers).toHaveLength(0)
  const result = converter.convert(file(10), { format: 'webp', grayscale: true, maxWidth: 32, maxHeight: 16 })
  expect(workers[0].requests[0]).toMatchObject({ grayscale: true, maxWidth: 32, maxHeight: 16 })
  workers[0].respond({ id: workers[0].requests[0].id, blob: new Blob(['a'], { type: 'image/webp' }) })
  expect(await result).toMatchObject({ width: 32, height: 16 })
})
