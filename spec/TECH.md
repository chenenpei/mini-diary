# MiniDiary 技术架构文档

## 1. 技术栈

### 核心框架
| 技术 | 版本 | 用途 |
|------|------|------|
| TanStack Start | latest | React 全栈元框架，内置路由 |
| Vite | 7.x | 构建工具和开发服务器 |
| React | 19.x | UI 框架 |
| TypeScript | 5.x | 类型安全（严格模式） |
| pnpm | latest | 包管理器 |

### UI 层
| 技术 | 用途 |
|------|------|
| Tailwind CSS 4 | 原子化 CSS |
| shadcn/ui | 高质量 React 组件库 |
| Radix UI | 无头 UI 基础组件 |
| Heroicons | 图标库 |
| Motion (motion.dev) | 动画库 |

### 数据层
| 技术 | 用途 |
|------|------|
| TanStack Router | 类型安全路由（内置于 Start） |
| TanStack Query | 异步状态管理 |
| Dexie.js | IndexedDB 封装 |
| Zustand | 轻量级全局状态（可选） |

### 媒体处理
| 技术 | 用途 |
|------|------|
| Canvas API | 客户端图片压缩（轻量级方案） |
| react-markdown + remark-gfm | Markdown 渲染 |

### 国际化
| 技术 | 用途 |
|------|------|
| i18next + react-i18next | 多语言支持 |
| Intl.DateTimeFormat | 日期本地化 |

> **备注**：使用原生 Canvas API 进行图片压缩，避免依赖已停止维护的 browser-image-compression。如需更高级功能，可考虑 @aspect-dev/image-compressor 或 Squoosh WASM。

### 测试工具
| 技术 | 用途 |
|------|------|
| Vitest | 单元/集成测试 |
| Testing Library | React 组件测试 |
| Playwright | E2E 测试（可选） |
| fake-indexeddb | IndexedDB 模拟 |

---

## 2. 项目结构

```
src/
├── routes/                 # TanStack Start 文件路由
│   ├── __root.tsx          # 根布局（主题、错误边界）
│   ├── _timeline.tsx       # 时间线布局路由（渲染 Timeline + Outlet 覆盖层）
│   ├── _timeline/
│   │   ├── index.tsx       # 首页（空组件，仅定义 search params）
│   │   └── entry/
│   │       ├── new.tsx     # 新建日记（覆盖层）
│   │       └── $id.tsx     # 编辑日记（覆盖层）
│   └── search.tsx          # 搜索页面
├── components/
│   ├── ui/                 # shadcn/ui 基础组件
│   ├── timeline/           # 时间线相关组件
│   │   ├── DiaryCard.tsx
│   │   ├── DateNav.tsx
│   │   └── EmptyState.tsx
│   ├── editor/             # 编辑器相关组件
│   │   ├── TextArea.tsx
│   │   ├── ImageUploader.tsx
│   │   └── Toolbar.tsx
│   └── layout/             # 布局组件
│       ├── TopBar.tsx
│       ├── Drawer.tsx
│       └── FAB.tsx
├── i18n/                   # 国际化
│   ├── index.ts            # i18n 初始化配置
│   ├── types.ts            # TypeScript 类型定义
│   ├── useLocale.ts        # 语言切换 hook
│   └── locales/            # 翻译文件
│       ├── zh-CN/          # 中文翻译
│       └── en/             # 英文翻译
├── lib/
│   ├── db.ts               # Dexie 数据库实例
│   ├── repositories/       # 数据访问层
│   │   ├── entries.ts
│   │   └── images.ts
│   ├── image.ts            # 图片压缩工具
│   └── markdown.ts         # Markdown 配置
├── hooks/                  # 自定义 Hooks
│   ├── useEntries.ts
│   ├── useImages.ts
│   ├── useKeyboardHeight.ts  # 键盘高度监听（移动端适配）
│   └── useTheme.ts
├── utils/                  # 纯工具函数
│   ├── date.ts
│   └── format.ts
└── types/                  # TypeScript 类型
    └── index.ts
```

---

## 3. 数据模型

### DiaryEntry
```typescript
interface DiaryEntry {
  id: string;              // UUID v4
  content: string;         // Markdown 文本，max 10,000 字符
  date: string;            // ISO 8601 (YYYY-MM-DD)
  createdAt: number;       // Unix 时间戳 (ms)
  updatedAt: number;       // Unix 时间戳 (ms)
  imageIds: string[];      // 关联图片 ID，max 3
}
```

### ImageRecord
```typescript
interface ImageRecord {
  id: string;              // UUID v4
  entryId: string;         // 外键 → DiaryEntry.id
  blob: Blob;              // 压缩后图片（类型由 blob.type 推导）
  thumbnail: Blob;         // 缩略图
  createdAt: number;       // 创建时间戳
}
```

