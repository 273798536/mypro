# 财务报销稽核重试补偿队列 API - 使用指南

## 概述

本系统是一个完整的财务报销稽核重试补偿队列服务，专门处理"先用后补"场景下的发票PDF、差旅申请、付款流水和临时补录单的稽核工作。系统重点解决多人共用行程时住宿和交通经常重复报销引出的重复和冲突问题。

---

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动服务

```bash
npm run dev
```

服务将在 `http://localhost:3000` 启动

### 3. 测试健康检查

```bash
curl http://localhost:3000/health
```

---

## 系统架构

### 核心流程

**快速通道（已核验材料）：**
```
提交 → 排队 → 复核 → 补偿入账 → 关闭
```

**标准稽核流程（需系统稽核）：**
```
提交 → 排队 → 处理(稽核) → 复核 → 补偿入账 → 关闭
           ↓
         限次重试 → 人工干预 → 手动重试
                          ↓
                     死信队列(累计重试≥5次)
```

### 状态流转图

```
SUBMITTED (提交)
    ↓
QUEUED (排队) ←───────────────┐
    ↓                         │
PROCESSING (处理中)            │
    ↓                         │
RETRYING (重试中) → 失败 → 继续重试
    ↓  超过重试次数            │
MANUAL_INTERVENTION (人工干预)  │
    ↓                         │
PENDING_REVIEW (待复核)        │
    ↓                         │
COMPENSATED (补偿入账)         │
    ↓                         │
CLOSED (关闭)                  │
                               │
FAILED (失败) → 可手动重回队列 ─┘
    ↓
DEAD_LETTER (死信) → 解决后重回队列
```

---

## 测试用户账号

系统预置了4个测试用户，代表不同权限级别。**所有用户默认密码均为 `test123`**：

| 用户名 | 姓名 | 角色 | 权限说明 |
|--------|------|------|----------|
| entry_clerk | 张三 | 录入员 (data_entry) | 创建报销单、查看、上传材料 |
| reviewer_wang | 王丽 | 复核员 (reviewer) | 审核、重试、请求人工干预 |
| supervisor_li | 李总监 | 主管 (supervisor) | 补偿入账、关闭、处理死信、看报表 |
| viewer_zhao | 赵查看 | 只读 (read_only) | 仅查看基本信息 |

> **安全说明**：
> - 密码使用 bcrypt 加盐哈希存储（10轮）
> - 登录时严格校验密码，错误密码返回401
> - 不存在的用户和密码错误返回相同提示，防止用户名枚举
> - 所有API接口（除登录和角色查询）都需要有效的JWT Token

---

## API 接口详解

### 1. 认证接口

#### 登录

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "entry_clerk",
    "password": "any_password"
  }'
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "username": "entry_clerk",
      "name": "张三",
      "role": "data_entry",
      "department": "财务部"
    }
  }
}
```

> **注意**：后续所有接口都需要在 Header 中携带 `Authorization: Bearer <token>`

---

### 2. 报销单管理

#### 2.1 创建报销单 (录入员/复核员/主管)

**样例材料：多人共用行程的差旅报销**

```bash
curl -X POST http://localhost:3000/api/reimbursements \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "applicationNo": "BX-2024-0524-001",
    "applicantId": "EMP001",
    "applicantName": "张三",
    "department": "技术部",
    "travelApplicationId": "CL-2024-0520-008",
    "totalAmount": 3250.00,
    "currency": "CNY",
    "items": [
      {
        "type": "transportation",
        "amount": 1200.00,
        "date": "2024-05-20",
        "description": "北京→上海 高铁 G101",
        "receiptNumber": "INV-2024-001234",
        "relatedTravelId": "CL-2024-0520-008"
      },
      {
        "type": "accommodation",
        "amount": 1800.00,
        "date": "2024-05-20",
        "description": "上海希尔顿酒店 标准间",
        "receiptNumber": "HOTEL-2024-56789",
        "relatedTravelId": "CL-2024-0520-008"
      },
      {
        "type": "meal",
        "amount": 250.00,
        "date": "2024-05-20",
        "description": "出差餐补"
      }
    ]
  }'
