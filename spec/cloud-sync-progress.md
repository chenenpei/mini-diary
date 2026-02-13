# 云同步功能 — 开发进度追踪

> 基于 [cloud-sync-design.md](cloud-sync-design.md) 的设计分阶段实现。
> 新 session 从本文件恢复上下文。

## 阶段总览

| 阶段 | 内容 | 状态 | 实现计划 |
|------|------|------|----------|
| Phase 1 | 数据模型变更（软删除、settings） | 🔵 进行中 | `docs/plans/2026-02-13-phase1-soft-delete.md` |
| Phase 2 | 同步核心逻辑（合并、变更检测、数据验证） | ⚪ 未开始 | — |
| Phase 3 | 云存储适配层（Google Drive / OneDrive API） | ⚪ 未开始 | — |
| Phase 4 | 同步 UI（设置页、进度展示、冲突弹窗） | ⚪ 未开始 | — |
| Phase 5 | 健壮性（重试、备份恢复、启动检查） | ⚪ 未开始 | — |

## Phase 1 详情

**范围：** DiaryEntry 添加 `deletedAt`，AppSettings 添加 `lastSyncedAt`，软删除替代物理删除，查询过滤，墓碑清理。

**关键决策：**
- 软删除过滤在 Repository 层实现
- AppSettings 扩展现有接口（非 KV 重构）
- deletedAt 不加索引（数据量小，filter 够用）
- 不需要 Dexie schema 版本升级（非索引字段无需升版本）
- 测试风格：BDD（从行为角度组织）

**Task 进度：**

| Task | 内容 | 状态 |
|------|------|------|
| 1 | 类型定义变更 | ⚪ 未开始 |
| 2 | 软删除行为（测试 + 实现） | ⚪ 未开始 |
| 3 | 查询过滤（测试 + 实现） | ⚪ 未开始 |
| 4 | 同步辅助方法（测试 + 实现） | ⚪ 未开始 |
| 5 | 墓碑清理（测试 + 实现） | ⚪ 未开始 |

## 如何恢复

1. 读取本文件了解当前阶段和进度
2. 读取对应的实现计划（`docs/plans/` 下）获取具体 task 内容
3. 读取设计文档 `spec/cloud-sync-design.md` 了解完整设计
4. 从第一个「未开始」的 task 继续
