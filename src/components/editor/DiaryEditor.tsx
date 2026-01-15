'use client'

import { cn } from '@/lib/utils'
import { useState, useCallback, useEffect } from 'react'
import { ImageUploader } from './ImageUploader'

const MAX_CONTENT_LENGTH = 10000

interface ProcessedImage {
  file: File
  blob: Blob
  thumbnail: Blob
}

interface ExistingImage {
  id: string
  url: string
}

interface DiaryEditorProps {
  /** Initial content */
  initialContent?: string
  /** Content change handler */
  onChange?: (content: string) => void
  /** Image change handler */
  onImagesChange?: (images: ProcessedImage[]) => void
  /** Existing images with URLs (for edit mode) */
  existingImages?: ExistingImage[]
  /** Callback when existing image is removed */
  onExistingImageRemove?: (id: string) => void
  /** Placeholder text */
  placeholder?: string
  /** Auto focus on mount */
  autoFocus?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * DiaryEditor - 日记编辑器组件
 *
 * 设计规范:
 * - 背景: Surface
 * - 边框: 1px Border
 * - Focus: 2px Primary 边框
 * - Placeholder: Tertiary
 * - 支持受限 Markdown (加粗、斜体、列表)
 */
export function DiaryEditor({
  initialContent = '',
  onChange,
  onImagesChange,
  existingImages = [],
  onExistingImageRemove,
  placeholder = '写点什么...',
  autoFocus = false,
  className,
}: DiaryEditorProps) {
  const [content, setContent] = useState(initialContent)

  useEffect(() => {
    setContent(initialContent)
  }, [initialContent])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newContent = e.target.value
      setContent(newContent)
      onChange?.(newContent)
    },
    [onChange]
  )

  const isOverLimit = content.length > MAX_CONTENT_LENGTH
  const charCount = content.length

  return (
    <div className={cn('flex flex-col', className)}>
      <textarea
        value={content}
        onChange={handleChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={cn(
          'min-h-[300px] w-full resize-none rounded-md border border-border bg-surface p-4 text-base leading-relaxed text-foreground placeholder:text-muted-foreground',
          'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
          'sm:min-h-[400px] sm:p-5'
        )}
      />

      {/* Character count */}
      <div className="mt-2 flex justify-end">
        <span
          className={cn(
            'text-xs',
            isOverLimit ? 'text-destructive' : 'text-muted-foreground'
          )}
        >
          {charCount.toLocaleString()} / {MAX_CONTENT_LENGTH.toLocaleString()}
        </span>
      </div>

      {/* Image uploader */}
      <ImageUploader
        existingImages={existingImages}
        onImagesChange={onImagesChange}
        onExistingImageRemove={onExistingImageRemove}
        className="mt-4"
      />
    </div>
  )
}

interface EditorHeaderProps {
  /** Page title */
  title: string
  /** Has unsaved changes */
  isDirty?: boolean
  /** Back button click handler */
  onBack?: () => void
  /** Save button click handler */
  onSave?: () => void
  /** Save button disabled state */
  saveDisabled?: boolean
  /** Is saving */
  isSaving?: boolean
}

/**
 * EditorHeader - 编辑器顶部栏
 */
export function EditorHeader({
  title,
  isDirty = false,
  onBack,
  onSave,
  saveDisabled = false,
  isSaving = false,
}: EditorHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background px-4">
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="touch-target flex items-center justify-center rounded-sm text-foreground transition-colors hover:bg-surface active:opacity-60"
      >
        <span className="text-sm">取消</span>
      </button>

      {/* Title with dirty indicator */}
      <div className="flex items-center gap-2">
        <span className="font-medium text-foreground">{title}</span>
        {isDirty && (
          <span className="h-2 w-2 rounded-full bg-primary" aria-label="有未保存的修改" />
        )}
      </div>

      {/* Save button */}
      <button
        type="button"
        onClick={onSave}
        disabled={saveDisabled || isSaving}
        className={cn(
          'touch-target flex items-center justify-center rounded-sm bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors',
          saveDisabled || isSaving
            ? 'cursor-not-allowed opacity-50'
            : 'hover:bg-primary/90 active:opacity-80'
        )}
      >
        {isSaving ? '保存中...' : '保存'}
      </button>
    </header>
  )
}
