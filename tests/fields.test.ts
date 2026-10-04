import { expect, test } from 'bun:test'
import { VectorFieldAnimation } from '../src/lib/fields'

test('animation owns one frame loop and removes its resize listener on destruction', () => {
  const previousWindow = globalThis.window
  const previousRaf = globalThis.requestAnimationFrame
  const previousCancel = globalThis.cancelAnimationFrame
  const resizeListeners = new Set<EventListenerOrEventListenerObject>()
  const pendingFrames = new Map<number, FrameRequestCallback>()
  let nextId = 0
  const canvas = { width: 0, height: 0, getContext: () => ({}) } as unknown as HTMLCanvasElement
  globalThis.window = {
    innerWidth: 800, innerHeight: 600,
    addEventListener: (name: string, listener: EventListenerOrEventListenerObject) => { if (name === 'resize') resizeListeners.add(listener) },
    removeEventListener: (name: string, listener: EventListenerOrEventListenerObject) => { if (name === 'resize') resizeListeners.delete(listener) },
  } as unknown as Window & typeof globalThis
  globalThis.requestAnimationFrame = callback => { pendingFrames.set(++nextId, callback); return nextId }
  globalThis.cancelAnimationFrame = id => { pendingFrames.delete(id) }
  try {
    const animation = new VectorFieldAnimation(canvas)
    expect(canvas.width).toBe(800)
    expect(canvas.height).toBe(600)
    expect(resizeListeners.size).toBe(1)
    animation.start()
    animation.start()
    expect(pendingFrames.size).toBe(1)
    animation.stop()
    expect(pendingFrames.size).toBe(0)
    animation.start()
    expect(pendingFrames.size).toBe(1)
    animation.destroy()
    expect(pendingFrames.size).toBe(0)
    expect(resizeListeners.size).toBe(0)
    animation.destroy()
    expect(resizeListeners.size).toBe(0)
  } finally {
    globalThis.window = previousWindow
    globalThis.requestAnimationFrame = previousRaf
    globalThis.cancelAnimationFrame = previousCancel
  }
})
