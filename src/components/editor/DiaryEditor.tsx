'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import {
  getTextLength,
  hasStructuralContent,
  htmlToMarkdown,
  markdownToHtml,
  sanitizeHtml,
} from '@/lib/contentEditable'
import { cn } from '@/lib/utils'
import { ImagePreview } from './ImagePreview'
import {
  applyMarkdownFormat,
  convertToList,
  exitList,
  getListItemContext,
} from './editorUtils'

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

// Markdown 快捷输入的正则和命令配置
const MARKDOWN_SHORTCUTS = [
  { pattern: /\*\*(.+)\*\*$/, command: 'bold' }, // **text** → 粗体
  { pattern: /(?<!\*)\*([^*]+)\*$/, command: 'italic' }, // *text* → 斜体
] as const

// 自动列表转换配置
const AUTO_LIST_CONFIGS = [
  { pattern: /^-[\s\u00A0]$/, cursorPos: 2, command: 'insertUnorderedList', prefixLen: 2 },
  { pattern: /^1\.[\s\u00A0]$/, cursorPos: 3, command: 'insertOrderedList', prefixLen: 3 },
] as const

/**
 * DiaryEditor - 日记编辑器组件（WYSIWYG 设计）
 *
 * 设计规范:
 * - 使用 contenteditable 实现所见即所得
 * - 支持加粗、斜体、无序列表、有序列表
 * - 数据以 Markdown 格式存储
 *
 * 安全说明:
 * - 所有 HTML 内容在设置前都经过 DOMPurify sanitizeHtml() 清理
 * - 粘贴时只提取纯文本，丢弃 HTML
 */
export const DiaryEditor = forwardRef<DiaryEditorRef, DiaryEditorProps>(function DiaryEditor(
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
  ref,
) {
  const { t } = useTranslation('editor')
  const editorRef = useRef<HTMLDivElement>(null)
  const placeholderText = placeholder ?? t('placeholder')
  const isComposingRef = useRef(false)
  const [isComposing, setIsComposing] = useState(false)
  const [charCount, setCharCount] = useState(0)

  // 将 Markdown 转为 HTML 显示（已清理）
  const initialHtml = useMemo(() => sanitizeHtml(markdownToHtml(initialContent)), [initialContent])

  // 安全地设置编辑器内容（内容已经过 DOMPurify sanitizeHtml 清理）
  const setEditorContent = useCallback((html: string) => {
    if (editorRef.current) {
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
      const selection = window.getSelection()
      if (selection) {
        selection.selectAllChildren(editorRef.current)
        selection.collapseToEnd()
      }
    }
  }, [autoFocus])

  // Markdown 快捷输入处理
  const handleMarkdownShortcuts = useCallback(() => {
    for (const { pattern, command } of MARKDOWN_SHORTCUTS) {
      if (applyMarkdownFormat(pattern, command)) return
    }
  }, [])

  // 自动列表转换处理
  const handleAutoList = useCallback(() => {
    for (const { pattern, cursorPos, command, prefixLen } of AUTO_LIST_CONFIGS) {
      if (convertToList(pattern, cursorPos, command, prefixLen)) return
    }
  }, [])

  // 处理输入
  const handleInput = useCallback(() => {
    if (isComposingRef.current) return

    handleMarkdownShortcuts()
    handleAutoList()
    updateCharCount()

    if (editorRef.current && onChange) {
      const markdown = htmlToMarkdown(editorRef.current.innerHTML)
      onChange(markdown)
    }
  }, [onChange, updateCharCount, handleMarkdownShortcuts, handleAutoList])

  // 处理 IME 输入
  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true
    setIsComposing(true)
  }, [])

  const handleCompositionEnd = useCallback(() => {
    isComposingRef.current = false
    setIsComposing(false)
    handleInput()
  }, [handleInput])

  // 处理粘贴 - 只保留纯文本
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
  }, [])

  // 处理键盘事件
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    // Enter 键在空列表项中退出列表
    if (e.key === 'Enter' && !e.shiftKey) {
      const ctx = getListItemContext()
      if (ctx && ctx.li.textContent?.trim() === '') {
        e.preventDefault()
        exitList(ctx.li, ctx.list)
        return
      }
    }

    // Backspace 在列表项开头退出列表
    if (e.key === 'Backspace') {
      const selection = window.getSelection()
      if (selection?.rangeCount) {
        const range = selection.getRangeAt(0)
        if (range.collapsed && range.startOffset === 0) {
          const ctx = getListItemContext()
          if (ctx) {
            e.preventDefault()
            const content = ctx.li.innerHTML
            exitList(ctx.li, ctx.list, `<p>${content || '<br>'}</p>`)
            return
          }
        }
      }
    }

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
  }, [])

  const isOverLimit = charCount > MAX_CONTENT_LENGTH
  const hasImages = existingImages.length > 0 || newImages.length > 0
  const isEmpty = charCount === 0 && !hasStructuralContent(editorRef.current?.innerHTML ?? '')

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
      {/* ContentEditable 编辑器 */}
      <div className="relative min-h-0 flex-1">
        {/* biome-ignore lint/a11y/useSemanticElements: contentEditable requires div, not textarea */}
        <div
          ref={editorRef}
          role="textbox"
          aria-multiline="true"
          tabIndex={0}
          contentEditable
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          className={cn(
            'min-h-full w-full border-none bg-transparent p-0 text-sm leading-relaxed text-foreground',
            'outline-none focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2',
            '[&_p]:my-0 [&_p]:leading-relaxed',
            '[&_ul]:my-0 [&_ul]:list-disc [&_ul]:pl-5',
            '[&_ol]:my-0 [&_ol]:list-decimal [&_ol]:pl-5',
            '[&_li]:my-0.5',
            '[&_strong]:font-bold',
            '[&_em]:italic',
            '[&_p+p]:mt-2',
            '[&_ul+p]:mt-2',
            '[&_ol+p]:mt-2',
            '[&_ul+ul]:mt-2',
            '[&_ul+ol]:mt-2',
            '[&_ol+ul]:mt-2',
            '[&_ol+ol]:mt-2',
          )}
          suppressContentEditableWarning
        />
        {/* Placeholder */}
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
        {hasImages && (
          <ImagePreview
            existingImages={existingImages}
            newImages={newImages}
            onExistingRemove={onExistingImageRemove}
            onNewRemove={onNewImageRemove}
            className="mb-4"
          />
        )}

        <div className="flex justify-end">
          <span
            className={cn('text-xs', isOverLimit ? 'text-destructive' : 'text-muted-foreground')}
          >
            {charCount.toLocaleString()} / {MAX_CONTENT_LENGTH.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  )
})
