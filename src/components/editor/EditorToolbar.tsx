'use client'

import { useRef, useCallback } from 'react'
import { ImagePlus, Bold, List } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight'
import { processImage, createImageUrl, validateImage } from '@/lib/image'

interface ImageItem {
  id: string
  file: File
  previewUrl: string
  isProcessing: boolean
  error: string | undefined
}

interface EditorToolbarProps {
  /** Ref to textarea for text manipulation */
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  /** Function to set content (from DiaryEditorRef.setContent) */
  setContent?: ((content: string) => void) | undefined
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
 * EditorToolbar - 编辑器底部工具栏
 *
 * 功能：
 * - 图片按钮：添加图片
 * - 加粗按钮：包裹选中文本或插入 **文字**
 * - 列表按钮：在行首插入 -
 *
 * 特性：
 * - 固定在底部，跟随键盘高度
 * - 适配 iPhone 安全区域
 */
export function EditorToolbar({
  textareaRef,
  setContent,
  imageCount = 0,
  maxImages = 3,
  onImagesAdd,
  onImageProcessed,
  onImageError,
  className,
}: EditorToolbarProps) {
  const keyboardHeight = useKeyboardHeight()
  const fileInputRef = useRef<HTMLInputElement>(null)
  // 使用 ref 保存选区位置，确保同步读写
  const savedSelectionRef = useRef<{ start: number; end: number } | null>(null)

  const remainingSlots = maxImages - imageCount

  // 在 pointerdown 时保存当前选区位置
  const saveSelection = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      savedSelectionRef.current = {
        start: textarea.selectionStart,
        end: textarea.selectionEnd,
      }
    }
  }, [textareaRef])

  // 获取选区位置（优先使用保存的，否则使用当前的）
  const getSelection = useCallback(() => {
    const textarea = textareaRef.current
    if (savedSelectionRef.current) {
      const result = savedSelectionRef.current
      savedSelectionRef.current = null // 使用后清除
      return result
    }
    if (textarea) {
      return {
        start: textarea.selectionStart,
        end: textarea.selectionEnd,
      }
    }
    return { start: 0, end: 0 }
  }, [textareaRef])

  // 加粗按钮处理（切换加粗状态）
  const handleBold = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea || !setContent) return

    const { start, end } = getSelection()
    const content = textarea.value
    const selectedText = content.substring(start, end)

    // 检查选中文本是否已被加粗（前后各有 **）
    const before = content.substring(Math.max(0, start - 2), start)
    const after = content.substring(end, end + 2)
    const isAlreadyBold = before === '**' && after === '**'

    if (isAlreadyBold) {
      // 移除加粗：删除前后的 **
      const newText =
        content.substring(0, start - 2) +
        selectedText +
        content.substring(end + 2)
      setContent(newText)
      requestAnimationFrame(() => {
        textarea.focus()
        // 光标位置需要减去前面移除的 2 个字符
        textarea.setSelectionRange(start - 2, end - 2)
      })
    } else {
      // 添加加粗
      const newText =
        content.substring(0, start) +
        '**' +
        selectedText +
        '**' +
        content.substring(end)
      setContent(newText)
      requestAnimationFrame(() => {
        textarea.focus()
        if (start === end) {
          // 没有选中文本，将光标移到两个星号之间
          textarea.setSelectionRange(start + 2, start + 2)
        } else {
          // 有选中文本，保持选中状态（位置向后偏移 2）
          textarea.setSelectionRange(start + 2, end + 2)
        }
      })
    }
  }, [textareaRef, setContent])

  // 列表按钮处理
  const handleList = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea || !setContent) return

    const { start } = getSelection()
    const content = textarea.value

    // 找到当前行的开始位置
    let lineStart = start
    while (lineStart > 0 && content[lineStart - 1] !== '\n') {
      lineStart--
    }

    // 检查行首是否已有列表标记
    const lineContent = content.substring(lineStart)
    if (lineContent.startsWith('- ')) {
      // 移除列表标记
      const newText =
        content.substring(0, lineStart) + content.substring(lineStart + 2)
      setContent(newText)
      requestAnimationFrame(() => {
        textarea.focus()
        textarea.setSelectionRange(start - 2, start - 2)
      })
    } else {
      // 添加列表标记
      const newText = `${content.substring(0, lineStart)}- ${content.substring(lineStart)}`
      setContent(newText)
      requestAnimationFrame(() => {
        textarea.focus()
        textarea.setSelectionRange(start + 2, start + 2)
      })
    }
  }, [textareaRef, setContent])

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
        id: crypto.randomUUID(),
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
            onImageError?.(imageItem.id, validation.error ?? '图片验证失败')
            continue
          }

          const { blob, thumbnail } = await processImage(imageItem.file)
          onImageProcessed?.(imageItem.id, { file: imageItem.file, blob, thumbnail })
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : '处理图片失败'
          onImageError?.(imageItem.id, errorMessage)
        }
      }
    },
    [remainingSlots, onImagesAdd, onImageProcessed, onImageError]
  )

  // 触发文件选择
  const handleImageClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  return (
    <div
      className={cn(
        'fixed left-0 right-0 z-50 flex h-12 items-center justify-start gap-1 border-t border-border bg-background/95 px-4 backdrop-blur-sm',
        className
      )}
      style={{
        bottom: keyboardHeight,
        paddingBottom:
          keyboardHeight === 0 ? 'env(safe-area-inset-bottom, 0px)' : 0,
      }}
    >
      {/* 图片按钮 */}
      <ToolbarButton
        icon={<ImagePlus className="h-5 w-5" />}
        onClick={handleImageClick}
        disabled={remainingSlots <= 0}
        aria-label="添加图片"
      />

      {/* 分隔线 */}
      <div className="mx-1 h-5 w-px bg-border" />

      {/* 加粗按钮 */}
      <ToolbarButton
        icon={<Bold className="h-5 w-5" />}
        onClick={handleBold}
        onPointerDown={saveSelection}
        aria-label="加粗"
      />

      {/* 列表按钮 */}
      <ToolbarButton
        icon={<List className="h-5 w-5" />}
        onClick={handleList}
        onPointerDown={saveSelection}
        aria-label="无序列表"
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
  onClick?: () => void
  /** 在 pointerdown 时调用（用于保存选区位置） */
  onPointerDown?: () => void
  disabled?: boolean
  'aria-label': string
}

function ToolbarButton({
  icon,
  onClick,
  onPointerDown,
  disabled,
  'aria-label': ariaLabel,
}: ToolbarButtonProps) {
  // 在 mousedown/touchstart 时保存选区，并阻止默认行为防止焦点丢失
  const handlePointerDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (onPointerDown) {
        onPointerDown()
        e.preventDefault() // 阻止焦点丢失
      }
    },
    [onPointerDown]
  )

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseDown={handlePointerDown}
      onTouchStart={handlePointerDown}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-sm text-foreground transition-opacity',
        disabled
          ? 'cursor-not-allowed opacity-40'
          : 'hover:opacity-70 active:opacity-50'
      )}
    >
      {icon}
    </button>
  )
}
