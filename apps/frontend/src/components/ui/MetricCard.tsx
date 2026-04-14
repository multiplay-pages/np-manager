import type { ReactNode } from 'react'
import { cx } from './styles'

interface MetricCardProps {
  title: string
  value: number | string
  detail?: ReactNode
  active?: boolean
  onClick?: () => void
}

export function MetricCard({ title, value, detail, active = false, onClick }: MetricCardProps) {
  const content = (
    <>
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-500">
        {title}
      </span>
      <span className="mt-3 block text-3xl font-semibold tracking-tight text-ink-900">
        {value}
      </span>
      {detail && <span className="mt-2 block text-xs leading-5 text-ink-500">{detail}</span>}
    </>
  )

  const className = cx(
    'rounded-panel border p-4 text-left transition-colors',
    active
      ? 'border-brand-500 bg-brand-50 shadow-soft'
      : 'border-line bg-surface hover:border-brand-200 hover:bg-brand-50/60',
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
