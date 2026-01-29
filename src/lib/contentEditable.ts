/**
 * ContentEditable utilities for WYSIWYG editor
 *
 * 支持的格式 (与工具栏一致):
 * - 加粗: **text** ↔ <strong>text</strong>
 * - 无序列表: - item ↔ <ul><li>item</li></ul>
 * - 有序列表: 1. item ↔ <ol><li>item</li></ol>
 *
 * 其他格式 (斜体等) 保持原样传递
 */

import DOMPurify from 'dompurify'

// 配置 DOMPurify 只允许受限标签
const ALLOWED_TAGS = ['p', 'br', 'strong', 'b', 'em', 'i', 'ul', 'ol', 'li', 'div']
const ALLOWED_ATTR: string[] = []

/**
 * 清理 HTML，防止 XSS
 * 所有外部输入的 HTML 都必须经过此函数清理
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  })
}

/**
 * Markdown → HTML（加载时显示）
 *
 * 只处理受限语法:
 * - **text** → <strong>text</strong>
 * - *text* → <em>text</em>
 * - - item → <li>item</li> (包装在 <ul>)
 * - 1. item → <li>item</li> (包装在 <ol>)
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown) return ''

  const lines = markdown.split('\n')
  const result: string[] = []
  let inUnorderedList = false
  let inOrderedList = false
  let lastWasBlank = false // 追踪上一行是否是空行

  for (const line of lines) {
    // 检查无序列表
    if (line.startsWith('- ')) {
      lastWasBlank = false
      if (inOrderedList) {
        result.push('</ol>')
        inOrderedList = false
      }
      if (!inUnorderedList) {
        result.push('<ul>')
        inUnorderedList = true
      }
      const content = processInlineMarkdown(line.substring(2))
      result.push(`<li>${content}</li>`)
      continue
    }

    // 检查有序列表
    const orderedMatch = line.match(/^(\d+)\. (.*)$/)
    if (orderedMatch) {
      lastWasBlank = false
      if (inUnorderedList) {
        result.push('</ul>')
        inUnorderedList = false
      }
      if (!inOrderedList) {
        result.push('<ol>')
        inOrderedList = true
      }
      const content = processInlineMarkdown(orderedMatch[2] ?? '')
      result.push(`<li>${content}</li>`)
      continue
    }

    // 普通段落 - 先关闭列表
    if (inUnorderedList) {
      result.push('</ul>')
      inUnorderedList = false
    }
    if (inOrderedList) {
      result.push('</ol>')
      inOrderedList = false
    }

    // 空行处理：
    // - 第一个空行是段落分隔符（不生成可见内容）
    // - 连续的额外空行是可见空行（保留为 <p><br></p>）
    if (line.trim() === '') {
      if (lastWasBlank) {
        // 连续空行：额外的空行生成可见空段落
        result.push('<p><br></p>')
      } else {
        // 第一个空行：只是段落分隔符
        lastWasBlank = true
      }
      continue
    }

    lastWasBlank = false

    // 普通文本
    const content = processInlineMarkdown(line)
    result.push(`<p>${content}</p>`)
  }

  // 关闭未闭合的列表
  if (inUnorderedList) {
    result.push('</ul>')
  }
  if (inOrderedList) {
    result.push('</ol>')
  }

  return result.join('')
}

/**
 * 处理行内 Markdown（加粗、斜体）
 */
function processInlineMarkdown(text: string): string {
  // 转义 HTML 特殊字符
  let result = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // **text** → <strong>text</strong>
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

  // *text* → <em>text</em> (避免与 ** 冲突)
  result = result.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')

  return result
}

/**
 * HTML → Markdown（保存时存储）
 *
 * 将 contenteditable 的 HTML 转回 Markdown 格式
 *
 * 安全说明: 这里使用 template 元素解析 HTML 是安全的，因为:
 * 1. template 元素的内容不会被执行（脚本不运行、图片不加载）
 * 2. 我们只提取文本内容，不将结果插入 DOM
 * 3. 调用此函数前，HTML 已经经过 DOMPurify 清理
 */