```

**成功响应：**
```json
{
  "success": true,
  "data": {
    "id": "reimbursement-uuid",
    "applicationNo": "BX-2024-0524-001",
    "status": "submitted",
    "totalAmount": 3250,
    ...
  }
}
```

#### 2.2 上传材料 (录入员/复核员/主管)

**材料来源类型：**
- `invoice_pdf` - 发票PDF
- `travel_application` - 差旅申请
- `payment_record` - 付款流水
- `supplementary_form` - 临时补录单
- `shift_record` - 班次记录

```bash
curl -X POST http://localhost:3000/api/reimbursements/{id}/materials \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "source": "invoice_pdf",
    "sourceId": "PDF-2024-0524-001",
    "fileName": "北京上海高铁发票.pdf",
    "fileUrl": "/uploads/invoices/PDF-2024-0524-001.pdf",
    "parsedData": {
      "invoiceNumber": "INV-2024-001234",
      "amount": 1200.00,
      "date": "2024-05-20",
      "departure": "北京",
      "arrival": "上海",
      "passenger": "张三"
    }
  }'
```

#### 2.3 上传班次记录 (用于冲突检测)

```bash
curl -X POST http://localhost:3000/api/reimbursements/{id}/materials \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "source": "shift_record",
    "sourceId": "SHIFT-2024-0524-001",
    "parsedData": {
      "employeeId": "EMP001",
      "date": "2024-05-20",
      "shiftType": "business_trip",
      "location": "上海",
      "startTime": "09:00",
      "endTime": "18:00"
    }
  }'
```

#### 2.4 查询报销单列表

```bash
curl "http://localhost:3000/api/reimbursements?status=submitted&page=1&pageSize=20" \
  -H "Authorization: Bearer <token>"
```

#### 2.5 查询报销单详情

```bash
curl http://localhost:3000/api/reimbursements/{id} \
  -H "Authorization: Bearer <token>"
```

---

### 3. 报销单状态操作

#### 3.1 排入处理队列 (复核员/主管)

```bash
curl -X POST http://localhost:3000/api/reimbursements/{id}/queue \
  -H "Authorization: Bearer <token>"
```

#### 3.2 开始稽核处理 (复核员/主管)

**路径：排队 → 处理 → 复核**

```bash
curl -X POST http://localhost:3000/api/reimbursements/{id}/process \
  -H "Authorization: Bearer <token>"
```

#### 3.3 材料验证 (复核员/主管)

```bash
curl -X POST http://localhost:3000/api/reimbursements/{id}/materials/{materialId}/verify \
  -H "Authorization: Bearer <token>"
```

**使用场景：** 当报销单因 `missing_document` 进入重试队列时，先上传缺少的材料，调用此接口验证材料，然后触发重试即可恢复正常流程。

#### 3.4 查询材料详情

```bash
curl http://localhost:3000/api/reimbursements/{id}/materials/{materialId} \
  -H "Authorization: Bearer <token>"
```

#### 3.5 死信可解性验证 (主管)

**在解决死信之前，必须先验证数据已修正**

```bash
# 检查死信对应的报销单是否已修正所有问题
curl http://localhost:3000/api/dead-letters/{id}/validate \
  -H "Authorization: Bearer <token>"
```

**验证检查项：**
- ✅ 发票PDF已验证
- ✅ 差旅申请单已验证（如果有）
- ✅ 所有重复报销项已处理
- ✅ 明细金额合计与申报总额匹配

#### 3.6 解决死信 (主管)

```bash
curl -X POST http://localhost:3000/api/dead-letters/{id}/resolve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "resolution": "已补充发票并验证，重复项已移除",
    "confirmDataCorrected": true
  }'
