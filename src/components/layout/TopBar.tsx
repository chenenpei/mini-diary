'use client'

import { Menu, Search } from 'lucide-react'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface TopBarProps extends ComponentPropsWithoutRef<'header'> {
  /** Left action button click handler (menu) */
  onMenuClick?: () => void
  /** Right action button click handler (search) */
  onSearchClick?: () => void
  /** Center content (typically date or title) */
  children?: ReactNode
  /** Show menu button */
  showMenu?: boolean
  /** Show search button */
  showSearch?: boolean
}

/**
 * TopBar - 顶部导航栏组件
 *
 * 设计规范:
 * - 背景: Background
 * - 底部边框: 1px Border
 * - 图标: 24×24px, Primary 色
 * - 按钮: 无背景, hover 时 Surface 背景
 */
export function TopBar({
  onMenuClick,
  onSearchClick,
  children,
  showMenu = true,
  showSearch = true,
  className,
  ...props
}: TopBarProps) {
  const { t } = useTranslation()

  return (
    <header
      className={cn(
        'sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4',
        className,
      )}
      {...props}
    >
      {/* Left: Menu Button */}
      <div className="flex w-12 justify-start">
        {showMenu && (
          <button
            type="button"
            onClick={onMenuClick}
            className="touch-target flex items-center justify-center rounded-sm text-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:opacity-60"
            aria-label={t('openMenu')}
          >
            <Menu className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Center: Title/Date */}
      <div className="flex-1 text-center font-medium text-foreground">{children}</div>

      {/* Right: Search Button */}
      <div className="flex w-12 justify-end">
        {showSearch && (
          <button
            type="button"
            onClick={onSearchClick}
            className="touch-target flex items-center justify-center rounded-sm text-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:opacity-60"
            aria-label={t('search')}
          >
            <Search className="h-6 w-6" />
          </button>
        )}
      </div>
    </header>
  )
}
