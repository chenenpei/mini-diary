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
app/
├── routes/                 # TanStack Start 文件路由
│   ├── __root.tsx          # 根布局（主题、错误边界）
│   ├── index.tsx           # 首页/时间线
│   ├── editor.new.tsx      # 新建日记
│   ├── editor.$id.tsx      # 编辑日记
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
