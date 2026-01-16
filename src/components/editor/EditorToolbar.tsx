'use client'

import { useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ImagePlus, Bold, List, ListOrdered } from 'lucide-react'
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
  const { t } = useTranslation('editor')
  const { t: tImage } = useTranslation('image')
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

  // 无序列表按钮处理（支持多行）
  const handleList = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea || !setContent) return

    const { start, end } = getSelection()
    const content = textarea.value

    // 找到选区覆盖的所有行
    let blockStart = start
    while (blockStart > 0 && content[blockStart - 1] !== '\n') {
      blockStart--
    }
    let blockEnd = end
    while (blockEnd < content.length && content[blockEnd] !== '\n') {
      blockEnd++
    }

    // 获取选中的文本块并按行分割
    const selectedBlock = content.substring(blockStart, blockEnd)
    const lines = selectedBlock.split('\n')

    // 检查是否所有行都已有列表标记
    const allHaveMarker = lines.every((line) => line.startsWith('- '))

    let newLines: string[]
    let offsetChange: number

    if (allHaveMarker) {
      // 移除所有行的列表标记
      newLines = lines.map((line) => line.substring(2))
      offsetChange = -2
    } else {
      // 为所有行添加列表标记
      newLines = lines.map((line) => `- ${line}`)
      offsetChange = 2
    }

    const newBlock = newLines.join('\n')
    const newText = content.substring(0, blockStart) + newBlock + content.substring(blockEnd)
    setContent(newText)

    requestAnimationFrame(() => {
      textarea.focus()
      // 调整选区位置
      const newStart = Math.max(blockStart, start + offsetChange)
      const newEnd = end + offsetChange * lines.length
      textarea.setSelectionRange(newStart, newEnd)
    })
  }, [textareaRef, setContent, getSelection])

  // 序号列表按钮处理（支持多行）
  const handleOrderedList = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea || !setContent) return

    const { start, end } = getSelection()
    const content = textarea.value

    // 找到选区覆盖的所有行
    let blockStart = start
    while (blockStart > 0 && content[blockStart - 1] !== '\n') {
      blockStart--
    }
    let blockEnd = end
    while (blockEnd < content.length && content[blockEnd] !== '\n') {
      blockEnd++
    }

    // 获取选中的文本块并按行分割
    const selectedBlock = content.substring(blockStart, blockEnd)
    const lines = selectedBlock.split('\n')

    // 检查是否所有行都已有序号列表标记
    const allHaveMarker = lines.every((line) => /^\d+\. /.test(line))

    let newLines: string[]
    let totalOffsetChange = 0

    if (allHaveMarker) {
      // 移除所有行的序号列表标记
      newLines = lines.map((line) => {
        const match = line.match(/^(\d+)\. /)
        if (match) {
          totalOffsetChange -= match[0].length
          return line.substring(match[0].length)
        }
        return line
      })
    } else {
      // 查找选区前一行的序号以确定起始序号
      let prevLineEnd = blockStart - 1
      let prevLineStart = prevLineEnd
      while (prevLineStart > 0 && content[prevLineStart - 1] !== '\n') {
        prevLineStart--
      }
      const prevLineContent = prevLineStart >= 0 ? content.substring(prevLineStart, prevLineEnd + 1) : ''
      const prevMatch = prevLineContent.match(/^(\d+)\. /)
      let startNumber = prevMatch?.[1] ? Number.parseInt(prevMatch[1], 10) + 1 : 1

      // 为所有行添加序号列表标记
      newLines = lines.map((line) => {
        const marker = `${startNumber}. `
        totalOffsetChange += marker.length
        startNumber++
        return `${marker}${line}`
      })
    }

    const newBlock = newLines.join('\n')
    const newText = content.substring(0, blockStart) + newBlock + content.substring(blockEnd)
    setContent(newText)

    requestAnimationFrame(() => {
      textarea.focus()
      // 调整选区位置
      const firstLineMatch = lines[0]?.match(/^(\d+)\. /)
      const firstLineOffset = allHaveMarker
        ? -(firstLineMatch?.[0].length ?? 0)
        : `1. `.length
      const newStart = Math.max(blockStart, start + firstLineOffset)
      const newEnd = end + totalOffsetChange
      textarea.setSelectionRange(newStart, newEnd)
    })
  }, [textareaRef, setContent, getSelection])

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
            onImageError?.(imageItem.id, validation.error ?? tImage('validationFailed'))
            continue
          }

          const { blob, thumbnail } = await processImage(imageItem.file)
          onImageProcessed?.(imageItem.id, { file: imageItem.file, blob, thumbnail })
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : tImage('processFailed')
          onImageError?.(imageItem.id, errorMessage)
        }
      }
    },
    [remainingSlots, onImagesAdd, onImageProcessed, onImageError, tImage]
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
        icon={<ImagePlus className="h-4 w-4" />}
        label={t('addImage')}
        onClick={handleImageClick}
        disabled={remainingSlots <= 0}
      />

      {/* 分隔线 */}
      <div className="mx-1 h-5 w-px bg-border" />

      {/* 加粗按钮 */}
      <ToolbarButton
        icon={<Bold className="h-4 w-4" />}
        label={t('bold')}
        onClick={handleBold}
        onPointerDown={saveSelection}
      />

      {/* 无序列表按钮 */}
      <ToolbarButton
        icon={<List className="h-4 w-4" />}
        label={t('list')}
        onClick={handleList}
        onPointerDown={saveSelection}
      />

      {/* 序号列表按钮 */}
      <ToolbarButton
        icon={<ListOrdered className="h-4 w-4" />}
        label={t('orderedList')}
        onClick={handleOrderedList}
        onPointerDown={saveSelection}
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
  /** 在 pointerdown 时调用（用于保存选区位置） */
  onPointerDown?: () => void
  disabled?: boolean
}

function ToolbarButton({
  icon,
  label,
  onClick,
  onPointerDown,
  disabled,
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
      className={cn(
        'flex h-8 items-center gap-1.5 rounded-md px-2.5 text-foreground transition-colors',
        disabled
          ? 'cursor-not-allowed opacity-40'
          : 'hover:bg-muted active:opacity-70'
      )}
    >
      {icon}
      <span className="text-sm">{label}</span>
    </button>
  )
}