> **简化说明**：移除 `originalName`、`mimeType`、`size` 字段，这些可从 Blob 对象推导获取。

### AppSettings
```typescript
interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  version: string;
  lastBackupAt?: number;
}
```

---

## 4. IndexedDB Schema

```typescript
import Dexie from 'dexie';

const db = new Dexie('MiniDiaryDB');

db.version(1).stores({
  entries: 'id, date, createdAt, updatedAt',
  images: 'id, entryId, createdAt',
  settings: 'key'
});
```

**索引说明**：
- `entries.date` - 按日期查询时间线
- `entries.createdAt` - 按时间排序
- `images.entryId` - 关联查询

---

## 5. 数据流架构

```
┌─────────────────────────────────────────────────────────┐
│                      用户操作                            │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              React 组件 + TanStack Query                 │
│         (useQuery / useMutation / queryClient)          │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   Repository 层                          │
│            (entriesRepository / imagesRepository)        │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                      Dexie.js                           │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                     IndexedDB                           │
└─────────────────────────────────────────────────────────┘
```

### TanStack Query 配置
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,  // 5 分钟
      gcTime: 30 * 60 * 1000,    // 30 分钟
    },
  },
});
```

---

## 6. 图片处理

### 压缩配置
```typescript
// 使用 Canvas API 进行压缩
const imageConfig = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.8,          // JPEG 质量
  outputFormat: 'image/jpeg'
};

const thumbnailConfig = {
  maxWidth: 400,
  maxHeight: 400,
  quality: 0.7
};
```

### 处理流程
1. 用户选择图片
2. 验证格式（JPG/PNG/WebP）和大小（<10MB）
3. 使用 Canvas API 压缩（createImageBitmap + canvas.toBlob）
4. 同时生成缩略图
5. 存入 `images` 表

### 压缩实现示例
```typescript
async function compressImage(file: File, config: ImageConfig): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = calculateDimensions(bitmap, config);

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, width, height);

  return canvas.convertToBlob({
    type: config.outputFormat,
    quality: config.quality
  });
}
```

---

## 7. 性能优化

### 代码分割
- 路由级懒加载（TanStack Start 自动处理）
- 重型库动态导入：
  ```typescript
  const imageCompression = await import('browser-image-compression');
  const ReactMarkdown = await import('react-markdown');
  ```

### 列表优化
- 虚拟滚动：日记 >100 条时启用 `@tanstack/react-virtual`
- 图片懒加载：Intersection Observer，视口前 200px 加载
- 骨架屏：首次加载显示 3 个占位卡片

### 数据预取
```typescript
// 浏览某日期时，预加载前后 1 天数据
queryClient.prefetchQuery({
  queryKey: ['entries', previousDate],
  queryFn: () => entriesRepository.getByDate(previousDate)
});
```

### 缓存策略
- LRU 图片缓存：最多 50 张
- TanStack Query：5 分钟 staleTime

---

## 8. PWA 配置

### Viewport Meta
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content">
```

- `viewport-fit=cover` - 支持 iOS 刘海屏安全区域
- `interactive-widget=resizes-content` - 键盘弹出时调整内容大小而非滚动页面（关键！）

### Service Worker (Workbox)
```javascript
// 缓存策略
{
  // App Shell - CacheFirst
  urlPattern: /\.(html|css|js)$/,
  handler: 'CacheFirst',

  // 图片 - CacheFirst with expiration
  urlPattern: /\.(png|jpg|jpeg|webp)$/,
  handler: 'CacheFirst',
  options: {
    expiration: { maxEntries: 50, maxAgeSeconds: 30 * 24 * 60 * 60 }
  }
}
```

### Manifest
```json
{
  "name": "MiniDiary - 隐私日记应用",
  "short_name": "日记",
  "description": "本地存储的极简日记应用，完全隐私，无需注册",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "theme_color": "#000000",
  "background_color": "#ffffff",
  "categories": ["productivity", "lifestyle"],
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ],
  "screenshots": [
    { "src": "/screenshot-mobile.png", "sizes": "540x720", "form_factor": "narrow" }
  ]
}
```

---

## 9. 数据导入/导出

### 导出格式
```json
{
  "version": "1.0.0",
  "exportedAt": 1234567890000,
  "totalEntries": 100,
  "totalImages": 50,
  "entries": [/* DiaryEntry[] */],
  "images": {
    "imageId": {
      "blob": "data:image/jpeg;base64,...",
      "thumbnail": "data:image/jpeg;base64,...",
      "originalName": "photo.jpg",
      "mimeType": "image/jpeg",
      "size": 123456,
      "createdAt": 1234567890000
    }
  }
}
```

