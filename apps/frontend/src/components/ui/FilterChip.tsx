import type { ButtonHTMLAttributes } from 'react'
import { cx } from './styles'

interface FilterChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
}

export function FilterChip({ active = false, className, type = 'button', ...props }: FilterChipProps) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex h-8 items-center justify-center rounded-ui border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
        active
          ? 'border-brand-600 bg-brand-600 text-white shadow-soft'
          : 'border-line-strong bg-surface text-ink-650 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700',
        className,
      )}
      {...props}
    />
  )
}
