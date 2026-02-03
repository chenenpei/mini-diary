# Writing Prompts (写作提示) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在新建日记时显示随机写作提示作为 placeholder，帮助用户打开思路。

**Architecture:** 创建独立的 prompts 模块存放提示库，通过 i18n 管理中英文翻译。新建日记页面在挂载时随机选取一条提示传递给编辑器组件。

**Tech Stack:** React, i18next, TypeScript

---

### Task 1: 创建写作提示数据模块

**Files:**
- Create: `src/lib/prompts.ts`
- Test: `src/test/lib/prompts.test.ts`

**Step 1: 写失败测试**

创建测试文件 `src/test/lib/prompts.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getRandomPrompt, PROMPT_KEYS } from '@/lib/prompts'

describe('prompts', () => {
  describe('PROMPT_KEYS', () => {
    it('should have at least 30 prompt keys', () => {
      expect(PROMPT_KEYS.length).toBeGreaterThanOrEqual(30)
    })

    it('should have unique keys', () => {
      const uniqueKeys = new Set(PROMPT_KEYS)
      expect(uniqueKeys.size).toBe(PROMPT_KEYS.length)
    })

    it('should have keys in correct format', () => {
      for (const key of PROMPT_KEYS) {
        expect(key).toMatch(/^prompt\d+$/)
      }
    })
  })

  describe('getRandomPrompt', () => {
    beforeEach(() => {
      vi.spyOn(Math, 'random')
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('should return a prompt key from PROMPT_KEYS', () => {
      vi.mocked(Math.random).mockReturnValue(0)
      const result = getRandomPrompt()
      expect(PROMPT_KEYS).toContain(result)
    })

    it('should return first prompt when random is 0', () => {
      vi.mocked(Math.random).mockReturnValue(0)
      const result = getRandomPrompt()
      expect(result).toBe(PROMPT_KEYS[0])
    })

    it('should return last prompt when random is close to 1', () => {
      vi.mocked(Math.random).mockReturnValue(0.999)
      const result = getRandomPrompt()
      expect(result).toBe(PROMPT_KEYS[PROMPT_KEYS.length - 1])
    })
  })
})
```

**Step 2: 运行测试确认失败**

Run: `pnpm test src/test/lib/prompts.test.ts`
Expected: FAIL - Cannot find module '@/lib/prompts'

**Step 3: 实现 prompts 模块**

创建 `src/lib/prompts.ts`:

```typescript
/**
 * 写作提示 (Writing Prompts)
 *
 * 提示内容通过 i18n 管理，此模块只定义 key 和随机选取逻辑。
 * 翻译文件: src/i18n/locales/{locale}/prompts.json
 */

/**
 * 所有提示的 i18n key 列表
 * 对应翻译文件中的 prompts namespace
 */
export const PROMPT_KEYS = [
  // 开放问句 (Open-ended)
  'prompt1',  // 此刻脑子里在想什么？
  'prompt2',  // 今天有什么小发现？
  'prompt3',  // 最近在期待什么事？
  'prompt4',  // 今天学到了什么？
  'prompt5',  // 有什么想吐槽的？
  'prompt6',  // 最近在纠结什么？
  'prompt7',  // 有什么想感谢的人或事？
  'prompt8',  // 今天做了什么决定？
  'prompt9',  // 有什么想法一直没说出口？
  'prompt10', // 最近有什么变化？

  // 具体引导 (Specific guidance)
  'prompt11', // 描述一下窗外现在的样子
  'prompt12', // 刚才吃了什么？味道如何？
  'prompt13', // 现在在听什么音乐？
  'prompt14', // 描述一下此刻的环境
  'prompt15', // 今天见了谁？
  'prompt16', // 手边有什么东西？
  'prompt17', // 今天走过哪些地方？
  'prompt18', // 最近读了什么书/看了什么剧？
  'prompt19', // 今天的天气怎么样？
  'prompt20', // 描述一下现在的声音

  // 情绪探索 (Emotional exploration)
  'prompt21', // 现在是什么心情？
  'prompt22', // 为什么会有这种感觉？
  'prompt23', // 今天最开心的瞬间是？
  'prompt24', // 有什么让你感到烦躁？
  'prompt25', // 此刻最想做什么？
  'prompt26', // 今天有什么遗憾的事？
  'prompt27', // 什么事让你感到平静？
  'prompt28', // 最近有什么压力？
  'prompt29', // 今天有什么惊喜？
  'prompt30', // 现在最想念谁？

  // 额外提示 (Additional)
  'prompt31', // 如果今天重来，会做什么不同的事？
  'prompt32', // 明天最想做什么？
  'prompt33', // 最近有什么小确幸？
  'prompt34', // 今天有什么值得记住的细节？
  'prompt35', // 现在脑海里浮现什么画面？
] as const

export type PromptKey = (typeof PROMPT_KEYS)[number]

/**
 * 随机获取一个提示 key
 */
export function getRandomPrompt(): PromptKey {
  const index = Math.floor(Math.random() * PROMPT_KEYS.length)
  return PROMPT_KEYS[index]
}
```

