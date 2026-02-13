# MiniDiary 云同步设计文档

## 1. 概述与目标

### 背景

MiniDiary 当前所有数据存储在本地 IndexedDB，支持 JSON 格式的手动导入/导出。用户希望在多设备间同步数据，同时保持「数据本地化」的核心原则——云存储仅作为同步媒介，不依赖任何后端服务。

### 目标

- 支持通过 Google Drive / OneDrive 同步数据
- 用户手动触发同步，完全掌控
- 整包同步策略，简单可靠
- 冲突时智能合并，必要时渐进式披露选项
- 为未来分块同步预留扩展空间
- 同步过程实时展示进度，缓解用户等待焦虑
- 网络异常自动重试，图片逐张断点续传
- 写前备份 + 事务写入，确保任何情况下不丢数据

### 非目标（本期不做）

- 自动后台同步
- iCloud 支持（无公开 Web API）
- 实时多设备协作
- 端到端加密（可作为后续功能）

---

## 2. 数据模型变更

### DiaryEntry 新增字段

```typescript
interface DiaryEntry {
  id: string
  content: string
  date: string
  createdAt: number
  updatedAt: number
  imageIds: string[]
  deletedAt?: number  // 新增：软删除时间戳
}
```

### 软删除规则

| 规则 | 说明 |
|------|------|
| 删除操作 | 设置 `deletedAt = Date.now()`，不物理删除 |
| 查询过滤 | 所有列表查询过滤掉 `deletedAt` 有值的条目 |
| 墓碑清理 | 同步成功后，清理 `deletedAt` 超过 30 天的条目 |
| 图片清理 | 墓碑清理时，一并删除关联的图片 |

### ImageRecord 保持不变

```typescript
interface ImageRecord {
  id: string
  entryId: string
  blob: Blob
  thumbnail: Blob
  createdAt: number
}
```

图片不需要软删除——编辑时移除图片立即删除，随条目删除的图片在墓碑清理时一并处理。

---

## 3. 云端存储格式

### 文件结构

```
Google Drive / OneDrive 应用文件夹:
└── MiniDiary/
    ├── mini-diary.json      # 日记数据 + 图片清单
    └── images/
        ├── {id}.jpg         # 压缩图
        └── {id}_thumb.jpg   # 缩略图
```

### mini-diary.json 格式

```typescript
interface CloudData {
  version: 1                     // 格式版本，用于未来升级
  syncedAt: string               // ISO 8601 时间戳
  entries: DiaryEntry[]          // 所有日记条目（含软删除的）
  imageManifest: ImageManifest[] // 图片清单（不含 Blob）
}

interface ImageManifest {
  id: string
  entryId: string
  createdAt: number
}
```

### 设计要点

| 要点 | 说明 |
|------|------|
| 版本号 | `version: 1` 为整包同步，未来 `version: 2` 可切换到按年分块 |
| 软删除条目包含 | 云端 JSON 包含 `deletedAt` 有值的条目，确保删除能同步 |
| 图片分离 | JSON 只存清单，Blob 单独存文件，避免 JSON 过大 |
| 应用文件夹 | 使用 Drive/OneDrive 的 App Folder，不访问用户其他文件 |

---

## 4. 同步流程

### 整体流程

```
用户点击「同步」
       │
       ▼
  检查云端状态
       │
       ├─→ 未授权 → 跳转 OAuth 授权 → 返回重试
       │
       ├─→ 云端无数据 → 执行 Push → 完成 ✓
       │
       ├─→ 云端 = 本地 → 提示「已是最新」
       │
       ├─→ 仅云端有变更 → 执行 Pull → 完成 ✓
       │
       ├─→ 仅本地有变更 → 执行 Push → 完成 ✓
       │
       └─→ 双方都有变更 → 弹窗让用户选择
              │
              ├─→ [合并] → 执行 Merge → Push → 完成 ✓
              ├─→ [下载] → 执行 Pull → 完成 ✓
              └─→ [上传] → 执行 Push → 完成 ✓
```

### 变更检测

通过比较 `syncedAt` 和本地最后修改时间：

```typescript
const localLastModified = Math.max(...entries.map(e => e.updatedAt))
const cloudSyncedAt = cloudData.syncedAt

const localChanged = localLastModified > lastSyncedAt  // 本地记录的上次同步时间
const cloudChanged = cloudSyncedAt > lastSyncedAt
```

