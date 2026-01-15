'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  /** Whether the picker is open */
  isOpen: boolean
  /** Currently selected date (YYYY-MM-DD) */
  selectedDate: string
  /** Max selectable date (YYYY-MM-DD), defaults to today */
  maxDate?: string | undefined
  /** Called when a date is selected */
  onSelect: (date: string) => void
  /** Called when picker should close */
  onClose: () => void
}

/**
 * DatePicker - 日期选择器组件
 *
 * 极简设计，黑白灰配色
 */
export function DatePicker({
  isOpen,
  selectedDate,
  maxDate,
  onSelect,
  onClose,
}: DatePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const max = maxDate ?? toDateString(new Date())

  // Current view month (YYYY-MM)
  const [viewMonth, setViewMonth] = useState(() => selectedDate.slice(0, 7))

  // Reset view to selected date when opening
  useEffect(() => {
    if (isOpen) {
      setViewMonth(selectedDate.slice(0, 7))
    }
  }, [isOpen, selectedDate])

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  // Navigate months
  const handlePrevMonth = useCallback(() => {
    setViewMonth((prev) => {
      const { year, month } = parseYearMonth(prev)
      const newDate = new Date(year, month - 2, 1)
      return toDateString(newDate).slice(0, 7)
    })
  }, [])

  const handleNextMonth = useCallback(() => {
    setViewMonth((prev) => {
      const { year, month } = parseYearMonth(prev)
      const newDate = new Date(year, month, 1)
      return toDateString(newDate).slice(0, 7)
    })
  }, [])

  // Check if next month is disabled
  const nextMonthDisabled = useMemo(() => {
    const { year, month } = parseYearMonth(viewMonth)
    const nextMonth = new Date(year, month, 1)
    const { year: maxYear, month: maxMonth } = parseYearMonth(max.slice(0, 7))
    const maxDate = new Date(maxYear, maxMonth - 1, 1)
    return nextMonth > maxDate
  }, [viewMonth, max])

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const { year, month } = parseYearMonth(viewMonth)
    const firstDay = new Date(year, month - 1, 1)
    const lastDay = new Date(year, month, 0)
    const daysInMonth = lastDay.getDate()
    const startWeekday = firstDay.getDay()

    const days: Array<{ date: string; day: number; isCurrentMonth: boolean; isDisabled: boolean }> = []

    // Previous month padding
    const prevMonth = new Date(year, month - 2, 1)
    const prevMonthDays = new Date(year, month - 1, 0).getDate()
    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = prevMonthDays - i
      const dateStr = toDateString(new Date(prevMonth.getFullYear(), prevMonth.getMonth(), d))
      days.push({ date: dateStr, day: d, isCurrentMonth: false, isDisabled: false })
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = toDateString(new Date(year, month - 1, d))
      days.push({ date: dateStr, day: d, isCurrentMonth: true, isDisabled: dateStr > max })
    }

    // Next month padding
    const remaining = 42 - days.length // 6 rows * 7 days
    const nextMonthDate = new Date(year, month, 1)
    for (let d = 1; d <= remaining; d++) {
      const dateStr = toDateString(new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), d))
      days.push({ date: dateStr, day: d, isCurrentMonth: false, isDisabled: dateStr > max })
    }

    return days
  }, [viewMonth, max])

  // Month/year display
  const monthYearDisplay = useMemo(() => {
    const { year, month } = parseYearMonth(viewMonth)
    return `${year}年${month}月`
  }, [viewMonth])

  const handleDateSelect = useCallback(
    (date: string) => {
      if (date > max) return
      onSelect(date)
      onClose()
    },
    [max, onSelect, onClose]
  )

  const weekdays = ['日', '一', '二', '三', '四', '五', '六']

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-black/20"
            aria-hidden="true"
          />

          {/* Picker */}
          <motion.div
            ref={containerRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed left-1/2 top-1/2 z-50 w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-background p-4 shadow-xl ring-1 ring-black/5"
            role="dialog"
            aria-modal="true"
            aria-label="选择日期"
          >
            {/* Header */}
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="上个月"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="font-medium text-foreground">{monthYearDisplay}</span>
              <button
                type="button"
                onClick={handleNextMonth}
                disabled={nextMonthDisabled}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
                  nextMonthDisabled
                    ? 'cursor-not-allowed text-muted-foreground/40'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
                aria-label="下个月"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Weekday headers */}
            <div className="mb-1 grid grid-cols-7 gap-1">
              {weekdays.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-medium text-muted-foreground"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map(({ date, day, isCurrentMonth, isDisabled }) => {
                const isSelected = date === selectedDate
                const isToday = date === toDateString(new Date())

                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => handleDateSelect(date)}
                    disabled={isDisabled}
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-full text-sm transition-colors',
                      !isCurrentMonth && 'text-muted-foreground/50',
                      isCurrentMonth && !isSelected && !isDisabled && 'text-foreground hover:bg-muted',
                      isSelected && 'bg-foreground text-background',
                      isToday && !isSelected && 'ring-1 ring-foreground/30',
                      isDisabled && 'cursor-not-allowed opacity-30'
                    )}
                    aria-label={date}
                    aria-selected={isSelected}
                  >
                    {day}
                  </button>
                )
              })}
            </div>

            {/* Today shortcut */}
            <div className="mt-3 border-t border-border pt-3">
              <button
                type="button"
                onClick={() => handleDateSelect(toDateString(new Date()))}
                className="w-full rounded-md py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                今天
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
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
 * Parse YYYY-MM string to year and month numbers
 */
function parseYearMonth(yearMonth: string): { year: number; month: number } {
  const year = Number.parseInt(yearMonth.slice(0, 4), 10)
  const month = Number.parseInt(yearMonth.slice(5, 7), 10)
  return { year, month }
}
