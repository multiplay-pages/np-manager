import type { ReactNode } from 'react'
import { cx } from './styles'

type MetricCardTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger'

interface MetricCardProps {
  title: string
  value: number | string
  detail?: ReactNode
  description?: ReactNode
  tone?: MetricCardTone
  active?: boolean
  onClick?: () => void
}

const toneClasses: Record<MetricCardTone, string> = {
  neutral: 'border-line bg-surface hover:border-brand-200 hover:bg-brand-50/60',
  brand: 'border-brand-200 bg-brand-50/70 text-brand-900 hover:border-brand-300',
  success: 'border-emerald-200 bg-emerald-50/70 text-emerald-900 hover:border-emerald-300',
  warning: 'border-amber-200 bg-amber-50/70 text-amber-900 hover:border-amber-300',
  danger: 'border-red-200 bg-red-50/70 text-red-900 hover:border-red-300',
}

export function MetricCard({
  title,
  value,
  detail,
  description,
  tone = 'neutral',
  active = false,
  onClick,
}: MetricCardProps) {
  const content = (
    <>
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-500">
        {title}
      </span>
      <span className="mt-3 block text-3xl font-semibold tracking-tight text-ink-900">
        {value}
      </span>
      {description && (
        <span className="mt-1 block text-sm leading-5 text-ink-600">{description}</span>
      )}
      {detail && <span className="mt-2 block text-xs leading-5 text-ink-500">{detail}</span>}
    </>
  )

  const className = cx(
    'rounded-panel border p-4 text-left transition-colors',
    active
      ? 'border-brand-500 bg-brand-50 shadow-soft'
      : toneClasses[tone],
  )

  if (!onClick) {
    return <div className={className}>{content}</div>
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        className,
        'w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
      )}
    >
      {content}
    </button>
  )
}
