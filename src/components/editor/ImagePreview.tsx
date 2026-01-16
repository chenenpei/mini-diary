'use client'

import { useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Lightbox } from '@/components/ui'

interface ExistingImage {
  id: string
  url: string
}

interface NewImage {
  id: string
  previewUrl: string
  isProcessing: boolean
  error?: string | undefined
}

interface ImagePreviewProps {
  /** Existing images with URLs (for edit mode) */
  existingImages?: ExistingImage[]
  /** New images being added */
  newImages?: NewImage[]
  /** Callback when existing image is removed */
  onExistingRemove?: ((id: string) => void) | undefined
  /** Callback when new image is removed */
  onNewRemove?: ((id: string) => void) | undefined
  /** Additional CSS classes */
  className?: string
}

/**
 * ImagePreview - 图片预览组件
 *
 * 展示已添加的图片，与添加按钮分离
 * 支持点击预览（Lightbox）和删除
 */
export function ImagePreview({
  existingImages = [],
  newImages = [],
  onExistingRemove,
  onNewRemove,
  className,
}: ImagePreviewProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  // 构建所有可预览图片的 URL 列表
  const allImageUrls = useMemo(() => {
    const existingUrls = existingImages.map((img) => img.url)
    const newUrls = newImages
      .filter((img) => !img.isProcessing && !img.error)
      .map((img) => img.previewUrl)
    return [...existingUrls, ...newUrls]
  }, [existingImages, newImages])

  const handleImageClick = useCallback((index: number) => {
    setLightboxIndex(index)
    setLightboxOpen(true)
  }, [])

  const totalImages = existingImages.length + newImages.length
  if (totalImages === 0) return null

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {/* 现有图片 */}
      {existingImages.map((img, index) => (
        <ImageThumbnail
          key={img.id}
          src={img.url}
          onClick={() => handleImageClick(index)}
          onRemove={() => onExistingRemove?.(img.id)}
        />
      ))}

      {/* 新添加的图片 */}
      {newImages.map((img, index) => {
        // 计算在 lightbox 中的索引（排除处理中和错误的图片）
        const validNewImagesBefore = newImages
          .slice(0, index)
          .filter((i) => !i.isProcessing && !i.error).length
        const lightboxIdx = existingImages.length + validNewImagesBefore
        const canPreview = !img.isProcessing && !img.error

        return (
          <ImageThumbnail
            key={img.id}
            src={img.previewUrl}
            isProcessing={img.isProcessing}
            error={img.error}
            onClick={canPreview ? () => handleImageClick(lightboxIdx) : undefined}
            onRemove={!img.isProcessing ? () => onNewRemove?.(img.id) : undefined}
          />
        )
      })}

      {/* Lightbox */}
      <Lightbox
        images={allImageUrls}
        currentIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onIndexChange={setLightboxIndex}
      />
    </div>
  )
}

interface ImageThumbnailProps {
  src: string
  isProcessing?: boolean
  error?: string | undefined
  onClick?: (() => void) | undefined
  onRemove?: (() => void) | undefined
}

function ImageThumbnail({
  src,
  isProcessing,
  error,
  onClick,
  onRemove,
}: ImageThumbnailProps) {
  const { t } = useTranslation('image')

  return (
    <div className="relative h-20 w-20 overflow-hidden rounded-sm bg-muted">
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="h-full w-full"
        >
          <img
            src={src}
            alt=""
            className={cn(
              'h-full w-full object-cover',
              isProcessing && 'opacity-50'
            )}
          />
        </button>
      ) : (
        <img
          src={src}
          alt=""
          className={cn(
            'h-full w-full object-cover',
            isProcessing && 'opacity-50'
          )}
        />
      )}

      {/* 处理中遮罩 */}
      {isProcessing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <svg
            className="h-6 w-6 animate-spin text-white"
            viewBox="0 0 24 24"
            fill="none"
            role="img"
            aria-label={t('processing')}
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
      )}

      {/* 错误提示 */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-destructive/80">
          <span className="text-xs text-white">{t('failed')}</span>
        </div>
      )}

      {/* 删除按钮 */}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
          aria-label={t('remove')}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}
