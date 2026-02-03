'use client'

import { MoreHorizontal } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface DropdownItem {
  /** Unique key */
  key: string
  /** Display label */
  label: string
  /** Icon component */
  icon?: React.ReactNode
  /** Whether this is a destructive action */
  destructive?: boolean
  /** Click handler */
  onClick: () => void
}

interface DropdownProps {
  /** Menu items */
  items: DropdownItem[]
  /** Trigger button content (default: MoreVertical icon) */
  trigger?: React.ReactNode
  /** Additional CSS classes for trigger button */
  triggerClassName?: string
  /** Additional CSS classes for menu */
  menuClassName?: string
}

/**
 * Dropdown - 下拉菜单组件
 *
 * 设计规范:
 * - 点击触发器显示菜单
 * - 点击外部关闭
 * - 支持键盘导航 (ESC 关闭)
 */
export function Dropdown({ items, trigger, triggerClassName, menuClassName }: DropdownProps) {
  const { t } = useTranslation('common')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsOpen((prev) => !prev)
  }, [])

  const handleItemClick = useCallback((item: DropdownItem) => {
    setIsOpen(false)
    item.onClick()
  }, [])

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [isOpen])

  // ESC to close
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
          triggerClassName,
        )}
        aria-label={t('moreActions')}
        aria-expanded={isOpen}
      >
        {trigger ?? <MoreHorizontal className="h-5 w-5" />}
      </button>

      {/* Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={cn(
              'absolute right-0 top-full z-50 mt-1 min-w-[120px] overflow-hidden rounded-md bg-background py-1 shadow-lg border border-border',
              menuClassName,
            )}
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.1 }}
          >
            {items.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => handleItemClick(item)}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted',
                  item.destructive ? 'text-destructive hover:text-destructive' : 'text-foreground',
                )}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
