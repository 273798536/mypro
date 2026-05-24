# 外协加工对账异常回执状态机 API

## 项目概述

本系统是一个专门针对外协加工对账异常处理的状态机系统，实现了从外协送货单、返修记录、扣款明细到最终结算的全流程追踪管理，重点解决同一批半成品分批返工后结算单多扣款的责任追溯问题。

### 核心设计理念

1. **完整证据链**：所有数据变更都保留原始来源、操作者、时间和原因
2. **不可篡改**：人工改判不覆盖原始证据，只新增变更记录
3. **状态可追溯**：完整的状态流转历史，支持审计追踪
4. **边界情况处理**：重复提交、撤回再提交、部分失败、人工改判、导出前冻结

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动服务

```bash
npm run dev
```

### 运行测试

```bash
node scripts/test-api.mjs
```

## 状态流转图

```
草稿(DRAFT) → 已提交(SUBMITTED) → 待复核(PENDING_REVIEW)
     ↓              ↓                    ↓
  已归档        已撤回           已通过/已驳回/已改判
     ↑              ↑                    ↓
     └──────────────┴───────── 已冻结(FROZEN)
```

### 状态说明

| 状态 | 说明 | 可流转到 |
|------|------|----------|
| draft | 草稿 | 已提交、已归档 |
| submitted | 已提交 | 待复核、已撤回、已冻结 |
| pending_review | 待复核 | 已通过、已驳回、已改判、已冻结、已撤回 |
| approved | 已通过 | 已改判、已冻结、已归档 |
| rejected | 已驳回 | 已改判、已提交、已归档 |
| modified | 已改判 | 待复核、已冻结、已撤回 |
| frozen | 已冻结 | 任意状态（解冻） |
| archived | 已归档 | 无（最终状态） |
| withdrawn | 已撤回 | 已提交、已归档 |

## API 接口

### 通用请求头

所有接口必须携带以下请求头：

```
x-operator-id: 操作人ID
x-operator-name: 操作人姓名
x-operator-role: 操作人角色
Content-Type: application/json
```

### 接口列表

#### 1. 创建回执

```http
POST /api/v1/receipts
```

**请求体：**
```json
{
  "batchNo": "BATCH-2024-001",
  "semiProductCode": "SP-001",
  "semiProductName": "铝合金外壳",
  "supplierId": "SUPP-001",
  "supplierName": "深圳精诚五金",
  "quantity": 500,
  "abnormalAmount": 2500.00,
  "deductionAmount": 1500.00,
  "customerServiceNotes": "客户反馈尺寸偏差"
}
```

#### 2. 提交回执

```http
POST /api/v1/receipts/:id/submit
```

**请求体：**
```json
{
  "reason": "提交审核"
}
```

#### 3. 提交复核

```http
POST /api/v1/receipts/:id/review
```

#### 4. 审核通过

```http
POST /api/v1/receipts/:id/approve
```

#### 5. 驳回

```http
POST /api/v1/receipts/:id/reject
```
**请求体：**
```json
{
  "reason": "证据不足，需要补充材料"
}
```

#### 6. 人工改判

```http
POST /api/v1/receipts/:id/modify
```
**请求体：**
```json
{
  "confirmedAmount": 1000,
  "deductionAmount": 1000,
  "manualReason": "经核实，供应商只承担部分责任"
}
```

#### 7. 冻结（导出前）

```http
POST /api/v1/receipts/:id/freeze
```
**请求体：**
```json
{
  "reason": "导出结算前冻结，防止数据变更"
}
```

#### 8. 解冻

```http
POST /api/v1/receipts/:id/unfreeze
```
**请求体：**
```json
{
  "reason": "导出完成",
  "targetStatus": "pending_review"
}
```

#### 9. 撤回

```http
POST /api/v1/receipts/:id/withdraw
```

#### 10. 撤回后重新提交

```http
POST /api/v1/receipts/:id/resubmit
```

#### 11. 归档

```http
POST /api/v1/receipts/:id/archive
```

#### 12. 上传附件

```http
POST /api/v1/receipts/:id/attachments
Content-Type: multipart/form-data
```
**表单字段：**
- `file`: 附件文件
- `description`: 附件描述

#### 13. 数据导入

```http
POST /api/v1/import
Content-Type: multipart/form-data
```
**表单字段：**
- `file`: Excel/CSV 文件
- `sourceType`: `delivery_note` | `repair_record` | `deduction_detail`
- `skipHeader`: `true` | `false`

#### 14. 数据导出

```http
POST /api/v1/export
```
**请求体：**
```json
{
  "format": "excel",
  "includeOriginalEvidence": true,
  "includeStatusHistory": true,
  "statusFilter": ["approved", "modified"],
  "dateRange": {
    "start": "2024-01-01",
    "end": "2024-12-31"
  }
}
```

#### 15. 获取回执详情

```http
GET /api/v1/receipts/:id
```

**返回包含：**
- 回执基本信息
- 状态流转历史
- 原始证据记录
- 附件列表

#### 16. 获取回执列表

```http
GET /api/v1/receipts?supplierId=SUPP-001&status=pending_review&batchNo=BATCH-2024
```

#### 17. 获取统计数据

```http
GET /api/v1/dashboard/stats
```

## 边界情况处理

### 1. 重复提交

**场景：** 同一批次号多次导入

