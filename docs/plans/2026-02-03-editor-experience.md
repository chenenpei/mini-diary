# 编辑器体验优化设计

## 概述

优化 WYSIWYG 编辑器的输入体验，包括 Bug 修复和新功能。

## 1. Bug 修复：Placeholder 未消失

**问题**：点击工具栏列表按钮后，插入了 `<ul><li></li></ul>`，但 placeholder 仍然显示。

**原因**：`isEmpty` 只检查 `charCount === 0`，空列表项没有文本内容。

**解决方案**：修改判断逻辑，检查 DOM 是否有结构元素。

```typescript
// 之前
const isEmpty = charCount === 0

// 之后
const isEmpty = charCount === 0 && !hasStructuralContent(editorRef.current)
```

`hasStructuralContent` 检查是否存在 `<ul>`、`<ol>`、`<hr>` 等元素。

## 2. 自动列表转换

**触发规则**：

| 输入 | 结果 |
|------|------|
| `- ` (行首) | 转成无序列表 |
| `1. ` (行首) | 转成有序列表 |

**实现**：在 `handleInput` 中检测当前行内容，匹配后删除触发字符并执行 `execCommand`。

## 3. 列表行为优化

| 操作 | 结果 |
|------|------|
| 空列表项 + 回车 | 退出列表，变成普通段落 |
| 列表项开头 + Backspace | 退出列表，内容变成普通段落 |

**实现**：在 `handleKeyDown` 中检测 Enter 和 Backspace，判断光标位置和列表项状态。

## 4. Markdown 快捷输入

| 输入 | 结果 |
|------|------|
| `**文字**` | 粗体 |
| `*文字*` | 斜体 |

**触发时机**：输入闭合符号后立即转换。

**实现**：在 `handleInput` 中用正则检测 `**...**` 和 `*...*` 模式，匹配后替换为对应格式。

## 5. 分割线支持

| 场景 | 显示 |
|------|------|
| 编辑器 | `---` 文本 |
| 日记卡片 | 水平分割线 `<hr>` |

**实现**：
- 编辑器无需改动（保持文本原样）
- MarkdownContent 组件确保 `---` 渲染为 `<hr>`
- 添加 `<hr>` 样式

## 涉及文件

- `src/components/editor/DiaryEditor.tsx` - 主要改动
- `src/components/timeline/MarkdownContent.tsx` - 分割线渲染
- `src/lib/contentEditable.ts` - 可能需要辅助函数