### 新增本地字段

需要在本地存储上次同步时间：

```typescript
// settings 表
{ key: 'lastSyncedAt', value: number }  // 上次成功同步的时间戳
```

---

## 5. 合并逻辑

### 条目合并规则

```typescript
function mergeEntries(local: DiaryEntry[], cloud: DiaryEntry[]): DiaryEntry[] {
  const merged = new Map<string, DiaryEntry>()

  // 1. 先放入所有云端条目
  for (const entry of cloud) {
    merged.set(entry.id, entry)
  }

  // 2. 用本地条目覆盖或补充
  for (const entry of local) {
    const existing = merged.get(entry.id)
    if (!existing || entry.updatedAt > existing.updatedAt) {
      merged.set(entry.id, entry)
    }
  }

  return Array.from(merged.values())
}
```

### 合并结果示例

| 条目 | 本地 updatedAt | 云端 updatedAt | 结果 |
|------|---------------|---------------|------|
| A | 1000 | 1500 | 取云端 |
| B | 2000 | 1000 | 取本地 |
| C | 1500 | (无) | 保留本地 |
| D | (无) | 1200 | 保留云端 |

### 软删除的传播

```typescript
// 如果任一方有 deletedAt，取较新的状态
if (local.deletedAt || cloud.deletedAt) {
  // 比较 updatedAt，保留更新的版本
  // 删除操作也会更新 updatedAt
}
```

### 图片合并规则

```typescript
function mergeImages(
  localManifest: ImageManifest[],
  cloudManifest: ImageManifest[]
): { toUpload: string[], toDownload: string[] } {
  const localIds = new Set(localManifest.map(i => i.id))
  const cloudIds = new Set(cloudManifest.map(i => i.id))

  return {
    toUpload: localManifest.filter(i => !cloudIds.has(i.id)).map(i => i.id),
    toDownload: cloudManifest.filter(i => !localIds.has(i.id)).map(i => i.id)
  }
}
```

---

## 6. UI 设计与页面状态

### 侧边栏新增入口

```
侧边栏
├── 云同步           ← 新增
│   └── 点击进入同步设置页
├── 数据导出
├── 数据导入
├── ...
```

### 同步设置页状态

#### 1. 空白状态 - 未配置

```
┌─────────────────────────────────┐
│ ← 云同步                        │
├─────────────────────────────────┤
│                                 │
│        ☁️ (简笔画图标)          │
│                                 │
│   选择云存储服务开始同步         │
│   数据将保存在你的私人网盘中     │
│                                 │
│  ┌─────────┐ ┌─────────┐       │
│  │ Google  │ │ OneDrive│       │
│  │ Drive   │ │         │       │
│  └─────────┘ └─────────┘       │
│                                 │
└─────────────────────────────────┘
```

#### 2. 加载状态 - 授权中 / 检查云端

```
┌─────────────────────────────────┐
│ ← 云同步                        │
├─────────────────────────────────┤
│                                 │
│         (spinner)               │
│                                 │
│    正在连接 Google Drive...     │
│                                 │
└─────────────────────────────────┘
```

#### 3. 已连接 - 从未同步

```
┌─────────────────────────────────┐
│ ← 云同步                        │
├─────────────────────────────────┤
│                                 │
│  Google Drive                   │
│  user@gmail.com                 │
│                                 │
│  状态: 云端暂无数据              │
│                                 │
│  ┌─────────────────────────┐   │
│  │    上传本地数据到云端     │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │        断开连接          │   │
│  └─────────────────────────┘   │
│                                 │
└─────────────────────────────────┘
```

#### 4. 已连接 - 云端有数据，本地为空

```
┌─────────────────────────────────┐
│ ← 云同步                        │
├─────────────────────────────────┤
│                                 │
│  Google Drive                   │
│  user@gmail.com                 │
│                                 │
│  状态: 云端有 42 条日记          │
│                                 │
│  ┌─────────────────────────┐   │
│  │    下载云端数据到本地     │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │        断开连接          │   │
│  └─────────────────────────┘   │
│                                 │
└─────────────────────────────────┘
```

#### 5. 理想状态 - 已同步

