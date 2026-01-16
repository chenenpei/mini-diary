'use client'

import { cn } from '@/lib/utils'
import { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { useTranslation } from 'react-i18next'
import { ImagePreview } from './ImagePreview'

const MAX_CONTENT_LENGTH = 10000

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

export interface DiaryEditorRef {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  setContent: (content: string) => void
}

interface DiaryEditorProps {
  /** Initial content */
  initialContent?: string
  /** Content change handler */
  onChange?: (content: string) => void
  /** Existing images with URLs (for edit mode) */
  existingImages?: ExistingImage[]
  /** New images being added */
  newImages?: NewImage[]
  /** Callback when existing image is removed */
  onExistingImageRemove?: (id: string) => void
  /** Callback when new image is removed */
  onNewImageRemove?: (id: string) => void
  /** Placeholder text */
  placeholder?: string
  /** Auto focus on mount */
  autoFocus?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * DiaryEditor - 日记编辑器组件（沉浸式设计）
 *
 * 设计规范:
 * - 无边框、透明背景
 * - 图片展示在文字下方
 * - 字数统计在底部
 */
export const DiaryEditor = forwardRef<DiaryEditorRef, DiaryEditorProps>(
  function DiaryEditor(
    {
      initialContent = '',
      onChange,
      existingImages = [],
      newImages = [],
      onExistingImageRemove,
      onNewImageRemove,
      placeholder,
      autoFocus = false,
      className,
    },
    ref
  ) {
    const { t } = useTranslation('editor')
    const [content, setContent] = useState(initialContent)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const placeholderText = placeholder ?? t('placeholder')

    // 暴露 ref 给父组件
    useImperativeHandle(ref, () => ({
      textareaRef,
      setContent: (newContent: string) => {
        setContent(newContent)
        onChange?.(newContent)
      },
    }))

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
    const hasImages = existingImages.length > 0 || newImages.length > 0

    return (
      <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
        {/* Textarea - 占据剩余空间，内容超出时滚动 */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          placeholder={placeholderText}
          autoFocus={autoFocus}
          className={cn(
            'min-h-0 w-full flex-1 resize-none border-none bg-transparent p-0 text-base leading-relaxed text-foreground placeholder:text-muted-foreground',
            'focus:outline-none'
          )}
        />

        {/* 底部固定区域：图片 + 字数统计 */}
        <div className="mt-auto shrink-0 pt-4">
          {/* Image preview */}
          {hasImages && (
            <ImagePreview
              existingImages={existingImages}
              newImages={newImages}
              onExistingRemove={onExistingImageRemove}
              onNewRemove={onNewImageRemove}
              className="mb-4"
            />
          )}

          {/* Character count */}
          <div className="flex justify-end">
            <span
              className={cn(
                'text-xs',
                isOverLimit ? 'text-destructive' : 'text-muted-foreground'
              )}
            >
              {charCount.toLocaleString()} / {MAX_CONTENT_LENGTH.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    )
  }
)

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
  const { t } = useTranslation('editor')

  return (
    <header className="sticky top-0 z-40 flex h-12 items-center justify-between border-b border-border bg-background px-4">
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-foreground transition-colors hover:text-foreground/70 active:opacity-60"
      >
        {t('cancel')}
      </button>

      {/* Title with dirty indicator */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground">{title}</span>
        {isDirty && (
          <span className="h-1.5 w-1.5 rounded-full bg-primary" role="status" aria-label={t('unsavedChanges')} />
        )}
      </div>

      {/* Save button */}
      <button
        type="button"
        onClick={onSave}
        disabled={saveDisabled || isSaving}
        className={cn(
          'rounded-md bg-primary px-3 py-1 text-sm font-medium text-primary-foreground transition-colors',
          saveDisabled || isSaving
            ? 'cursor-not-allowed opacity-50'
            : 'hover:bg-primary/90 active:opacity-80'
        )}
      >
        {isSaving ? t('saving') : t('save')}
      </button>
    </header>
  )
}