### 冲突解决
- 比较 `updatedAt` 时间戳
- 保留更新的版本

---

## 10. 并发安全

### 多标签页同步
使用 BroadcastChannel API 同步标签页状态：

```typescript
// lib/sync.ts
const channel = new BroadcastChannel('mini-diary-sync');

// 发送更新通知
export function notifyChange(type: 'entry' | 'image', id: string) {
  channel.postMessage({ type, id, timestamp: Date.now() });
}

// 监听更新
channel.onmessage = (event) => {
  queryClient.invalidateQueries({ queryKey: [event.data.type] });
};
```

### 错误恢复策略
```typescript
// IndexedDB 配额超出处理
async function saveWithRetry(entry: DiaryEntry) {
  try {
    await db.entries.add(entry);
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      // 清理旧图片缩略图
      await cleanupOldThumbnails();
      // 重试保存
      return db.entries.add(entry);
    }
    throw error;
  }
}
```

---

## 11. 测试策略

| 类型 | 工具 | 覆盖范围 |
|------|------|----------|
| 单元测试 | Vitest | utils、repositories、image 处理 |
| 组件测试 | Testing Library | UI 组件 |
| 集成测试 | Vitest + fake-indexeddb | 完整用户流程 |
| E2E 测试 | Playwright | 关键路径（PWA 离线测试必需）|

### 模拟 IndexedDB
```typescript
import 'fake-indexeddb/auto';
```

---

## 12. 国际化 (i18n)

### 技术方案
使用 `i18next` + `react-i18next` 实现多语言支持。

### 翻译文件结构
```
src/i18n/locales/
├── zh-CN/
│   ├── common.json   # 通用词条
│   ├── entry.json    # 日记相关
│   ├── editor.json   # 编辑器相关
│   ├── settings.json # 设置相关
│   └── ...
└── en/
    └── (同上结构)
```

### 使用方式
```typescript
import { useTranslation } from 'react-i18next'

function MyComponent() {
  const { t } = useTranslation('entry')
  return <h1>{t('createTitle')}</h1>
}
```

### 日期本地化
使用原生 `Intl.DateTimeFormat` 处理日期格式：
```typescript
// 中文: "1月15日 周三"
// 英文: "Wed, Jan 15"
new Intl.DateTimeFormat(locale, {
  month: 'short',
  day: 'numeric',
  weekday: 'short'
}).format(date)
```

### 语言持久化
语言偏好存储在 `localStorage`，键名为 `mini-diary-locale`。

---

## 13. WYSIWYG 编辑器

### 技术方案

使用原生 `contenteditable` 实现所见即所得编辑，支持受限格式：
- **加粗**：`<strong>` / `**text**`
- **斜体**：`<em>` / `*text*`
- **无序列表**：`<ul><li>` / `- item`
- **有序列表**：`<ol><li>` / `1. item`

数据存储仍为 Markdown 格式，通过双向转换实现兼容。

### 依赖

| 库 | 用途 |
|----|------|
| DOMPurify (~7KB) | HTML 清理，防止 XSS |

### 核心文件

| 文件 | 职责 |
|------|------|
| `lib/contentEditable.ts` | Markdown ↔ HTML 转换 + 清理 |
| `components/editor/DiaryEditor.tsx` | contenteditable 编辑器组件 |
| `components/editor/editorUtils.ts` | DOM 操作辅助函数（光标、格式化、列表） |
| `components/editor/EditorHeader.tsx` | 编辑器顶部栏（取消/保存按钮） |
| `components/timeline/MarkdownContent.tsx` | Markdown 预处理 + 渲染 |

### HTML ↔ Markdown 转换

#### Markdown → HTML（加载时）

```typescript
markdownToHtml("今天**很开心**\n- 买了咖啡")
// → "<p>今天<strong>很开心</strong></p><ul><li>买了咖啡</li></ul>"
```

#### HTML → Markdown（保存时）

```typescript
htmlToMarkdown("<p>今天<strong>很开心</strong></p><ul><li>买了咖啡</li></ul>")
// → "今天**很开心**\n- 买了咖啡\n"
```

### 可见空行保留

用户在编辑器中创建的可见空行需要在保存和渲染时保持一致。

#### 问题

标准 Markdown 将多个空行合并为一个段落分隔：

```
Line 1

Line 2      → 渲染时只有一个段落间距
```

但富文本编辑器中，用户可能明确希望保留多个空行作为视觉分隔。

#### 解决方案

**规则定义**：
- 一个空行（`\n\n`）= 段落分隔符（不可见）
- 两个或更多空行（`\n\n\n+`）= 段落分隔 + 可见空行