```

> **重要**：必须设置 `confirmDataCorrected: true` 并通过数据验证才能解决死信。解决后报销单状态变为 `queued` 并重新计入汇总。

#### 3.7 关闭死信 (主管)

**当死信无需继续处理时，直接关闭**

```bash
curl -X POST http://localhost:3000/api/dead-letters/{id}/close \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "reason": "报销单已取消，无需继续处理"
  }'
```

> 关闭后报销单状态变为 `closed` 且不计入汇总。

#### 3.8 手动持久化数据 (主管)

```bash
curl -X POST http://localhost:3000/api/admin/save \
  -H "Authorization: Bearer <token>"
```

> **持久化说明**：系统每30秒自动保存一次数据到 `data/store.json`，服务关闭时也会自动保存。重启服务时会自动加载数据。

#### 3.6 提交复核 (复核员/主管)

```bash
curl -X POST http://localhost:3000/api/reimbursements/{id}/review \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "reason": "材料齐全，金额核对无误"
  }'
```

#### 3.3 请求人工干预 (复核员/主管)

**场景：** 系统检测到重复报销，需要人工判断

```bash
curl -X POST http://localhost:3000/api/reimbursements/{id}/manual \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "reason": "检测到与报销单 BX-2024-0524-002 存在住宿日期重叠，需人工确认是否为多人共用行程"
  }'
```

#### 3.4 补偿入账 (主管)

```bash
curl -X POST http://localhost:3000/api/reimbursements/{id}/compensate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "remarks": "已完成重复项剔除，实际补偿金额 2800 元"
  }'
```

#### 3.5 关闭报销单 (主管)

```bash
curl -X POST http://localhost:3000/api/reimbursements/{id}/close \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "reason": "报销流程完成"
  }'
```

---

### 4. 重复报销检测与处理

#### 4.1 检测重复报销

```bash
curl -X POST http://localhost:3000/api/reimbursements/{id}/detect-duplicates \
  -H "Authorization: Bearer <token>"
```

**响应示例（发现重复）：**
```json
{
  "success": true,
  "data": {
    "marked": 2,
    "details": [
      {
        "itemId": "item-uuid-1",
        "duplicateOf": "item-uuid-other",
        "duplicateReimbursementId": "reimbursement-uuid-other",
        "confidence": 85,
        "reason": "日期相同; 金额相同; 住宿日期重叠"
      }
    ]
  }
}
```

#### 4.2 解决重复项

**方案A：移除重复项（保留原始）**

```bash
curl -X POST http://localhost:3000/api/reimbursements/{id}/items/{itemId}/resolve-duplicate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "keepOriginal": true
  }'
```

**方案B：标记为非重复（确认为不同消费）**

```bash
curl -X POST http://localhost:3000/api/reimbursements/{id}/items/{itemId}/resolve-duplicate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "keepOriginal": false
  }'
```

---

### 5. 重试队列管理

#### 5.1 手动加入重试队列

**重试分类：**
- `duplicate_detection` - 重复检测
- `mismatch_amount` - 金额不匹配
- `missing_document` - 缺少文件
- `invalid_data` - 数据无效
- `system_error` - 系统错误
- `conflict_resolution` - 冲突解决

```bash
curl -X POST http://localhost:3000/api/reimbursements/{id}/retry \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "category": "duplicate_detection"
  }'
```

> **重试策略**：指数退避算法，第1次30分钟后，第2次60分钟，第3次120分钟，超过3次转入人工干预，超过5次进入死信队列

---

### 6. 报表与查询

#### 6.1 获取汇总报表

```bash
curl "http://localhost:3000/api/reports/summary?startDate=2024-05-01&endDate=2024-05-31" \
  -H "Authorization: Bearer <token>"
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "totalCount": 156,
    "totalAmount": 456800.50,
    "byStatus": {
      "submitted": { "count": 12, "amount": 35000 },
      "queued": { "count": 8, "amount": 22000 },
      "processing": { "count": 5, "amount": 15000 },
      "pending_review": { "count": 15, "amount": 45000 },
      "compensated": { "count": 100, "amount": 320000 },
      "closed": { "count": 10, "amount": 15000 },
      "dead_letter": { "count": 6, "amount": 4800.50 }
    },
    "byRetryCategory": {
      "duplicate_detection": { "count": 25, "amount": 75000 },
      "mismatch_amount": { "count": 8, "amount": 24000 }
    },
    "deadLetterCount": 6,
    "retryableCount": 15
  }
}
```

#### 6.2 经理看板 (主管专属)

```bash
curl http://localhost:3000/api/reports/dashboard \
  -H "Authorization: Bearer <token>"
