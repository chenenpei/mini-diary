'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ComponentPropsWithoutRef } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n'
import { cn } from '@/lib/utils'

interface DateNavigatorProps extends ComponentPropsWithoutRef<'nav'> {
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
  const { t } = useTranslation('date')
  const formattedDate = formatDateDisplay(date)
  const isToday = date === getTodayString()

  return (
    <nav
      className={cn('flex items-center justify-center gap-2', className)}
      aria-label={t('navigation')}
      {...props}
    >
      {/* Previous Day Button */}
      <button
        type="button"
        onClick={onPrevious}
        className="touch-target flex items-center justify-center rounded-sm text-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:opacity-60"
        aria-label={t('previousDay')}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      {/* Date Display */}
      <button
        type="button"
        onClick={onDateClick}
        className="touch-target min-w-[120px] rounded-sm px-3 py-1 text-center font-medium text-foreground transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        aria-label={t('selectDate')}
      >
        {isToday ? t('today') : formattedDate}
      </button>

      {/* Next Day Button */}
      <button
        type="button"
        onClick={onNext}
        disabled={disableNext}
        className={cn(
          'touch-target flex items-center justify-center rounded-sm text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          disableNext ? 'cursor-not-allowed opacity-60' : 'hover:bg-surface active:opacity-60',
        )}
        aria-label={t('nextDay')}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </nav>
  )
}

/**
 * Format date string for display using Intl.DateTimeFormat
 * zh-CN: "1月15日 周三"
 * en: "Wed, Jan 15"
 */
function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr)
  const locale = i18n.language === 'en' ? 'en-US' : 'zh-CN'

  if (locale === 'zh-CN') {
    const month = date.getMonth() + 1
    const day = date.getDate()
    const weekday = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()]
    return `${month}月${day}日 周${weekday}`
  }

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date)
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
