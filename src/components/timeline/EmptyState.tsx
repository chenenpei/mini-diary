'use client'

import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { easing } from '@/lib/motion'
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
  const prefersReducedMotion = useReducedMotion()
  const displayTitle = title ?? t('emptyTitle')
  const displayDescription = description ?? t('emptyDescription')
  return (
    <motion.div
      className={cn(
        'flex min-h-0 w-full flex-1 flex-col items-center justify-center px-0 py-10 text-center sm:py-12',
        className,
      )}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : { duration: 0.28, ease: easing.smooth }
      }
    >
      <div className="flex max-w-sm flex-col items-center">
        {/* Minimalist illustration - geometric page icon */}
        <svg
          className="mb-6 h-16 w-16 text-muted-foreground/35 sm:mb-7"
          viewBox="0 0 48 48"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
          role="presentation"
          focusable="false"
        >
          {/* Page with corner fold */}
          <path d="M10 4 H32 L38 10 V44 H10 Z" />
          <path d="M32 4 V10 H38" />
          {/* Minimal text lines */}
          <line x1="16" y1="20" x2="32" y2="20" />
          <line x1="16" y1="26" x2="28" y2="26" />
        </svg>

        <h3 className="text-xl font-semibold leading-snug tracking-tight text-foreground">
          {displayTitle}
        </h3>
        <p className="mt-2.5 text-balance text-sm leading-relaxed text-muted-foreground sm:max-w-[30ch]">
          {displayDescription}
        </p>
      </div>
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
 * SparseHint - 稀疏状态轻提示
 *
 * Placed directly after the list (not pinned to the viewport) so the hint reads
 * as a footnote to the day, not a floating bug between content and the FAB.
 */
export function SparseHint({ text, className }: SparseHintProps) {
  const { t } = useTranslation('timeline')
  const displayText = text ?? t('sparseHint')

  return (
    <div
      className={cn('mt-5 border-t border-border pt-4', className)}
      role="note"
    >
      <p className="text-pretty text-xs leading-relaxed text-muted-foreground/90 sm:text-sm">
        {displayText}
      </p>
    </div>
  )
}