```

#### 6.3 失败记录列表

```bash
curl "http://localhost:3000/api/reports/failed?department=技术部" \
  -H "Authorization: Bearer <token>"
```

#### 6.4 可重试记录

```bash
curl http://localhost:3000/api/reports/retryable \
  -H "Authorization: Bearer <token>"
```

#### 6.5 审计追踪（状态变更历史）

```bash
curl http://localhost:3000/api/reports/audit-trail/{reimbursementId} \
  -H "Authorization: Bearer <token>"
```

**响应示例：**
```json
{
  "success": true,
  "data": [
    {
      "timestamp": "2024-05-24T10:30:00.000Z",
      "fromStatus": "submitted",
      "toStatus": "queued",
      "operatorName": "王丽",
      "reason": "进入处理队列"
    },
    {
      "timestamp": "2024-05-24T10:00:00.000Z",
      "fromStatus": null,
      "toStatus": "submitted",
      "operatorName": "张三",
      "reason": "创建并提交报销单"
    }
  ]
}
```

#### 6.6 导出CSV报表 (主管专属)

```bash
curl http://localhost:3000/api/reports/export \
  -H "Authorization: Bearer <token>"
```

---

### 7. 死信队列管理

#### 7.1 获取死信列表

```bash
curl "http://localhost:3000/api/dead-letters?resolved=false" \
  -H "Authorization: Bearer <token>"
```

#### 7.2 解决死信 (主管专属)

```bash
curl -X POST http://localhost:3000/api/dead-letters/{id}/resolve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "resolution": "已核实为两人同住一间酒店，各自报销一半，调整金额后重新进入队列"
  }'
```

**修正后的影响：**
1. 死信标记为已解决
2. 关联报销单状态从 `dead_letter` 变为 `queued`
3. 报销单重新计入汇总统计
4. 审计日志记录修正前后的状态变化

#### 7.3 关闭死信 (主管专属)

```bash
curl -X POST http://localhost:3000/api/dead-letters/{id}/close \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "reason": "经核实为重复提交，无需处理"
  }'
```

#### 7.4 死信统计

```bash
curl http://localhost:3000/api/dead-letters/statistics/summary \
  -H "Authorization: Bearer <token>"
```

---

## 典型失败路径与修正方式

### 场景1：多人共用行程导致重复住宿报销

**失败路径：**
1. 员工A提交报销单，包含5月20日上海希尔顿酒店住宿 1800元
2. 员工B提交报销单，同样包含5月20日上海希尔顿酒店住宿 1800元
3. 系统检测到重复（日期相同+酒店相同），标记为 `duplicate_detection`
4. 自动重试3次失败 → 转入人工干预
5. 人工仍未处理 → 超过5次重试阈值 → 进入死信队列

**修正方式：**
1. 主管查看死信详情，确认是两人同住一间，每人报销一半
2. 分别修改两张报销单的住宿金额为 900元
3. 调用解决死信接口，提供解决方案说明
4. 系统自动将两张单据重新排入处理队列

**报表变化：**
- 死信计数 -2
- 待处理计数 +2
- 汇总金额减少 1800元（重复部分被剔除）

---

### 场景2：发票金额与申报金额不匹配

**失败路径：**
1. 员工提交报销，申报交通费用 1200元
2. 上传发票PDF解析后实际金额为 1150元
3. 系统检测到金额不匹配，进入重试队列
4. 等待员工补传正确发票

**修正方式：**
1. 员工上传正确发票（金额1200元）
2. 复核员触发重试
3. 系统验证通过，进入复核流程

---

### 场景3：缺少班次记录导致行程冲突无法验证

**失败路径：**
1. 员工提交出差报销
2. 系统要求验证班次记录，但未上传
3. 进入 `missing_document` 重试分类

**修正方式：**
1. 录入员补上班次记录（调用材料上传接口）
2. 复核员调用材料验证接口，标记材料为已验证
3. 触发重试，系统检测到材料已验证
4. 验证行程与班次一致，通过稽核

**完整命令示例：**

```bash
# 1. 上传缺少的班次记录
curl -X POST http://localhost:3000/api/reimbursements/{id}/materials \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "source": "shift_record",
    "sourceId": "SHIFT-2024-0524-001",
    "parsedData": {
      "employeeId": "EMP001",
      "date": "2024-05-20",
      "shiftType": "business_trip",
      "location": "上海"
    }
  }'

