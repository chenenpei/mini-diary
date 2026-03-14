'use client'

import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  /** Main title */
  title?: string
  /** Description text */
  description?: string
  /** Additional CSS classes */
  className?: string
}

/**
 * EmptyState - 空状态组件
 *
 * 设计规范:
 * - 居中显示
 * - 黑白线条插画，简洁几何形状
 * - 文案简短直接，不超过 15 字
 */
export function EmptyState({ title, description, className }: EmptyStateProps) {
  const { t } = useTranslation('timeline')
  const displayTitle = title ?? t('emptyTitle')
  const displayDescription = description ?? t('emptyDescription')
  return (
    <motion.div
      className={cn('flex flex-col items-center justify-center py-16 text-center', className)}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Minimalist illustration - geometric page icon */}
      <svg
        className="mb-8 h-16 w-16 text-muted-foreground/30"
        viewBox="0 0 48 48"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        role="img"
        aria-hidden="true"
      >
        {/* Page with corner fold */}
        <path d="M10 4 H32 L38 10 V44 H10 Z" />
        <path d="M32 4 V10 H38" />
        {/* Minimal text lines */}
        <line x1="16" y1="20" x2="32" y2="20" />
        <line x1="16" y1="26" x2="28" y2="26" />
      </svg>

      <h3 className="text-xl font-semibold tracking-tight text-foreground">{displayTitle}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{displayDescription}</p>
    </motion.div>
  )
}

interface SparseHintProps {
  /** Hint text */
  text?: string
  /** Additional CSS classes */
  className?: string
}

/**
 * SparseHint - 稀疏状态轻提示组件
 *
 * 设计规范:
 * - 放在内容之后（底部），不喧宾夺主
 * - 使用 Tertiary 色，降低视觉权重
 * - 不强制用户多写，仅轻提示
 */
export function SparseHint({ text, className }: SparseHintProps) {
  const { t } = useTranslation('timeline')
  const displayText = text ?? t('sparseHint')

  return (
    <div className={cn('flex flex-1 items-center justify-center', className)}>
      <p className="text-sm text-muted-foreground">{displayText}</p>
    </div>
  )
}
