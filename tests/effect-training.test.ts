import { expect, test } from 'bun:test'
import { lessons, readProgress } from '../src/lib/effect-training'
const lab = (id: string, input: string) => lessons.find(lesson => lesson.id === id)!.run(input)

test('all lesson starting inputs execute with installed Effect 4', async () => {
  for (const lesson of lessons) {
    const value = await lesson.run(lesson.initial)
    expect(value.value).toBeDefined()
    expect(lesson.choices[lesson.answer]).toBeDefined()
  }
})

test('laziness and composition preserve their taught behavior', async () => {
  expect(await lab('describe', '3')).toEqual({ value: [1, 2, 3], trace: ['After construction: counter = 0', 'After 3 run(s): counter = 3'] })
  expect((await lab('compose', '4')).value).toEqual({ sessions: 4, minutes: 100, ready: true })
  await expect(lab('describe', '0')).rejects.toThrow()
})

test('typed failure recovers and schema transforms or reports invalid input', async () => {
  expect((await lab('failure', '')).value).toBe('Add a name to personalize your plan.')
  expect((await lab('schema', '{"name":"Alex","sessions":"4"}')).value).toEqual({ decoded: { name: 'Alex', sessions: 4 }, encoded: { name: 'Alex', sessions: '4' } })
  expect((await lab('schema', '{"name":"Alex","sessions":"oops"}')).value).toHaveProperty('validationError')
  expect((await lab('schema', '{"name":"Alex","sessions":"3","extra":true}')).value).toHaveProperty('validationError')
  await expect(lab('schema', '{')).rejects.toThrow()
})

test('resources release on failure, concurrency preserves order, retry is bounded', async () => {
  expect(await lab('resources', 'fail')).toEqual({ value: { exit: 'Failure' }, trace: ['acquire', 'use session', 'release'] })
  const concurrent = await lab('concurrency', '3')
  expect(concurrent.value).toEqual(['A', 'B', 'C'])
  expect(concurrent.trace.indexOf('start C')).toBeLessThan(concurrent.trace.indexOf('finish A'))
  expect((await lab('capstone', '{"name":"Alex","sessions":3,"offlineAttempts":2}')).value).toMatchObject({ saved: true, attempts: 3 })
  expect((await lab('capstone', '{"name":"Alex","sessions":3,"offlineAttempts":3}')).value).toEqual({ saved: false, attempts: 3 })
  const invalid = await lab('capstone', '{"name":"Alex","sessions":0,"offlineAttempts":2}')
  expect(invalid.value).toHaveProperty('validationError')
  expect(invalid.trace).toEqual([])
})

test('stored progress ignores malformed, duplicate and obsolete lesson ids', () => {
  expect(readProgress('["describe","describe","old",4]')).toEqual(['describe'])
  expect(readProgress('{')).toEqual([])
  expect(readProgress('{}')).toEqual([])
})
