# 投标资料封版异常回执状态机 API

## 项目概述

投标资料封版异常回执状态机服务，用于管理投标资料的全生命周期，包括资质文件、报价版本、盖章扫描件和退款流水等原始材料的管理，支持完整的状态流转和操作轨迹追踪。

## 核心功能

### 1. 批次管理
- 批次创建与编辑
- 状态流转（草稿 → 提交 → 复核 → 通过/驳回 → 冻结 → 结算 → 归档）
- 人工备注管理

### 2. 附件管理
- 资质文件上传（qualification）
- 报价版本上传（price_version）
- 盖章扫描件上传（sealed_scan）
- 退款流水上传（refund_flow）
- 盘点差异上传（inventory_diff）
- 附件版本控制
- 附件历史追溯

### 3. 状态机动作
- **提交（SUBMIT）**：草稿 → 已提交
- **复核（REVIEW）**：已提交 → 复核中 → 复核通过
- **改判（OVERRULE）**：复核中 → 复核驳回
- **冻结（FREEZE）**：冻结批次，记录冻结前后状态
- **解冻（UNFREEZE）**：恢复冻结前状态
- **结算（SETTLE）**：复核通过 → 已结算
- **归档（ARCHIVE）**：已结算 → 已归档
- **撤回（CANCEL）**：草稿 → 已取消

### 4. 数据校验与异常处理
- 坏数据隔离到失败列表
- 未处理记录统计
- 已修正记录统计
- 需人工确认记录统计
- 数据一致性校验

### 5. 报表与导出
- 批次详情报表
- 冻结前后状态对比
- CSV格式导出
- 报表汇总查询

## 项目结构

```
├── src/
│   ├── index.js              # 应用入口
│   ├── database/             # 数据库层
│   │   ├── index.js          # 数据库连接
│   │   └── schema.js         # 表结构定义
│   ├── state-machine/        # 状态机
│   │   └── index.js          # 状态流转规则
│   ├── services/             # 业务服务层
│   │   ├── batchService.js   # 批次服务
│   │   ├── attachmentService.js  # 附件服务
│   │   ├── stateService.js   # 状态服务
│   │   ├── validationService.js  # 校验服务
│   │   ├── reportService.js  # 报表服务
│   │   └── auditService.js   # 审计服务
│   ├── routes/               # API路由
│   │   ├── batches.js        # 批次路由
│   │   └── reports.js        # 报表路由
│   ├── middleware/           # 中间件
│   │   └── requestLogger.js  # 请求日志
│   └── utils/                # 工具类
│       └── logger.js         # 日志配置
├── config/                   # 配置文件
├── scripts/                  # 脚本
│   └── init-db.js            # 数据库初始化
├── tests/                    # 测试用例
├── data/                     # 数据库文件
├── uploads/                  # 上传文件
├── exports/                  # 导出文件
└── logs/                     # 日志文件
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 初始化数据库

```bash
npm run init-db
```

### 3. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

服务默认运行在 `http://localhost:3000`

## API 文档

### 公共请求头

| 头名称 | 说明 | 示例 |
|--------|------|------|
| X-Operator | 操作人标识 | zhangsan |

### 批次管理

#### 创建批次
```
POST /api/batches
Content-Type: application/json
X-Operator: zhangsan

{
  "projectName": "XX项目投标",
  "bidNo": "BID-2024-001",
  "manualRemark": "重点关注资质文件"
}
```

#### 批次列表
```
GET /api/batches?status=DRAFT&page=1&pageSize=20
```

#### 批次详情
```
GET /api/batches/:id
```

#### 完整详情（含附件、校验结果）
```
GET /api/batches/:id/detail
```

#### 历史轨迹
```
GET /api/batches/:id/history
```

### 附件管理

#### 上传附件
```
POST /api/batches/:id/attachments
Content-Type: multipart/form-data
X-Operator: zhangsan

Form Data:
- file: [文件]
- attachmentType: qualification | price_version | sealed_scan | refund_flow | inventory_diff
- pageCount: 10
- pageModified: 3,5,7
```

#### 附件列表
```
GET /api/batches/:id/attachments
```

#### 附件版本历史
```
GET /api/batches/:id/attachments/:type/history
```

### 状态流转

#### 提交
```
POST /api/batches/:id/actions/submit
{
  "remark": "资料已准备齐全"
}
```

#### 复核
```
POST /api/batches/:id/actions/review
{
  "passed": true,
  "reason": "资料审核通过",
  "remark": "资质文件齐全"
}
```

#### 冻结
```
POST /api/batches/:id/actions/freeze
{
  "reason": "发现报价版本异常，需要复核"
}
```

#### 解冻
```
POST /api/batches/:id/actions/unfreeze
{
  "reason": "异常已确认，恢复处理"
}
```

#### 结算
```
POST /api/batches/:id/actions/settle
{
  "remark": "结算完成"
}
```

#### 归档
```
POST /api/batches/:id/actions/archive
```

#### 撤回
```
POST /api/batches/:id/actions/cancel
{
  "reason": "项目取消"
}
```

### 异常处理

#### 失败记录列表
```
GET /api/batches/:id/failed-records?isResolved=false
```

#### 解决失败记录
```
PUT /api/batches/:id/failed-records/:recordId/resolve
{
  "resolutionRemark": "已核对数据，确认无误"
}
```

#### 一致性校验
```
GET /api/batches/:id/validation
```

### 报表导出

#### 导出批次报表
```
POST /api/batches/:id/export
{
  "format": "csv"
}
```

#### 报表汇总
```
GET /api/reports?startDate=2024-01-01&endDate=2024-12-31
```

## 状态流转图

```
DRAFT(草稿)
   |
   ├─ SUBMIT → SUBMITTED(已提交)
   |              |
   |              └─ REVIEW → UNDER_REVIEW(复核中)
   |                                  |
   |                                  ├─ REVIEW → REVIEW_PASSED(复核通过)
   |                                  |       |
   |                                  |       ├─ FREEZE → FROZEN(冻结)
   |                                  |       |        └─ UNFREEZE → (恢复原状态)
   |                                  |       |
   |                                  |       ├─ SETTLE → SETTLED(已结算)
   |                                  |       |            └─ ARCHIVE → ARCHIVED(已归档)
   |                                  |       |
   |                                  |       └─ ARCHIVE → ARCHIVED(已归档)
   |                                  |
   |                                  └─ OVERRULE → REVIEW_REJECTED(复核驳回)
   |                                                      |
   |                                                      └─ REVIEW → UNDER_REVIEW(复核中)
   |
   └─ CANCEL → CANCELLED(已取消)
```

## 数据一致性保证

1. **单一数据源**：所有接口从同一数据表读取数据
2. **事务保证**：状态变更和附件上传使用数据库事务
3. **审计追踪**：所有字段变更记录在 `audit_trails` 表
4. **状态历史**：完整的状态变更历史记录在 `status_history` 表
5. **版本控制**：附件多版本管理，可追溯历史版本

## 报表重点指标

项目负责人关注的核心指标：

| 指标 | 说明 |
|------|------|
| 冻结前后状态 | 显示批次冻结前的状态和冻结后的状态 |
| 人工理由 | 冻结、复核等操作的人工备注 |
| 未处理记录 | 未解决的异常记录数 |
| 已修正记录 | 已解决的异常记录数 |
| 需人工确认 | 需要人工判断的记录数 |
| 导出汇总 | 可追溯的导出记录 |

## 运行测试

```bash
npm test
```
