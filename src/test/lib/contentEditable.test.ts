import { describe, expect, it } from 'vitest'
import {
  getTextLength,
  hasStructuralContent,
  htmlToMarkdown,
  markdownToHtml,
  sanitizeHtml,
} from '@/lib/contentEditable'

describe('contentEditable utilities', () => {
  describe('sanitizeHtml', () => {
    it('should allow safe tags', () => {
      const html = '<p>Hello <strong>world</strong></p>'
      expect(sanitizeHtml(html)).toBe('<p>Hello <strong>world</strong></p>')
    })

    it('should remove script tags', () => {
      const html = '<p>Hello</p><script>alert("xss")</script>'
      expect(sanitizeHtml(html)).toBe('<p>Hello</p>')
    })

    it('should remove onclick attributes', () => {
      const html = '<p onclick="alert(1)">Hello</p>'
      expect(sanitizeHtml(html)).toBe('<p>Hello</p>')
    })

    it('should remove href attributes', () => {
      const html = '<a href="javascript:alert(1)">link</a>'
      // a tag is not allowed, so it should be removed entirely
      expect(sanitizeHtml(html)).toBe('link')
    })
  })

  describe('markdownToHtml', () => {
    it('should return empty string for empty input', () => {
      expect(markdownToHtml('')).toBe('')
    })

    it('should convert plain text to paragraph', () => {
      expect(markdownToHtml('Hello world')).toBe('<p>Hello world</p>')
    })

    it('should convert bold text', () => {
      expect(markdownToHtml('Hello **world**')).toBe('<p>Hello <strong>world</strong></p>')
    })

    it('should convert italic text', () => {
      expect(markdownToHtml('Hello *world*')).toBe('<p>Hello <em>world</em></p>')
    })

    it('should convert bold and italic together', () => {
      expect(markdownToHtml('**bold** and *italic*')).toBe(
        '<p><strong>bold</strong> and <em>italic</em></p>',
      )
    })

    it('should convert unordered list', () => {
      const markdown = '- item 1\n- item 2'
      expect(markdownToHtml(markdown)).toBe('<ul><li>item 1</li><li>item 2</li></ul>')
    })

    it('should convert ordered list', () => {
      const markdown = '1. item 1\n2. item 2'
      expect(markdownToHtml(markdown)).toBe('<ol><li>item 1</li><li>item 2</li></ol>')
    })

    it('should handle paragraph followed by list', () => {
      const markdown = 'Hello\n- item 1\n- item 2'
      expect(markdownToHtml(markdown)).toBe('<p>Hello</p><ul><li>item 1</li><li>item 2</li></ul>')
    })

    it('should handle list followed by paragraph', () => {
      const markdown = '- item 1\n- item 2\nHello'
      expect(markdownToHtml(markdown)).toBe('<ul><li>item 1</li><li>item 2</li></ul><p>Hello</p>')
    })

    it('should handle empty lines as paragraph separators', () => {
      // Empty lines in Markdown are paragraph separators, not visible empty lines
      const markdown = 'Line 1\n\nLine 2'
      expect(markdownToHtml(markdown)).toBe('<p>Line 1</p><p>Line 2</p>')
    })

    it('should escape HTML special characters', () => {
      expect(markdownToHtml('<script>alert(1)</script>')).toBe(
        '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>',
      )
    })

    it('should handle bold text in list items', () => {
      const markdown = '- **bold** item'
      expect(markdownToHtml(markdown)).toBe('<ul><li><strong>bold</strong> item</li></ul>')
    })

    it('should skip blank line before list (no extra <p><br></p>)', () => {
      // Blank line before list should not generate empty paragraph in editor
      const markdown = 'Hello\n\n- item 1\n- item 2'
      expect(markdownToHtml(markdown)).toBe('<p>Hello</p><ul><li>item 1</li><li>item 2</li></ul>')
    })

    it('should skip blank line after list (no extra <p><br></p>)', () => {
      // Blank line after list should not generate empty paragraph in editor
      const markdown = '- item 1\n- item 2\n\nHello'
      expect(markdownToHtml(markdown)).toBe('<ul><li>item 1</li><li>item 2</li></ul><p>Hello</p>')
    })

    it('should skip blank line between paragraphs (no extra <p><br></p>)', () => {
      // Single blank line between paragraphs is just a separator, not visible empty line
      const markdown = 'Line 1\n\nLine 2'
      expect(markdownToHtml(markdown)).toBe('<p>Line 1</p><p>Line 2</p>')
    })

    it('should preserve one visible blank line (two consecutive empty lines)', () => {
      // 两个空行 = 一个段落分隔 + 一个可见空行
      const markdown = 'Line 1\n\n\nLine 2'
      expect(markdownToHtml(markdown)).toBe('<p>Line 1</p><p><br></p><p>Line 2</p>')
    })

    it('should preserve multiple visible blank lines', () => {
      // 三个空行 = 一个段落分隔 + 两个可见空行
      const markdown = 'Line 1\n\n\n\nLine 2'
      expect(markdownToHtml(markdown)).toBe('<p>Line 1</p><p><br></p><p><br></p><p>Line 2</p>')
    })
  })

  describe('htmlToMarkdown', () => {
    it('should return empty string for empty input', () => {
      expect(htmlToMarkdown('')).toBe('')
    })

    it('should convert paragraph to text', () => {
      expect(htmlToMarkdown('<p>Hello world</p>')).toBe('Hello world')
    })

    it('should convert strong to bold markdown', () => {
      expect(htmlToMarkdown('<p>Hello <strong>world</strong></p>')).toBe('Hello **world**')
    })

    it('should convert b tag to bold markdown', () => {
      expect(htmlToMarkdown('<p>Hello <b>world</b></p>')).toBe('Hello **world**')
    })

    it('should convert em to italic markdown', () => {
      expect(htmlToMarkdown('<p>Hello <em>world</em></p>')).toBe('Hello *world*')
    })

    it('should convert i tag to italic markdown', () => {
      expect(htmlToMarkdown('<p>Hello <i>world</i></p>')).toBe('Hello *world*')
    })

    it('should convert unordered list', () => {
      const html = '<ul><li>item 1</li><li>item 2</li></ul>'
      expect(htmlToMarkdown(html)).toBe('- item 1\n- item 2')
    })

    it('should convert ordered list', () => {
      const html = '<ol><li>item 1</li><li>item 2</li></ol>'
      expect(htmlToMarkdown(html)).toBe('1. item 1\n2. item 2')
    })

    it('should handle paragraph followed by list', () => {
      const html = '<p>Hello</p><ul><li>item 1</li><li>item 2</li></ul>'
      expect(htmlToMarkdown(html)).toBe('Hello\n\n- item 1\n- item 2')
    })

    it('should handle list followed by paragraph', () => {
      // List must be followed by blank line in Markdown to prevent
      // continuation parsing (where text becomes part of the list item)
      const html = '<ul><li>item 1</li><li>item 2</li></ul><p>Hello</p>'
      expect(htmlToMarkdown(html)).toBe('- item 1\n- item 2\n\nHello')
    })

    it('should handle list followed by text (no wrapper)', () => {
      // Even raw text after list needs blank line separation
      const html = '<ul><li>item 1</li><li>item 2</li></ul>Hello'
      expect(htmlToMarkdown(html)).toBe('- item 1\n- item 2\n\nHello')
    })

    it('should handle multiple paragraphs', () => {
      const html = '<p>Line 1</p><p>Line 2</p>'
      expect(htmlToMarkdown(html)).toBe('Line 1\n\nLine 2')
    })

    it('should handle br tags', () => {
      const html = '<p>Line 1<br>Line 2</p>'
      expect(htmlToMarkdown(html)).toBe('Line 1\nLine 2')
    })

    it('should handle div tags like paragraphs', () => {
      const html = '<div>Hello</div><div>World</div>'
      expect(htmlToMarkdown(html)).toBe('Hello\n\nWorld')
    })

    it('should handle bold in list items', () => {
      const html = '<ul><li><strong>bold</strong> item</li></ul>'
      expect(htmlToMarkdown(html)).toBe('- **bold** item')
    })

    it('should handle complex nested content', () => {
      const html =
        '<p>Start <strong>bold</strong> and <em>italic</em></p><ul><li>item 1</li><li>item 2</li></ul><p>End</p>'
      expect(htmlToMarkdown(html)).toBe('Start **bold** and *italic*\n\n- item 1\n- item 2\n\nEnd')
    })
  })

  describe('roundtrip conversion', () => {
    // Roundtrip should preserve content structure
    // - Lists get normalized with blank lines (for proper Markdown parsing)
    // - Consecutive paragraphs remain as blank-line-separated (A\n\nB stays A\n\nB)
    const testCases: Array<{ input: string; expected: string }> = [
      { input: 'Hello world', expected: 'Hello world' },
      { input: 'Hello **bold** world', expected: 'Hello **bold** world' },
      { input: 'Hello *italic* world', expected: 'Hello *italic* world' },
      { input: '- item 1\n- item 2', expected: '- item 1\n- item 2' },
      { input: '1. item 1\n2. item 2', expected: '1. item 1\n2. item 2' },
      // Two paragraphs should roundtrip correctly
      { input: 'Line 1\n\nLine 2', expected: 'Line 1\n\nLine 2' },
      // Visible blank lines should be preserved
      { input: 'Line 1\n\n\nLine 2', expected: 'Line 1\n\n\nLine 2' },
      { input: 'Line 1\n\n\n\nLine 2', expected: 'Line 1\n\n\n\nLine 2' },
      // Lists get normalized with blank lines
      {
        input: 'Paragraph\n- item 1\n- item 2',
        expected: 'Paragraph\n\n- item 1\n- item 2',
      },
      {
        input: '- item 1\n- item 2\nParagraph',
        expected: '- item 1\n- item 2\n\nParagraph',
      },
      {
        input: 'Start **bold** and *italic*\n- item 1\n- item 2\nEnd',
        expected: 'Start **bold** and *italic*\n\n- item 1\n- item 2\n\nEnd',
      },
    ]

    testCases.forEach(({ input, expected }) => {
      it(`should convert: "${input.replace(/\n/g, '\\n')}"`, () => {
        const html = markdownToHtml(input)
        const result = htmlToMarkdown(html)
        expect(result).toBe(expected)
      })
    })
  })

  describe('getTextLength', () => {
    it('should return 0 for empty input', () => {
      expect(getTextLength('')).toBe(0)
    })

    it('should count plain text correctly', () => {
      expect(getTextLength('<p>Hello</p>')).toBe(5)
    })

    it('should ignore HTML tags in count', () => {
      expect(getTextLength('<p>Hello <strong>world</strong></p>')).toBe(11)
    })

    it('should count list items correctly', () => {
      expect(getTextLength('<ul><li>item 1</li><li>item 2</li></ul>')).toBe(12)
    })
  })

  describe('hasStructuralContent', () => {
    it('should return false for empty string', () => {
      expect(hasStructuralContent('')).toBe(false)
    })

    it('should return false for whitespace only', () => {
      expect(hasStructuralContent('   ')).toBe(false)
    })

    it('should return false for empty paragraph', () => {
      expect(hasStructuralContent('<p></p>')).toBe(false)
    })

    it('should return false for paragraph with only br', () => {
      expect(hasStructuralContent('<p><br></p>')).toBe(false)
    })

    it('should return true for unordered list', () => {
      expect(hasStructuralContent('<ul><li>item</li></ul>')).toBe(true)
    })

    it('should return true for ordered list', () => {
      expect(hasStructuralContent('<ol><li>item</li></ol>')).toBe(true)
    })

    it('should return true for hr', () => {
      expect(hasStructuralContent('<hr>')).toBe(true)
    })

    it('should return true for empty list (key case for placeholder bug)', () => {
      expect(hasStructuralContent('<ul><li><br></li></ul>')).toBe(true)
    })
  })
})
