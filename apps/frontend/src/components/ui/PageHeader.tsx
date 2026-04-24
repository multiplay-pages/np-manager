import type { ReactNode } from 'react'

interface PageHeaderProps {
  eyebrow?: string
  icon?: ReactNode
  title: string
  description?: ReactNode
  actions?: ReactNode
}

export function PageHeader({ eyebrow, icon, title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <div
            aria-hidden="true"
            className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-ui border border-line bg-surface shadow-sm"
          >
            {icon}
          </div>
        )}
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
              {eyebrow}
            </p>
          )}
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink-900">{title}</h1>
          {description && <div className="mt-2 text-sm leading-6 text-ink-500">{description}</div>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
