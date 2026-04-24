import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from './styles'

export type SectionCardPadding = 'none' | 'sm' | 'md'

const paddingClasses: Record<SectionCardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
}

export interface SectionCardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title?: ReactNode
  description?: ReactNode
  action?: ReactNode
  children: ReactNode
  padding?: SectionCardPadding
}

export function SectionCard({
  action,
  children,
  className,
  description,
  padding = 'md',
  title,
  ...props
}: SectionCardProps) {
  const hasHeader = title || description || action

  return (
    <section
      className={cx('rounded-panel border border-line bg-surface shadow-sm', className)}
      {...props}
    >
      {hasHeader && (
        <div
          className={cx(
            'flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-start sm:justify-between',
            padding === 'none' && 'border-b-0',
          )}
        >
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold text-ink-900">{title}</h2>}
            {description && (
              <div className="mt-1 text-sm leading-6 text-ink-500">{description}</div>
            )}
          </div>
          {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
        </div>
      )}
      <div className={paddingClasses[padding]}>{children}</div>
    </section>
  )
}