**Step 4: 运行测试确认通过**

Run: `pnpm test src/test/lib/prompts.test.ts`
Expected: PASS

**Step 5: 提交**

```bash
git add src/lib/prompts.ts src/test/lib/prompts.test.ts
git commit -m "feat: 添加写作提示数据模块"
```

---

### Task 2: 添加中文提示翻译

**Files:**
- Create: `src/i18n/locales/zh-CN/prompts.json`

**Step 1: 创建中文翻译文件**

创建 `src/i18n/locales/zh-CN/prompts.json`:

```json
{
  "prompt1": "此刻脑子里在想什么？",
  "prompt2": "今天有什么小发现？",
  "prompt3": "最近在期待什么事？",
  "prompt4": "今天学到了什么？",
  "prompt5": "有什么想吐槽的？",
  "prompt6": "最近在纠结什么？",
  "prompt7": "有什么想感谢的人或事？",
  "prompt8": "今天做了什么决定？",
  "prompt9": "有什么想法一直没说出口？",
  "prompt10": "最近有什么变化？",
  "prompt11": "描述一下窗外现在的样子",
  "prompt12": "刚才吃了什么？味道如何？",
  "prompt13": "现在在听什么音乐？",
  "prompt14": "描述一下此刻的环境",
  "prompt15": "今天见了谁？",
  "prompt16": "手边有什么东西？",
  "prompt17": "今天走过哪些地方？",
  "prompt18": "最近读了什么书/看了什么剧？",
  "prompt19": "今天的天气怎么样？",
  "prompt20": "描述一下现在的声音",
  "prompt21": "现在是什么心情？",
  "prompt22": "为什么会有这种感觉？",
  "prompt23": "今天最开心的瞬间是？",
  "prompt24": "有什么让你感到烦躁？",
  "prompt25": "此刻最想做什么？",
  "prompt26": "今天有什么遗憾的事？",
  "prompt27": "什么事让你感到平静？",
  "prompt28": "最近有什么压力？",
  "prompt29": "今天有什么惊喜？",
  "prompt30": "现在最想念谁？",
  "prompt31": "如果今天重来，会做什么不同的事？",
  "prompt32": "明天最想做什么？",
  "prompt33": "最近有什么小确幸？",
  "prompt34": "今天有什么值得记住的细节？",
  "prompt35": "现在脑海里浮现什么画面？"
}
```

**Step 2: 提交**

```bash
git add src/i18n/locales/zh-CN/prompts.json
git commit -m "feat: 添加中文写作提示翻译"
```

---

### Task 3: 添加英文提示翻译

**Files:**
- Create: `src/i18n/locales/en/prompts.json`

**Step 1: 创建英文翻译文件**

创建 `src/i18n/locales/en/prompts.json`:

