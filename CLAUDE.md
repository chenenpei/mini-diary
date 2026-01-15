# CLAUDE.md

本文件为 Claude Code 提供代码库工作指南。

## 项目概述

**MiniDiary** 是一个极简主义 PWA 日记应用，数据存储在本地 IndexedDB。

**设计哲学**：黑白灰极简主义，大量留白，微妙动效。

**详细文档**：
- [PRD.md](.claude/spec/PRD.md) - 产品需求
- [TECH.md](.claude/spec/TECH.md) - 技术架构
- [DESIGN.md](.claude/spec/DESIGN.md) - 设计规范

## 技术栈

- **框架**：TanStack Start + React 19 + TypeScript
- **构建**：Vite 7
- **UI**：Tailwind CSS 4 + shadcn/ui + Motion
- **数据**：Dexie.js (IndexedDB) + TanStack Query
- **测试**：Vitest + Testing Library

## 常用命令

```bash
pnpm install          # 安装依赖
pnpm dev              # 开发服务器
pnpm build            # 生产构建
pnpm typecheck        # 类型检查
pnpm lint             # 代码检查
pnpm test             # 运行测试
```

## 目录结构

```
app/
├── routes/           # 文件路由
├── components/
│   ├── ui/           # shadcn/ui 组件
│   ├── timeline/     # 时间线组件
│   ├── editor/       # 编辑器组件
│   └── layout/       # 布局组件
├── lib/
│   ├── db.ts         # Dexie 数据库
│   └── repositories/ # 数据访问层
├── hooks/            # 自定义 Hooks
└── types/            # TypeScript 类型
```

## 核心数据模型

```typescript
interface DiaryEntry {
  id: string;           // UUID
  content: string;      // Markdown，max 10,000 字符
  date: string;         // YYYY-MM-DD
  createdAt: number;    // Unix 时间戳
  updatedAt: number;
  imageIds: string[];   // max 3
}

interface ImageRecord {
  id: string;
  entryId: string;
  blob: Blob;
  thumbnail: Blob;
  // ...
}
```

## 开发规范

1. **TypeScript 严格模式**，避免 `any`
2. **Repository 模式**：IndexedDB 访问通过 `lib/repositories/*`
3. **TanStack Query**：数据库状态管理，5 分钟 staleTime
4. **图片必须压缩**：存储前压缩 + 生成缩略图
5. **Markdown 受限**：仅支持加粗、斜体、列表

## 功能优先级

| P0 (MVP) | P1 | P2 |
|----------|-----|-----|
| 时间线视图 | 全文搜索 | Web Worker 搜索 |
| 日期导航 | 数据导入/导出 | HEIC 支持 |
| 创建/编辑/删除 | 主题切换 | Lightbox |
| 图片上传 | PWA 安装 | |
