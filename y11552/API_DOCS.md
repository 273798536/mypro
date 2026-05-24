# 智能柜补货重试补偿队列 API 文档

## 概述

智能柜补货重试补偿队列服务 API 用于处理智能柜补货异常情况下的补偿流程，确保柜机库存、补货照片、退款记录和外部回执的一致性。

## 基础信息

- **基础URL**: `http://localhost:3000/api/v1`
- **认证方式**: 请求头携带 `x-user-id` 和 `x-user-name`
- **管理员认证**: 额外携带 `x-api-key: admin-key-2024`

## 核心功能

1. **幂等性保证**: 同一批数据重复提交只会更新同一条记录
2. **自动重试**: 根据重试分类自动进行限次重试
3. **人工接管**: 支持人工审核、改判、补偿
4. **历史追踪**: 完整记录每次操作的时间、人员、变更内容
5. **导出冻结**: 导出前自动冻结记录，确保数据一致性

## API 端点

### 1. 提交补偿事实

**POST** `/facts`

提交柜机库存、补货照片、退款记录等数据。

**请求头**:
```
x-user-id: {用户ID}
x-user-name: {用户姓名}
Content-Type: application/json
```

**请求体**:
```json
{
  "idempotencyKey": "唯一幂等键（如批次+柜机+时间）",
  "batchId": "批次ID",
  "city": "城市",
  "cabinetInventory": {
    "cabinetId": "柜机ID",
    "slotId": "格口ID",
    "productId": "商品ID",
    "expectedQuantity": 10,
    "actualQuantity": 8
  },
  "replenishPhotos": [
    {
      "photoId": "照片ID",
      "url": "照片URL",
      "uploadTime": "2026-05-24T12:00:00Z",
      "uploader": "上传人",
      "verificationStatus": "verified"
    }
  ],
  "refundRecords": [
    {
      "refundId": "退款ID",
      "orderId": "订单ID",
      "userId": "用户ID",
      "amount": 25.5,
      "refundTime": "2026-05-24T12:00:00Z",
      "reason": "退款原因"
    }
  ],
  "externalReceipts": [],
  "remarks": "备注"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "fact": {...},
    "isNew": true,
    "message": "记录创建成功"
  },
  "timestamp": "..."
}
```

### 2. 查询事实列表

**GET** `/facts`

**查询参数**:
- `city`: 城市筛选
- `status`: 状态筛选（多值用逗号分隔）
- `batchId`: 批次ID筛选
- `startDate`: 开始日期
- `endDate`: 结束日期

### 3. 查询单个事实详情

**GET** `/facts/:id`

### 4. 查询事实历史记录

**GET** `/facts/:id/history`

返回该记录的所有操作历史，包括：
- 操作时间
- 操作人
- 操作类型
- 变更摘要
- 变更前后的值

### 5. 人工处理决策

**POST** `/facts/:id/decision`

**请求体**:
```json
{
  "decision": "approve|reject|retry|compensate",
  "reason": "处理原因",
  "newCategory": "可选：新的重试分类"
}
```

### 6. 关闭记录

**POST** `/facts/:id/close`

**请求体**:
```json
{
  "reason": "关闭原因"
}
```

### 7. 补偿入账

**POST** `/facts/:id/compensate`

### 8. 添加外部回执

**POST** `/facts/:id/receipt`

**请求体**:
```json
{
  "receiptId": "回执ID",
  "externalSystem": "外部系统名称",
  "transactionId": "交易ID",
  "status": "pending|success|failed",
  "submittedAt": "提交时间"
}
```

### 9. 冻结/解冻记录

**POST** `/facts/:id/freeze`
**POST** `/facts/:id/unfreeze`

### 10. 导出数据

**POST** `/export`

**请求体**:
```json
{
  "city": "可选：城市",
  "startDate": "可选：开始日期",
  "endDate": "可选：结束日期",
  "status": ["可选：状态数组"],
  "batchId": "可选：批次ID"
}
```

**注意**: 导出的记录会自动冻结，防止导出期间被修改。

### 11. 运营仪表板

**GET** `/facts/dashboard`

返回运营关键指标：
- 各状态统计（待处理、重试中、已验证、人工审核、已补偿、死信、已关闭）
- 重试队列按分类统计
- 死信队列列表
- 待重试队列预览

### 12. 死信恢复

**POST** `/facts/:id/retry-dead-letter`

将死信记录重新加入重试队列。

### 13. 触发立即重试

**POST** `/trigger-retry`

立即执行一次重试处理。

## 状态说明

| 状态 | 说明 |
|------|------|
| pending | 待处理 |
| processing | 处理中 |
| verified | 已验证 |
| retrying | 重试中 |
| manual_review | 待人工审核 |
| compensated | 已补偿 |
| dead_letter | 死信（重试超限） |
| closed | 已关闭 |
| frozen | 已冻结（导出中） |
| withdrawn | 已撤回 |

## 重试分类

| 分类 | 说明 | 可自动重试 |
|------|------|------------|
| network_issue | 网络问题 | 是 |
| invalid_data | 无效数据 | 否（需人工修正） |
| missing_attachment | 缺少附件 | 是（补充后） |
| external_api_down | 外部系统不可用 | 是 |
| data_conflict | 数据冲突 | 否（需人工核对） |
| unknown_error | 未知错误 | 否 |

## 使用示例

### 提交缺附件记录
```bash
curl -X POST http://localhost:3000/api/v1/facts \
  -H "x-user-id: oper001" \
  -H "x-user-name: 李操作员" \
  -H "Content-Type: application/json" \
  -d '{
    "idempotencyKey": "SH-CAB001-20260524",
    "batchId": "BATCH-20260524",
    "city": "上海市",
    "cabinetInventory": {
      "cabinetId": "CAB-SH-001",
      "slotId": "SLOT-A1",
      "productId": "PROD-001",
      "expectedQuantity": 10,
      "actualQuantity": 10
    },
    "replenishPhotos": [],
    "refundRecords": [],
    "createdBy": "李操作员"
  }'
```

### 查看历史记录
```bash
curl -H "x-user-id: oper001" -H "x-user-name: 李操作员" \
  http://localhost:3000/api/v1/facts/{factId}/history
```

## 边界场景说明

1. **重复提交**: 使用相同的 `idempotencyKey` 提交会返回已有记录，不会创建新记录
2. **撤回后重提**: 使用新的幂等键提交，系统视为新记录
3. **部分失败**: 部分数据验证失败会进入重试队列
4. **人工改判**: 人工操作会完整记录在历史中
5. **导出冻结**: 导出期间记录无法修改，导出后可解冻

## 自动化检查

运行自动化检查脚本验证系统功能：
```bash
npm run test:checks
```

检查项目：
1. 重复导入幂等性
2. 历史记录追踪
3. 异常保留机制
4. 导出一致性
5. 冻结解冻功能
6. 运营仪表板完整性
7. 人工改判流程
8. 重试分类检测
