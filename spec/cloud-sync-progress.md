# 云同步功能 — 开发进度追踪

> 基于 [cloud-sync-design.md](cloud-sync-design.md) 的设计分阶段实现。
> 新 session 从本文件恢复上下文。

## 阶段总览

| 阶段 | 内容 | 状态 | 实现计划 |
|------|------|------|----------|
| Phase 1 | 数据模型变更（软删除、settings） | ✅ 已完成 | `docs/plans/2026-02-13-phase1-soft-delete.md` |
| Phase 2 | 同步核心逻辑（合并、变更检测、数据验证） | ✅ 已完成 | `docs/plans/2026-02-13-phase2-sync-logic.md` |
| Phase 3 | 云存储适配层（Google Drive API） | ✅ 已完成 | `docs/plans/2026-02-13-phase3-cloud-adapter.md` |
| Phase 4 | 同步 UI（设置页、进度展示、冲突弹窗） | ⚪ 未开始 | `docs/plans/2026-02-13-phase4-sync-ui.md` |
| Phase 5 | 健壮性（重试、备份恢复、启动检查） | ⚪ 未开始 | `docs/plans/2026-02-13-phase5-robustness.md` |

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
| 1 | 类型定义变更 | ✅ 已完成 |
| 2 | 软删除行为（测试 + 实现） | ✅ 已完成 |
| 3 | 查询过滤（测试 + 实现） | ✅ 已完成 |
| 4 | 同步辅助方法（测试 + 实现） | ✅ 已完成 |
| 5 | 墓碑清理（测试 + 实现） | ✅ 已完成 |

## Phase 2 详情

**范围：** 4 个纯函数（无 DB、无网络），放在 `src/lib/sync.ts`。

**关键决策：**
- 纯函数优先，SyncBackup 放 Phase 5
- 使用 `isRecord` 类型守卫代替 `as` 断言
- mergeEntries 用 updatedAt last-write-wins 策略，自然处理软删除传播
- validateCloudData 区分 errors（结构性问题）和 warnings（字段缺失）

**Task 进度：**

| Task | 内容 | 状态 |
|------|------|------|
| 1 | 类型定义（CloudData, ImageManifest 等） | ✅ 已完成 |
| 2 | mergeEntries（测试 + 实现） | ✅ 已完成 |
| 3 | mergeImages（测试 + 实现） | ✅ 已完成 |
| 4 | detectChanges（测试 + 实现） | ✅ 已完成 |
| 5 | validateCloudData（测试 + 实现） | ✅ 已完成 |

## Phase 3 详情

**范围：** CloudAdapter 接口 + Google Drive 适配器 + SyncManager 编排器 + Auth 模块。

**关键决策：**
- Adapter 模式：CloudAdapter 接口隔离云存储细节
- Google Drive REST API v3 + appDataFolder（应用私有空间）
- SyncManager 纯协调器：接收 SyncInput，返回 SyncResult，不直接访问 DB
- Auth 使用 GIS (Google Identity Services) 隐式授权流
- Token 缓存在 IndexedDB settings 表，含 5 分钟过期缓冲
- 并发 token 请求用 inflight guard 防重复弹窗
- 查询注入防护（escapeQueryValue）、Content-Type 净化、数据验证类型守卫
- ValidationResult 改为判别联合类型，消除调用侧 `as CloudData`

**Task 进度：**

| Task | 内容 | 状态 |
|------|------|------|
| 1 | 类型定义（SyncPhase, SyncProgress, CloudAdapter 等） | ✅ 已完成 |
| 2 | Settings Repository（同步配置存取） | ✅ 已完成 |
| 3 | 进度计算（纯函数 + 阶段权重） | ✅ 已完成 |
| 4 | Google Drive 适配器（REST API v3 + 安全修复） | ✅ 已完成 |
| 5 | Auth 模块（GIS token provider + 并发防护） | ✅ 已完成 |
| 6 | SyncManager（push/pull/merge 编排） | ✅ 已完成 |

## 如何恢复

1. 读取本文件了解当前阶段和进度
2. 读取对应的实现计划（`docs/plans/` 下）获取具体 task 内容
3. 读取设计文档 `spec/cloud-sync-design.md` 了解完整设计
4. 从第一个「未开始」的 task 继续
