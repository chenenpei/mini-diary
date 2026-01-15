'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'
import { markdownComponents } from '@/lib/markdown'

interface MarkdownContentProps {
  /** Markdown content to render */
  content: string
  /** Additional CSS classes */
  className?: string
}

/**
 * MarkdownContent - Markdown 内容渲染组件
 *
 * 支持受限的 Markdown 语法:
 * - **加粗**
 * - *斜体*
 * - 列表 (有序/无序)
 */
export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div className={cn('prose prose-sm max-w-none text-foreground', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
