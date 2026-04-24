import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from './styles'

export type AlertBannerTone = 'info' | 'warning' | 'success' | 'danger' | 'neutral'

const toneClasses: Record<AlertBannerTone, string> = {
  info: 'border-brand-200 bg-brand-50/80 text-brand-900',
  warning: 'border-amber-200 bg-amber-50/80 text-amber-900',
  success: 'border-emerald-200 bg-emerald-50/80 text-emerald-900',
  danger: 'border-red-200 bg-red-50/90 text-red-900',
  neutral: 'border-line bg-ink-50 text-ink-800',
}

const descriptionClasses: Record<AlertBannerTone, string> = {
  info: 'text-brand-800',
  warning: 'text-amber-800',
  success: 'text-emerald-800',
  danger: 'text-red-800',
  neutral: 'text-ink-600',
}

export interface AlertBannerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  tone?: AlertBannerTone
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
}

export function AlertBanner({
  action,
  className,
  description,
  title,
  tone = 'neutral',
  ...props
}: AlertBannerProps) {
  return (
    <div
      className={cx('rounded-panel border px-4 py-3 shadow-sm', toneClasses[tone], className)}
      role={tone === 'danger' ? 'alert' : 'status'}
      {...props}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          {description && (
            <div className={cx('mt-1 text-sm leading-6', descriptionClasses[tone])}>
              {description}
            </div>
          )}
        </div>
        {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
      </div>
    </div>
  )
}
