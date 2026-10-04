import { expect, test } from 'bun:test'
import { breadcrumbsForPath } from '../src/lib/breadcrumbs'

test('home has one current breadcrumb', () => {
  expect(breadcrumbsForPath('/')).toEqual([{ label: 'Launcher', href: '/' }])
})

test('nested routes link to their parents and use readable labels', () => {
  expect(breadcrumbsForPath('/converters/image/')).toEqual([
    { label: 'Launcher', href: '/' },
    { label: 'Converters', href: '/converters' },
    { label: 'Image Converter', href: '/converters/image' },
  ])
  expect(breadcrumbsForPath('/gym/effect-js/lessons').map(crumb => crumb.label)).toEqual(['Launcher', 'Gym', 'Effect', 'Lessons'])
})

test('icon names decode for display while preserving link paths', () => {
  expect(breadcrumbsForPath('/icons/proicons/arrow%2Dleft').slice(2)).toEqual([
    { label: 'proicons', href: '/icons/proicons' },
    { label: 'arrow left', href: '/icons/proicons/arrow%2Dleft' },
  ])
  expect(() => breadcrumbsForPath('/icons/%invalid')).not.toThrow()
})
