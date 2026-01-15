'use client'

import { useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import type { DiaryEntry } from '@/types'
import { motion } from 'motion/react'
import { DiaryCard, cardListVariants } from './DiaryCard'
import { Lightbox } from '@/components/ui'

interface DiaryListProps {
  /** List of diary entries */
  entries: DiaryEntry[]
  /** Edit entry handler */
  onEdit?: (entry: DiaryEntry) => void
  /** Delete entry handler */
  onDelete?: (entry: DiaryEntry) => void
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
  onEdit,
  onDelete,
  thumbnailUrlsMap = new Map(),
  fullImageUrlsMap = new Map(),
  className,
}: DiaryListProps) {
  // Track known entry IDs to only animate new ones
  const knownIdsRef = useRef<Set<string>>(new Set())

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
        initial={false}
        animate="show"
      >
        {entries.map((entry) => {
          // Check if this is a new entry
          const isNew = !knownIdsRef.current.has(entry.id)
          // Add to known IDs (will persist across renders)
          knownIdsRef.current.add(entry.id)

          return (
            <motion.div
              key={entry.id}
              initial={isNew ? { opacity: 0, y: 20 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <DiaryCard
                entry={entry}
                imageUrls={thumbnailUrlsMap.get(entry.id) ?? []}
                onImageClick={(index) => handleImageClick(entry.id, index)}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            </motion.div>
          )
        })}
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
