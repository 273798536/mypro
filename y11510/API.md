# 图书馆馆际借阅异常回执状态机 API

## 概述

本 API 提供图书馆馆际借阅异常回执的全生命周期管理，包括批次创建、附件补传、复核改判、冻结结算、撤回归档等核心功能。

## 认证

所有 API 需要在请求头中携带认证信息：

| 头名称 | 类型 | 说明 |
|--------|------|------|
| `x-user-id` | string | 用户 ID |
| `x-user-name` | string | 用户姓名 |
| `x-user-role` | string | 用户角色：`admin` / `reviewer` / `operator` / `viewer` |

## 角色权限矩阵

| 操作 | ADMIN | REVIEWER | OPERATOR | VIEWER |
|------|-------|----------|----------|--------|
| 批次创建 | ✅ | ❌ | ✅ | ❌ |
| 复核改判 | ✅ | ✅ | ❌ | ❌ |
| 冻结结算 | ✅ | ❌ | ❌ | ❌ |
| 撤回归档 | ✅ | ❌ | ❌ | ❌ |
| 附件上传 | ✅ | ✅ | ✅ | ❌ |
| 查看记录 | ✅ | ✅ | ✅ | ✅ |
| 导出报表 | ✅ | ✅ | ❌ | ❌ |
| 自动检查 | ✅ | ❌ | ❌ | ❌ |

## API 端点

### 健康检查

#### `GET /health`

检查服务健康状态

