import { createRootRoute, createRoute, createRouter } from '@octanejs/tanstack-router'
import { lazyRouteComponent } from './lib/lazy-route'
import App from './App.btsx'

const rootRoute = createRootRoute({
  component: App,
  notFoundComponent: lazyRouteComponent(() => import('./pages/NotFound.btsx')),
})

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: lazyRouteComponent(() => import('./pages/Home.btsx')),
})
const convertersRoute = createRoute({ getParentRoute: () => rootRoute, path: '/converters', component: lazyRouteComponent(() => import('./pages/Converters.btsx')) })
const imageConverterRoute = createRoute({ getParentRoute: () => rootRoute, path: '/converters/image', component: lazyRouteComponent(() => import('./pages/ImageConverter.btsx')) })
const iconsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/icons', component: lazyRouteComponent(() => import('./pages/Icons.btsx')) })
const iconFavoritesRoute = createRoute({ getParentRoute: () => rootRoute, path: '/icons/favorites', component: lazyRouteComponent(() => import('./pages/IconFavorites.btsx')) })
const iconSetRoute = createRoute({ getParentRoute: () => rootRoute, path: '/icons/$iconSetId', component: lazyRouteComponent(() => import('./pages/IconSet.btsx')) })
const iconDetailRoute = createRoute({ getParentRoute: () => rootRoute, path: '/icons/$iconSetId/$iconName', component: lazyRouteComponent(() => import('./pages/IconDetail.btsx')) })
const gymRoute = createRoute({ getParentRoute: () => rootRoute, path: '/gym', component: lazyRouteComponent(() => import('./pages/Gym.btsx')) })
const effectJsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/gym/effect-js', component: lazyRouteComponent(() => import('./pages/EffectJs.btsx')) })
const effectJsLessonsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/gym/effect-js/lessons', component: lazyRouteComponent(() => import('./pages/EffectJsLessons.btsx')) })
export const router = createRouter({
  defaultPreload: 'intent',
  routeTree: rootRoute.addChildren([homeRoute, convertersRoute, imageConverterRoute, iconsRoute, iconFavoritesRoute, iconSetRoute, iconDetailRoute, gymRoute, effectJsRoute, effectJsLessonsRoute]),
})

declare module '@octanejs/tanstack-router' {
  interface Register {
    router: typeof router
  }
}