```
┌─────────────────────────────────┐
│ ← 云同步                        │
├─────────────────────────────────┤
│                                 │
│  Google Drive                   │
│  user@gmail.com                 │
│                                 │
│  上次同步: 2026-02-04 10:30    │
│  本地 42 条 · 云端 42 条        │
│                                 │
│  ┌─────────────────────────┐   │
│  │        同步数据          │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │        断开连接          │   │
│  └─────────────────────────┘   │
│                                 │
└─────────────────────────────────┘
```

#### 6. 同步进行中

```
┌─────────────────────────────────┐
│ ← 云同步                        │
├─────────────────────────────────┤
│                                 │
│  Google Drive                   │
│  user@gmail.com                 │
│                                 │
│  ┌─────────────────────────┐   │
│  │                         │   │
│  │  ✓ 检查云端状态          │   │
│  │  ✓ 下载日记数据          │   │
│  │  ● 下载图片 (3/5)       │   │
│  │  ○ 合并数据              │   │
│  │  ○ 上传数据              │   │
│  │                         │   │
│  │  ━━━━━━━━━━░░░░░ 56%   │   │
│  │                         │   │
│  └─────────────────────────┘   │
│                                 │
│           [取消]                │
│                                 │
└─────────────────────────────────┘
```

**步骤状态图标：**
- `✓` 已完成（灰色，静态）
- `●` 进行中（带 pulse 动画）
- `○` 待执行（浅灰色）
- `✗` 失败（红色）

**进度条：**
- 使用 `transform: scaleX()` 动画（合成器属性，遵循动画性能规范）
- 百分比文字跟随进度条右端

#### 7. 错误状态

| 错误类型 | 显示 | 操作 |
|----------|------|------|
| 授权失败 | "授权失败，请重试" | [重新授权] |
| 网络错误 | "网络连接失败" | [重试] |
| 云端数据损坏 | "云端数据格式错误" | [覆盖云端] / [联系支持] |
| 配额不足 | "云存储空间不足" | [前往管理] |
| Token 过期 | "授权已过期" | [重新授权] |

#### 8. 同步完成

```
┌─────────────────────────────────┐
│ ← 云同步                        │
├─────────────────────────────────┤
│                                 │
│  Google Drive                   │
│  user@gmail.com                 │
│                                 │
│  ┌─────────────────────────┐   │
│  │                         │   │
│  │      ✓  同步完成         │   │
│  │                         │   │
│  │  同步了 42 条日记        │   │
│  │  ↑ 上传 3 张 · ↓ 下载 1 张│  │
│  │  用时 12 秒              │   │
│  │                         │   │
│  └─────────────────────────┘   │
│                                 │
│          [完成]                 │
│                                 │
└─────────────────────────────────┘
```

**交互说明：**
- 完成图标 `✓` 使用 scale 弹入动画（`transform: scale`）
- 摘要信息逐行 fade in（`opacity` 动画，50ms 间隔）
- 3 秒后自动返回已连接状态（state 5），或用户点击 [完成]

#### 9. 同步失败 - 自动重试中

```
┌─────────────────────────────────┐
│ ← 云同步                        │
├─────────────────────────────────┤
│                                 │
│  Google Drive                   │
│  user@gmail.com                 │
│                                 │
│  ┌─────────────────────────┐   │
│  │                         │   │
│  │  ✓ 检查云端状态          │   │
│  │  ✓ 下载日记数据          │   │
│  │  ✗ 下载图片 (3/5)       │   │
│  │    ↳ 网络中断            │   │
│  │    ↳ 将在 3 秒后重试...  │   │
│  │  ○ 合并数据              │   │
│  │  ○ 上传数据              │   │
│  │                         │   │
│  └─────────────────────────┘   │
│                                 │
│           [取消]                │
│                                 │
└─────────────────────────────────┘
```

#### 10. 同步失败 - 重试耗尽

```
┌─────────────────────────────────┐
│ ← 云同步                        │
├─────────────────────────────────┤
│                                 │
│  Google Drive                   │
│  user@gmail.com                 │
│                                 │
│  ┌─────────────────────────┐   │
│  │                         │   │
│  │  ✓ 检查云端状态          │   │
│  │  ✓ 下载日记数据          │   │
│  │  ✗ 下载图片失败          │   │
│  │    ↳ 2 张图片下载失败    │   │
│  │    ↳ 日记数据已同步完成  │   │
│  │                         │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │    重试失败的图片         │   │
│  └─────────────────────────┘   │
│  ┌─────────────────────────┐   │
│  │    忽略，稍后再试         │   │
│  └─────────────────────────┘   │
│                                 │
└─────────────────────────────────┘
```

