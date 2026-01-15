'use client'

import { cn } from '@/lib/utils'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'

interface FABProps {
  /** Button icon */
  icon: ReactNode
  /** Click handler */
  onClick?: () => void
  /** Additional CSS classes */
  className?: string
  /** Accessible label */
  'aria-label'?: string
}

/**
 * FAB - 浮动操作按钮组件
 *
 * 设计规范:
 * - 尺寸: 56×56px
 * - 背景: Primary (黑/白反转)
 * - 图标: 背景反色
 * - 阴影: md
 * - Hover: scale(1.05) + 阴影增强
 */
export function FAB({ icon, onClick, className, 'aria-label': ariaLabel = '新建日记' }: FABProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={cn(
        'fixed bottom-6 left-1/2 z-50 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-sm bg-primary text-primary-foreground shadow-md transition-shadow hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        className
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label={ariaLabel}
    >
      {icon}
    </motion.button>
  )
}
