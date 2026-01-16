'use client'

import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n'
import { cn } from '@/lib/utils'
import type { DiaryEntry } from '@/types'
import { Pencil, Trash2 } from 'lucide-react'
import { MarkdownContent } from './MarkdownContent'
import { Dropdown } from '@/components/ui'

interface DiaryCardProps {
  /** Diary entry data */
  entry: DiaryEntry
  /** Image URLs (resolved from imageIds) */
  imageUrls?: string[] | undefined
  /** Image click handler (index of clicked image) */
  onImageClick?: ((index: number) => void) | undefined
  /** Edit button click handler */
  onEdit?: ((entry: DiaryEntry) => void) | undefined
  /** Delete button click handler */
  onDelete?: ((entry: DiaryEntry) => void) | undefined
  /** Additional CSS classes */
  className?: string | undefined
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
const DOUBLE_TAP_DELAY = 300

export function DiaryCard({ entry, imageUrls = [], onImageClick, onEdit, onDelete, className }: DiaryCardProps) {
  const { t } = useTranslation('common')
  const lastTapRef = useRef<number>(0)
  const formattedTime = formatTime(entry.createdAt)

  const handleTap = () => {
    const now = Date.now()
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      onEdit?.(entry)
      lastTapRef.current = 0
    } else {
      lastTapRef.current = now
    }
  }

  const dropdownItems = [
    {
      key: 'edit',
      label: t('edit'),
      icon: <Pencil className="h-4 w-4" />,
      onClick: () => onEdit?.(entry),
    },
    {
      key: 'delete',
      label: t('delete'),
      icon: <Trash2 className="h-4 w-4" />,
      destructive: true,
      onClick: () => onDelete?.(entry),
    },
  ]

  return (
    <article
      className={cn(
        'relative rounded-lg bg-card px-4 pb-4 pt-3 shadow-sm ring-1 ring-black/5 dark:border dark:border-border sm:px-5 sm:pb-5 sm:pt-3.5',
        className
      )}
      onDoubleClick={() => onEdit?.(entry)}
      onClick={handleTap}
    >
      {/* Dropdown menu */}
      <div className="absolute right-3 top-3 sm:right-4 sm:top-4">
        <Dropdown items={dropdownItems} />
      </div>

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
            <button
              type="button"
              key={`${entry.id}-img-${index}`}
              className="relative aspect-square w-20 overflow-hidden rounded-sm bg-muted"
              onClick={(e) => {
                e.stopPropagation()
                onImageClick?.(index)
              }}
            >
              <img
                src={url}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </article>
  )
}

/**
 * Format timestamp to readable time string
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const locale = i18n.language === 'en' ? 'en-US' : 'zh-CN'
  return date.toLocaleTimeString(locale, {
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
