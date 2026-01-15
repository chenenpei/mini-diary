'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { DiaryEntry } from '@/types'
import { motion } from 'motion/react'
import { DiaryCard, cardItemVariants, cardListVariants } from './DiaryCard'
import { Lightbox } from '@/components/ui'

interface DiaryListProps {
  /** List of diary entries */
  entries: DiaryEntry[]
  /** Card click handler */
  onCardClick?: (entry: DiaryEntry) => void
  /** Thumbnail URLs map (entryId -> urls) for display */
  thumbnailUrlsMap?: Map<string, string[]>
  /** Full image URLs map (entryId -> urls) for lightbox */
  fullImageUrlsMap?: Map<string, string[]>
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
  thumbnailUrlsMap = new Map(),
  fullImageUrlsMap = new Map(),
  className,
}: DiaryListProps) {
  const handleCardClick = onCardClick ?? (() => {})

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxImages, setLightboxImages] = useState<string[]>([])
  const [lightboxIndex, setLightboxIndex] = useState(0)

  const handleImageClick = (entryId: string, imageIndex: number) => {
    const fullUrls = fullImageUrlsMap.get(entryId) ?? []
    if (fullUrls.length > 0) {
      setLightboxImages(fullUrls)
      setLightboxIndex(imageIndex)
      setLightboxOpen(true)
    }
  }

  return (
    <>
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
              imageUrls={thumbnailUrlsMap.get(entry.id) ?? []}
              onImageClick={(index) => handleImageClick(entry.id, index)}
            />
          </motion.div>
        ))}
      </motion.div>

      <Lightbox
        images={lightboxImages}
        currentIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onIndexChange={setLightboxIndex}
      />
    </>
  )
}
