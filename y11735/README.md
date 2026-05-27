# 校园一卡通退款后端服务

## 系统概述

毕业季一卡通退款处理系统，支持从导入到复核、导出的全流程管理。

## 核心功能

- **余额拆分**：自动区分自充金额和补贴金额，按规则计算可退金额
- **退款状态机**：pending → approved/rejected → processed
- **挂失拦截**：自动检测挂失卡片，禁止退款
- **离校校验**：检查离校状态，未通过则拦截或警告
- **批次管理**：按批次导入、复核、导出
- **审计留痕**：所有操作全程记录，支持追溯
- **修正历史**：记录每次金额修改的原因和前后值

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 初始化测试数据

```bash
npm run seed
```

造数脚本会创建6个测试学生，覆盖各种场景：
- 2020001 张三 - 正常可退款
- 2020002 李四 - 正常可退款
- 2020003 王五 - 离校待确认（警告）
- 2020004 赵六 - 卡片已挂失（拦截）
- 2020005 孙七 - 离校被拒绝（拦截）
- 2020006 周八 - 正常可退款

### 3. 启动服务

```bash
npm run dev
```

服务启动在 http://localhost:3000

## 主要操作流程

### 流程1：完整批次处理（推荐）

#### 步骤1：创建批次

```bash
curl -X POST http://localhost:3000/api/refund/batches \
  -H "Content-Type: application/json" \
  -d '{"batchName":"2024届毕业生第一批退款","operator":"财务处-张老师"}'
```

返回：
```json
{
  "code": 0,
  "data": {
    "batchNo": "BATCH1717000000000",
    "status": "draft"
  }
}
```

#### 步骤2：导入退款清单

方式A - CSV导入：
```bash
curl -X POST http://localhost:3000/api/refund/batches/BATCH1717000000000/import \
  -F "file=@./sample/import_example.csv" \
  -F "operator=财务处-张老师"
```

方式B - JSON导入：
```bash
curl -X POST http://localhost:3000/api/refund/batches/BATCH1717000000000/import-json \
  -H "Content-Type: application/json" \
  -d '{
    "operator": "财务处-张老师",
    "records": [
      {"studentId":"2020001","cardNo":"CARD001"},
      {"studentId":"2020002","cardNo":"CARD002"},
      {"studentId":"2020003","cardNo":"CARD003"},
      {"studentId":"2020004","cardNo":"CARD004"},
      {"studentId":"2020005","cardNo":"CARD005"},
      {"studentId":"2020006","cardNo":"CARD006"}
    ]
  }'
```

导入结果会清晰标记成功/失败：
```json
{
  "code": 0,
  "data": {
    "total": 6,
    "success": 4,
    "failed": 2,
    "results": [
      {"success": true, "studentId": "2020001", "errors": [], "warnings": []},
      {"success": true, "studentId": "2020002", "errors": [], "warnings": []},
      {"success": true, "studentId": "2020003", "errors": [], "warnings": ["离校手续待确认"]},
      {"success": false, "studentId": "2020004", "errors": ["卡片已挂失"], "warnings": []},
      {"success": false, "studentId": "2020005", "errors": ["离校手续被拒绝"], "warnings": []},
      {"success": true, "studentId": "2020006", "errors": [], "warnings": []}
    ]
  }
}
```

#### 步骤3：查看批次详情

```bash
curl http://localhost:3000/api/refund/batches/BATCH1717000000000
```

返回批次统计：
- 总记录数、通过数、拒绝数、待审核数
- 总金额、通过金额
- 每条记录的明细（原余额、自充退款、补贴退款、不可退金额、实际退款）

#### 步骤4：批量复核

```bash
curl -X POST http://localhost:3000/api/refund/batches/BATCH1717000000000/review \
  -H "Content-Type: application/json" \
  -d '{"operator":"财务处-李主任","approved":true,"remarks":"核对无误"}'
```

#### 步骤5：导出CSV

```bash
curl -X POST http://localhost:3000/api/refund/batches/BATCH1717000000000/export \
  -o refund_export.csv
```

#### 步骤6：标记打款完成

```bash
curl -X POST http://localhost:3000/api/refund/batches/BATCH1717000000000/process \
  -H "Content-Type: application/json" \
  -d '{"operator":"银行对接员"}'
```

### 流程2：单条记录处理

#### 复核单条记录

```bash
curl -X POST http://localhost:3000/api/refund/records/RECxxxxxx/review \
  -H "Content-Type: application/json" \
  -d '{"operator":"财务处-李主任","approved":false,"reason":"存在疑问，需进一步核实"}'
```

#### 修改退款金额（仅待审核状态）

