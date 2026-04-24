import type { ImgHTMLAttributes } from 'react'
import { appIconAssets, type AppIconAssetName } from '@/lib/appIconAssets'
import { cx } from './styles'

export type { AppIconAssetName } from '@/lib/appIconAssets'

const assetIconSizes = {
  sm: 'h-4 w-4',
  md: 'h-[18px] w-[18px]',
  lg: 'h-5 w-5',
  xl: 'h-6 w-6',
} as const

export interface AppIconAssetProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> {
  name: AppIconAssetName
  size?: keyof typeof assetIconSizes
  decorative?: boolean
  alt?: string
}

export function AppIconAsset({
  alt = '',
  className,
  decorative = true,
  draggable = false,
  name,
  size = 'sm',
  ...props
}: AppIconAssetProps) {
  return (
    <img
      src={appIconAssets[name]}
      alt={decorative ? '' : alt}
      aria-hidden={decorative ? true : undefined}
      className={cx('shrink-0 object-contain', assetIconSizes[size], className)}
      draggable={draggable}
      {...props}
    />
  )
}