**Markdown → HTML**（`markdownToHtml`）：

```typescript
// 第一个空行：段落分隔符（不生成内容）
// 连续的额外空行：生成 <p><br></p>（可见空段落）

if (line.trim() === '') {
  if (lastWasBlank) {
    result.push('<p><br></p>')  // 可见空行
  } else {
    lastWasBlank = true         // 仅分隔
  }
  continue
}
```

**HTML → Markdown**（`htmlToMarkdown`）：

```typescript
// 空段落（只有 <br> 或空内容）贡献一个 \n
// 保持 lastWasBlock 不变，让连续空段落各贡献一个 \n

if (isEmptyParagraph) {
  if (isTopLevel && lastWasBlock) {
    result.push('\n')
  }
  // 不改变 lastWasBlock
  break
}
```

**Markdown 预处理**（用于 react-markdown 渲染）：

react-markdown 遵循标准 Markdown 规范，会合并空行。为了在时间线渲染时保留可见空行，需要预处理：

```typescript
// preprocessMarkdown: 将额外空行转换为 non-breaking space
// \n\n\n → \n\n\u00A0\n\n

export function preprocessMarkdown(markdown: string): string {
  return markdown.replace(/\n\n(\n+)/g, (_match, extraNewlines: string) => {
    const visibleLines = Array(extraNewlines.length).fill('\u00A0').join('\n\n')
    return '\n\n' + visibleLines + '\n\n'
  })
}
```

**示例**：

| 用户输入 | Markdown 存储 | 编辑器显示 | 时间线渲染 |
|----------|---------------|------------|------------|
| A↵↵B | `A\n\nB` | A（空）B | A（空）B |
| A↵↵↵B | `A\n\n\nB` | A（空行）B | A（空行）B |
| A↵↵↵↵B | `A\n\n\n\nB` | A（两空行）B | A（两空行）B |

### 编辑器快捷输入

#### Markdown 格式快捷键

| 快捷键 | 功能 |
|--------|------|
| `Cmd/Ctrl + B` | 加粗选中文本 |
| `Cmd/Ctrl + I` | 斜体选中文本 |

#### 自动格式转换

输入时自动转换 Markdown 语法为富文本：

| 输入 | 转换结果 |
|------|----------|
| `**text**` | **text**（加粗） |
| `*text*` | *text*（斜体） |
| `- ` (行首) | 无序列表项 |
| `1. ` (行首) | 有序列表项 |

**实现细节**：
- 使用 `document.execCommand` API 应用格式
- 自动列表转换支持普通空格和非断空格（`\u00A0`，浏览器在某些情况下插入）
- 配置驱动设计，便于扩展新的快捷输入

#### 列表退出行为

| 操作 | 行为 |
|------|------|
| 空列表项中按 Enter | 退出列表，插入新段落 |
| 列表项开头按 Backspace | 退出列表，保留内容为普通段落 |

### 水平分隔线

- **编辑器中**：`---` 保持为文本，不转换为 `<hr>`
- **时间线渲染**：`---` 由 react-markdown 渲染为 `<hr>` 分隔线

这种设计让用户可以在编辑器中输入 `---` 而不触发意外的格式转换，同时在时间线展示时获得视觉分隔效果。

### 安全措施

1. **HTML 清理**：所有 HTML 在显示前经过 DOMPurify 清理
2. **白名单标签**：只允许 `p`, `br`, `strong`, `b`, `em`, `i`, `ul`, `ol`, `li`, `div`
3. **无属性**：不允许任何 HTML 属性（如 `onclick`, `href`）
4. **粘贴处理**：粘贴时只提取纯文本，丢弃 HTML

### IME 输入处理

中文输入法需要特殊处理以避免 placeholder 重叠：

```typescript
const [isComposing, setIsComposing] = useState(false)

// compositionstart 时隐藏 placeholder
const handleCompositionStart = () => setIsComposing(true)
const handleCompositionEnd = () => {
  setIsComposing(false)
  handleInput()  // IME 结束后触发更新
}

// Placeholder 显示条件
{isEmpty && !isComposing && <Placeholder />}
```

---

## 14. 开发命令

```bash
pnpm install          # 安装依赖
pnpm dev              # 开发服务器
pnpm build            # 生产构建
pnpm preview          # 预览生产构建
pnpm typecheck        # 类型检查
pnpm lint             # 代码检查
pnpm test             # 运行测试
pnpm test:watch       # 监听模式
```

---

## 15. 部署

- **构建产物**：静态文件（SPA）
- **托管选项**：Vercel / Netlify / Cloudflare Pages
- **包大小目标**：<200KB gzipped（不含图片）
- **缓存破坏**：Vite 自动处理内容哈希
