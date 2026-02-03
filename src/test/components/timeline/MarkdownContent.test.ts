import { describe, expect, it } from 'vitest'
import { preprocessMarkdown } from '@/components/timeline/MarkdownContent'

describe('preprocessMarkdown', () => {
  it('should return unchanged for text without blank lines', () => {
    expect(preprocessMarkdown('Hello world')).toBe('Hello world')
  })

  it('should return unchanged for single blank line (paragraph separator)', () => {
    // 一个空行 = 段落分隔，不需要转换
    expect(preprocessMarkdown('Line 1\n\nLine 2')).toBe('Line 1\n\nLine 2')
  })

  it('should convert one visible blank line (two consecutive empty lines)', () => {
    // 两个空行 = 一个段落分隔 + 一个可见空行
    // \n\n\n 中有一个额外的 \n，应该变成 \u00A0
    const input = 'Line 1\n\n\nLine 2'
    const expected = 'Line 1\n\n\u00A0\n\nLine 2'
    expect(preprocessMarkdown(input)).toBe(expected)
  })

  it('should convert two visible blank lines (three consecutive empty lines)', () => {
    // 三个空行 = 一个段落分隔 + 两个可见空行
    const input = 'Line 1\n\n\n\nLine 2'
    const expected = 'Line 1\n\n\u00A0\n\n\u00A0\n\nLine 2'
    expect(preprocessMarkdown(input)).toBe(expected)
  })

  it('should handle multiple sections with visible blank lines', () => {
    const input = 'A\n\n\nB\n\n\n\nC'
    const expected = 'A\n\n\u00A0\n\nB\n\n\u00A0\n\n\u00A0\n\nC'
    expect(preprocessMarkdown(input)).toBe(expected)
  })

  it('should handle blank lines at the start', () => {
    const input = '\n\n\nLine 1'
    const expected = '\n\n\u00A0\n\nLine 1'
    expect(preprocessMarkdown(input)).toBe(expected)
  })

  it('should handle blank lines at the end', () => {
    const input = 'Line 1\n\n\n'
    const expected = 'Line 1\n\n\u00A0\n\n'
    expect(preprocessMarkdown(input)).toBe(expected)
  })

  it('should not affect list formatting', () => {
    const input = 'Text\n\n- item 1\n- item 2'
    expect(preprocessMarkdown(input)).toBe('Text\n\n- item 1\n- item 2')
  })

  it('should handle visible blank line before list', () => {
    const input = 'Text\n\n\n- item 1'
    const expected = 'Text\n\n\u00A0\n\n- item 1'
    expect(preprocessMarkdown(input)).toBe(expected)
  })
})
