/**
 * Editor utility functions for contenteditable operations
 *
 * 这些函数封装了 contenteditable 的 DOM 操作，减少重复代码
 */

/**
 * 获取当前选区的文本节点和光标位置
 * @returns 文本节点信息，或 null（如果不在文本节点中）
 */
export function getTextNodeContext(): {
  selection: Selection
  range: Range
  node: Node
  text: string
  cursorPos: number
} | null {
  const selection = window.getSelection()
  if (!selection || !selection.rangeCount) return null

  const range = selection.getRangeAt(0)
  const node = range.startContainer

  if (node.nodeType !== Node.TEXT_NODE) return null

  return {
    selection,
    range,
    node,
    text: node.textContent ?? '',
    cursorPos: range.startOffset,
  }
}

/**
 * 应用 Markdown 格式转换（如 **text** → 粗体）
 * @param pattern - 匹配的正则表达式（需要捕获组 1 为内容）
 * @param command - execCommand 的命令名（如 'bold', 'italic'）
 * @returns 是否成功应用
 */
export function applyMarkdownFormat(pattern: RegExp, command: string): boolean {
  const ctx = getTextNodeContext()
  if (!ctx) return false

  const { selection, node, text, cursorPos } = ctx
  const textBeforeCursor = text.slice(0, cursorPos)

  const match = textBeforeCursor.match(pattern)
  if (!match || !match[1]) return false

  const content = match[1]
  const matchStart = cursorPos - match[0].length

  // 选中匹配的文本
  const selectRange = document.createRange()
  selectRange.setStart(node, matchStart)
  selectRange.setEnd(node, cursorPos)
  selection.removeAllRanges()
  selection.addRange(selectRange)

  // 删除 Markdown 语法，插入纯文本
  document.execCommand('delete', false)
  document.execCommand('insertText', false, content)

  // 选中插入的文本并应用格式
  const newNode = selection.anchorNode
  if (newNode && newNode.nodeType === Node.TEXT_NODE) {
    const newPos = selection.anchorOffset
    const formatRange = document.createRange()
    formatRange.setStart(newNode, newPos - content.length)
    formatRange.setEnd(newNode, newPos)
    selection.removeAllRanges()
    selection.addRange(formatRange)
    document.execCommand(command, false)
    selection.collapseToEnd()
  }

  return true
}

/**
 * 自动转换列表（如 "- " → 无序列表）
 * @param pattern - 匹配的正则表达式
 * @param expectedCursorPos - 期望的光标位置
 * @param listCommand - 列表命令（'insertUnorderedList' 或 'insertOrderedList'）
 * @param prefixLength - 前缀长度（用于删除）
 * @returns 是否成功转换
 */
export function convertToList(
  pattern: RegExp,
  expectedCursorPos: number,
  listCommand: string,
  prefixLength: number,
): boolean {
  const ctx = getTextNodeContext()
  if (!ctx) return false

  const { text, cursorPos } = ctx
  if (!pattern.test(text) || cursorPos !== expectedCursorPos) return false

  // 先转换为列表
  document.execCommand(listCommand, false)

  // 转换后删除前缀
  const newSelection = window.getSelection()
  if (newSelection && newSelection.rangeCount > 0) {
    const newRange = newSelection.getRangeAt(0)
    const newNode = newRange.startContainer
    if (newNode.nodeType === Node.TEXT_NODE && pattern.test(newNode.textContent ?? '')) {
      const deleteRange = document.createRange()
      deleteRange.setStart(newNode, 0)
      deleteRange.setEnd(newNode, prefixLength)
      newSelection.removeAllRanges()
      newSelection.addRange(deleteRange)
      document.execCommand('delete', false)
    }
  }

  return true
}

/**
 * 获取当前光标所在的列表项
 * @returns 列表项元素和父列表，或 null
 */
export function getListItemContext(): {
  li: HTMLLIElement
  list: HTMLUListElement | HTMLOListElement
} | null {
  const selection = window.getSelection()
  if (!selection || !selection.rangeCount) return null

  const range = selection.getRangeAt(0)
  const li =
    range.startContainer.parentElement?.closest('li') ??
    (range.startContainer.nodeType === Node.ELEMENT_NODE
      ? (range.startContainer as Element).closest('li')
      : null)

  if (!li) return null

  const list = li.closest('ul, ol') as HTMLUListElement | HTMLOListElement | null
  if (!list) return null

  return { li: li as HTMLLIElement, list }
}

/**
 * 退出列表（移除列表项并插入内容）
 * @param li - 要移除的列表项
 * @param list - 父列表
 * @param insertContent - 要插入的 HTML 内容（可选）
 */
export function exitList(
  li: HTMLLIElement,
  list: HTMLUListElement | HTMLOListElement,
  insertContent?: string,
): void {
  // 移除列表项
  li.remove()

  // 如果列表为空，也移除列表
  if (list.children.length === 0) {
    list.remove()
  }

  // 插入内容
  if (insertContent) {
    document.execCommand('insertHTML', false, insertContent)
  } else {
    document.execCommand('insertParagraph', false)
  }
}
