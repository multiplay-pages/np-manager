import type { DetailsHTMLAttributes, ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cx } from './styles'

export interface DisclosureCardProps
  extends Omit<DetailsHTMLAttributes<HTMLDetailsElement>, 'title'> {
  title: ReactNode
  description: ReactNode
  children: ReactNode
}

export function DisclosureCard({
  children,
  className,
  description,
  title,
  ...props
}: DisclosureCardProps) {
  return (
    <details
      className={cx('group rounded-panel border border-line bg-surface shadow-sm', className)}
      {...props}
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 rounded-panel px-5 py-4 transition-colors hover:bg-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-ink-900">{title}</span>
          <span className="mt-1 block text-sm leading-6 text-ink-500">{description}</span>
        </span>
        <span
          aria-hidden="true"
          className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-ui border border-line bg-surface text-ink-500 transition-transform group-open:rotate-180"
        >
          <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0" />
        </span>
      </summary>
      <div className="border-t border-line px-5 py-5">{children}</div>
    </details>
  )
}
