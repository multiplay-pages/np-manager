import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from './styles'

export type BadgeTone = 'neutral' | 'brand' | 'green' | 'emerald' | 'amber' | 'red' | 'orange'

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-ink-100 text-ink-650 ring-line',
  brand: 'bg-brand-50 text-brand-700 ring-brand-200',
  green: 'bg-green-50 text-green-700 ring-green-200',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  orange: 'bg-orange-50 text-orange-700 ring-orange-200',
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
  icon?: ReactNode
  leadingDot?: boolean
}

export function Badge({
  children,
  className,
  icon,
  leadingDot = false,
  tone = 'neutral',
  ...props
}: BadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex min-h-6 items-center gap-1.5 rounded-ui px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {leadingDot && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />}
      {icon}
      {children}
    </span>
  )
}
