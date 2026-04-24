import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from './styles'

export type DataFieldVariant = 'default' | 'compact'

export interface DataFieldProps extends HTMLAttributes<HTMLDivElement> {
  label: ReactNode
  value: ReactNode
  mono?: boolean
  emptyText?: ReactNode
  variant?: DataFieldVariant
}

export function DataField({
  className,
  emptyText = '-',
  label,
  mono = false,
  value,
  variant = 'default',
  ...props
}: DataFieldProps) {
  const isEmpty = value === null || value === undefined || value === ''

  return (
    <div className={cx(variant === 'compact' ? 'space-y-0.5' : 'space-y-1', className)} {...props}>
      <dt
        className={cx(
          'font-semibold uppercase tracking-[0.08em] text-ink-400',
          variant === 'compact' ? 'text-[11px]' : 'text-xs',
        )}
      >
        {label}
      </dt>
      <dd
        className={cx(
          'break-words font-medium text-ink-800',
          mono && 'font-mono',
          variant === 'compact' ? 'text-xs' : 'text-sm',
        )}
      >
        {isEmpty ? <span className="font-normal text-ink-400">{emptyText}</span> : value}
      </dd>
    </div>
  )
}
