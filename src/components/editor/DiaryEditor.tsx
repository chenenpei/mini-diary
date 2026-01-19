'use client'

import { cn } from '@/lib/utils'
import {
  useState,
  useCallback,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useMemo,
} from 'react'
import { useTranslation } from 'react-i18next'
import { ImagePreview } from './ImagePreview'
import {
  markdownToHtml,
  htmlToMarkdown,
  sanitizeHtml,
  getTextLength,
} from '@/lib/contentEditable'

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
  editorRef: React.RefObject<HTMLDivElement | null>
  setContent: (content: string) => void
  getMarkdown: () => string
}

interface DiaryEditorProps {
  /** Initial content (Markdown format) */
  initialContent?: string
  /** Content change handler (receives Markdown) */
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
 * DiaryEditor - 日记编辑器组件（WYSIWYG 设计）
 *
 * 设计规范:
 * - 使用 contenteditable 实现所见即所得
 * - 支持加粗、无序列表、有序列表
 * - 数据以 Markdown 格式存储
 *
 * 安全说明:
 * - 所有 HTML 内容在设置前都经过 DOMPurify sanitizeHtml() 清理
 * - 粘贴时只提取纯文本，丢弃 HTML
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
    const editorRef = useRef<HTMLDivElement>(null)
    const placeholderText = placeholder ?? t('placeholder')
    const isComposingRef = useRef(false)
    const [isComposing, setIsComposing] = useState(false)
    const [charCount, setCharCount] = useState(0)

    // 将 Markdown 转为 HTML 显示（已清理）
    const initialHtml = useMemo(
      () => sanitizeHtml(markdownToHtml(initialContent)),
      [initialContent]
    )

    // 安全地设置编辑器内容
    const setEditorContent = useCallback((html: string) => {
      if (editorRef.current) {
        // 内容已经过 sanitizeHtml 清理，安全设置
        editorRef.current.innerHTML = html
      }
    }, [])

    // 暴露 ref 给父组件
    useImperativeHandle(ref, () => ({
      editorRef,
      setContent: (markdown: string) => {
        const html = sanitizeHtml(markdownToHtml(markdown))
        setEditorContent(html)
        updateCharCount()
        onChange?.(markdown)
      },
      getMarkdown: () => {
        if (editorRef.current) {
          return htmlToMarkdown(editorRef.current.innerHTML)
        }
        return ''
      },
    }))

    // 更新字数统计
    const updateCharCount = useCallback(() => {
      if (editorRef.current) {
        const length = getTextLength(editorRef.current.innerHTML)
        setCharCount(length)
      }
    }, [])

    // 初始化编辑器内容
    useEffect(() => {
      if (editorRef.current && initialHtml) {
        setEditorContent(initialHtml)
        updateCharCount()
      }
    }, [initialHtml, updateCharCount, setEditorContent])

    // 自动聚焦
    useEffect(() => {
      if (autoFocus && editorRef.current) {
        editorRef.current.focus()
        // 将光标移到末尾
        const selection = window.getSelection()
        if (selection) {
          selection.selectAllChildren(editorRef.current)
          selection.collapseToEnd()
        }
      }
    }, [autoFocus])

    // 处理输入
    const handleInput = useCallback(() => {
      // 在 IME 输入过程中不触发更新
      if (isComposingRef.current) return

      updateCharCount()

      if (editorRef.current && onChange) {
        const markdown = htmlToMarkdown(editorRef.current.innerHTML)
        onChange(markdown)
      }
    }, [onChange, updateCharCount])

    // 处理 IME 输入开始
    const handleCompositionStart = useCallback(() => {
      isComposingRef.current = true
      setIsComposing(true)
    }, [])

    // 处理 IME 输入结束
    const handleCompositionEnd = useCallback(() => {
      isComposingRef.current = false
      setIsComposing(false)
      handleInput()
    }, [handleInput])

    // 处理粘贴 - 只保留纯文本，防止 XSS
    const handlePaste = useCallback(
      (e: React.ClipboardEvent) => {
        e.preventDefault()
        // 只提取纯文本，丢弃所有 HTML
        const text = e.clipboardData.getData('text/plain')
        document.execCommand('insertText', false, text)
      },
      []
    )

    // 处理键盘事件
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>) => {
        // Cmd/Ctrl + B 加粗
        if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
          e.preventDefault()
          document.execCommand('bold', false)
          return
        }

        // Cmd/Ctrl + I 斜体
        if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
          e.preventDefault()
          document.execCommand('italic', false)
          return
        }
      },
      []
    )

    const isOverLimit = charCount > MAX_CONTENT_LENGTH
    const hasImages = existingImages.length > 0 || newImages.length > 0
    const isEmpty = charCount === 0

    return (
      <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
        {/* ContentEditable 编辑器 */}
        <div className="relative min-h-0 flex-1">
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            className={cn(
              'min-h-full w-full border-none bg-transparent p-0 text-sm leading-relaxed text-foreground',
              'focus:outline-none',
              // 编辑器内部基础样式
              '[&_p]:my-0 [&_p]:leading-relaxed',
              '[&_ul]:my-0 [&_ul]:list-disc [&_ul]:pl-5',
              '[&_ol]:my-0 [&_ol]:list-decimal [&_ol]:pl-5',
              '[&_li]:my-0.5',
              '[&_strong]:font-bold',
              '[&_em]:italic',
              // 段落间距规则（相邻兄弟选择器）
              '[&_p+p]:mt-2',
              '[&_ul+p]:mt-2',
              '[&_ol+p]:mt-2',
              '[&_ul+ul]:mt-2',
              '[&_ul+ol]:mt-2',
              '[&_ol+ul]:mt-2',
              '[&_ol+ol]:mt-2'
            )}
            suppressContentEditableWarning
          />
          {/* Placeholder - IME 输入时也隐藏 */}
          {isEmpty && !isComposing && (
            <div
              className="pointer-events-none absolute left-0 top-0 text-base leading-relaxed text-muted-foreground"
              aria-hidden="true"
            >
              {placeholderText}
            </div>
          )}
        </div>

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
        <span className="text-base font-medium text-foreground">{title}</span>
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
