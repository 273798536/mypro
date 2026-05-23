# 社区团购售后权限追责台账 API 文档

## 概述

本 API 用于管理社区团购售后追责台账，支持团长退款表、仓库复核表的导入、匹配、审核和导出功能。

## 认证

所有 API 调用需在请求头中携带用户身份信息：

```
X-User-Id: 用户ID
X-User-Name: 用户名
X-User-Role: 角色 (admin|city_manager|warehouse|leader|auditor|customer_service)
X-City-Code: 城市编码
```

## 角色说明

| 角色 | 说明 | 敏感字段 |
|------|------|----------|
| admin | 管理员 | 全部可见 |
| city_manager | 城市负责人 | 手机号、ID脱敏 |
| warehouse | 仓库 | 手机号、ID脱敏 |
| leader | 团长 | 仅自己的信息可见 |
| auditor | 审计员 | 手机号、ID脱敏 |
| customer_service | 客服 | 用户手机号可见 |

## API 接口

### 1. 批次管理

#### 1.1 创建批次

```
POST /api/batches
Content-Type: application/json

{
  "batchNo": "BJ-20240101-0001",
  "cityCode": "BJ",
  "cityName": "北京",
  "importStrategy": "ignore"
}
```

**importStrategy 选项：**
- `ignore`: 重复数据忽略
- `overwrite`: 重复数据覆盖
- `append`: 重复数据追加（同ignore）

#### 1.2 查询批次列表

```
GET /api/batches?page=1&pageSize=20&cityCode=BJ&status=draft
```

**状态说明：**
- `draft`: 草稿
- `submitted`: 已提交
- `rejected`: 已驳回
- `confirmed`: 已确认（二次确认）
- `audited`: 已审计

#### 1.3 获取批次详情

```
GET /api/batches/{batchId}
```

#### 1.4 提交批次

```
POST /api/batches/{batchId}/submit
{
  "reason": "数据已核对完成"
}
```

#### 1.5 驳回批次

```
POST /api/batches/{batchId}/reject
{
  "reason": "数据不完整，缺少3条复核记录"
}
```

#### 1.6 二次确认批次

```
POST /api/batches/{batchId}/confirm
{
  "reason": "复核通过，金额一致"
}
```

#### 1.7 审计批次

```
POST /api/batches/{batchId}/audit
{
  "reason": "审计通过",
  "remark": "所有单据合规"
}
```

### 2. 数据导入

#### 2.1 导入团长退款表

```
POST /api/batches/{batchId}/import/refunds
Content-Type: application/json

{
  "strategy": "ignore",
  "data": [
    {
      "refundNo": "TK20240101001",
      "orderNo": "DD20240101001",
      "leaderId": "L001",
      "leaderName": "张三",
      "leaderPhone": "13800138001",
      "userId": "U001",
      "userName": "李四",
      "userPhone": "13900139001",
      "refundType": "less_shipped",
      "productSku": "SKU001",
      "productName": "新鲜草莓",
      "quantity": 2,
      "unitPrice": 29.90,
      "refundAmount": 59.80,
      "refundReason": "少发1盒"
    }
  ]
}
```

**refundType 选项：**
- `less_shipped`: 少发
- `defective`: 坏品
- `other`: 其他

#### 2.2 导入仓库复核表

```
POST /api/batches/{batchId}/import/reviews
Content-Type: application/json

{
  "strategy": "ignore",
  "data": [
    {
      "reviewNo": "FH20240101001",
      "orderNo": "DD20240101001",
      "warehouseCode": "WH001",
      "warehouseName": "北京一号仓",
      "reviewerId": "R001",
      "reviewerName": "王仓管",
      "productSku": "SKU001",
      "productName": "新鲜草莓",
      "actualQuantity": 1,
      "shouldQuantity": 2,
      "compensationAmount": 29.90,
      "reviewResult": "less_shipped",
      "reviewRemark": "称重核对，确实少发",
      "reviewedAt": "2024-01-01T10:00:00Z"
    }
  ]
}
```

**reviewResult 选项：**
- `normal`: 正常
- `less_shipped`: 少发
- `defective`: 坏品
- `unprocessable`: 无法处理

### 3. 数据匹配

#### 3.1 执行批次匹配

```
POST /api/batches/{batchId}/match
```

匹配规则：
1. 按订单号 + 商品SKU匹配
2. 金额误差小于0.01视为匹配
3. 匹配结果写入 refund.matchedAmount 和 diffAmount

### 4. 数据查询

#### 4.1 查询退款明细

```
GET /api/batches/{batchId}/refunds?page=1&pageSize=50&status=pending_review&refundType=less_shipped&isMatched=false
```

**退款状态：**
- `normal`: 正常
- `pending_review`: 待复核
- `unprocessable`: 无法处理
- `matched`: 已匹配
- `mismatched`: 不匹配