**交互说明：**
- 部分成功时，明确告知用户「日记数据已同步完成」，缓解焦虑
- 失败的图片不影响已成功同步的数据
- 「忽略」不会丢数据——图片仍在本地，下次同步时再上传

### 冲突弹窗

```
┌─────────────────────────────────┐
│  云端和本地都有新内容            │
│                                 │
│  本地: 新增 3 条，修改 2 条      │
│  云端: 新增 1 条，修改 1 条      │
│                                 │
│  ┌─────────────────────────┐   │
│  │    合并双方变更 (推荐)    │   │
│  └─────────────────────────┘   │
│  ┌─────────────────────────┐   │
│  │    ↓ 用云端覆盖本地       │   │
│  └─────────────────────────┘   │
│  ┌─────────────────────────┐   │
│  │    ↑ 用本地覆盖云端       │   │
│  └─────────────────────────┘   │
│                                 │
│            [取消]               │
└─────────────────────────────────┘
```

---

## 7. 同步管道与进度模型

### 设计原则

同步是用户唯一「等待」的操作。进度展示的目标：

| 原则 | 做法 |
|------|------|
| 让等待可预期 | 展示总步骤和当前位置 |
| 让过程可感知 | 每一步都有明确的状态文字变化 |
| 让失败可理解 | 失败时定位到具体步骤，而非笼统的「同步失败」 |

### 同步阶段定义

```typescript
type SyncPhase =
  | { phase: 'preparing'; message: '准备同步...' }
  | { phase: 'checking'; message: '检查云端状态...' }
  | { phase: 'downloading-entries'; message: '下载日记数据...' }
  | { phase: 'downloading-images'; current: number; total: number }
  | { phase: 'merging'; message: '合并数据...' }
  | { phase: 'uploading-entries'; message: '上传日记数据...' }
  | { phase: 'uploading-images'; current: number; total: number }
  | { phase: 'verifying'; message: '验证数据完整性...' }
  | { phase: 'done'; summary: SyncSummary }
  | { phase: 'error'; error: SyncError; failedAt: string }
```

### 不同操作的阶段序列

| 操作 | 阶段序列 |
|------|----------|
| Push | preparing → checking → uploading-entries → uploading-images → verifying → done |
| Pull | preparing → checking → downloading-entries → downloading-images → verifying → done |
| Merge | preparing → checking → downloading-entries → downloading-images → merging → uploading-entries → uploading-images → verifying → done |

### 进度计算

```typescript
interface SyncProgress {
  currentPhase: SyncPhase
  completedPhases: number  // 已完成的阶段数
  totalPhases: number      // 总阶段数（因操作类型而异）
  percent: number          // 0-100，综合进度
}
```

**权重分配**（图片传输通常最耗时，给更多权重）：

| 阶段 | 权重 |
|------|------|
| preparing / checking / merging / verifying | 各 5% |
| uploading-entries / downloading-entries | 各 10% |
| uploading-images / downloading-images | 各 60%（按张数均分） |

> 示例：Merge 操作，总共 8 个阶段。下载图片 5 张已完成 3 张时：
> preparing(5) + checking(5) + download-entries(10) + download-images(60 × 3/5 = 36) = 56%

### 同步摘要

```typescript
interface SyncSummary {
  direction: 'push' | 'pull' | 'merge'
  entriesSynced: number
  imagesUploaded: number
  imagesDownloaded: number
  duration: number  // 毫秒
}
```

---

## 8. 重试与错误恢复

### 错误分类

```typescript
type SyncErrorKind =
  | 'network'       // 网络超时、断连
  | 'server'        // 5xx 服务端错误
  | 'rate_limit'    // 429 请求过多
  | 'auth'          // 401/403 授权失效
  | 'data_corrupt'  // 云端数据格式异常
  | 'quota'         // 存储空间不足
  | 'cancelled'     // 用户主动取消
```

