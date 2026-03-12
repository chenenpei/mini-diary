'use client'

import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn, triggerHaptic } from '@/lib/utils'

interface FABProps {
  /** Button icon */
  icon: ReactNode
  /** Click handler */
  onClick?: () => void
  /** Additional CSS classes */
  className?: string
  /** Accessible label */
  'aria-label'?: string
  /** Play a subtle one-time pulse animation to draw attention */
  pulse?: boolean
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
export function FAB({ icon, onClick, className, 'aria-label': ariaLabel, pulse }: FABProps) {
  const { t } = useTranslation('entry')
  const label = ariaLabel ?? t('create')

  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={cn(
        'fixed bottom-6 left-1/2 z-50 flex h-14 w-14 -translate-x-1/2 touch-manipulation items-center justify-center rounded-sm bg-foreground text-background shadow-md transition-shadow hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        className,
      )}
      {...(pulse ? { animate: { scale: [1, 1.08, 1] }, transition: { duration: 0.5, ease: [0.25, 1, 0.5, 1] as const, delay: 0.6 } } : {})}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onTapStart={() => triggerHaptic(10)}
      aria-label={label}
    >
      {icon}
    </motion.button>
  )
}
