import assignUserIcon from '@/assets/icons/assign-user.svg'
import clientsIcon from '@/assets/icons/clients.svg'
import copyIcon from '@/assets/icons/copy.svg'
import copyLinkIcon from '@/assets/icons/copy-link.svg'
import dashboardIcon from '@/assets/icons/dashboard.svg'
import emptyStateIcon from '@/assets/icons/empty-state.svg'
import needsActionTodayIcon from '@/assets/icons/needs-action-today.svg'
import noDateIcon from '@/assets/icons/no-date.svg'
import notificationAttemptsIcon from '@/assets/icons/notification-attempts.svg'
import notificationErrorsIcon from '@/assets/icons/notification-errors.svg'
import notificationFallbackIcon from '@/assets/icons/notification-fallback.svg'
import notificationsIcon from '@/assets/icons/notifications.svg'
import openRequestIcon from '@/assets/icons/open-request.svg'
import operatorsIcon from '@/assets/icons/operators.svg'
import reportsIcon from '@/assets/icons/reports.svg'
import requestQueueIcon from '@/assets/icons/request-queue.svg'
import systemModeIcon from '@/assets/icons/system-mode.svg'
import tasksIcon from '@/assets/icons/tasks.svg'
import templatesIcon from '@/assets/icons/templates.svg'
import urgentIcon from '@/assets/icons/urgent.svg'
import usersIcon from '@/assets/icons/users.svg'
import warningIcon from '@/assets/icons/warning.svg'

export const appIconAssets = {
  'assign-user': assignUserIcon,
  clients: clientsIcon,
  copy: copyIcon,
  'copy-link': copyLinkIcon,
  dashboard: dashboardIcon,
  'empty-state': emptyStateIcon,
  'needs-action-today': needsActionTodayIcon,
  'no-date': noDateIcon,
  'notification-attempts': notificationAttemptsIcon,
  'notification-errors': notificationErrorsIcon,
  'notification-fallback': notificationFallbackIcon,
  notifications: notificationsIcon,
  'open-request': openRequestIcon,
  operators: operatorsIcon,
  reports: reportsIcon,
  'request-queue': requestQueueIcon,
  'system-mode': systemModeIcon,
  tasks: tasksIcon,
  templates: templatesIcon,
  urgent: urgentIcon,
  users: usersIcon,
  warning: warningIcon,
} as const

export type AppIconAssetName = keyof typeof appIconAssets
