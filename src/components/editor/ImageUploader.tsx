'use client'

import { useCallback, useRef, useState, useMemo } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { processImage, createImageUrl, revokeImageUrl, validateImage } from '@/lib/image'
import { Lightbox } from '@/components/ui'

const MAX_IMAGES = 3

interface ImageItem {
  id: string
  file: File
  previewUrl: string
  isProcessing: boolean
  error: string | undefined
}

interface ExistingImage {
  id: string
  url: string
}

interface ImageUploaderProps {
  /** Existing images with URLs (for edit mode) */
  existingImages?: ExistingImage[]
  /** Callback when new images change */
  onImagesChange?: ((images: { file: File; blob: Blob; thumbnail: Blob }[]) => void) | undefined
  /** Callback when existing image is removed */
  onExistingImageRemove?: ((id: string) => void) | undefined
  /** Additional CSS classes */
  className?: string
}

/**
 * ImageUploader - 图片上传组件
 *
 * 设计规范:
 * - 最多 3 张图片
 * - 支持 JPG/PNG/WebP
 * - 单张最大 10MB
 * - 显示压缩进度
 */
export function ImageUploader({
  existingImages = [],
  onImagesChange,
  onExistingImageRemove,
  className,
}: ImageUploaderProps) {
  const [images, setImages] = useState<ImageItem[]>([])
  const processedImagesRef = useRef<
    Map<string, { file: File; blob: Blob; thumbnail: Blob }>
  >(new Map())
  const inputRef = useRef<HTMLInputElement>(null)

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  const remainingSlots = MAX_IMAGES - existingImages.length - images.length

  // Build all image URLs for lightbox (existing + new)
  const allImageUrls = useMemo(() => {
    const existingUrls = existingImages.map((img) => img.url)
    const newUrls = images
      .filter((img) => !img.isProcessing && !img.error)
      .map((img) => img.previewUrl)
    return [...existingUrls, ...newUrls]
  }, [existingImages, images])

  const handleImageClick = useCallback((index: number) => {
    setLightboxIndex(index)
    setLightboxOpen(true)
  }, [])

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? [])
      if (files.length === 0) return

      // Reset input
      if (inputRef.current) {
        inputRef.current.value = ''
      }

      // Limit to remaining slots
      const filesToProcess = files.slice(0, remainingSlots)

      // Add files to state with processing status
      const newImages: ImageItem[] = filesToProcess.map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: createImageUrl(file),
        isProcessing: true,
        error: undefined,
      }))

      setImages((prev) => [...prev, ...newImages])

      // Process each image
      for (const imageItem of newImages) {
        try {
          const validation = validateImage(imageItem.file)
          if (!validation.valid) {
            setImages((prev) =>
              prev.map((img) =>
                img.id === imageItem.id
                  ? { ...img, isProcessing: false, error: validation.error }
                  : img
              )
            )
            continue
          }

          const { blob, thumbnail } = await processImage(imageItem.file)

          processedImagesRef.current.set(imageItem.id, {
            file: imageItem.file,
            blob,
            thumbnail,
          })

          setImages((prev) =>
            prev.map((img) =>
              img.id === imageItem.id ? { ...img, isProcessing: false } : img
            )
          )
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : '处理图片失败'
          setImages((prev) =>
            prev.map((img) =>
              img.id === imageItem.id
                ? { ...img, isProcessing: false, error: errorMessage }
                : img
            )
          )
        }
      }

      // Notify parent of processed images
      const validImages = Array.from(processedImagesRef.current.values())
      onImagesChange?.(validImages)
    },
    [remainingSlots, onImagesChange]
  )

  const handleRemove = useCallback(
    (id: string) => {
      setImages((prev) => {
        const imageToRemove = prev.find((img) => img.id === id)
        if (imageToRemove) {
          revokeImageUrl(imageToRemove.previewUrl)
        }
        return prev.filter((img) => img.id !== id)
      })

      processedImagesRef.current.delete(id)
      const validImages = Array.from(processedImagesRef.current.values())
      onImagesChange?.(validImages)
    },
    [onImagesChange]
  )

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Image grid */}
      <div className="flex flex-wrap gap-2">
        {/* Existing images */}
        {existingImages.map((existing, index) => (
          <div
            key={existing.id}
            className="relative h-20 w-20 overflow-hidden rounded-sm bg-muted"
          >
            <button
              type="button"
              onClick={() => handleImageClick(index)}
              className="h-full w-full"
            >
              <img
                src={existing.url}
                alt=""
                className="h-full w-full object-cover"
              />
            </button>
            <button
              type="button"
              onClick={() => onExistingImageRemove?.(existing.id)}
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
              aria-label="移除图片"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {/* New images */}
        {images.map((image, index) => {
          // Calculate the lightbox index (after existing images)
          const lightboxIdx = existingImages.length + images
            .slice(0, index)
            .filter((img) => !img.isProcessing && !img.error).length
          const canPreview = !image.isProcessing && !image.error

          return (
            <div
              key={image.id}
              className="relative h-20 w-20 overflow-hidden rounded-sm bg-muted"
            >
              {canPreview ? (
                <button
                  type="button"
                  onClick={() => handleImageClick(lightboxIdx)}
                  className="h-full w-full"
                >
                  <img
                    src={image.previewUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ) : (
                <img
                  src={image.previewUrl}
                  alt=""
                  className={cn(
                    'h-full w-full object-cover',
                    image.isProcessing && 'opacity-50'
                  )}
                />
              )}

              {/* Processing overlay */}
              {image.isProcessing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <svg
                    className="h-6 w-6 animate-spin text-white"
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
              )}

              {/* Error indicator */}
              {image.error && (
                <div className="absolute inset-0 flex items-center justify-center bg-destructive/80">
                  <span className="text-xs text-white">失败</span>
                </div>
              )}

              {/* Remove button */}
              {!image.isProcessing && (
                <button
                  type="button"
                  onClick={() => handleRemove(image.id)}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                  aria-label="移除图片"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          )
        })}

        {/* Add button */}
        {remainingSlots > 0 && (
          <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-sm border border-dashed border-border bg-surface transition-colors hover:border-primary hover:bg-surface/80">
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <ImagePlus className="h-6 w-6 text-muted-foreground" />
          </label>
        )}
      </div>

      {/* Help text */}
      <p className="text-xs text-muted-foreground">
        最多 {MAX_IMAGES} 张图片，支持 JPG/PNG/WebP，单张不超过 10MB
      </p>

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