**响应示例：**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "library-interlibrary-loan-exception"
}
```

---

### 异常回执管理

#### `POST /api/exceptions/batch`

批次创建异常回执

**请求体：**
```json
{
  "batchName": "2024年1月逾期批次",
  "records": [
    {
      "borrowApplication": {
        "id": "app-001",
        "applicationNo": "APP202401001",
        "readerId": "R001",
        "readerName": "张三",
        "bookId": "B001",
        "bookTitle": "计算机网络",
        "sourceLibrary": "图书馆A",
        "targetLibrary": "图书馆B",
        "applyDate": "2024-01-01T00:00:00.000Z",
        "status": "exception"
      },
      "expressOrder": {
        "id": "exp-001",
        "orderNo": "EXP202401001",
        "courierCompany": "顺丰",
        "trackingNo": "SF1234567890",
        "cost": 15,
        "status": "delivered"
      },
      "readerCompensation": {
        "id": "comp-001",
        "recordNo": "COMP202401001",
        "compensationType": "overdue",
        "amount": 50,
        "reason": "逾期30天",
        "status": "pending"
      },
      "exceptionType": "overdue",
      "amount": 50,
      "reason": "逾期30天未归还"
    }
  ]
}
```

**异常类型：**
- `overdue` - 逾期
- `damaged` - 污损
- `lost` - 丢失
- `renew_overlap` - 续借叠加
- `other` - 其他

**响应示例：**
```json
{
  "success": true,
  "data": {
    "batchId": "batch-uuid",
    "batchNo": "BATCH202401011234",
    "totalCount": 1,
    "successCount": 1,
    "failedCount": 0,
    "failedRecords": [],
    "receiptIds": ["receipt-uuid"]
  }
}
```

---

#### `GET /api/exceptions/receipts`

查询异常回执列表

**查询参数：**
- `status` - 状态过滤
- `exceptionType` - 异常类型过滤
- `readerId` - 读者 ID 过滤
- `startDate` - 开始日期
- `endDate` - 结束日期
- `limit` - 分页数量（默认 100）
- `offset` - 分页偏移（默认 0）

**状态列表：**
- `pending_review` - 待审核
- `approved` - 已通过
- `rejected` - 已拒绝
- `frozen` - 已冻结
- `settled` - 已结算
- `archived` - 已归档
- `cancelled` - 已撤销

**响应示例：**
```json
{
  "success": true,
  "data": [
    {
      "id": "receipt-uuid",
      "receiptNo": "ER202401011234",
      "status": "pending_review",
      "exceptionType": "overdue",
      "readerName": "张三",
      "bookTitle": "计算机网络",
      "amount": 50,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 1
}
```

---

#### `GET /api/exceptions/receipts/:id`

获取单个异常回执详情

**响应示例：**
```json
{
  "success": true,
  "data": {
    "id": "receipt-uuid",
    "receiptNo": "ER202401011234",
    "batchId": "batch-uuid",
    "exceptionType": "overdue",
    "status": "pending_review",
    "borrowApplicationId": "app-001",
    "readerId": "R001",
    "readerName": "张三",
    "bookTitle": "计算机网络",
    "amount": 50,
    "reason": "逾期30天未归还",
    "manualReason": null,
    "reviewComment": null,
    "statusBeforeFreeze": null,
    "frozenReason": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "createdBy": "user001"
  }
}
```

---

#### `GET /api/exceptions/receipts/:id/detail`

获取异常回执完整详情（含关联数据和历史）

**响应示例：**
```json
{
  "success": true,
  "data": {
    "receipt": { ... },
    "borrowApplication": { ... },
    "expressOrder": { ... },
    "readerCompensation": { ... },
    "attachments": [ ... ],
    "history": [
      {
        "actionType": "batch_create",
        "operatorName": "管理员",
        "changes": { ... },
        "reason": "Create exception receipt",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

---

#### `POST /api/exceptions/receipts/:id/review`

复核改判

**需要角色：** `admin` 或 `reviewer`

**请求体：**
```json
{
  "approved": true,
  "reviewComment": "情况属实，予以通过"
}
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "id": "receipt-uuid",
    "status": "approved",
    "reviewComment": "情况属实，予以通过",
    "reviewedBy": "reviewer001",
    "reviewedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### `POST /api/exceptions/receipts/:id/freeze`

冻结结算

**需要角色：** `admin`

**请求体：**
```json
{
  "frozenReason": "存在争议，需要进一步核实"
}
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "id": "receipt-uuid",
    "status": "frozen",
    "statusBeforeFreeze": "approved",
    "frozenReason": "存在争议，需要进一步核实",
    "frozenBy": "admin001",
    "frozenAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### `POST /api/exceptions/receipts/:id/unfreeze`

解冻

**需要角色：** `admin`

**请求体：**
```json
{
  "targetStatus": "approved",
  "reason": "争议已解决，恢复状态"
}
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "id": "receipt-uuid",
    "status": "approved",
    "previousStatus": "frozen"
  }
}
```

---

#### `POST /api/exceptions/receipts/:id/cancel`

撤回归档

**需要角色：** `admin`

**请求体：**
```json
{
  "reason": "经核实为系统误报",
  "archive": false
}
```

**参数说明：**
- `archive: true` - 归档（状态变为 `archived`）
- `archive: false` - 撤销（状态变为 `cancelled`）

**响应示例：**
```json
{
  "success": true,
  "data": {
    "id": "receipt-uuid",
    "status": "cancelled"
  }
}
```

---

#### `PATCH /api/exceptions/receipts/:id/manual-reason`

更新人工说明

**需要角色：** `admin` 或 `reviewer`

**请求体：**
```json
{
  "manualReason": "经与读者沟通，确认逾期原因是出差在外，情况特殊"
}
```

---

#### `GET /api/exceptions/receipts/:id/history`

获取变更历史

**响应示例：**
```json
{
  "success": true,
  "data": [
    {
      "actionType": "review_decision",
      "operatorName": "审核员",
      "changes": {
        "status": {
          "old": "pending_review",
          "new": "approved"
        },
        "reviewComment": {
          "old": null,
          "new": "情况属实，予以通过"
        }
      },
      "reason": "情况属实，予以通过",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

#### `POST /api/exceptions/receipts/:id/attachments`

上传附件

**需要角色：** `admin`、`reviewer` 或 `operator`

**请求：** `multipart/form-data`
- `file` - 附件文件

---

#### `GET /api/exceptions/receipts/:id/attachments`

获取附件列表

---

#### `GET /api/exceptions/batches/:id`

获取批次信息

---

#### `GET /api/exceptions/batches/:id/receipts`

获取批次下的所有回执

---

### 报表与统计

#### `GET /api/reports/summary`

获取汇总报表

**响应示例：**
```json
{
  "success": true,
  "data": {
    "totalReceipts": 100,
    "byStatus": {
      "pending_review": 30,
      "approved": 50,
      "rejected": 10,
      "frozen": 5,
      "cancelled": 5
    },
    "byType": {
      "overdue": 60,
      "damaged": 25,
      "lost": 10,
      "renew_overlap": 5
    },
    "totalAmount": 15000,
    "frozenCount": 5,
    "frozenAmount": 2500,
    "pendingReviewCount": 30,
    "pendingReviewAmount": 4500,
    "approvedCount": 50,
    "approvedAmount": 7500
  }
}
```

---

#### `GET /api/reports/export/csv`

导出 CSV 报表

**需要角色：** `admin` 或 `reviewer`

**查询参数：**
- `status` - 状态过滤
- `exceptionType` - 异常类型过滤
- `startDate` - 开始日期
- `endDate` - 结束日期

**响应：** CSV 文件下载

---

#### `GET /api/reports/consistency/:receiptId`

检查数据一致性

---

#### `POST /api/reports/auto-check`

运行自动化检查

**需要角色：** `admin`

**检查项：**
1. 重复导入检测
2. 权限一致性检查
3. 异常保留提醒（超30天待审核、超60天冻结）
4. 导出数据一致性
5. 审计日志完整性

**响应示例：**
```json
{
  "success": true,
  "data": [
    {
      "checkType": "duplicate_imports",
      "passed": true,
      "issuesFound": 0,
      "details": { "issues": [] }
    },
    {
      "checkType": "permission_consistency",
      "passed": true,
      "issuesFound": 0,
      "details": { "issues": [] }
    },
    {
      "checkType": "exception_retention",
      "passed": false,
      "issuesFound": 3,
      "details": {
        "issues": [
          {
            "type": "long_pending_reviews",
            "count": 2,
            "description": "Receipts pending review for more than 30 days"
          },
          {
            "type": "long_frozen",
            "count": 1,
            "description": "Receipts frozen for more than 60 days"
          }
        ]
      }
    },
    {
      "checkType": "export_consistency",
      "passed": true,
      "issuesFound": 0,
      "details": {
        "totals": {
          "receiptCount": 100,
          "totalAmount": 15000
        }
      }
    },
    {
      "checkType": "audit_log_integrity",
      "passed": true,
      "issuesFound": 0,
      "details": { "issues": [], "checkedReceipts": 100 }
    }
  ]
}
```

---

#### `GET /api/reports/auto-check/results`

获取最新自动检查结果

---

## 状态流转图

```
pending_review
    |
    ├──> approved ──> settled
    │       │
    │       └──────> frozen ──> [解冻后可恢复到 pending_review/approved/rejected]
    │
    ├──> rejected
    │       │
    │       └──────> frozen
    │
    ├──> frozen
    │
    ├──> archived
    │
    └──> cancelled

frozen ──> [解冻] ──> pending_review / approved / rejected / cancelled
```

## 核心设计原则

1. **异常保留**：所有异常记录独立保存，逾期、污损、续借叠加等分别记录，不合并计算
2. **审计追踪**：每一步操作都记录前后状态差异，可追溯完整变更历史
3. **数据一致性**：详情接口、导出文件、历史查询使用同一数据源
4. **失败可见**：坏数据不进入汇总，但在失败列表中保留完整错误原因
5. **权限控制**：基于角色的访问控制，关键操作需要管理员权限
6. **自动化检查**：定期检查重复导入、权限一致性、异常保留、导出一致性
