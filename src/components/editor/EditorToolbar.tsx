'use client'

import { Bold, ImagePlus, List, ListOrdered } from 'lucide-react'
import { useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight'
import { createImageUrl, ImageProcessingError, processImage, validateImage } from '@/lib/image'
import { cn, generateId } from '@/lib/utils'

interface ImageItem {
  id: string
  file: File
  previewUrl: string
  isProcessing: boolean
  error: string | undefined
}

interface EditorToolbarProps {
  /** Ref to contenteditable editor for focus management */
  editorRef: React.RefObject<HTMLDivElement | null>
  /** Current image count (existing + new) */
  imageCount?: number
  /** Max images allowed */
  maxImages?: number
  /** Callback when images are added */
  onImagesAdd?: (images: ImageItem[]) => void
  /** Callback when processed image is ready */
  onImageProcessed?: (id: string, result: { file: File; blob: Blob; thumbnail: Blob }) => void
  /** Callback when image processing fails */
  onImageError?: (id: string, error: string) => void
  /** Additional CSS classes */
  className?: string
}

/**
 * EditorToolbar - 编辑器底部工具栏（WYSIWYG 版本）
 *
 * 功能：
 * - 图片按钮：添加图片
 * - 加粗按钮：使用 execCommand('bold')
 * - 列表按钮：使用 execCommand('insertUnorderedList')
 * - 有序列表按钮：使用 execCommand('insertOrderedList')
 *
 * 特性：
 * - 固定在底部，跟随键盘高度
 * - 适配 iPhone 安全区域
 */
export function EditorToolbar({
  editorRef,
  imageCount = 0,
  maxImages = 3,
  onImagesAdd,
  onImageProcessed,
  onImageError,
  className,
}: EditorToolbarProps) {
  const { t } = useTranslation('editor')
  const { t: tImage } = useTranslation('image')
  const keyboardHeight = useKeyboardHeight()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const remainingSlots = maxImages - imageCount

  // 确保编辑器获得焦点
  const focusEditor = useCallback(() => {
    editorRef.current?.focus()
  }, [editorRef])

  // 加粗按钮处理
  const handleBold = useCallback(() => {
    focusEditor()
    document.execCommand('bold', false)
  }, [focusEditor])

  // 无序列表按钮处理
  const handleList = useCallback(() => {
    focusEditor()
    document.execCommand('insertUnorderedList', false)
  }, [focusEditor])

  // 序号列表按钮处理
  const handleOrderedList = useCallback(() => {
    focusEditor()
    document.execCommand('insertOrderedList', false)
  }, [focusEditor])

  // 图片选择处理
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? [])
      if (files.length === 0) return

      // 重置 input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      // 限制数量
      const filesToProcess = files.slice(0, remainingSlots)

      // 创建图片项
      const newImages: ImageItem[] = filesToProcess.map((file) => ({
        id: generateId(),
        file,
        previewUrl: createImageUrl(file),
        isProcessing: true,
        error: undefined,
      }))

      onImagesAdd?.(newImages)

      // 处理每张图片
      for (const imageItem of newImages) {
        try {
          const validation = validateImage(imageItem.file)
          if (!validation.valid) {
            onImageError?.(imageItem.id, tImage(validation.errorKey ?? 'validationFailed'))
            continue
          }

          const { blob, thumbnail } = await processImage(imageItem.file)
          onImageProcessed?.(imageItem.id, { file: imageItem.file, blob, thumbnail })
        } catch (err) {
          const errorMessage =
            err instanceof ImageProcessingError ? tImage(err.errorKey) : tImage('processFailed')
          onImageError?.(imageItem.id, errorMessage)
        }
      }
    },
    [remainingSlots, onImagesAdd, onImageProcessed, onImageError, tImage],
  )

  // 触发文件选择
  const handleImageClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  return (
    <div
      className={cn(
        'fixed left-0 right-0 z-50 flex h-12 items-center justify-start gap-1 border-t border-border bg-background/95 px-4 backdrop-blur-sm',
        className,
      )}
      style={{
        bottom: keyboardHeight,
        paddingBottom: keyboardHeight === 0 ? 'env(safe-area-inset-bottom, 0px)' : 0,
      }}
    >
      {/* 图片按钮 */}
      <ToolbarButton
        icon={<ImagePlus className="h-4 w-4" />}
        label={t('addImage')}
        onClick={handleImageClick}
        disabled={remainingSlots <= 0}
      />

      {/* 分隔线 */}
      <div className="mx-1 h-5 w-px bg-border" />

      {/* 加粗按钮 */}
      <ToolbarButton icon={<Bold className="h-4 w-4" />} label={t('bold')} onClick={handleBold} />

      {/* 无序列表按钮 */}
      <ToolbarButton icon={<List className="h-4 w-4" />} label={t('list')} onClick={handleList} />

      {/* 序号列表按钮 */}
      <ToolbarButton
        icon={<ListOrdered className="h-4 w-4" />}
        label={t('orderedList')}
        onClick={handleOrderedList}
      />

      {/* 隐藏的文件 input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  )
}

interface ToolbarButtonProps {
  icon: React.ReactNode
  label: string
  onClick?: () => void
  disabled?: boolean
}

function ToolbarButton({ icon, label, onClick, disabled }: ToolbarButtonProps) {
  // 在 mousedown 时阻止默认行为防止焦点丢失
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
  }, [])

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseDown={handleMouseDown}
      disabled={disabled}
      className={cn(
        'flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-md px-2.5 text-foreground transition-colors',
        disabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-muted active:opacity-70',
      )}
    >
      {icon}
      <span className="text-sm">{label}</span>
    </button>
  )
}
