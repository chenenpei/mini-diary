# MiniDiary

极简主义 PWA 日记应用，数据存储在本地浏览器。

**在线预览**: [https://cep-mini-diary.netlify.app/](https://cep-mini-diary.netlify.app/)

## 特性

- 📝 **极简记录** - 像发微博一样简单，打开即写
- 🔒 **隐私优先** - 数据存储在本地 IndexedDB，零服务器通信
- 📱 **PWA 支持** - 可安装到桌面，支持离线使用
- 🌓 **主题切换** - 支持浅色/深色/跟随系统
- 🖼️ **图片支持** - 每条日记最多 3 张图片，自动压缩
- 📤 **数据导出** - 支持 JSON 格式导出备份
- 🔍 **全文搜索** - 快速查找历史记录
- ☁️ **云同步** - 通过 Google Drive 跨设备同步，数据保存在你的私人网盘
- 🌐 **多语言** - 支持中文 / English

## 技术栈

- **框架**: TanStack Start + React 19 + TypeScript
- **构建**: Vite 7
- **UI**: Tailwind CSS 4 + shadcn/ui + Motion
- **数据**: Dexie.js (IndexedDB) + TanStack Query
- **代码质量**: Biome (lint + format)

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 生产构建
pnpm build
```

## 可用命令

```bash
pnpm dev              # 开发服务器 (端口 3000)
pnpm build            # 生产构建
pnpm typecheck        # 类型检查
pnpm lint             # 代码检查 (Biome)
pnpm format           # 代码格式化
pnpm test             # 运行测试
```

## 项目结构

```
src/
├── routes/             # TanStack Start 文件路由
├── components/
│   ├── ui/             # 通用 UI 组件
│   ├── timeline/       # 时间线相关组件
│   ├── editor/         # 编辑器组件
│   ├── sync/           # 云同步组件
│   └── layout/         # 布局组件
├── lib/
│   ├── db.ts           # Dexie 数据库实例
│   ├── repositories/   # 数据访问层
│   ├── sync/           # 同步核心逻辑
│   ├── cloud/          # 云存储适配层
│   └── utils.ts        # 工具函数
├── hooks/              # TanStack Query Hooks
└── types/              # TypeScript 类型定义
```

## 文档

- [PRD.md](spec/PRD.md) - 产品需求文档
- [TECH.md](spec/TECH.md) - 技术架构文档
- [DESIGN.md](spec/DESIGN.md) - 设计规范文档
- [cloud-sync-design.md](spec/cloud-sync-design.md) - 云同步设计文档

## 许可证

MIT