```json
{
  "prompt1": "What's on your mind right now?",
  "prompt2": "Any small discoveries today?",
  "prompt3": "What are you looking forward to?",
  "prompt4": "What did you learn today?",
  "prompt5": "Anything you want to vent about?",
  "prompt6": "What's been on your mind lately?",
  "prompt7": "Anyone or anything you're grateful for?",
  "prompt8": "What decisions did you make today?",
  "prompt9": "Any thoughts you haven't shared?",
  "prompt10": "What's changed recently?",
  "prompt11": "Describe what's outside your window",
  "prompt12": "What did you just eat? How was it?",
  "prompt13": "What music are you listening to?",
  "prompt14": "Describe your surroundings right now",
  "prompt15": "Who did you meet today?",
  "prompt16": "What's within arm's reach?",
  "prompt17": "Where did you go today?",
  "prompt18": "What have you been reading or watching?",
  "prompt19": "How's the weather today?",
  "prompt20": "Describe the sounds around you",
  "prompt21": "How are you feeling right now?",
  "prompt22": "Why do you feel this way?",
  "prompt23": "What was the happiest moment today?",
  "prompt24": "What's been bothering you?",
  "prompt25": "What do you most want to do right now?",
  "prompt26": "Any regrets from today?",
  "prompt27": "What makes you feel calm?",
  "prompt28": "What's been stressing you lately?",
  "prompt29": "Any surprises today?",
  "prompt30": "Who do you miss right now?",
  "prompt31": "If you could redo today, what would you change?",
  "prompt32": "What do you most want to do tomorrow?",
  "prompt33": "Any small joys lately?",
  "prompt34": "What detail from today is worth remembering?",
  "prompt35": "What image comes to mind right now?"
}
```

**Step 2: 提交**

```bash
git add src/i18n/locales/en/prompts.json
git commit -m "feat: 添加英文写作提示翻译"
```

---

### Task 4: 注册 prompts namespace 到 i18n

**Files:**
- Modify: `src/i18n/index.ts`

**Step 1: 添加 prompts namespace 导入和注册**

修改 `src/i18n/index.ts`，在中文翻译导入区块后添加:

```typescript
import zhPrompts from './locales/zh-CN/prompts.json'
```

在英文翻译导入区块后添加:

```typescript
import enPrompts from './locales/en/prompts.json'
```

在 `resources` 对象的 `'zh-CN'` 中添加:

```typescript
prompts: zhPrompts,
```

在 `resources` 对象的 `en` 中添加:

```typescript
prompts: enPrompts,
```

在 `ns` 数组中添加 `'prompts'`:

```typescript
ns: ['common', 'entry', 'editor', 'settings', 'search', 'data', 'date', 'image', 'timeline', 'prompts'],
```

**Step 2: 运行类型检查**

Run: `pnpm typecheck`
Expected: PASS

**Step 3: 提交**

```bash
git add src/i18n/index.ts
git commit -m "feat: 注册 prompts namespace 到 i18n"
```

---

### Task 5: 创建 useRandomPrompt hook

**Files:**
- Create: `src/hooks/useRandomPrompt.ts`
- Test: `src/test/hooks/useRandomPrompt.test.ts`

**Step 1: 写失败测试**

创建 `src/test/hooks/useRandomPrompt.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useRandomPrompt } from '@/hooks/useRandomPrompt'
import * as prompts from '@/lib/prompts'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => `translated:${key}`,
  }),
}))

describe('useRandomPrompt', () => {
  beforeEach(() => {
    vi.spyOn(prompts, 'getRandomPrompt')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return a translated prompt', () => {
    vi.mocked(prompts.getRandomPrompt).mockReturnValue('prompt1')
    const { result } = renderHook(() => useRandomPrompt())
    expect(result.current).toBe('translated:prompt1')
  })

  it('should call getRandomPrompt once on mount', () => {
    vi.mocked(prompts.getRandomPrompt).mockReturnValue('prompt1')
    renderHook(() => useRandomPrompt())
    expect(prompts.getRandomPrompt).toHaveBeenCalledTimes(1)
  })

  it('should not change prompt on re-render', () => {
    vi.mocked(prompts.getRandomPrompt).mockReturnValue('prompt1')
    const { result, rerender } = renderHook(() => useRandomPrompt())
    const firstPrompt = result.current
    rerender()
    expect(result.current).toBe(firstPrompt)
    // getRandomPrompt should still only be called once (via useMemo)
    expect(prompts.getRandomPrompt).toHaveBeenCalledTimes(1)
  })
})
```