export function htmlToMarkdown(html: string): string {
  if (!html) return ''

  // 使用 template 元素安全地解析 HTML
  // template 的内容是惰性的，不会执行脚本或加载资源
  const template = document.createElement('template')
  template.innerHTML = DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR })

  return nodeToMarkdown(template.content, true).trim()
}

/**
 * 递归将 DOM 节点转为 Markdown
 * @param node - 要转换的节点
 * @param isTopLevel - 是否是顶层调用（用于处理块级元素后的文本换行）
 */
function nodeToMarkdown(node: Node, isTopLevel = false): string {
  const result: string[] = []
  let lastWasBlock = false // 追踪上一个元素是否是块级元素

  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent ?? ''
      // 如果上一个是块级元素，且当前文本非空，需要换行
      if (isTopLevel && lastWasBlock && text.trim()) {
        result.push('\n')
      }
      result.push(text)
      if (text.trim()) {
        lastWasBlock = false
      }
      continue
    }

    if (child.nodeType !== Node.ELEMENT_NODE) continue

    const element = child as Element
    const tagName = element.tagName.toLowerCase()

    switch (tagName) {
      case 'strong':
      case 'b':
        result.push(`**${nodeToMarkdown(element)}**`)
        lastWasBlock = false
        break

      case 'em':
      case 'i':
        result.push(`*${nodeToMarkdown(element)}*`)
        lastWasBlock = false
        break

      case 'ul':
        if (isTopLevel && lastWasBlock) {
          result.push('\n')
        }
        result.push(processUnorderedList(element))
        lastWasBlock = true
        break

      case 'ol':
        if (isTopLevel && lastWasBlock) {
          result.push('\n')
        }
        result.push(processOrderedList(element))
        lastWasBlock = true
        break

      case 'li':
        // li 应该由 ul/ol 处理，这里只是兜底
        result.push(`- ${nodeToMarkdown(element)}`)
        lastWasBlock = false
        break

      case 'p':
      case 'div': {
        const content = nodeToMarkdown(element)
        // 检查是否是空段落（只有 <br> 产生的换行或空内容）
        const isEmptyParagraph = !content.trim() || content === '\n'

        if (isEmptyParagraph) {
          // 空段落 = 一个额外的空行
          // 只在 lastWasBlock 时产生一个 \n，保持 lastWasBlock 不变
          // 这样连续多个空段落会各贡献一个 \n
          if (isTopLevel && lastWasBlock) {
            result.push('\n')
          }
          // 不改变 lastWasBlock，让它继续传递给下一个元素
          break
        }

        if (isTopLevel && lastWasBlock) {
          result.push('\n')
        }
        if (content || result.length > 0) {
          result.push(content)
          result.push('\n')
        }
        lastWasBlock = true
        break
      }

      case 'br':
        result.push('\n')
        lastWasBlock = false
        break

      default:
        // 其他标签只取内容
        result.push(nodeToMarkdown(element))
        lastWasBlock = false
    }
  }

  return result.join('')
}

/**
 * 处理无序列表
 */
function processUnorderedList(ul: Element): string {
  const items: string[] = []
  for (const li of Array.from(ul.children)) {
    if (li.tagName.toLowerCase() === 'li') {
      items.push(`- ${nodeToMarkdown(li).trim()}`)
    }
  }
  // 末尾加换行，配合 nodeToMarkdown 中块级元素前的换行，形成空行
  // 这样 Markdown 解析器才能正确识别列表结束
  return `${items.join('\n')}\n`
}

/**
 * 处理有序列表
 */
function processOrderedList(ol: Element): string {
  const items: string[] = []
  let counter = 1
  for (const li of Array.from(ol.children)) {
    if (li.tagName.toLowerCase() === 'li') {
      items.push(`${counter}. ${nodeToMarkdown(li).trim()}`)
      counter++
    }
  }
  // 末尾加换行，配合 nodeToMarkdown 中块级元素前的换行，形成空行
  return `${items.join('\n')}\n`
}

/**
 * 获取纯文本长度（用于字数统计）
 *
 * 安全说明: 使用 template 元素解析，只提取 textContent
 */
export function getTextLength(html: string): number {
  if (!html) return 0
  const template = document.createElement('template')
  // 清理 HTML 后再解析
  template.innerHTML = DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR })
  return template.content.textContent?.length ?? 0
}