```bash
curl -X PUT http://localhost:3000/api/refund/records/RECxxxxxx/amount \
  -H "Content-Type: application/json" \
  -d '{
    "operator": "财务处-张老师",
    "selfRechargeRefund": 350,
    "subsidyRefund": 180.5,
    "nonRefundableAmount": 50,
    "changeReason": "发现50元为不可退专项补贴"
  }'
```

### 流程3：审计追溯

#### 查看批次操作历史

```bash
curl http://localhost:3000/api/refund/audit/batch/BATCH1717000000000
```

#### 查看单条记录修改历史

```bash
curl http://localhost:3000/api/refund/audit/record/RECxxxxxx
```

#### 查看学生所有相关操作

```bash
curl http://localhost:3000/api/refund/audit/student/2020001
```

## 异常路径说明

### 异常1：卡片已挂失

**触发条件**：导入时卡片状态为 lost 或在挂失系统中有未解决记录

**系统行为**：
- 导入时标记为失败
- errors 字段明确提示「卡片已挂失，挂失时间: xxxx-xx-xx」
- 不会创建退款记录
- 审计日志记录失败原因

**处理方式**：联系学生核实卡片状态，挂失解除后重新导入

### 异常2：离校状态异常

**触发条件**：
- 离校状态为 rejected（被拒绝）→ 拦截
- 离校状态为 pending（待确认）→ 警告但允许导入

**系统行为**：
- rejected：导入失败，errors 提示「离校手续被拒绝: xxx」
- pending：导入成功，但 warnings 提示「离校手续待确认」
- 状态原因字段会记录警告信息，复核时可见

**处理方式**：
- rejected：学生需先完成离校手续
- pending：联系相关部门确认离校状态后再决定是否通过

### 异常3：补贴不可退

**触发条件**：补贴规则配置 isRefundable = false

**系统行为**：
- 计算时将补贴金额计入 nonRefundableAmount
- warnings 提示「补贴金额不可退款」
- 实际退款金额 = 自充部分

**处理方式**：系统自动处理，财务人员可在复核时确认拆分结果

### 异常4：重复申请

**触发条件**：同一学生已有待审核/已通过/已处理的退款记录

**系统行为**：
- 导入失败，errors 提示「学生已有退款申请，批次号: xxx」
- 防止重复退款

**处理方式**：检查历史记录，确认是否为同一笔退款

### 异常5：修改已复核记录

**触发条件**：尝试修改状态非 pending 的记录金额

**系统行为**：抛出错误「仅待审核状态的记录可修改」

**处理方式**：如需修改，先将记录状态重置为 pending（需提供重置功能）

## API 列表

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/refund/health | 健康检查 |
| GET | /api/refund/batches | 批次列表 |
| POST | /api/refund/batches | 创建批次 |
| GET | /api/refund/batches/:batchNo | 批次详情 |
| POST | /api/refund/batches/:batchNo/import | CSV导入 |
| POST | /api/refund/batches/:batchNo/import-json | JSON导入 |
| POST | /api/refund/batches/:batchNo/review | 批次复核 |
| POST | /api/refund/batches/:batchNo/export | 批次导出CSV |
| POST | /api/refund/batches/:batchNo/process | 标记打款完成 |
| POST | /api/refund/records/:recordNo/review | 单条复核 |
| PUT | /api/refund/records/:recordNo/amount | 修改金额 |
| GET | /api/refund/audit/batch/:batchNo | 批次审计日志 |
| GET | /api/refund/audit/record/:recordNo | 记录审计日志 |
| GET | /api/refund/audit/student/:studentId | 学生审计日志 |

## 数据来源说明

所有业务数据均保留来源字段（source）：
- 学生档案：学生档案系统
- 卡片余额：一卡通系统
- 补贴规则：学生资助管理系统
- 挂失记录：挂失系统
- 离校状态：离校系统
- 退款记录：导入/手动创建

## 项目结构

```
src/
├── models/           # 数据库模型
│   ├── Student.ts          # 学生档案
│   ├── Card.ts             # 一卡通卡片
│   ├── SubsidyRule.ts      # 补贴规则
│   ├── LostCard.ts         # 挂失记录
│   ├── GraduationStatus.ts # 离校状态
│   ├── RefundBatch.ts      # 退款批次
│   ├── RefundRecord.ts     # 退款明细
│   └── AuditLog.ts         # 审计日志
├── services/         # 业务服务
│   ├── BalanceSplitService.ts   # 余额拆分
│   ├── ValidationService.ts     # 校验服务（挂失/离校/重复）
│   ├── RefundService.ts         # 退款核心服务
│   ├── ImportExportService.ts   # 导入导出
│   └── AuditService.ts          # 审计服务
├── routes/           # API路由
│   └── refund.ts
├── scripts/          # 脚本
│   └── seed.ts             # 测试数据
├── database.ts       # 数据库连接
└── server.ts         # 服务入口
```
