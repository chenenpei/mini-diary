'use client'

import { cn } from '@/lib/utils'
import type { DiaryEntry } from '@/types'
import { motion } from 'motion/react'
import { DiaryCard, cardItemVariants, cardListVariants } from './DiaryCard'

interface DiaryListProps {
  /** List of diary entries */
  entries: DiaryEntry[]
  /** Card click handler */
  onCardClick?: (entry: DiaryEntry) => void
  /** Image URLs map (entryId -> urls) */
  imageUrlsMap?: Map<string, string[]>
  /** Additional CSS classes */
  className?: string
}

/**
 * DiaryList - 日记列表组件
 *
 * 设计规范:
 * - 列表项目间距: 8px
 * - stagger 动画: 0.03s
 */
export function DiaryList({
  entries,
  onCardClick,
  imageUrlsMap = new Map(),
  className,
}: DiaryListProps) {
  const handleCardClick = onCardClick ?? (() => {})

  return (
    <motion.div
      className={cn('flex flex-col gap-2', className)}
      variants={cardListVariants}
      initial="hidden"
      animate="show"
    >
      {entries.map((entry) => (
        <motion.div key={entry.id} variants={cardItemVariants}>
          <DiaryCard
            entry={entry}
            onClick={handleCardClick}
            imageUrls={imageUrlsMap.get(entry.id) ?? []}
          />
        </motion.div>
      ))}
    </motion.div>
  )
}
