/**
 * Markdown configuration for MiniDiary
 *
 * 支持的语法 (受限):
 * - **加粗**
 * - *斜体*
 * - 列表 (有序/无序)
 *
 * 不支持:
 * - 标题
 * - 链接
 * - 图片
 * - 代码块
 * - 引用
 */

import type { Components } from 'react-markdown'

/**
 * Custom component overrides for react-markdown
 * Restricts rendering to only supported elements
 */
export const markdownComponents: Components = {
  // Supported: bold
  strong: ({ children }) => (
    <strong className="font-bold">{children}</strong>
  ),

  // Supported: italic
  em: ({ children }) => (
    <em className="italic">{children}</em>
  ),

  // Supported: unordered list - 间距由容器相邻兄弟选择器控制
  ul: ({ children }) => (
    <ul className="list-disc pl-5">{children}</ul>
  ),

  // Supported: ordered list - 间距由容器相邻兄弟选择器控制
  ol: ({ children }) => (
    <ol className="list-decimal pl-5">{children}</ol>
  ),

  // Supported: list item - 与编辑器对齐
  li: ({ children }) => <li className="my-0.5">{children}</li>,

  // Supported: paragraph - 无 margin，与编辑器对齐
  p: ({ children }) => (
    <p className="leading-relaxed">{children}</p>
  ),

  // Disable unsupported elements by rendering just their children
  h1: ({ children }) => <p className="my-2">{children}</p>,
  h2: ({ children }) => <p className="my-2">{children}</p>,
  h3: ({ children }) => <p className="my-2">{children}</p>,
  h4: ({ children }) => <p className="my-2">{children}</p>,
  h5: ({ children }) => <p className="my-2">{children}</p>,
  h6: ({ children }) => <p className="my-2">{children}</p>,

  // Disable links (render as plain text)
  a: ({ children }) => <span>{children}</span>,

  // Disable images
  img: () => null,

  // Disable blockquote
  blockquote: ({ children }) => <div className="my-2">{children}</div>,

  // Disable code blocks
  code: ({ children }) => <span>{children}</span>,
  pre: ({ children }) => <div>{children}</div>,

  // Disable horizontal rule
  hr: () => null,
}
