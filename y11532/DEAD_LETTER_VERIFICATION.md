# 死信处理与恢复链路验证文档

## 概述

本文档详细说明银行网点排班重试补偿队列服务的死信处理与恢复链路，确保列表/详情/历史/导出/状态五维一致性。

---

## 一、死信链路完整流程

```
提交任务 → 入队 → 处理 → 检测冲突 → 失败 → 重试(最多3次)
                                          ↓
                                    达到重试上限
                                          ↓
                                    标记为 dead_letter
                                          ↓
                              写入 dead_letters 表
                                          ↓
                         ┌─────────────────────────────────┐
                         │                                 │
                人工查看死信列表                     死信自动保留
                         │                                 │
                点击恢复按钮                     查看原始数据快照
                         │                                 │
                恢复为 pending                     导出审计
                         │                                 │
                重新入队处理                     标记已解决
                         │                                 │
                成功/失败                      不可恢复的手动关闭
```

---

## 二、死信写入流程（关键修复点）

### 2.1 数据结构变更

**文件**: [models.go](file:///Users/mac/pro/solo/workspaces/y11532/internal/models/models.go#L245-L262)

```go
type DeadLetter struct {
    BaseModel
    TaskID            uuid.UUID   // 关联任务ID
    RetryTaskItemID   uuid.UUID   // 任务项表主键（修复前缺失）
    BusinessDataID    uuid.UUID   // 业务数据主键（排班/请假/培训等表ID）
    ItemType          string      // 业务类型: schedule/leave/forecast/scan/training
    FailedAt          time.Time   // 失败时间
    ErrorCount        int         // 累计失败次数
    LastError         string      // 最后一次错误信息
    ConflictType      string      // 冲突类型
    OriginalData      string      // 失败时的原始数据快照（JSON）
    Resolved          bool        // 是否已解决
    ResolvedBy        uuid.UUID   // 解决人
    ResolvedAt        *time.Time  // 解决时间
    ResolveMethod     string      // 解决方式: restore/manual_close
    ResolveComment    string      // 解决备注
    RestoredTaskID    uuid.UUID   // 恢复后关联的任务ID
}
```

### 2.2 写入逻辑修复

**文件**: [retry_queue_service.go](file:///Users/mac/pro/solo/workspaces/y11532/internal/services/retry_queue_service.go#L634-L691)

**修复前问题**:
- `deadLetter.ItemID = item.ItemID` 保存的是**业务数据ID**（如排班表ID）
- 恢复时用这个ID查询 `retry_task_items.id`（任务项表主键），永远查不到
- 缺少错误检查，静默失败

**修复后逻辑**:
1. 正确保存两个ID：
   - `RetryTaskItemID = item.ID` → 任务项表主键
   - `BusinessDataID = item.ItemID` → 业务数据主键

2. 写入前更新任务项状态为 `dead_letter`（在 ProcessTask 中完成）

3. 添加完整错误检查：
   - 每个查询都检查 error
   - 创建死信记录失败打日志
   - 支持 training 类型的原始数据保存

4. 原始数据快照：
   - 查询业务表获取完整数据
   - JSON 序列化后存入 `OriginalData`
   - 即使业务数据被删除也能查看

---

## 三、死信恢复流程（关键修复点）

**文件**: [statistics_service.go](file:///Users/mac/pro/solo/workspaces/y11532/internal/services/statistics_service.go#L381-L516)

### 3.1 恢复算法

```
输入: deadLetterID, operator
输出: 恢复后的任务, error

步骤:
1. 查询死信记录 → 不存在返回错误
2. 检查是否已解决 → 已解决返回错误
3. 查询关联任务 → 不存在返回错误
4. 查询关联任务项:
   a. 优先用 RetryTaskItemID 查询
   b. 查不到则用 BusinessDataID + TaskID 查询
   c. 还查不到则根据死信记录重建
5. 重置任务项状态为 pending, 重试次数为0
6. 计算任务新状态:
   - 原状态是 dead_letter:
     * 还有其他死信项 → retrying
     * 没有其他死信项 → pending
   - 其他状态: 保持或改为 pending
7. 重置任务重试次数, 清除错误信息
8. 事务保存: 任务 + 任务项 + 死信记录
9. 写入两条操作历史: 任务级 + 任务项级
10. 打日志
```

### 3.2 状态流转一致性

| 死信恢复前状态 | 恢复后状态 | 说明 |
|--------------|-----------|------|
| dead_letter (有其他死信项) | retrying | 还有其他失败项，继续重试 |
| dead_letter (无其他死信项) | pending | 全部恢复完成，等待入队 |
| pending | pending | 保持不变 |
| retrying | retrying | 保持不变 |
| success/compensated/closed | pending | 特殊情况，强制重置 |

### 3.3 恢复后续跑链路

```
恢复成功 → 状态变为 pending/retrying
                ↓
          调用 /tasks/:id/queue 入队
                ↓
          调用 /tasks/:id/process 处理
                ↓
         ┌────── 检测冲突 ──────┐
         │                       │
     无冲突                     有冲突
         ↓                       ↓
     成功                   再次失败(可重试)
         ↓                       ↓
  状态变为 success        重试次数++，下次重试
                                 ↓
                          再次达到上限 → 死信
```

---

## 四、五维一致性保证

### 4.1 列表与详情一致

**验证点**:
- 任务列表显示的 `success_count` + `failed_count` = `total_count`
- 任务详情显示的明细项数 = `total_count`
- 死信列表显示的失败项与任务详情中的失败项一致

**实现保证**:
- 所有计数更新都在事务中
- 死信恢复时正确更新 `failed_count`

### 4.2 历史可追溯

**验证点**:
- 死信写入有操作历史（OpTypeFail）
- 死信恢复有两条操作历史：
  - 任务级：状态从 `dead_letter` 变为 `pending/retrying`
  - 任务项级：状态从 `dead_letter` 变为 `pending`
- 每条历史都有 `before_snapshot` 和 `after_snapshot`
- 历史记录 `diff_summary` 明确记录变化

**实现保证**:
- `RestoreDeadLetter` 中调用两次 `RecordOperation`
- 每次状态变更都强制写历史

### 4.3 导出与状态一致

**验证点**:
- 冻结状态的任务可以导出
- 导出的 `success_count` = 任务详情中的成功数
- 导出文件哈希与数据库存储的一致
- 导出前任务状态与导出时状态一致

**实现保证**:
- 导出服务允许 `frozen` 状态导出
- 导出时记录数据快照 `data_snapshot`
- 冻结时保存 `status_before_freeze`，解冻恢复原状态

### 4.4 日志与状态一致

**验证点**:
- 死信写入打错误日志
- 死信恢复打信息日志
- 日志包含 `dead_letter_id`、`task_id`、`item_id`
- 日志级别正确（错误用 Error，警告用 Warn，信息用 Info）

**实现保证**:
- 所有异常路径都打日志
- 使用结构化日志字段
- 关键操作都有日志

### 4.5 状态机闭环

**状态流转规则**:

| 当前状态 | 允许操作 | 下一状态 |
|---------|---------|---------|
| pending | queue, withdraw | queued, withdrawn |
| queued | process | processing |
| processing | (自动) | success / partial_failed / retrying / dead_letter |
| retrying | process, manual_takeover | processing / manual_takeover |
| success | close, freeze, export | closed, frozen |
| partial_failed | manual_takeover | manual_takeover |
| manual_takeover | compensate | compensated |
| compensated | close | closed |
| dead_letter | restore, manual_takeover | pending/retrying, manual_takeover |
| frozen | unfreeze, export | (原状态) |
| closed | - | - |
| withdrawn | resubmit | resubmitted |
| resubmitted | queue | queued |

---

## 五、边界情况处理

### 5.1 任务项被删除

**场景**: 死信对应的任务项被物理删除

**处理**:
1. 用 `RetryTaskItemID` 查不到
2. 降级用 `BusinessDataID + TaskID` 查询
3. 还查不到则根据死信记录重建任务项
4. 打 Warn 日志
5. 操作历史记录重建情况

### 5.2 任务被删除

**场景**: 死信对应的任务被物理删除

**处理**:
1. 查询任务失败直接返回错误
2. 不在数据库层面做级联删除
3. 死信记录保留用于审计

### 5.3 重复恢复

**场景**: 同一条死信被多次恢复

**处理**:
1. 检查 `deadLetter.Resolved` 标志
2. 已解决返回明确错误信息
3. 错误信息包含解决方式和时间

### 5.4 部分恢复

**场景**: 一个任务有多个死信项，只恢复其中一个

**处理**:
1. 恢复后任务状态根据剩余死信项数量决定
2. 还有死信项 → `retrying`
3. 没有死信项 → `pending`
4. 操作历史记录明确说明

---

## 六、API 验证清单

### 6.1 死信相关 API

| API | 验证点 | 预期结果 |
|-----|--------|---------|
| `GET /api/v1/dead-letters` | 列示所有死信 | 返回死信列表，包含业务数据ID和任务项ID |
| `POST /api/v1/dead-letters/:id/restore` | 恢复死信 | 返回任务ID和新状态，操作历史有两条记录 |
| `GET /api/v1/tasks/:id/consistency` | 一致性检查 | is_consistent = true，无可疑差异 |
| `GET /api/v1/tasks/:id/history` | 操作历史 | 包含死信写入和死信恢复记录 |
| `POST /api/v1/tasks/:id/export` | 冻结后导出 | frozen 状态允许导出，文件哈希正确 |

### 6.2 培训数据 API

| API | 验证点 | 预期结果 |
|-----|--------|---------|
| `POST /api/v1/tasks` | 提交含培训数据 | trainings 字段被正确接收和处理 |
| `GET /api/v1/tasks/:id` | 任务详情 | training_count 计数正确 |
| `POST /api/v1/tasks/:id/process` | 处理培训数据 | training 类型任务项被处理，检测培训冲突 |

### 6.3 冻结/解冻 API

| API | 验证点 | 预期结果 |
|-----|--------|---------|
| `POST /api/v1/tasks/:id/freeze` | 冻结任务 | status 变为 frozen，status_before_freeze 保存原状态 |
| `POST /api/v1/tasks/:id/unfreeze` | 解冻任务 | 状态恢复为 status_before_freeze 的值 |
| `POST /api/v1/tasks/:id/export` | 冻结时导出 | 允许导出，数据与冻结时一致 |

---

## 七、无 Go 环境验证方法

### 7.1 代码静态验证

1. **检查字段映射**:
   - 打开 [retry_queue_service.go:640-648](file:///Users/mac/pro/solo/workspaces/y11532/internal/services/retry_queue_service.go#L640-L648)
   - 确认 `RetryTaskItemID = item.ID` 和 `BusinessDataID = item.ItemID`
   - 这是最关键的修复点

2. **检查恢复查询逻辑**:
   - 打开 [statistics_service.go:398-422](file:///Users/mac/pro/solo/workspaces/y11532/internal/services/statistics_service.go#L398-L422)
   - 确认优先用 `RetryTaskItemID` 查询
   - 确认有降级查询策略
   - 确认每个查询都检查 error

3. **检查操作历史记录**:
   - 打开 [statistics_service.go:496-510](file:///Users/mac/pro/solo/workspaces/y11532/internal/services/statistics_service.go#L496-L510)
   - 确认有两次 RecordOperation 调用
   - 确认 from_status 和 to_status 正确

4. **检查冻结状态导出**:
   - 打开 [export_service.go:53-58](file:///Users/mac/pro/solo/workspaces/y11532/internal/services/export_service.go#L53-L58)
   - 确认允许 `frozen` 状态导出

5. **检查解冻状态恢复**:
   - 打开 [retry_queue_service.go:832-841](file:///Users/mac/pro/solo/workspaces/y11532/internal/services/retry_queue_service.go#L832-L841)
   - 确认从 `StatusBeforeFreeze` 恢复状态

### 7.2 数据一致性检查清单

```
✓ DeadLetter.RetryTaskItemID = RetryTaskItem.ID
✓ DeadLetter.BusinessDataID = RetryTaskItem.ItemID
✓ RetryTaskItem.Status 在转入死信时更新为 dead_letter
✓ 死信恢复时重试计数重置为 0
✓ 死信恢复时任务状态根据剩余死信项智能决定
✓ 每次状态变更都写 OperationHistory
✓ OperationHistory 包含 before_snapshot 和 after_snapshot
✓ OperationHistory.diff_summary 自动生成
✓ 冻结时保存 StatusBeforeFreeze
✓ 解冻时恢复 StatusBeforeFreeze
✓ 导出允许 frozen 状态
✓ 所有数据库操作有错误检查
✓ 所有异常路径有日志
✓ 事务保证数据一致性
✓ 任务计数 (success+failed = total) 始终正确
```

---

## 八、关键代码引用速查

| 功能 | 文件 | 行号 |
|-----|------|------|
| 死信数据结构 | models.go | 245-262 |
| 冻结前状态字段 | models.go | 157 |
| 死信写入逻辑 | retry_queue_service.go | 634-691 |
| 转入死信前更新状态 | retry_queue_service.go | 485-497 |
| 死信恢复逻辑 | statistics_service.go | 381-516 |
| 冻结逻辑 | retry_queue_service.go | 789-819 |
| 解冻逻辑 | retry_queue_service.go | 822-855 |
| 导出状态检查 | export_service.go | 53-58 |
| 培训数据提交入口 | task_handler.go | 40,70 |
| 培训数据处理 | retry_queue_service.go | 596-608 |
| 培训类型冲突检测 | conflict_service.go | 74-94 |

---

## 九、常见问题

### Q1: 死信恢复后为什么不是直接成功？
A: 死信恢复只是将状态重置为待处理，需要重新入队处理才能判断是否成功。这样可以确保冲突检测逻辑重新执行，避免人工绕过业务规则。

### Q2: 为什么要保存两个ID（RetryTaskItemID 和 BusinessDataID）？
A: RetryTaskItemID 是任务项表的主键，用于快速定位任务项；BusinessDataID 是业务数据的主键，用于查询原始业务数据。两者用途不同，分开保存避免混淆。

### Q3: 解冻后为什么不直接处理？
A: 解冻只是解除冻结状态，是否重新处理由操作员决定。操作员可能只想查看数据而不想立即重跑。

### Q4: 为什么死信恢复要写两条操作历史？
A: 一条是任务级的（整个任务状态变化），一条是任务项级的（具体失败项的状态变化）。这样在列表、详情、历史三个视图看数据时都能对应上，不会出现"列表显示恢复了但历史看不到具体哪项恢复了"的情况。

### Q5: 任务项被删了还能恢复吗？
A: 可以。死信记录中保存了完整的 OriginalData 快照，即使任务项被删除也能根据快照重建。这是为了防止误删除导致数据丢失。
