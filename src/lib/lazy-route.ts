import { lazyRouteComponent as createLazyComponent } from '@octanejs/tanstack-router'

// The adapter can return undefined from preload; routes require a Promise.
export function lazyRouteComponent(...args: Parameters<typeof createLazyComponent>) {
  const component = createLazyComponent(...args)
  const preload = component.preload
  return Object.assign(component, { preload: async () => { await preload() } })
}
