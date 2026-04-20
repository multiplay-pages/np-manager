// @vitest-environment jsdom
import { isValidElement, type ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { ROUTES } from '@/constants/routes'
import { AdminOnlyRoute, router } from './router'

function findAppRoute(path: string) {
  const appRoute = router.routes.find((route) => route.path === '/')
  return appRoute?.children?.find((route) => route.path === path)
}

function getRouteElement(path: string): ReactElement | undefined {
  const route = findAppRoute(path)
  if (!route || !('element' in route)) return undefined

  return route.element as ReactElement
}

describe('notification diagnostics routes', () => {
  it.each([ROUTES.NOTIFICATION_ATTEMPTS, ROUTES.NOTIFICATION_FAILURES])(
    'protects %s with AdminOnlyRoute',
    (path) => {
      const element = getRouteElement(path)

      expect(element).toBeTruthy()
      expect(isValidElement(element)).toBe(true)
      expect(element?.type).toBe(AdminOnlyRoute)
    },
  )
})