# 2. 验证材料
curl -X POST http://localhost:3000/api/reimbursements/{id}/materials/{materialId}/verify \
  -H "Authorization: Bearer <token>"

# 3. 触发重试
curl -X POST http://localhost:3000/api/reimbursements/{id}/retry \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "category": "missing_document"
  }'
```

---

### 场景4：死信处理 - 解决vs关闭

**死信的两种处理方式：**

| 操作 | 状态变化 | isInSummary | 使用场景 |
|------|----------|-------------|----------|
| 解决死信 | dead_letter → queued | true | 已修正失败数据，需要重新处理 |
| 关闭死信 | dead_letter → closed | false | 无需继续处理，如报销单已取消 |

**解决死信的完整流程：**

```bash
# 1. 检查死信数据是否已修正
curl http://localhost:3000/api/dead-letters/{deadLetterId}/validate \
  -H "Authorization: Bearer <supervisor_token>"

# 2. 如果验证不通过，先修正数据
#    - 上传缺少的材料
#    - 验证材料（调用 /verify 接口）
#    - 处理重复报销项
#    - 核对金额一致性

# 3. 修正完成后，再次验证通过，然后解决死信
curl -X POST http://localhost:3000/api/dead-letters/{deadLetterId}/resolve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <supervisor_token>" \
  -d '{
    "resolution": "已补充发票并验证，重复项已移除，金额已核对",
    "confirmDataCorrected": true
  }'
```

**关闭死信的流程：**

```bash
curl -X POST http://localhost:3000/api/dead-letters/{deadLetterId}/close \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <supervisor_token>" \
  -d '{
    "reason": "报销单已取消，员工放弃报销"
  }'
```

---

### 场景5：数据持久化与重启恢复

**重启恢复流程：**
1. 服务正常运行时，每30秒自动保存数据到 `data/store.json`
2. 服务关闭（SIGTERM/SIGINT）时自动调用 `gracefulShutdown()` 保存数据
3. 服务重启时，构造函数自动调用 `load()` 从磁盘加载数据
4. 如果加载失败，使用初始化的测试用户数据继续运行

**验证持久化：**

```bash
# 手动触发保存
curl -X POST http://localhost:3000/api/admin/save \
  -H "Authorization: Bearer <supervisor_token>"

