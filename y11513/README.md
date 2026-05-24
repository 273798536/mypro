# 图书馆馆际借阅验收回放链路 API

## 项目概述

解决客服答案下线失败导致数据反复进入系统的问题。系统能够：

- ✅ **识别重复记录** - 基于业务主键去重，重复请求只更新同一条事实
- ✅ **保留处理原因** - 逾期、污损、续借叠在一起时的费用计算问题清晰记录
- ✅ **原始证据保留** - 导入时保留来源文件、原始行号，改判不覆盖原始数据
- ✅ **异步任务分级** - 区分等重试、等人工、永久失败三种状态
- ✅ **断点续处理** - 服务重启后从上次状态继续处理
- ✅ **数据一致性校验** - 列表、详情、历史、导出、日志五维对账

## 技术栈

- **后端**: Node.js + TypeScript + Express
- **数据库**: SQLite (本地持久化)
- **日志**: Winston
- **数据校验**: 内置一致性校验引擎

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 生成测试数据

```bash
npm run generate
```

### 3. 启动服务

```bash
npm run dev
```

服务启动在 `http://localhost:3000`

### 4. 验证服务

```bash
curl http://localhost:3000/health
```

## 核心流程

### 完整工作流

```
造数 → 启动服务 → 发请求(导入) → 对账 → 导出 → 回放异常
```

### 命令脚本

| 命令 | 说明 |
|------|------|
| `npm run generate` | 生成测试数据 (JSON + CSV) |
| `npm run dev` | 启动开发服务器 |
| `npm run reconcile` | 执行对账校验 |
| `npm run replay` | 回放异常任务 |
| `npm run export` | 导出所有数据 |

## API 接口

### 记录管理

#### 1. 获取记录列表

```http
GET /api/records/:recordType?page=1&pageSize=20
```

**recordType 可选值**:
- `borrow_application` - 借阅申请
- `express_order` - 快递单
- `compensation_record` - 读者赔偿记录
- `shift_record` - 班次记录

#### 2. 获取单条记录详情

```http
GET /api/records/:recordType/:id
```

#### 3. 获取记录变更历史

```http
GET /api/records/:recordType/:id/history
```

#### 4. 创建单条记录

```http
POST /api/records/:recordType
Content-Type: application/json

{
  "sourceFile": "manual_entry",
  "lineNumber": 1,
  "data": { ... }
}
```

#### 5. 批量导入记录

```http
POST /api/records/:recordType/import
Content-Type: application/json

{
  "sourceFile": "borrow_applications.json",
  "records": [
    { "applicationNo": "BORROW-000001", ... },
    { "applicationNo": "BORROW-000002", ... }
  ]
}
```

#### 6. 上传 CSV 文件导入

```http
POST /api/records/:recordType/upload
Content-Type: multipart/form-data

file: @data/borrow_applications.csv
```

#### 7. 导出记录为 CSV

```http
GET /api/records/:recordType/export
```

### 任务管理

#### 1. 获取任务列表

```http
GET /api/tasks?status=pending&page=1&pageSize=20
```

**status 可选值**:
- `pending` - 待处理
- `processing` - 处理中
- `success` - 成功
- `waiting_retry` - 等待重试
- `waiting_manual` - 等待人工
- `permanent_failed` - 永久失败

#### 2. 获取统计信息

```http
GET /api/tasks/statistics
```

返回：
- 各类型记录数量
- 任务状态分布
- 处理原因分布
- 最近导入记录

#### 3. 重试单个任务

```http
POST /api/tasks/:id/retry
```

#### 4. 执行全量对账

```http
POST /api/tasks/reconcile
```

检查：
- 记录完整性
- 版本一致性
- 历史记录匹配
- 跨记录关联

#### 5. 回放异常任务

```http
POST /api/tasks/replay-exceptions
```

自动重试 `waiting_manual` 和 `permanent_failed` 状态的任务。

#### 6. 跨记录一致性校验

```http
POST /api/tasks/verify-consistency
```

检查：
- 借阅申请与快递单的对应关系
- 费用计算是否存在重叠
- 异常高赔偿金额

## 使用示例

### 导入借阅申请

```bash
curl -X POST http://localhost:3000/api/records/borrow_application/import \
  -H "Content-Type: application/json" \
  -d @data/borrow_applications.json
```

### 上传快递单 CSV

```bash
curl -X POST http://localhost:3000/api/records/express_order/upload \
  -F "file=@data/express_orders.csv"
```

### 执行对账

```bash
curl -X POST http://localhost:3000/api/tasks/reconcile
```

### 查看赔偿记录历史

```bash
curl http://localhost:3000/api/records/compensation_record/{id}/history
```

## 核心机制

### 1. 去重识别规则

每种记录类型有独特的业务主键生成规则：