#### 4.2 查询复核明细

```
GET /api/batches/{batchId}/reviews?page=1&pageSize=50&reviewResult=less_shipped&isMatched=false
```

#### 4.3 更新退款状态

```
PUT /api/batches/refunds/{refundId}/status
{
  "status": "unprocessable",
  "processRemark": "用户无法提供有效凭证，无法核实"
}
```

### 5. 数据导出

#### 5.1 导出数据

```
GET /api/batches/{batchId}/export?type=full&format=csv
```

**导出类型：**
- `refunds`: 仅退款明细
- `reviews`: 仅复核明细
- `full`: 完整数据（含去向说明）
- `summary`: 汇总报表

**格式：**
- `csv`: CSV格式
- `json`: JSON格式

### 6. 备注管理

#### 6.1 添加备注

```
POST /api/batches/{batchId}/remarks
{
  "refundId": "uuid",
  "remarkType": "customer_service",
  "content": "已电话联系用户，用户表示理解",
  "isSensitive": false
}
```

**remarkType 选项：**
- `user`: 用户备注
- `customer_service`: 客服备注
- `system`: 系统备注

#### 6.2 查询备注

```
GET /api/batches/{batchId}/remarks
```

### 7. 异常照片

#### 7.1 上传照片

```
POST /api/batches/{batchId}/photos
Content-Type: multipart/form-data

file: [二进制文件]
refundId: 关联退款ID
description: 坏品照片
photoType: defective
```

#### 7.2 查询照片

```
GET /api/batches/{batchId}/photos
```

### 8. 审计轨迹

#### 8.1 查询审计日志

```
GET /api/audit-trails?page=1&pageSize=50&entityType=batch&batchId={batchId}
```

**entityType 选项：**
- `batch`: 批次
- `leader_refund`: 退款记录
- `warehouse_review`: 复核记录
- `remark`: 备注
- `exception_photo`: 照片
- `async_task`: 异步任务

**action 说明：**
- create: 创建
- update: 更新
- delete: 删除
- submit: 提交
- reject: 驳回
- confirm: 确认
- audit: 审计
- export: 导出
- import: 导入
- match: 匹配
- status_change: 状态变更

### 9. 异步任务

#### 9.1 查询任务列表

```
GET /api/tasks
```

**任务状态：**
- `pending`: 等待执行
- `processing`: 处理中
- `retry_waiting`: 等待重试
- `manual_waiting`: 待人工处理
- `failed`: 永久失败
- `completed`: 已完成

#### 9.2 重试任务

```
POST /api/tasks/{taskId}/retry
```

#### 9.3 转人工处理

```
POST /api/tasks/{taskId}/assign
{
  "assignedTo": "管理员A",
  "resolutionNote": "数据格式异常，需手动修正"
}
```

#### 9.4 解决人工任务

```
POST /api/tasks/{taskId}/resolve
{
  "resolved": true,
  "resolutionNote": "已手动修复数据，任务完成"
}
```

## 失败处理流程

### 异步任务失败分级

1. **等待重试 (retry_waiting)**
   - 触发条件：临时性错误（如数据库连接超时）
   - 处理方式：系统自动重试（最多3次，间隔5分钟递增）
   - 恢复方式：服务重启后自动继续

2. **等待人工 (manual_waiting)**
   - 触发条件：重试3次仍失败
   - 处理方式：通知管理员，分配责任人
   - 恢复方式：人工介入解决后标记完成

3. **永久失败 (failed)**
   - 触发条件：人工确认无法解决
   - 处理方式：记录失败原因，不再重试
   - 恢复方式：需重新创建任务

### 数据修正方式

| 问题类型 | 修正方式 | 报表变化 |
|----------|----------|----------|
| 金额不匹配 | 修改退款单的 matchedAmount | diffAmount 变化，matchedAmount 变化 |
| 缺少复核记录 | 补充导入复核表 | reviewCount 增加，matchedCount 可能增加 |
| 重复导入 | 使用 overwrite 策略重新导入 | 相关字段更新，审计日志记录覆盖操作 |
| 状态错误 | 调用更新状态接口 | 状态统计变化，processRemark 更新 |

## 城市负责人重点关注视图

### 角色视图 (city_manager)

数据自动脱敏：
- 团长电话 → 138****8001
- 用户电话 → 139****9001
- 用户ID、团长ID → 部分脱敏

### 变更原因追踪

每条变更记录包含：
- 操作人（脱敏后）
- 操作时间
- 变更字段
- 原值 → 新值
- 变更原因

### 敏感字段处理

敏感字段变更会：
1. 记录完整审计日志
2. 导出时按角色脱敏
3. 查询时按角色控制可见性
