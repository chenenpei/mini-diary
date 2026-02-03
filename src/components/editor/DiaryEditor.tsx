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

  // Markdown 快捷输入：检测 **text** 和 *text* 并转换
  const handleMarkdownShortcuts = useCallback(() => {
    const selection = window.getSelection()
    if (!selection || !selection.rangeCount) return

    const range = selection.getRangeAt(0)
    const node = range.startContainer

    // 只处理文本节点
    if (node.nodeType !== Node.TEXT_NODE) return

    const text = node.textContent ?? ''
    const cursorPos = range.startOffset

    // 获取光标前的文本
    const textBeforeCursor = text.slice(0, cursorPos)

    // 检测 **text** 粗体 (需要至少 **x**)
    const boldMatch = textBeforeCursor.match(/\*\*(.+)\*\*$/)
    if (boldMatch && boldMatch[1]) {
      const content = boldMatch[1]
      const matchStart = cursorPos - boldMatch[0].length

      // 创建新 range 选中匹配的文本
      const newRange = document.createRange()
      newRange.setStart(node, matchStart)
      newRange.setEnd(node, cursorPos)
      selection.removeAllRanges()
      selection.addRange(newRange)

      // 删除选中的 **text**
      document.execCommand('delete', false)
      // 插入纯文本
      document.execCommand('insertText', false, content)

      // 选中插入的文本并加粗
      const newNode = selection.anchorNode
      if (newNode && newNode.nodeType === Node.TEXT_NODE) {
        const newPos = selection.anchorOffset
        const selectRange = document.createRange()
        selectRange.setStart(newNode, newPos - content.length)
        selectRange.setEnd(newNode, newPos)
        selection.removeAllRanges()
        selection.addRange(selectRange)
        document.execCommand('bold', false)
        // 取消选择，光标移到末尾
        selection.collapseToEnd()
      }
      return
    }

    // 检测 *text* 斜体 (需要避免与 ** 冲突)
    // 匹配单个 * 包裹的文本，但排除 ** 的情况
    const italicMatch = textBeforeCursor.match(/(?<!\*)\*([^*]+)\*$/)
    if (italicMatch && italicMatch[1]) {
      const content = italicMatch[1]
      const matchStart = cursorPos - italicMatch[0].length

      // 创建新 range 选中匹配的文本
      const newRange = document.createRange()
      newRange.setStart(node, matchStart)
      newRange.setEnd(node, cursorPos)
      selection.removeAllRanges()
      selection.addRange(newRange)

      // 删除选中的 *text*
      document.execCommand('delete', false)
      // 插入纯文本
      document.execCommand('insertText', false, content)

      // 选中插入的文本并斜体
      const newNode = selection.anchorNode
      if (newNode && newNode.nodeType === Node.TEXT_NODE) {
        const newPos = selection.anchorOffset
        const selectRange = document.createRange()
        selectRange.setStart(newNode, newPos - content.length)
        selectRange.setEnd(newNode, newPos)
        selection.removeAllRanges()
        selection.addRange(selectRange)
        document.execCommand('italic', false)
        // 取消选择，光标移到末尾
        selection.collapseToEnd()
      }
      return
    }
  }, [])

  // 自动列表转换：检测行首 "- " 或 "1. " 并转换
  const handleAutoList = useCallback(() => {
    const selection = window.getSelection()
    if (!selection || !selection.rangeCount) return

    const range = selection.getRangeAt(0)
    const node = range.startContainer

    // 只处理文本节点
    if (node.nodeType !== Node.TEXT_NODE) return

    const text = node.textContent ?? ''
    const cursorPos = range.startOffset

    // 检测 "- " 无序列表（空格可能是普通空格或不间断空格 \u00A0）
    if (/^-[\s\u00A0]$/.test(text) && cursorPos === 2) {
      // 先转换为列表，再删除前缀
      document.execCommand('insertUnorderedList', false)
      // 转换后重新获取选区，删除 "- "
      const newSelection = window.getSelection()
      if (newSelection && newSelection.rangeCount > 0) {
        const newRange = newSelection.getRangeAt(0)
        const newNode = newRange.startContainer
        if (newNode.nodeType === Node.TEXT_NODE && /^-[\s\u00A0]/.test(newNode.textContent ?? '')) {
          const deleteRange = document.createRange()
          deleteRange.setStart(newNode, 0)
          deleteRange.setEnd(newNode, 2)
          newSelection.removeAllRanges()
          newSelection.addRange(deleteRange)
          document.execCommand('delete', false)
        }
      }
      return
    }

    // 检测 "1. " 有序列表（空格可能是普通空格或不间断空格 \u00A0）
    if (/^1\.[\s\u00A0]$/.test(text) && cursorPos === 3) {
      // 先转换为列表，再删除前缀
      document.execCommand('insertOrderedList', false)
      // 转换后重新获取选区，删除 "1. "
      const newSelection = window.getSelection()
      if (newSelection && newSelection.rangeCount > 0) {
        const newRange = newSelection.getRangeAt(0)
        const newNode = newRange.startContainer
        if (
          newNode.nodeType === Node.TEXT_NODE &&
          /^1\.[\s\u00A0]/.test(newNode.textContent ?? '')
        ) {
          const deleteRange = document.createRange()
          deleteRange.setStart(newNode, 0)
          deleteRange.setEnd(newNode, 3)
          newSelection.removeAllRanges()
          newSelection.addRange(deleteRange)
          document.execCommand('delete', false)
        }
      }
      return
    }
  }, [])

  // 处理输入
  const handleInput = useCallback(() => {
    // 在 IME 输入过程中不触发更新
    if (isComposingRef.current) return

    // Markdown 快捷转换
    handleMarkdownShortcuts()

    // 自动列表转换
    handleAutoList()

    updateCharCount()

    if (editorRef.current && onChange) {
      const markdown = htmlToMarkdown(editorRef.current.innerHTML)
      onChange(markdown)
    }
  }, [onChange, updateCharCount, handleMarkdownShortcuts, handleAutoList])

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
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault()
    // 只提取纯文本，丢弃所有 HTML
    const text = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
  }, [])

  // 处理键盘事件
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    // Enter 键在空列表项中退出列表
    if (e.key === 'Enter' && !e.shiftKey) {
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        const li = range.startContainer.parentElement?.closest('li')

        if (li) {
          // 检查列表项是否为空（只有 <br> 或空文本）
          const text = li.textContent?.trim() ?? ''
          if (text === '') {
            e.preventDefault()

            // 获取父列表
            const list = li.closest('ul, ol')
            if (list) {
              // 移除空的 li
              li.remove()

              // 如果列表为空，也移除列表
              if (list.children.length === 0) {
                list.remove()
              }

              // 插入新段落
              document.execCommand('insertParagraph', false)
            }
            return
          }
        }
      }
    }

    // Backspace 在列表项开头退出列表
    if (e.key === 'Backspace') {
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)

        // 检查是否在列表项开头（collapsed 且 offset 为 0）
        if (range.collapsed && range.startOffset === 0) {
          const li =
            range.startContainer.parentElement?.closest('li') ??
            (range.startContainer.nodeType === Node.ELEMENT_NODE
              ? (range.startContainer as Element).closest('li')
              : null)

          if (li) {
            e.preventDefault()

            // 保存列表项内容
            const content = li.innerHTML
            const list = li.closest('ul, ol')

            if (list) {
              // 移除列表项
              li.remove()

              // 如果列表为空，也移除列表
              if (list.children.length === 0) {
                list.remove()
              }

              // 插入内容作为段落
              document.execCommand('insertHTML', false, `<p>${content || '<br>'}</p>`)
            }
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
            '[&_ol+ol]:mt-2',
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
            className={cn('text-xs', isOverLimit ? 'text-destructive' : 'text-muted-foreground')}
          >
            {charCount.toLocaleString()} / {MAX_CONTENT_LENGTH.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  )
})

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
          <output className="sr-only" aria-live="polite">
            {t('unsavedChanges')}
          </output>
        )}
        {isDirty && <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />}
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
            : 'hover:bg-primary/90 active:opacity-80',
        )}
      >
        {isSaving ? t('saving') : t('save')}
      </button>
    </header>
  )
}
