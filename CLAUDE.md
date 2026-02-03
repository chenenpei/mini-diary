# CLAUDE.md

本文件为 Claude Code 提供代码库工作指南。

## 项目概述

**MiniDiary** 是一个极简主义 PWA 日记应用，数据存储在本地 IndexedDB。

**设计哲学**：黑白灰极简主义，大量留白，微妙动效。

**详细文档**：
- [PRD.md](spec/PRD.md) - 产品需求
- [TECH.md](spec/TECH.md) - 技术架构
- [DESIGN.md](spec/DESIGN.md) - 设计规范

## 技术栈

- **框架**：TanStack Start + React 19 + TypeScript
- **构建**：Vite 7
- **UI**：Tailwind CSS 4 + shadcn/ui + Motion
- **数据**：Dexie.js (IndexedDB) + TanStack Query
- **测试**：Vitest + Testing Library + fake-indexeddb
- **代码质量**：Biome (lint + format)

## 常用命令

```bash
pnpm install          # 安装依赖
pnpm dev              # 开发服务器 (端口 3000)
pnpm build            # 生产构建
pnpm typecheck        # 类型检查
pnpm lint             # 代码检查 (Biome)
pnpm format           # 代码格式化
pnpm check            # lint + format
pnpm test             # 运行测试
pnpm test:watch       # 监听模式测试
```

## 目录结构

```
src/
├── routes/             # TanStack Start 文件路由
├── components/
│   ├── ui/             # shadcn/ui 组件
│   ├── timeline/       # 时间线组件
│   ├── editor/         # 编辑器组件
│   └── layout/         # 布局组件
├── lib/
│   ├── db.ts           # Dexie 数据库实例
│   ├── repositories/   # 数据访问层
│   │   ├── entries.ts  # 日记条目 CRUD
│   │   └── images.ts   # 图片记录 CRUD
│   └── utils.ts        # 工具函数 (cn)
├── hooks/              # React Hooks
│   ├── useEntries.ts   # 日记条目 hooks (TanStack Query)
│   ├── useImages.ts    # 图片 hooks (TanStack Query)
│   └── useKeyboardHeight.ts  # 键盘高度监听 (移动端适配)
├── types/              # TypeScript 类型定义
│   └── index.ts        # 核心类型
└── test/               # 测试文件
    ├── setup.ts        # 测试环境配置
    └── lib/            # 按源码结构组织测试
```

## 核心数据模型

```typescript
interface DiaryEntry {
  id: string           // UUID v4
  content: string      // Markdown，max 10,000 字符
  date: string         // YYYY-MM-DD
  createdAt: number    // Unix 时间戳 (ms)
  updatedAt: number
  imageIds: string[]   // max 3
}

interface ImageRecord {
  id: string
  entryId: string
  blob: Blob
  thumbnail: Blob
  createdAt: number
}
```

## 开发规范

1. **TypeScript 严格模式**，避免 `any`
2. **谨慎使用类型断言**：除 `as const` 外，避免使用 `as` 断言；优先使用运行时检查或类型守卫
3. **Repository 模式**：IndexedDB 访问通过 `lib/repositories/*`
4. **TanStack Query**：数据库状态管理，5 分钟 staleTime
5. **图片必须压缩**：存储前压缩 + 生成缩略图 (Canvas API)
6. **Markdown 受限**：仅支持加粗、斜体、列表
7. **测试文件**：放在 `src/test/` 目录，按源码结构组织
8. **纯函数必须测试**：所有复杂的纯函数（尤其是字符串/数据转换函数）必须补充单元测试，不要依赖手动测试
9. **Commit 信息**：使用中文
10. **小步提交**：每完成一个独立任务立即提交，不要积攒多个任务一起提交
11. **动画性能**：仅对合成器属性 (`transform`, `opacity`) 进行动画，禁止对布局属性 (`width`, `height`, `margin`, `padding`) 进行动画
12. **编辑器覆盖层模式**：编辑器使用 Layout Route + Outlet 覆盖层模式实现，时间线始终保持挂载以保留滚动位置；编辑器打开时使用 `inert` 属性禁用时间线交互
13. **提交前检查**：每次提交 commit 前，先确认是否需要更新 `spec/` 目录下的文档和 `CLAUDE.md`

## 移动端适配

- **Viewport 配置**：`interactive-widget=resizes-content` 确保键盘弹出时调整内容大小而非滚动页面
- **页面布局**：
  - 需要滚动的页面使用 `h-dvh overflow-y-auto`
  - 编辑器等禁止滚动的页面使用 `h-dvh overflow-hidden`
- **全局样式**：`html/body` 设置 `overflow: hidden` + `overscroll-behavior: none`
- **键盘高度监听**：使用 `useKeyboardHeight` hook 通过 `visualViewport` API 获取键盘高度

## 功能状态

| 已完成 | 待实现 |
|--------|--------|
| 时间线视图 | Web Worker 搜索 |
| 日期导航 | HEIC 支持 |
| 创建/编辑/删除 | Lightbox |
| 图片上传 | PWA 安装引导 |
| 全文搜索 | |
| 数据导入/导出 | |
| 主题切换 | |
| 语言切换 | |
