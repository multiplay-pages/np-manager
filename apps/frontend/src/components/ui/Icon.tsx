import type { LucideIcon, LucideProps } from 'lucide-react'
import { cx } from './styles'

const iconSizes = {
  sm: 'h-4 w-4',
  md: 'h-[18px] w-[18px]',
  lg: 'h-5 w-5',
} as const

interface AppIconProps extends Omit<LucideProps, 'ref'> {
  icon: LucideIcon
  size?: keyof typeof iconSizes
}

export function AppIcon({ icon: Icon, size = 'sm', className, ...props }: AppIconProps) {
  return <Icon aria-hidden="true" className={cx('shrink-0', iconSizes[size], className)} {...props} />
}
