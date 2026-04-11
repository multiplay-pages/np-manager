/**
 * Stałe ścieżek routera aplikacji.
 * Użycie stałych zamiast stringów eliminuje literówki i ułatwia refactoring.
 */
export const ROUTES = {
  // Autoryzacja
  LOGIN: '/login',
  FORCE_PASSWORD_CHANGE: '/force-password-change',

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

  // Operatorzy (słownik)
  OPERATORS: '/operators',

  // Administracja
  ADMIN: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_USER_NEW: '/admin/users/new',
  ADMIN_USER_DETAIL: '/admin/users/:id',
  ADMIN_OPERATORS: '/admin/operators',
  ADMIN_COMMUNICATION_TEMPLATES: '/admin/communication-templates',
  ADMIN_PORTING_NOTIFICATION_SETTINGS: '/admin/porting-notification-settings',
  ADMIN_NOTIFICATION_FALLBACK_SETTINGS: '/admin/notification-fallback-settings',
  ADMIN_COMMUNICATION_TEMPLATE_NEW: '/admin/communication-templates/new',
  ADMIN_COMMUNICATION_TEMPLATE_DETAIL: '/admin/communication-templates/:id',
  ADMIN_COMMUNICATION_TEMPLATE_EDIT: '/admin/communication-templates/:id/edit',
  NOTIFICATION_FAILURES: '/notifications/failures',

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
