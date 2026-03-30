/**
 * Stałe ścieżek routera aplikacji.
 * Użycie stałych zamiast stringów eliminuje literówki i ułatwia refactoring.
 */
export const ROUTES = {
  // Autoryzacja
  LOGIN: '/login',

  // Główny dashboard
  DASHBOARD: '/',

  // Sprawy portabilności
  REQUESTS: '/requests',
  REQUEST_NEW: '/requests/new',
  REQUEST_DETAIL: '/requests/:id',

  // Klienci
  CLIENTS: '/clients',
  CLIENT_NEW: '/clients/new',
  CLIENT_DETAIL: '/clients/:id',
  CLIENT_EDIT: '/clients/:id/edit',

  // Zadania
  TASKS: '/tasks',

  // Raporty
  REPORTS: '/reports',

  // Administracja
  ADMIN: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_OPERATORS: '/admin/operators',
  ADMIN_DOCUMENT_TYPES: '/admin/document-types',
  ADMIN_SETTINGS: '/admin/settings',
  ADMIN_CALENDAR: '/admin/calendar',
} as const

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES]

/**
 * Generuje ścieżkę ze wstawionym parametrem ID.
 * Przykład: buildPath(ROUTES.REQUEST_DETAIL, '123') → '/requests/123'
 */
export function buildPath(route: string, id: string): string {
  return route.replace(':id', id)
}
