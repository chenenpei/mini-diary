'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import type { DiaryEntry } from '@/types'
import { motion } from 'motion/react'
import { DiaryCard, cardListVariants } from './DiaryCard'
import { Lightbox } from '@/components/ui'

interface DiaryListProps {
  /** List of diary entries */
  entries: DiaryEntry[]
  /** When true, cards play enter animation; when false (e.g. return from edit/new), no animation */
  animateEntries?: boolean
  /** Edit entry handler */
  onEdit?: (entry: DiaryEntry) => void
  /** Delete entry handler */
  onDelete?: (entry: DiaryEntry) => void
  /** Thumbnail URLs map (entryId -> urls) for display */
  thumbnailUrlsMap?: Map<string, string[]>
  /** Full image URLs map (entryId -> urls) for lightbox */
  fullImageUrlsMap?: Map<string, string[]>
  /** ID of entry to scroll to */
  scrollToId?: string | undefined
  /** Callback when scroll completes */
  onScrollComplete?: () => void
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
  animateEntries = true,
  onEdit,
  onDelete,
  thumbnailUrlsMap = new Map(),
  fullImageUrlsMap = new Map(),
  scrollToId,
  onScrollComplete,
  className,
}: DiaryListProps) {
  const entryRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  // Handle scroll to entry
  useEffect(() => {
    if (!scrollToId || entries.length === 0) return

    // Wait for render to complete
    const timer = setTimeout(() => {
      const element = entryRefs.current.get(scrollToId)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        onScrollComplete?.()
      }
    }, 150)

    return () => clearTimeout(timer)
  }, [scrollToId, entries, onScrollComplete])

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
        className={cn('flex flex-col gap-5', className)}
        variants={cardListVariants}
        initial={false}
        animate="show"
      >
        {entries.map((entry) => (
          <motion.div
            key={entry.id}
            ref={(el) => {
              if (el) entryRefs.current.set(entry.id, el)
            }}
            initial={animateEntries ? { opacity: 0, y: 20 } : false}
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
