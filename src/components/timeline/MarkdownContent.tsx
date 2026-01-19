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
 * 预处理 Markdown，保留可见空行
 *
 * 标准 Markdown 会将多个空行合并为一个段落分隔。
 * 为了保留用户编辑器中创建的可见空行，我们将额外的空行
 * 转换为包含 non-breaking space 的行，这样 react-markdown
 * 会将它们作为可见段落渲染。
 *
 * 规则：
 * - 一个空行 = 段落分隔（不可见）
 * - 两个或更多空行 = 段落分隔 + 可见空行
 */
export function preprocessMarkdown(markdown: string): string {
  // 将连续 3 个或更多换行符中的"额外"换行转换为带内容的行
  // \n\n\n → \n\n\u00A0\n\n （第一个空行是分隔符，第二个变成可见）
  return markdown.replace(/\n\n(\n+)/g, (_match, extraNewlines: string) => {
    // extraNewlines.length = 额外换行符数量 = 可见空行数量
    const visibleLines = Array(extraNewlines.length).fill('\u00A0').join('\n\n')
    return '\n\n' + visibleLines + '\n\n'
  })
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
  const processedContent = preprocessMarkdown(content)

  return (
    <div className={cn(
      'max-w-none text-foreground',
      // 段落间距规则（相邻兄弟选择器）
      '[&>p+p]:mt-2',           // 段落+段落：有间距
      '[&>ul+p]:mt-2',          // 列表+段落：有间距
      '[&>ol+p]:mt-2',
      '[&>ul+ul]:mt-2',         // 列表+列表：有间距
      '[&>ul+ol]:mt-2',
      '[&>ol+ul]:mt-2',
      '[&>ol+ol]:mt-2',
      className
    )}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  )
}