| 错误类型 | 可重试 | 策略 |
|----------|--------|------|
| network | ✓ | 指数退避重试 |
| server | ✓ | 指数退避重试 |
| rate_limit | ✓ | 按 Retry-After 头等待后重试 |
| auth | ✗ | 提示重新授权 |
| data_corrupt | ✗ | 提示覆盖云端或联系支持 |
| quota | ✗ | 提示管理存储空间 |
| cancelled | ✗ | 静默回退 |

### 重试策略

```typescript
const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelay: 1000,       // 1 秒
  maxDelay: 10000,       // 上限 10 秒
  backoffMultiplier: 3,  // 1s → 3s → 9s
}

// 重试间隔计算
function getRetryDelay(attempt: number): number {
  const delay = RETRY_CONFIG.baseDelay * (RETRY_CONFIG.backoffMultiplier ** attempt)
  return Math.min(delay, RETRY_CONFIG.maxDelay)
}
```

### 重试粒度

| 操作 | 重试单位 | 说明 |
|------|----------|------|
| 下载 JSON | 整体重试 | JSON 文件是原子性的 |
| 上传 JSON | 整体重试 | 同上 |
| 下载图片 | 逐张重试 | 失败的图片单独重试，不影响已成功的 |
| 上传图片 | 逐张重试 | 同上 |

### 图片批量操作的断点续传

```typescript
interface ImageSyncState {
  completed: string[]  // 已成功传输的图片 ID
  failed: string[]     // 重试耗尽仍失败的图片 ID
  pending: string[]    // 尚未开始的图片 ID
}
```

- 每张图片上传/下载成功后，立即记录到 `completed`
- 重试耗尽后，记录到 `failed`，继续处理下一张
- 全部处理完毕后，如果有 `failed`：
  - 展示「N 张图片同步失败，日记数据已同步完成」
  - 提供 [重试失败的图片] 按钮，仅重传 `failed` 列表

### 用户可见的重试状态

重试过程中，UI 需要让用户知道系统在努力：

```
  ✓ 检查云端状态
  ✓ 下载日记数据
  ● 下载图片 (3/5)
    ↳ 网络中断，正在重试 (2/3)...
  ○ 合并数据
  ○ 上传数据
```

重试倒计时（让用户知道等多久）：

```
  ● 下载图片 (3/5)
    ↳ 将在 3 秒后重试...
```

### 取消操作

用户随时可以取消同步：

| 取消时机 | 处理方式 |
|----------|----------|
| 下载条目前 | 无副作用，直接取消 |
| 下载条目后、写入本地前 | 丢弃下载数据，本地不变 |
| 已写入部分本地数据 | 从备份恢复（见数据安全章节） |
| 上传途中 | 本地数据不受影响；云端可能存在不完整状态，下次同步会覆盖 |
| 图片传输途中 | 已传输的图片保留，未传输的跳过 |

---

## 9. 数据安全保障

### 核心原则

> **底线：任何情况下都不丢失用户数据。**

| 原则 | 具体措施 |
|------|----------|
| 写前备份 | Pull/Merge 写入本地前，先创建快照 |
| 先写暂存再提交 | 下载数据先写暂存区，验证后再覆盖 |
| 失败可回滚 | 同步失败时从快照恢复 |
| 只增不删 | 同步过程中永远不物理删除条目 |

### 同步前快照

```typescript
// 新增 IndexedDB 对象存储
interface SyncBackup {
  id: 'latest'               // 固定 key，只保留一份
  entries: DiaryEntry[]       // 同步前的完整条目列表
  imageManifest: ImageManifest[]
  createdAt: number
}
```

**快照生命周期：**

```
同步开始
   │
   ├─→ 是 Pull / Merge？
   │      │
   │      ├─→ 创建快照（本地所有条目 + 图片清单）
   │      │
   │      ├─→ 执行同步...
   │      │
   │      ├─→ 成功 → 删除快照
   │      │
   │      └─→ 失败 → 从快照恢复 → 删除快照
   │
   └─→ 是 Push？
          │
          └─→ 无需快照（Push 不修改本地数据）
```

### 暂存区写入

Pull 操作的安全写入流程：

