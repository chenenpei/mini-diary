'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'motion/react'
import { useSwipeable } from 'react-swipeable'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFocusTrap } from '@/hooks/useFocusTrap'

interface LightboxProps {
  /** Array of image URLs */
  images: string[]
  /** Currently selected image index */
  currentIndex: number
  /** Whether the lightbox is open */
  isOpen: boolean
  /** Close handler */
  onClose: () => void
  /** Index change handler */
  onIndexChange: (index: number) => void
}

/**
 * Lightbox - 图片灯箱组件
 *
 * 设计规范:
 * - 全屏黑色背景
 * - 支持左右切换
 * - 支持键盘导航 (左右箭头, ESC 关闭)
 * - 点击背景关闭
 */
export function Lightbox({
  images,
  currentIndex,
  isOpen,
  onClose,
  onIndexChange,
}: LightboxProps) {
  const { t } = useTranslation('image')
  const { t: tCommon } = useTranslation('common')

  // Focus trap
  const lightboxRef = useFocusTrap<HTMLDivElement>({
    isActive: isOpen,
    autoFocus: true,
    restoreFocus: true,
  })

  const hasMultiple = images.length > 1
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < images.length - 1
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null)

  const handlePrev = useCallback(() => {
    if (hasPrev) {
      setSwipeDirection('right')
      onIndexChange(currentIndex - 1)
    }
  }, [hasPrev, currentIndex, onIndexChange])

  const handleNext = useCallback(() => {
    if (hasNext) {
      setSwipeDirection('left')
      onIndexChange(currentIndex + 1)
    }
  }, [hasNext, currentIndex, onIndexChange])

  // Swipe handlers
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (hasNext) {
        handleNext()
      }
    },
    onSwipedRight: () => {
      if (hasPrev) {
        handlePrev()
      }
    },
    delta: 50,
    swipeDuration: 500,
    trackMouse: false,
    preventScrollOnSwipe: true,
  })

  // Reset swipe direction after animation
  useEffect(() => {
    if (swipeDirection === null) {
      return
    }
    const timer = setTimeout(() => setSwipeDirection(null), 300)
    return () => clearTimeout(timer)
  }, [swipeDirection])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowLeft':
          handlePrev()
          break
        case 'ArrowRight':
          handleNext()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, handlePrev, handleNext])

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={lightboxRef}
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/90"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={t('lightbox')}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            aria-label={tCommon('close')}
          >
            <X className="h-6 w-6" />
          </button>

          {/* Image counter */}
          {hasMultiple && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
              {currentIndex + 1} / {images.length}
            </div>
          )}

          {/* Previous button */}
          {hasMultiple && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handlePrev()
              }}
              disabled={!hasPrev}
              className={cn(
                'absolute left-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors',
                hasPrev ? 'hover:bg-white/20' : 'cursor-not-allowed opacity-30'
              )}
              aria-label={t('prev')}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          {/* Next button */}
          {hasMultiple && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleNext()
              }}
              disabled={!hasNext}
              className={cn(
                'absolute right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors',
                hasNext ? 'hover:bg-white/20' : 'cursor-not-allowed opacity-30'
              )}
              aria-label={t('next')}
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          {/* Image with swipe support */}
          <div
            {...swipeHandlers}
            className="flex h-full w-full items-center justify-center"
          >
            <motion.img
              key={currentIndex}
              src={images[currentIndex]}
              alt={t('imageOf', { current: currentIndex + 1, total: images.length })}
              className="max-h-[90vh] max-w-[90vw] object-contain"
              initial={{
                opacity: 0,
                scale: 0.9,
                x: swipeDirection === 'left' ? 100 : swipeDirection === 'right' ? -100 : 0,
              }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{
                opacity: 0,
                scale: 0.9,
                x: swipeDirection === 'left' ? -100 : swipeDirection === 'right' ? 100 : 0,
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * Hook to manage lightbox state
 */
export function useLightbox() {
  const [state, setState] = useState<{
    isOpen: boolean
    images: string[]
    currentIndex: number
  }>({
    isOpen: false,
    images: [],
    currentIndex: 0,
  })

  const open = useCallback((images: string[], startIndex = 0) => {
    setState({
      isOpen: true,
      images,
      currentIndex: startIndex,
    })
  }, [])

  const close = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }))
  }, [])

  const setIndex = useCallback((index: number) => {
    setState((prev) => ({ ...prev, currentIndex: index }))
  }, [])

  return {
    ...state,
    open,
    close,
    setIndex,
  }
}
