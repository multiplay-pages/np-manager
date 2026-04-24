import { useEffect, useRef, useState, type ReactNode } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { Button } from './Button'
import { cx } from './styles'

export interface ActionMenuItem {
  id?: string
  label: string
  description?: ReactNode
  disabled?: boolean
  tone?: 'normal' | 'danger'
  onClick: () => void
}

export interface ActionMenuProps {
  items: ActionMenuItem[]
  triggerLabel?: string
  triggerAriaLabel?: string
  align?: 'start' | 'end'
  className?: string
}

export function ActionMenu({
  align = 'end',
  className,
  items,
  triggerAriaLabel,
  triggerLabel = 'Akcje',
}: ActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isOpen) return

    function handlePointerDown(event: MouseEvent) {
      if (!(event.target instanceof Node)) return
      if (menuRef.current?.contains(event.target)) return
      setIsOpen(false)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div ref={menuRef} className={cx('relative inline-flex', className)}>
      <Button
        type="button"
        variant="ghost"
        size={triggerLabel ? 'sm' : 'icon'}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={triggerAriaLabel ?? triggerLabel}
        onClick={() => setIsOpen((current) => !current)}
      >
        <MoreHorizontal aria-hidden="true" className="h-4 w-4 shrink-0" />
        {triggerLabel}
      </Button>

      {isOpen && (
        <div
          role="menu"
          className={cx(
            'absolute top-10 z-30 min-w-[220px] rounded-ui border border-line bg-surface p-1.5 shadow-panel',
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((item) => (
            <button
              key={item.id ?? item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              className={cx(
                'flex w-full flex-col rounded-ui px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                item.tone === 'danger'
                  ? 'text-red-700 hover:bg-red-50'
                  : 'text-ink-700 hover:bg-brand-50 hover:text-brand-700',
              )}
              onClick={() => {
                if (item.disabled) return
                item.onClick()
                setIsOpen(false)
              }}
            >
              <span className="text-sm font-semibold">{item.label}</span>
              {item.description && (
                <span className="mt-0.5 text-xs leading-5 text-ink-500">{item.description}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
