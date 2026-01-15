'use client'

import { cn } from '@/lib/utils'

interface SkeletonProps {
  /** Additional CSS classes */
  className?: string
}

/**
 * Skeleton - 基础骨架屏组件
 *
 * 设计规范:
 * - Surface 背景
 * - pulse 动画 1s
 * - 最小显示 300ms
 */
function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('animate-pulse rounded-md bg-surface', className)} />
}

/**
 * DiaryCardSkeleton - 日记卡片骨架屏
 */
export function DiaryCardSkeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-md border border-border bg-surface p-4 sm:p-5',
        className
      )}
    >
      {/* Time */}
      <Skeleton className="h-4 w-12" />

      {/* Content lines */}
      <div className="mt-3 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-3/5" />
      </div>
    </div>
  )
}

interface DiaryListSkeletonProps {
  /** Number of skeleton cards to show */
  count?: number
  /** Additional CSS classes */
  className?: string
}

/**
 * DiaryListSkeleton - 日记列表骨架屏
 *
 * 设计规范:
 * - 3 个骨架屏卡片
 * - pulse 动画
 */
export function DiaryListSkeleton({ count = 3, className }: DiaryListSkeletonProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: count }).map((_, index) => (
        <DiaryCardSkeleton key={`skeleton-${index}`} />
      ))}
    </div>
  )
}

/**
 * ImageSkeleton - 图片加载骨架屏
 */
export function ImageSkeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'relative flex aspect-square w-20 items-center justify-center overflow-hidden rounded-sm bg-muted',
        className
      )}
    >
      {/* Small spinner */}
      <svg
        className="h-5 w-5 animate-spin text-muted-foreground"
        viewBox="0 0 24 24"
        fill="none"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
    </div>
  )
}

export { Skeleton }
