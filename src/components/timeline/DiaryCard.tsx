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
 * - 背景: 白色/Surface
 * - 阴影: 微妙的投影效果
 * - 内边距: 16px (移动) / 20px (桌面)
 * - 时间文字: Tertiary, 小字号
 * - 正文: Primary, 标准字号，完整展示
 * - 图片: 圆角 sm
 */
export function DiaryCard({ entry, onClick, imageUrls = [], className }: DiaryCardProps) {
  const formattedTime = formatTime(entry.createdAt)

  return (
    <motion.article
      className={cn(
        'cursor-pointer rounded-lg bg-white p-4 shadow-sm ring-1 ring-black/5 transition-all hover:shadow-md sm:p-5',
        className
      )}
      onClick={() => onClick?.(entry)}
      whileTap={{ scale: 0.98 }}
      layout
    >
      {/* Time */}
      <time className="text-xs tracking-wide text-muted-foreground" dateTime={entry.date}>
        {formattedTime}
      </time>

      {/* Full Content */}
      <div className="mt-2 text-sm leading-relaxed text-foreground sm:text-base [&_p]:m-0 [&_ul]:m-0 [&_ol]:m-0 [&_li]:m-0 [&_p]:mb-2 [&_p:last-child]:mb-0">
        <MarkdownContent content={entry.content} className="prose-p:my-0 prose-ul:my-0 prose-ol:my-0 prose-li:my-0" />
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