```
1. 下载云端 JSON → 内存
2. 验证 JSON 格式和完整性
3. 下载所有需要的图片 → 暂存（内存中的 Blob 数组）
4. 开启 IndexedDB 事务：
   a. 写入所有条目（addOrUpdate）
   b. 写入所有图片
   c. 更新 lastSyncedAt
5. 事务提交 → 同步成功
6. 事务失败 → 自动回滚（IndexedDB 事务保证）
```

> **关键**：步骤 4 利用 IndexedDB 事务的原子性——要么全部写入成功，要么全部回滚。

### Merge 的安全写入

Merge 比 Pull 多一步本地数据合并：

```
1. 创建快照
2. 下载云端数据
3. 在内存中执行合并（不修改 IndexedDB）
4. 合并完成后，开启 IndexedDB 事务写入合并结果
5. 上传合并结果到云端
6. 云端上传成功 → 删除快照
7. 云端上传失败 → 本地已写入的合并结果保留（数据是完整的），提示用户重试上传
```

> **注意**：步骤 7 中本地数据已经是最新的合并结果，只是云端还未更新。下次同步时会检测到本地有变更，提示 Push。

### 数据完整性验证

```typescript
interface ValidationResult {
  valid: boolean
  errors: string[]
}

function validateCloudData(data: unknown): ValidationResult {
  // 1. 检查顶层结构
  // 2. 检查 version 字段
  // 3. 检查每个 entry 的必填字段
  // 4. 检查 imageManifest 中的 ID 在 entries 的 imageIds 中存在
  // 5. 检查日期格式、时间戳合理性
}
```

| 检查项 | 失败处理 |
|--------|----------|
| JSON 解析失败 | 提示「云端数据损坏」，可选覆盖云端 |
| version 不支持 | 提示「请升级应用」 |
| 必填字段缺失 | 跳过该条目，记录警告 |
| imageManifest 不一致 | 仅同步存在的图片，记录警告 |

### 异常场景处理汇总

| 场景 | 数据影响 | 恢复方式 |
|------|----------|----------|
| Pull 途中断网 | 无（未写入本地） | 重试即可 |
| Pull 写入事务失败 | 无（事务回滚） | 重试即可 |
| Merge 后上传失败 | 本地已更新为合并结果 | 重试上传 |
| Push 途中断网 | 本地无影响，云端可能不完整 | 重试 Push |
| 图片上传部分失败 | 条目数据已同步，部分图片未上传 | 重试失败的图片 |
| 用户取消（下载中） | 无影响 | 下次重新同步 |
| 用户取消（写入后） | 从快照恢复 | 下次重新同步 |
| 应用崩溃（同步中） | 检查是否有残留快照 | 启动时检测并恢复 |

### 启动时检查

```typescript
async function checkPendingRecovery(): Promise<void> {
  const backup = await db.syncBackup.get('latest')
  if (backup) {
    // 上次同步可能异常中断
    // 检查本地数据一致性
    // 如有问题，提示用户：「上次同步未完成，已恢复到同步前状态」
    // 恢复完成后删除快照
  }
}
```

---

## 10. 未来演进

### 版本演进路径

| 版本 | 格式 | 触发条件 |
|------|------|----------|
| v1 | 整包同步 | 当前实现 |
| v2 | 按年分块 | 数据量 > 50MB 时考虑 |

### v2 分块格式预览

```
云端:
└── MiniDiary/
    ├── manifest.json        # 索引文件
    ├── entries/
    │   ├── 2024.json
    │   ├── 2025.json
    │   └── 2026.json
    └── images/
        ├── 2024/
        ├── 2025/
        └── 2026/
```

```typescript
// manifest.json
{
  version: 2,
  format: 'yearly',
  years: [2024, 2025, 2026],
  syncedAt: "2026-02-04T..."
}
```

### 迁移策略

```
检测到 v1 格式
     │
     ▼
数据量 > 50MB？
     │
     ├─→ 否 → 继续使用 v1
     │
     └─→ 是 → 提示用户升级
              │
              ▼
         解析 v1 → 按年拆分 → 上传 v2 → 删除旧文件
```

### 其他可能的未来功能

| 功能 | 优先级 | 说明 |
|------|--------|------|
| 端到端加密 | P2 | 同步前加密，云端存储密文 |
| 更多云服务 | P2 | Dropbox、WebDAV 等 |
| 自动同步 | P3 | 可选开启，保存后自动上传 |
| 同步历史 | P3 | 记录每次同步的操作日志 |
