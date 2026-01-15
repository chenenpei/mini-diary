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
| browser-image-compression | 客户端图片压缩 |
| react-markdown + remark-gfm | Markdown 渲染 |

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
  blob: Blob;              // 压缩后图片
  thumbnail: Blob;         // 缩略图
  originalName: string;    // 原始文件名
  mimeType: string;        // MIME 类型
  size: number;            // 字节数
  createdAt: number;       // 创建时间戳
}
```

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
// 原图压缩
const imageOptions = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: 'image/jpeg',
  initialQuality: 0.8
};

// 缩略图生成
const thumbnailOptions = {
  maxSizeMB: 0.1,
  maxWidthOrHeight: 400,
  initialQuality: 0.7
};
```

### 处理流程
1. 用户选择图片
2. 验证格式（JPG/PNG/WebP）和大小（<10MB）
3. 使用 `browser-image-compression` 压缩
4. 同时生成缩略图
5. 存入 `images` 表

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
  "name": "MiniDiary",
  "short_name": "日记",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#000000",
  "background_color": "#ffffff",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
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

## 10. 测试策略

| 类型 | 工具 | 覆盖范围 |
|------|------|----------|
| 单元测试 | Vitest | utils、repositories、image 处理 |
| 组件测试 | Testing Library | UI 组件 |
| 集成测试 | Vitest + fake-indexeddb | 完整用户流程 |
| E2E 测试 | Playwright（可选） | 关键路径 |

### 模拟 IndexedDB
```typescript
import 'fake-indexeddb/auto';
```

---

## 11. 开发命令

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

## 12. 部署

- **构建产物**：静态文件（SPA）
- **托管选项**：Vercel / Netlify / Cloudflare Pages
- **包大小目标**：<200KB gzipped（不含图片）
- **缓存破坏**：Vite 自动处理内容哈希
