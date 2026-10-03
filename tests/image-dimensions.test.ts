import { expect, test } from 'bun:test'
import { constrainDimensions } from '../src/lib/image-dimensions'

test('fits landscape and portrait images inside both constraints', () => {
  expect(constrainDimensions(4000, 2000, 800, 800)).toEqual({ width: 800, height: 400 })
  expect(constrainDimensions(2000, 4000, 800, 800)).toEqual({ width: 400, height: 800 })
  expect(constrainDimensions(4000, 2000, undefined, 250)).toEqual({ width: 500, height: 250 })
})
test('does not upscale and keeps tiny dimensions nonzero', () => {
  expect(constrainDimensions(100, 50, 800, 800)).toEqual({ width: 100, height: 50 })
  expect(constrainDimensions(100, 50)).toEqual({ width: 100, height: 50 })
  expect(constrainDimensions(10000, 1, 1)).toEqual({ width: 1, height: 1 })
})
