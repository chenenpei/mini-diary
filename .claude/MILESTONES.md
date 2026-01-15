# MiniDiary 开发里程碑跟踪

## 进度概览

| 里程碑 | 状态 | 完成日期 |
|--------|------|----------|
| M1: 项目初始化与基础架构 | ✅ 已完成 | 2025-01-15 |
| M2: 数据层与核心类型 | ✅ 已完成 | 2025-01-15 |
| M3: 核心 UI 组件与布局 | ✅ 已完成 | 2026-01-15 |
| M4: P0 功能 - 时间线与编辑器 | ✅ 已完成 | 2026-01-15 |
| M5: P1 功能与 PWA | 🔲 待开始 | - |

**状态图例**: 🔲 待开始 | 🔄 进行中 | ✅ 已完成 | ⏸️ 暂停

---

## 里程碑 1: 项目初始化与基础架构

**目标**: 搭建项目骨架，配置开发环境

**验收标准**:
- `pnpm dev` 能启动开发服务器
- `pnpm build` 能成功构建
- `pnpm test` 能运行测试

| 任务 | 状态 | 提交 |
|------|------|------|
| 1.1 初始化 TanStack Start 项目 | ✅ | 188e903 |
| 1.2 配置 TypeScript 严格模式 | ✅ | 6de0e54 |
| 1.3 配置 Tailwind CSS 4 + shadcn/ui | ✅ | (included) |
| 1.4 配置 Vitest 测试环境 | ✅ | (included) |
| 1.5 创建目录结构 | ✅ | 1dbafe3 |
| 1.6 配置 Biome (替代 ESLint + Prettier) | ✅ | 4971420 |

---

## 里程碑 2: 数据层与核心类型

**目标**: 实现 IndexedDB 数据库和数据访问层

**验收标准**:
- 所有 Repository 测试通过
- 能正确读写 IndexedDB

| 任务 | 状态 | 提交 |
|------|------|------|
| 2.1 定义 TypeScript 类型 | ✅ | 1dde51b |
| 2.2 配置 Dexie.js 数据库 Schema | ✅ | 1dde51b |
| 2.3 实现 entriesRepository | ✅ | 1dde51b |
| 2.4 实现 imagesRepository | ✅ | 1dde51b |
| 2.5 配置 TanStack Query hooks | ✅ | 1dde51b |
| 2.6 编写 Repository 单元测试 | ✅ | 34c0129 |

---

## 里程碑 3: 核心 UI 组件与布局

**目标**: 实现设计规范中的 UI 组件和页面布局

**验收标准**:
- 组件正确渲染，符合设计规范
- 支持亮/暗模式切换

| 任务 | 状态 | 提交 |
|------|------|------|
| 3.1 配置设计 Token | ✅ | (已在 M1 中配置) |
| 3.2 实现布局组件 (TopBar, FAB, PageLayout) | ✅ | - |
| 3.3 实现日记卡片组件 (DiaryCard, DiaryList) | ✅ | - |
| 3.4 实现日期导航组件 (DateNavigator) | ✅ | - |
| 3.5 实现空状态组件 (EmptyState, SparseHint) | ✅ | - |
| 3.6 实现加载骨架屏组件 (Skeleton, DiaryCardSkeleton) | ✅ | - |

---

## 里程碑 4: P0 功能 - 时间线与编辑器

**目标**: 实现 MVP 核心功能

**验收标准**:
- 能完整进行日记的创建、查看、编辑、删除
- 图片上传压缩正常工作
- Markdown 渲染正确

| 任务 | 状态 | 提交 |
|------|------|------|
| 4.1 实现首页路由 (时间线视图) | ✅ | be4b8a9 |
| 4.2 实现日期导航功能 | ✅ | be4b8a9 |
| 4.3 实现日记列表展示 | ✅ | be4b8a9 |
| 4.4 实现新建日记页面 | ✅ | a77d08f |
| 4.5 实现编辑日记页面 | ✅ | 6141cc9 |
| 4.6 实现图片上传与压缩 | ✅ | 3cb9022 |
| 4.7 实现 Markdown 渲染 | ✅ | 331ee9e |
| 4.8 实现删除日记功能 | ✅ | 6141cc9 |

---

## 里程碑 5: P1 功能与 PWA

**目标**: 实现搜索、设置、数据导入导出和 PWA

**验收标准**:
- 所有 P1 功能可用
- PWA 可安装
- 离线功能正常

| 任务 | 状态 | 提交 |
|------|------|------|
| 5.1 实现搜索页面 | 🔲 | - |
| 5.2 实现侧边栏 (Drawer) | 🔲 | - |
| 5.3 实现主题切换功能 | 🔲 | - |
| 5.4 实现数据导出 | 🔲 | - |
| 5.5 实现数据导入 | 🔲 | - |
| 5.6 实现存储监控显示 | 🔲 | - |
| 5.7 配置 PWA | 🔲 | - |
| 5.8 实现清空数据功能 | 🔲 | - |

---

## 开发日志

### 2025-01-15
- 创建里程碑跟踪文档
- 完成里程碑 1：项目初始化与基础架构
- 根据专业评审修复设计和技术文档
  - 修正字体栈、阴影、缓动函数
  - 更新图片压缩方案为 Canvas API
  - 添加并发安全和错误恢复策略
- 切换 ESLint + Prettier 到 Biome
- 完成里程碑 2：数据层与核心类型
  - 定义 TypeScript 类型 (DiaryEntry, ImageRecord, AppSettings)
  - 配置 Dexie.js 数据库
  - 实现 entriesRepository 和 imagesRepository
  - 配置 TanStack Query hooks
  - 编写 32 个单元测试
- 规范化项目结构（测试文件移动到 src/test/）

### 2026-01-15
- 完成里程碑 3：核心 UI 组件与布局
  - 安装 motion 动画库
  - 实现布局组件：TopBar, FAB, PageLayout, PageTransition
  - 实现时间线组件：DiaryCard, DiaryList, DateNavigator
  - 实现状态组件：EmptyState, SparseHint, Skeleton, DiaryCardSkeleton
  - 修复 TypeScript 严格模式下的类型错误
  - 更新 CLAUDE.md 添加类型断言规范
- 完成里程碑 4：P0 功能 - 时间线与编辑器
  - 实现首页路由与日期导航
  - 实现日记列表展示 (DiaryList + DiaryCard)
  - 实现新建日记页面 (/entry/new)
  - 实现编辑日记页面 (/entry/$id)
  - 实现删除日记功能
  - 实现图片上传与压缩 (Canvas API)
  - 实现 Markdown 渲染 (react-markdown + remark-gfm)

---

## 恢复开发指南

如果在新对话中继续开发，请告诉 Claude:

> 请阅读 `.claude/MILESTONES.md` 了解当前进度，继续开发 MiniDiary 项目。
