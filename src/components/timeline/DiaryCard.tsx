'use client'

import { cn } from '@/lib/utils'
import type { DiaryEntry } from '@/types'
import { motion } from 'motion/react'
import { MarkdownContent } from './MarkdownContent'

interface DiaryCardProps {
  /** Diary entry data */
  entry: DiaryEntry
  /** Card click handler */
  onClick?: (entry: DiaryEntry) => void
  /** Image URLs (resolved from imageIds) */
  imageUrls?: string[]
  /** Additional CSS classes */
  className?: string
}

/**
 * DiaryCard - 日记卡片组件
 *
 * 设计规范:
 * - 背景: Surface
 * - 边框: 1px Border (可选)
 * - 内边距: 16px (移动) / 20px (桌面)
 * - 时间文字: Tertiary, 小字号
 * - 正文: Primary, 标准字号
 * - 图片: 圆角 sm
 */
export function DiaryCard({ entry, onClick, imageUrls = [], className }: DiaryCardProps) {
  const formattedTime = formatTime(entry.createdAt)
  // Truncate content for preview, but keep markdown syntax for rendering
  const previewContent = truncateContent(entry.content)

  return (
    <motion.article
      className={cn(
        'cursor-pointer rounded-md border border-border bg-surface p-4 transition-colors hover:bg-surface/80 sm:p-5',
        className
      )}
      onClick={() => onClick?.(entry)}
      whileTap={{ scale: 0.98 }}
      layout
    >
      {/* Time */}
      <time className="text-xs tracking-relaxed text-muted-foreground" dateTime={entry.date}>
        {formattedTime}
      </time>

      {/* Content Preview */}
      <div className="mt-2 line-clamp-3 text-sm leading-relaxed sm:text-base">
        <MarkdownContent content={previewContent} />
      </div>

      {/* Images */}
      {imageUrls.length > 0 && (
        <div className="mt-3 flex gap-2">
          {imageUrls.slice(0, 3).map((url, index) => (
            <div
              key={`${entry.id}-img-${index}`}
              className="relative aspect-square w-20 overflow-hidden rounded-sm bg-muted"
            >
              <img
                src={url}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      )}
    </motion.article>
  )
}

/**
 * Format timestamp to readable time string
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Truncate content for preview while preserving markdown
 */
function truncateContent(content: string, maxLength = 200): string {
  const trimmed = content.trim()
  if (trimmed.length <= maxLength) {
    return trimmed
  }
  return trimmed.slice(0, maxLength).trim() + '...'
}

// Animation variants for list
export const cardListVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.03 },
  },
}

export const cardItemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}