# 检查数据文件
ls -la data/store.json
```

---

## 权限矩阵

| 操作 | 录入员 | 复核员 | 主管 | 只读 |
|------|--------|--------|------|------|
| 创建报销单 | ✅ | ✅ | ✅ | ❌ |
| 查看报销单 | ✅ | ✅ | ✅ | ✅ |
| 上传材料 | ✅ | ✅ | ✅ | ❌ |
| 验证材料 | ❌ | ✅ | ✅ | ❌ |
| 排入队列 | ❌ | ✅ | ✅ | ❌ |
| 开始处理 | ❌ | ✅ | ✅ | ❌ |
| 提交复核 | ❌ | ✅ | ✅ | ❌ |
| 请求人工干预 | ❌ | ✅ | ✅ | ❌ |
| 手动重试 | ❌ | ✅ | ✅ | ❌ |
| 补偿入账 | ❌ | ❌ | ✅ | ❌ |
| 关闭单据 | ❌ | ❌ | ✅ | ❌ |
| 解决死信 | ❌ | ❌ | ✅ | ❌ |
| 查看汇总报表 | ❌ | ✅ | ✅ | ✅ |
| 经理看板 | ❌ | ❌ | ✅ | ❌ |
| 导出报表 | ❌ | ❌ | ✅ | ❌ |
| 手动持久化 | ❌ | ❌ | ✅ | ❌ |

### 字段可见性控制

| 字段 | 录入员 | 复核员 | 主管 | 只读 |
|------|--------|--------|------|------|
| id | ✅ | ✅ | ✅ | ✅ |
| applicationNo | ✅ | ✅ | ✅ | ✅ |
| applicantName | ✅ | ✅ | ✅ | ✅ |
| department | ✅ | ✅ | ✅ | ✅ |
| totalAmount | ✅ | ✅ | ✅ | ✅ |
| status | ✅ | ✅ | ✅ | ✅ |
| items (明细) | ✅ | ✅ | ✅ | ❌ |
| materials (材料) | ✅ | ✅ | ✅ | ❌ |
| statusLogs (日志) | ✅ | ✅ | ✅ | ❌ |
| failureReason | ✅ | ✅ | ✅ | ❌ |
| reviewedBy (复核人) | ❌ | ✅ | ✅ | ❌ |
| compensatedAt (补偿时间) | ❌ | ❌ | ✅ | ❌ |
| isInSummary (计入汇总) | ❌ | ✅ | ✅ | ✅ |

---

## 坏数据处理原则

1. **不进入汇总**：所有失败状态（failed、dead_letter、manual_intervention）的单据不计入汇总金额
2. **失败列表可见**：所有失败记录在 `/api/reports/failed` 中可查，包含详细失败原因
3. **审计追踪完整**：每条记录的状态变更都有完整日志，包含时间、操作人、原因
4. **可追溯**：报表中的每个数字都能追到具体的报销单记录

---

## 项目结构

```
src/
├── types/              # 类型定义
│   └── index.ts
├── database/           # 数据存储
│   └── store.ts
├── middleware/         # 中间件
│   └── auth.ts
├── services/           # 业务服务
│   ├── retryQueue.service.ts
│   ├── stateMachine.service.ts
│   ├── duplicateDetection.service.ts
│   └── report.service.ts
├── routes/             # API路由
│   ├── auth.routes.ts
│   ├── reimbursement.routes.ts
│   ├── report.routes.ts
│   └── deadLetter.routes.ts
├── utils/              # 工具
│   └── logger.ts
└── index.ts            # 入口文件
```

---

## 关键设计要点

1. **状态机驱动**：所有状态转换受状态机控制，确保流程合规
2. **指数退避重试**：避免瞬间大量重试导致系统压力
3. **死信队列兜底**：超过重试阈值的单据进入死信，不影响正常流程
4. **权限分级严格**：四级权限体系，字段级可见性控制
5. **审计日志完整**：每个状态变化都记录谁在什么时候因为什么做了什么
6. **坏数据隔离**：失败数据不污染汇总报表，但在失败列表可查
7. **可追溯性**：报表数字 → 分类统计 → 单条记录 → 操作日志 完整链路

---

## 后续优化建议

1. 接入真实数据库（PostgreSQL/MySQL）
2. 使用 Redis 实现分布式重试队列
3. 接入真实的发票OCR解析服务
4. 添加消息通知（邮件/短信）提醒人工干预
5. 实现WebSocket实时推送状态变更
6. 添加单元测试和集成测试
7. 实现更复杂的重复检测算法（机器学习）