| 记录类型 | 业务主键构成 |
|---------|-------------|
| 借阅申请 | 申请号 + 读者ID + ISBN |
| 快递单 | 快递单号 + 关联申请号 |
| 赔偿记录 | 赔偿单号 + 关联申请号 + 赔偿类型 |
| 班次记录 | 班次号 + 操作员ID + 班次日期 |

### 2. 重复类型判定

- **完全重复 (exact)**: 所有字段完全相同 → 跳过
- **部分重复 (partial)**: 非关键字段有差异 → 更新版本
- **冲突重复 (conflicting)**: 关键字段有差异 → 标记费用计算问题

### 3. 异步任务状态流转

```
pending → processing → success
    ↓         ↓
waiting_retry ←┘
    ↓  (重试超过3次)
waiting_manual / permanent_failed
```

### 4. 处理原因说明

系统自动标记以下处理原因：

| 原因 | 说明 |
|------|------|
| `normal` | 正常导入 |
| `duplicate_record` | 重复记录更新 |
| `overdue_fee_conflict` | 逾期费用冲突 |
| `damage_fee_conflict` | 污损费用冲突 |
| `renewal_fee_overlap` | 续借费用重叠 |
| `fee_calculation_error` | 费用计算错误 |

## 数据结构

### 借阅申请 (BorrowApplication)

```typescript
{
  applicationNo: string;      // 申请号
  readerId: string;          // 读者ID
  readerName: string;        // 读者姓名
  isbn: string;              // ISBN
  bookTitle: string;         // 书名
  applicantLibrary: string;  // 申请馆
  lendingLibrary: string;    // 借出馆
  applicationDate: number;   // 申请日期
  status: string;            // 状态
  expectedReturnDate: number;// 应还日期
  actualReturnDate?: number; // 实还日期
}
```

### 快递单 (ExpressOrder)

```typescript
{
  expressNo: string;            // 快递单号
  relatedApplicationNo: string; // 关联申请号
  sender: string;               // 寄件方
  receiver: string;             // 收件方
  sendDate: number;             // 寄出日期
  receiveDate?: number;         // 收到日期
  expressCompany: string;       // 快递公司
  freight: number;              // 运费
  status: string;               // 状态
}
```

### 赔偿记录 (CompensationRecord)

```typescript
{
  compensationNo: string;       // 赔偿单号
  relatedApplicationNo: string; // 关联申请号
  readerId: string;             // 读者ID
  compensationType: 'overdue' | 'damage' | 'lost';
  amount: number;               // 金额
  compensationDate: number;     // 赔偿日期
  status: string;               // 状态
  remark?: string;              // 备注
}
```

### 班次记录 (ShiftRecord)

```typescript
{
  shiftNo: string;          // 班次号
  operatorId: string;       // 操作员ID
  operatorName: string;     // 操作员姓名
  shiftDate: number;        // 班次日期
  shiftType: 'morning' | 'afternoon' | 'night';
  processedRecords: number; // 处理记录数
  remark?: string;          // 备注
}
```

## 目录结构

```
.
├── src/
│   ├── config/           # 配置文件
│   ├── controllers/      # API 控制器
│   ├── middleware/       # 中间件
│   ├── models/           # 数据模型
│   ├── routes/           # 路由定义
│   ├── services/         # 业务服务
│   ├── types/            # 类型定义
│   ├── utils/            # 工具函数
│   └── server.ts         # 服务入口
├── scripts/              # 命令脚本
│   ├── generate-data.ts  # 造数脚本
│   ├── reconcile.ts      # 对账脚本
│   ├── replay-exceptions.ts # 回放脚本
│   └── export.ts         # 导出脚本
├── data/                 # 数据文件
├── logs/                 # 日志文件
├── uploads/              # 上传文件
├── exports/              # 导出文件
└── package.json
```

## 日志与审计

所有操作都会记录详细日志：

- **HTTP 读写日志**: `logs/combined.log`
- **错误日志**: `logs/error.log`
- **变更历史**: 数据库 `history_records` 表

每条变更历史包含：
- 操作前后完整记录快照
- 操作人、操作时间
- 原始导入来源信息（文件、行号）

## 一致性保证

系统通过以下方式确保数据一致性：

1. **版本号机制**: 每次更新版本号 +1
2. **历史记录**: 所有变更永久保存，不可删除
3. **原始证据**: 导入源信息永不覆盖
4. **定期对账**: 自动检查数据完整性
5. **交叉校验**: 关联数据一致性检查

## 注意事项

1. **重复导入安全**: 相同业务数据重复导入只会更新版本，不会新增记录
2. **费用计算问题**: 逾期+污损同时存在时会自动标记待人工确认
3. **服务恢复**: 服务重启后自动从上次中断的任务继续处理
4. **数据溯源**: 任何数据都能追溯到原始导入文件和行号