**处理方式：**
- 系统检测到批次号已存在时，记录警告日志
- 创建新的回执记录（允许同一批次可能有多条异常记录）
- 原始证据分别记录，保留所有来源

**示例响应：
```json
{
  "success": true,
  "warning": "批次 BATCH-2024-001 已存在，将追加证据记录"
}
```

### 2. 撤回后再提交

**场景：** 提交后发现问题撤回，修正后重新提交

**处理方式：**
- 撤回后状态变为 `withdrawn`
- 可再次提交回到 `submitted` 状态
- 完整保留撤回和重新提交的操作记录

### 3. 部分失败

**场景：** 批量导入时部分记录失败

**处理方式：**
- 成功的记录正常入库
- 失败的记录详细记录错误信息、行号、原始值
- 返回导入批次记录成功和失败数量统计

**示例响应：
```json
{
  "success": false,
  "batchId": "xxx",
  "totalRecords": 10,
  "successCount": 8,
  "failedCount": 2,
  "errors": [
    {
      "sourceFile": "data.csv",
      "lineNumber": 5,
      "fieldName": "数量",
      "originalValue": "abc",
      "errorMessage": "字段 数量 必须是数字",
      "errorCode": "INVALID_NUMBER"
    }
  ]
}
```

### 4. 人工改判

**场景：** 复核时发现系统判断有误，需要人工调整

**处理方式：**
- 标记 `is_manual_modified = true
- 记录 `manual_reason
- 原始扣款金额和确认金额都可修改
- 状态流转记录原始值和新值对比

### 5. 导出前冻结

**场景：** 导出报表导出前冻结数据，防止导出过程中数据变更

**处理方式：**
- 冻结前状态保存到 `status_before_frozen`
- 冻结期间禁止任何修改操作
- 解冻时可恢复到冻结前状态或指定状态
- 导出报表包含冻结前后对比sheet

## 导出报表结构

导出的Excel文件包含以下Sheet：

### 1. 对账异常回执（主表）

包含所有回执的基本信息、状态、金额、人工改判标记、冻结信息等。

### 2. 汇总统计

工厂老板关注的核心数据：
- 总记录数
- 各状态数量统计
- 总异常/扣款/确认金额汇总
- 冻结数量
- 人工改判数量

### 3. 冻结前后对比

| 回执ID | 批次号 | 冻结前状态 | 当前状态 | 冻结时间 | 冻结操作人 | 冻结原因 | 解冻时间 | 解冻操作人 | 解冻原因

### 4. 人工改判记录

| 回执ID | 批次号 | 改判时间 | 改判操作人 | 原扣款金额 | 新扣款金额 | 扣款变更 | 改判理由

### 5. 状态流转记录（可选）

完整的状态变更历史。

### 6. 原始证据追溯（可选）

| 回执ID | 批次号 | 数据源类型 | 来源文件 | 原始行号 | 字段名称 | 原始值 | 解析值 | 导入批次

## 样例材料

位于 `examples/` 目录包含样例数据文件：

- `sample_delivery_notes.csv` - 外协送货单样例
- `sample_repair_records.csv` - 返修记录样例
- `sample_deduction_details.csv` - 扣款明细样例

## 失败路径测试

运行测试脚本模拟完整流程：

```bash
node scripts/test-api.mjs
```

测试覆盖场景：
1. 创建回执 → 草稿状态
2. 提交 → 已提交
3. 提交复核 → 待复核
4. 冻结 → 已冻结
5. 解冻 → 恢复状态
6. 人工改判 → 已改判
7. 审核通过 → 已通过
8. 撤回 → 已撤回
9. 重新提交 → 已提交
10. 查看详情和流转记录

## 项目结构

```
src/
├── config/
│   └── database.ts      # 数据库配置
├── models/
│   └── index.ts           # 数据模型和ORM
├── services/
│   ├── stateMachine.ts    # 状态机核心
│   ├── reconciliation.ts # 对账回执服务
│   ├── dataImport.ts     # 数据导入服务
│   └── export.ts        # 导出报表服务
├── controllers/
│   └── reconciliation.ts # API控制器
├── routes/
│   └── reconciliation.ts # 路由定义
├── middleware/
│   └── errorHandler.ts    # 错误处理中间件
├── types/
│   └── index.ts         # TypeScript类型定义
├── utils/
│   └── logger.ts        # 日志工具
└── index.ts             # 应用入口
```

## 数据库表结构

### reconciliation_receipts

对账异常回执主表。

### status_transitions

状态流转记录表，每条状态变更都有完整记录。

### original_evidences

原始证据表，保留导入时的来源文件、行号、原始值和解析值。

### attachments

附件表，存储上传的证明文件。

### import_batches

导入批次表，记录每次导入的结果统计。

## 常见问题

### Q: 如何保证数据不被篡改？

A: 系统采用"只增不改的设计：
- 原始证据一旦写入永不修改
- 状态变更只新增流转记录
- 人工改判标记并记录原因

### Q: 冻结状态下可以做什么？

A: 冻结状态下：
- 可以查看详情
- 可以导出
- 不可以修改金额
- 不可以变更状态（除了解冻）

### Q: 如何追溯责任？

A: 通过以下方式：
1. 查看状态流转记录的操作人
2. 查看原始证据的来源
3. 查看人工改判的理由
4. 查看冻结前后的状态对比
