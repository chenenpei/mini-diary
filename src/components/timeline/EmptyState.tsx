'use client'

import { cn } from '@/lib/utils'
import { motion } from 'motion/react'

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
export function EmptyState({
  title = '今天还是一片空白',
  description = '点击 + 开始记录',
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      className={cn('flex flex-col items-center justify-center py-16 text-center', className)}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Minimalist illustration - geometric diary icon */}
      <svg
        className="mb-6 h-24 w-24 text-muted-foreground/40"
        viewBox="0 0 100 100"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Book/diary outline */}
        <rect x="20" y="15" width="60" height="70" rx="2" />
        {/* Spine */}
        <line x1="30" y1="15" x2="30" y2="85" />
        {/* Lines representing text */}
        <line x1="40" y1="30" x2="70" y2="30" />
        <line x1="40" y1="42" x2="65" y2="42" />
        <line x1="40" y1="54" x2="70" y2="54" />
        {/* Pen */}
        <line x1="75" y1="65" x2="85" y2="55" />
        <line x1="85" y1="55" x2="88" y2="58" />
        <line x1="88" y1="58" x2="78" y2="68" />
      </svg>

      <h3 className="text-lg font-medium text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
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
export function SparseHint({
  text = '继续记录今天的点滴',
  className,
}: SparseHintProps) {
  return (
    <p className={cn('py-4 text-center text-sm text-muted-foreground', className)}>
      {text}
    </p>
  )
}
