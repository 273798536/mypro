# 银行网点排班重试补偿队列 API 文档

## 概述

本API提供银行网点排班数据的重试补偿队列管理服务，支持柜员排班、请假单、业务量预测和扫码明细的批量处理。

## 基础路径

`/api/v1`

## 任务管理 API

### 1. 提交任务

**POST** `/tasks`

提交排班数据批次到重试补偿队列。

**请求体：**
```json
{
  "branch_id": "uuid",
  "batch_no": "BATCH-20240520-001",
  "task_type": "schedule_verify",
  "priority": 0,
  "data_strategy": "append",
  "schedules": [...],
  "leaves": [...],
  "forecasts": [...],
  "scans": [...],
  "operator_id": "uuid",
  "operator_name": "张三"
}
```

**数据策略 (data_strategy):**
- `ignore`: 重复提交时忽略
- `overwrite`: 重复提交时覆盖原有数据
- `append`: 重复提交时追加数据

**响应：**
```json
{
  "task_id": "uuid",
  "batch_no": "BATCH-20240520-001",
  "status": "pending",
  "message": "任务提交成功"
}
```

### 2. 查询任务列表

**GET** `/tasks?branch_id=&status=&page=&page_size=`

**参数：**
- `branch_id`: 支行ID (可选)
- `status`: 任务状态过滤 (可选)
- `page`: 页码，默认1
- `page_size`: 每页条数，默认20

### 3. 获取任务详情

**GET** `/tasks/:id`

获取任务详情和子项列表。

### 4. 任务入队

**POST** `/tasks/:id/queue`

将任务加入处理队列。

**请求体：**
```json
{
  "operator_id": "uuid",
  "operator_name": "张三"
}
```

### 5. 处理任务

**POST** `/tasks/:id/process`

立即执行任务处理（同步调用）。

**响应：**
```json
{
  "success": true,
  "message": "",
  "item_results": [...]
}
```

### 6. 人工接管

**POST** `/tasks/:id/manual-takeover`

对失败任务进行人工接管。

**请求体：**
```json
{
  "operator_id": "uuid",
  "operator_name": "李四",
  "reason": "特殊业务情况需要人工干预"
}
```

### 7. 补偿入账

**POST** `/tasks/:id/compensate`

人工接管后进行补偿入账。

**请求体：**
```json
{
  "operator_id": "uuid",
  "operator_name": "李四",
  "comment": "已核实情况，做补偿处理"
}
```

### 8. 关闭任务

**POST** `/tasks/:id/close`

关闭成功或补偿完成的任务。

### 9. 冻结任务

**POST** `/tasks/:id/freeze`

导出前冻结任务，防止修改。

**请求体：**
```json
{
  "operator_id": "uuid",
  "operator_name": "李四",
  "reason": "待审计，冻结任务"
}
```

### 10. 解冻任务

**POST** `/tasks/:id/unfreeze`

解冻冻结的任务。

### 11. 撤回任务

**POST** `/tasks/:id/withdraw`

撤回已提交的任务。

### 12. 重新提交任务

**POST** `/tasks/:id/resubmit`

重新提交已撤回的任务。

## 历史追踪 API

### 13. 获取任务操作历史

**GET** `/tasks/:id/history`

按时间顺序返回所有操作记录，包含前后快照。

### 14. 历史对比

**GET** `/history/compare?history_id1=&history_id2=`

对比两个历史记录的差异。

## 统计分析 API

### 15. 支行行长看板

**GET** `/dashboard/manager?branch_id=`

返回支行行长视角的汇总数据：

```json
{
  "overview": {
    "total_tasks": 100,
    "pending_count": 5,
    "success_count": 85,
    "failed_count": 10,
    "dead_letter_count": 3,
    "manual_count": 2,
    "success_rate": 85.0,
    "avg_retry_count": 1.2
  },
  "retry_classification": [
    {
      "conflict_type": "leave_overlap",
      "count": 15,
      "success_count": 10,
      "failed_count": 5,
      "manual_count": 2,
      "avg_retry_count": 1.5
    }
  ],
  "dead_letter": {
    "total_count": 3,
    "resolved_count": 0,
    "unresolved_count": 3,
    "by_conflict_type": {...},
    "oldest_failed_at": "2024-05-18T10:00:00Z"
  },
  "task_resume": {
    "total_count": 20,
    "resumed_count": 15,
    "success_rate": 75.0
  },
  "recent_tasks": [...],
  "recent_operations": [...]
}
```

### 16. 数据一致性检查

**GET** `/tasks/:id/consistency`

检查任务数据在列表、详情、历史中的一致性。

**响应：**
```json
{
  "is_consistent": true,
  "discrepancies": [],
  "task_counts": {...},
  "item_counts": {...}
}
```

## 导出 API

### 17. 导出任务数据

**POST** `/tasks/:id/export`

**请求体：**
```json
{
  "export_type": "full",
  "operator_id": "uuid",
  "operator_name": "李四"
}
```

**导出类型 (export_type):**
- `summary`: 仅导出概览
- `details`: 导出明细列表
- `history`: 导出操作历史
- `full`: 导出全部信息

## 死信队列 API

### 18. 查询死信列表

**GET** `/dead-letters?branch_id=&resolved=&page=&page_size=`

### 19. 恢复死信

**POST** `/dead-letters/:id/restore`

将死信恢复到待处理状态重新处理。

## 任务状态流转

```
pending (待处理)
    ↓
queued (已排队)
    ↓
processing (处理中)
    ├→ success (成功) → close (已关闭)
    ├→ partial_failed (部分失败) → manual_takeover (人工接管) → compensated (已补偿) → close
    └→ failed (失败) → retrying (重试中)
                          ↑↓
                    dead_letter (死信)
                        ↓
                    restore (恢复)
```

## 冲突类型

| 冲突类型 | 说明 |
|---------|------|
| `leave_overlap` | 排班与请假重叠 |
| `training_overlap` | 排班与培训重叠 |
| `lunch_rule` | 午休规则冲突 |
| `window_shortage` | 窗口人手不足 |
| `forecast_mismatch` | 与业务量预测不匹配 |
| `scan_missing` | 扫码明细缺失 |

## 操作类型

| 操作类型 | 说明 |
|---------|------|
| `submit` | 提交任务 |
| `queue` | 入队 |
| `process` | 处理 |
| `retry` | 重试 |
| `success` | 成功 |
| `fail` | 失败 |
| `manual_takeover` | 人工接管 |
| `override` | 人工改判 |
| `compensate` | 补偿入账 |
| `close` | 关闭 |
| `freeze` | 冻结 |
| `unfreeze` | 解冻 |
| `withdraw` | 撤回 |
| `resubmit` | 重新提交 |
| `review` | 复核 |
| `export` | 导出 |

## 边界情况覆盖

1. **重复提交**: 通过 `data_strategy` 参数控制（忽略/覆盖/追加）
2. **撤回后再提交**: withdraw → resubmit 状态流转
3. **部分失败**: partial_failed 状态，支持部分成功部分重试
4. **人工改判**: manual_takeover → override → compensated 流程
5. **导出前冻结**: freeze 状态下不允许修改，确保导出数据一致性
6. **异常不吞噬**: 所有错误都会记录到 LastError 和操作历史

## 数据一致性保证

1. **操作历史完整记录**: 每一步操作都记录前后快照和差异
2. **任务与明细计数一致**: 定期校验 task.SuccessCount + task.FailedCount == task.TotalCount
3. **导出文件哈希校验**: 导出时记录SHA256哈希，支持后续校验
4. **状态机严格控制**: 所有状态变更都通过服务层统一接口
