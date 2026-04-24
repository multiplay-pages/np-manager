import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { Button } from './Button'
import { cx } from './styles'

export interface ActionMenuItem {
  id?: string
  label: string
  icon?: ReactNode
  description?: ReactNode
  disabled?: boolean
  tone?: 'normal' | 'danger'
  onClick: () => void | boolean | Promise<void | boolean>
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
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({})
  const menuRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  function updateMenuPosition() {
    const trigger = triggerRef.current
    if (!trigger) return

    const rect = trigger.getBoundingClientRect()
    const menuWidth = 220
    const viewportPadding = 12
    const horizontalLeft =
      align === 'end'
        ? Math.max(viewportPadding, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - viewportPadding))
        : Math.max(viewportPadding, Math.min(rect.left, window.innerWidth - menuWidth - viewportPadding))

    const estimatedMenuHeight = Math.min(320, Math.max(56, items.length * 46 + 12))
    const hasSpaceBelow = window.innerHeight - rect.bottom >= estimatedMenuHeight + viewportPadding

    setMenuStyle({
      left: horizontalLeft,
      ...(hasSpaceBelow
        ? { top: rect.bottom + 6, bottom: 'auto' }
        : { top: 'auto', bottom: Math.max(viewportPadding, window.innerHeight - rect.top + 6) }),
    })
  }

  function closeWhenAllowed(result: void | boolean | Promise<void | boolean>) {
    if (result instanceof Promise) {
      void result.then((shouldClose) => {
        if (shouldClose !== false) {
          setIsOpen(false)
        }
      }).catch(() => {})
      return
    }

    if (result !== false) {
      setIsOpen(false)
    }
  }

  useEffect(() => {
    if (!isOpen) return

    updateMenuPosition()

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
    window.addEventListener('resize', updateMenuPosition)
    window.addEventListener('scroll', updateMenuPosition, true)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', updateMenuPosition)
      window.removeEventListener('scroll', updateMenuPosition, true)
    }
  }, [align, isOpen, items.length])

  return (
    <div ref={menuRef} className={cx('relative inline-flex', className)}>
      <Button
        ref={triggerRef}
        type="button"
        variant="ghost"
        size={triggerLabel ? 'sm' : 'icon'}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={triggerAriaLabel ?? triggerLabel}
        onClick={() => {
          updateMenuPosition()
          setIsOpen((current) => !current)
        }}
      >
        <MoreHorizontal aria-hidden="true" className="h-4 w-4 shrink-0" />
        {triggerLabel}
      </Button>

      {isOpen && (
        <div
          role="menu"
          style={menuStyle}
          className={cx(
            'fixed z-50 max-h-[min(320px,calc(100vh-24px))] min-w-[220px] overflow-y-auto rounded-ui border border-line bg-surface p-1.5 shadow-panel',
          )}
        >
          {items.map((item) => (
            <button
              key={item.id ?? item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              className={cx(
                'flex w-full items-start gap-2 rounded-ui px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                item.tone === 'danger'
                  ? 'text-red-700 hover:bg-red-50'
                  : 'text-ink-700 hover:bg-brand-50 hover:text-brand-700',
              )}
              onClick={() => {
                if (item.disabled) return
                closeWhenAllowed(item.onClick())
              }}
            >
              {item.icon && (
                <span aria-hidden="true" className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                  {item.icon}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{item.label}</span>
                {item.description && (
                  <span className="mt-0.5 block text-xs leading-5 text-ink-500">{item.description}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