**Step 2: 运行测试确认失败**

Run: `pnpm test src/test/hooks/useRandomPrompt.test.ts`
Expected: FAIL - Cannot find module '@/hooks/useRandomPrompt'

**Step 3: 实现 useRandomPrompt hook**

创建 `src/hooks/useRandomPrompt.ts`:

```typescript
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { getRandomPrompt } from '@/lib/prompts'

/**
 * 获取随机写作提示
 *
 * 在组件挂载时随机选取一条提示，组件生命周期内保持不变。
 * 提示内容根据当前语言设置自动切换。
 *
 * @returns 翻译后的提示文本
 */
export function useRandomPrompt(): string {
  const { t } = useTranslation('prompts')

  // 只在挂载时随机选取，不随重渲染变化
  const promptKey = useMemo(() => getRandomPrompt(), [])

  return t(promptKey)
}
```

**Step 4: 运行测试确认通过**

Run: `pnpm test src/test/hooks/useRandomPrompt.test.ts`
Expected: PASS

**Step 5: 提交**

```bash
git add src/hooks/useRandomPrompt.ts src/test/hooks/useRandomPrompt.test.ts
git commit -m "feat: 添加 useRandomPrompt hook"
```

---

### Task 6: 在新建日记页面使用随机提示

**Files:**
- Modify: `src/routes/_timeline/entry/new.tsx`

**Step 1: 导入 useRandomPrompt**

在文件顶部导入区域添加:

```typescript
import { useRandomPrompt } from '@/hooks/useRandomPrompt'
```

**Step 2: 在 NewEntryPage 组件中使用 hook**

在 `NewEntryPage` 函数内部，在 `const entryDate = ...` 之后添加:

```typescript
const randomPrompt = useRandomPrompt()
```

**Step 3: 将提示传递给 DiaryEditor**

修改 `<DiaryEditor>` 组件，添加 `placeholder` prop:

```typescript
<DiaryEditor
  ref={editorRef}
  initialContent=""
  onChange={handleContentChange}
  newImages={images}
  onNewImageRemove={handleNewImageRemove}
  placeholder={randomPrompt}
  autoFocus
/>
```

**Step 4: 运行类型检查**

Run: `pnpm typecheck`
Expected: PASS

**Step 5: 手动验证**

Run: `pnpm dev`
验证步骤:
1. 打开应用，点击 FAB 新建日记
2. 确认 placeholder 显示随机提示（非固定的"写点什么..."）
3. 刷新页面，再次新建，确认提示有所变化
4. 切换语言到英文，新建日记，确认提示是英文

**Step 6: 提交**

```bash
git add src/routes/_timeline/entry/new.tsx
git commit -m "feat: 新建日记页面使用随机写作提示"
```

---

### Task 7: 运行完整测试并检查代码质量

**Step 1: 运行所有测试**

Run: `pnpm test`
Expected: All tests PASS

**Step 2: 运行类型检查**

Run: `pnpm typecheck`
Expected: PASS

**Step 3: 运行代码检查和格式化**

Run: `pnpm check`
Expected: PASS (或按提示修复问题)

**Step 4: 最终提交（如有修复）**

```bash
git add -A
git commit -m "chore: 修复代码风格问题"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | 创建 prompts 模块 | `src/lib/prompts.ts`, `src/test/lib/prompts.test.ts` |
| 2 | 中文翻译 | `src/i18n/locales/zh-CN/prompts.json` |
| 3 | 英文翻译 | `src/i18n/locales/en/prompts.json` |
| 4 | 注册 i18n namespace | `src/i18n/index.ts` |
| 5 | useRandomPrompt hook | `src/hooks/useRandomPrompt.ts`, `src/test/hooks/useRandomPrompt.test.ts` |
| 6 | 集成到新建页面 | `src/routes/_timeline/entry/new.tsx` |
| 7 | 质量检查 | - |

Total: 7 tasks, ~4 new files, ~2 modified files
