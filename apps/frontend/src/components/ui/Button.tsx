import type { ButtonHTMLAttributes, AnchorHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { cx } from './styles'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'icon'

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-600 text-white shadow-soft hover:bg-brand-700 focus-visible:ring-brand-500',
  secondary:
    'border border-line-strong bg-surface text-ink-700 hover:border-brand-300 hover:bg-brand-50 focus-visible:ring-brand-500',
  ghost: 'text-ink-600 hover:bg-ink-100 hover:text-ink-900 focus-visible:ring-brand-500',
  danger:
    'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 focus-visible:ring-red-500',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  icon: 'h-9 w-9 p-0 text-sm',
}

const baseClasses =
  'inline-flex items-center justify-center gap-2 rounded-ui font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  loadingLabel?: string
}

export function Button({
  children,
  className,
  disabled,
  isLoading = false,
  loadingLabel = 'Ladowanie',
  variant = 'secondary',
  size = 'md',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={cx(baseClasses, variantClasses[variant], sizeClasses[size], className)}
      {...props}
    >
      {isLoading ? (
        <>
          <span
            aria-hidden="true"
            className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent opacity-80"
          />
          <span className={cx(size === 'icon' && 'sr-only')}>{loadingLabel}</span>
        </>
      ) : (
        children
      )}
    </button>
  )
}

export interface ButtonLinkProps
  extends LinkProps,
    Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export function ButtonLink({
  className,
  variant = 'secondary',
  size = 'md',
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={cx(baseClasses, variantClasses[variant], sizeClasses[size], className)}
      {...props}
    />
  )
}
