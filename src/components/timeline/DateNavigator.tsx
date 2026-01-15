'use client'

import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ComponentPropsWithoutRef } from 'react'

interface DateNavigatorProps extends ComponentPropsWithoutRef<'div'> {
  /** Current selected date (YYYY-MM-DD) */
  date: string
  /** Navigate to previous day */
  onPrevious: () => void
  /** Navigate to next day */
  onNext: () => void
  /** Navigate to specific date */
  onDateClick?: () => void
  /** Disable next button (e.g., when at today) */
  disableNext?: boolean
}

/**
 * DateNavigator - 日期导航组件
 *
 * 设计规范:
 * - 图标: 20px, Primary 色
 * - 日期文字: Primary, 字重 500
 * - 按钮: 无背景, hover 时 Surface 背景
 * - 键盘导航: ← → 切换日期
 */
export function DateNavigator({
  date,
  onPrevious,
  onNext,
  onDateClick,
  disableNext = false,
  className,
  ...props
}: DateNavigatorProps) {
  const formattedDate = formatDateDisplay(date)
  const isToday = date === getTodayString()

  return (
    <div
      className={cn('flex items-center justify-center gap-2', className)}
      role="navigation"
      aria-label="日期导航"
      {...props}
    >
      {/* Previous Day Button */}
      <button
        type="button"
        onClick={onPrevious}
        className="touch-target flex items-center justify-center rounded-sm text-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:opacity-60"
        aria-label="前一天"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      {/* Date Display */}
      <button
        type="button"
        onClick={onDateClick}
        className="touch-target min-w-[120px] rounded-sm px-3 py-1 text-center font-medium text-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        aria-label="选择日期"
      >
        {isToday ? '今天' : formattedDate}
      </button>

      {/* Next Day Button */}
      <button
        type="button"
        onClick={onNext}
        disabled={disableNext}
        className={cn(
          'touch-target flex items-center justify-center rounded-sm text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          disableNext ? 'cursor-not-allowed opacity-40' : 'hover:bg-surface active:opacity-60'
        )}
        aria-label="后一天"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  )
}

/**
 * Format date string for display
 * YYYY-MM-DD -> "M月D日 周X"
 */
function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const weekday = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()]

  return `${month}月${day}日 周${weekday}`
}

/**
 * Format date to YYYY-MM-DD string
 */
function toDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get today's date string in YYYY-MM-DD format
 */
function getTodayString(): string {
  return toDateString(new Date())
}

/**
 * Date utility functions for navigation
 */
export const dateUtils = {
  /** Get previous day */
  getPreviousDay(dateStr: string): string {
    const date = new Date(dateStr)
    date.setDate(date.getDate() - 1)
    return toDateString(date)
  },

  /** Get next day */
  getNextDay(dateStr: string): string {
    const date = new Date(dateStr)
    date.setDate(date.getDate() + 1)
    return toDateString(date)
  },

  /** Get today */
  getToday(): string {
    return getTodayString()
  },

  /** Check if date is today */
  isToday(dateStr: string): boolean {
    return dateStr === getTodayString()
  },

  /** Check if date is in the future */
  isFuture(dateStr: string): boolean {
    return dateStr > getTodayString()
  },
}
