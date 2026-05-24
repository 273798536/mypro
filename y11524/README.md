# 家电安装回访权限追责台账 API

从预约单、师傅定位、用户评价和二次确认单开始建账的完整台账系统，支持完整的状态流转、幂等处理、审计追踪和脱敏导出。

## 核心特性

- **多源数据建账**: 预约单 → 师傅定位 → 用户评价 → 二次确认单，分步导入
- **完整状态机**: 草稿 → 提交 → 驳回/二次确认 → 只读审计
- **幂等处理**: 基于(预约单号+批次号)唯一键，重复请求只更新同一条记录
- **审计追踪**: 记录所有状态变更、操作人、变更原因、敏感字段
- **数据隔离**: 坏数据进入失败记录表，不影响汇总统计
- **角色视图**: 管理员/区域经理/售后/审核员，不同角色看到不同数据（脱敏）
- **统一事实**: 详情接口、历史查询、导出文件使用同一数据源

## 快速开始

### 1. 环境准备

```bash
# 安装依赖
npm install
```

### 2. 空库启动

系统会自动创建 `data/ledger.db` SQLite 数据库文件和所有数据表。

```bash
# 开发模式启动（支持热重载）
npm run dev

# 或生产模式
npm run build && npm start
```

服务器启动后访问: http://localhost:3000

### 3. 准备样例数据

```bash
# 运行数据填充脚本
npm run seed
```

样例数据包含：
- 3条预约单（北京、上海、广州各一条）
- 2条师傅定位数据
- 2条用户评价（1条好评5分，1条差评2分）
- 1条二次确认（改约场景）

### 4. 走主流程

使用 curl 或 Postman 执行以下步骤：

#### 步骤1: 导入预约单

```bash
curl -X POST http://localhost:3000/api/ledger/import/appointment \
  -H "Content-Type: application/json" \
  -d '{
    "appointmentNo": "FLOW001",
    "batchNo": "BATCH001",
    "customerName": "流程测试用户",
    "customerPhone": "13800138111",
    "customerAddress": "杭州市西湖区文三路100号",
    "area": "杭州",
    "applianceType": "空调",
    "appointmentTime": "2024-01-20 10:00:00",
    "technicianId": "TECH100",
    "technicianName": "周师傅",
    "status": "已完成",
    "operatorId": "OP100",
    "operatorName": "售后专员"
  }'
```

**返回**: `ledgerId` - 台账记录ID

#### 步骤2: 导入师傅定位

```bash
curl -X POST http://localhost:3000/api/ledger/import/technician-location \
  -H "Content-Type: application/json" \
  -d '{
    "appointmentNo": "FLOW001",
    "batchNo": "BATCH001",
    "technicianId": "TECH100",
    "checkInTime": "2024-01-20 09:55:00",
    "checkOutTime": "2024-01-20 11:20:00",
    "locationAddress": "杭州市西湖区文三路100号",
    "latitude": 30.2741,
    "longitude": 120.1551,
    "distanceToCustomer": 45
  }'
```

#### 步骤3: 导入用户评价

```bash
curl -X POST http://localhost:3000/api/ledger/import/user-review \
  -H "Content-Type: application/json" \
  -d '{
    "appointmentNo": "FLOW001",
    "batchNo": "BATCH001",
    "rating": 4,
    "reviewContent": "安装还可以，就是时间有点久",
    "reviewTime": "2024-01-20 18:00:00",
    "reviewerPhone": "13800138111"
  }'
```

#### 步骤4: 提交审核

```bash
# 将返回的 ledgerId 替换到下面
curl -X POST http://localhost:3000/api/ledger/status/change \
  -H "Content-Type: application/json" \
  -d '{
    "ledgerId": "你的台账ID",
    "targetStatus": "submitted",
    "changeReason": "资料完整，提交审核",
    "operatorId": "OP100",
    "operatorName": "售后专员",
    "role": "after_sales"
  }'
```

#### 步骤5: 查看台账详情

```bash
curl "http://localhost:3000/api/ledger/detail/你的台账ID?role=admin"
```

查看状态变更历史在 `statusHistory` 字段中。

### 5. 制造异常

#### 测试失败记录 - 无效数据

```bash
# 导入无效手机号的数据，会进入失败记录表
curl -X POST http://localhost:3000/api/ledger/import/appointment \
  -H "Content-Type: application/json" \
  -d '{
    "appointmentNo": "BAD001",
    "batchNo": "BATCH001",
    "customerName": "坏数据用户",
    "customerPhone": "invalid",
    "customerAddress": "测试地址",
    "area": "成都",
    "applianceType": "热水器",
    "appointmentTime": "2024-01-21 09:00:00",
    "technicianId": "TECH200",
    "technicianName": "测试师傅",
    "status": "已完成",
    "operatorId": "OP200",
    "operatorName": "操作人"
  }'
```

查看失败记录:
```bash
curl http://localhost:3000/api/ledger/failed-records
```

#### 测试幂等性 - 重复请求

```bash
# 连续发送两次相同请求
curl -X POST http://localhost:3000/api/ledger/import/appointment \
  -H "Content-Type: application/json" \
  -d '{
    "appointmentNo": "IDEMPOTENT001",
    "batchNo": "BATCH001",
    "customerName": "幂等测试",
    "customerPhone": "13800138222",
    "customerAddress": "测试地址",
    "area": "南京",
    "applianceType": "冰箱",
    "appointmentTime": "2024-01-22 14:00:00",
    "technicianId": "TECH300",
    "technicianName": "测试师傅",
    "status": "已完成",
    "operatorId": "OP300",
    "operatorName": "操作人"
  }'
```

观察返回的 `created` 字段：第一次为 `true`，后续为 `false`，但 `ledgerId` 保持一致。

#### 测试权限 - 非法状态转换

```bash
# 售后角色尝试直接从草稿跳到审计（应该失败）
curl -X POST http://localhost:3000/api/ledger/status/change \
  -H "Content-Type: application/json" \
  -d '{
    "ledgerId": "你的台账ID",
    "targetStatus": "audit_only",
    "changeReason": "尝试跳过流程",
    "operatorId": "OP100",
    "operatorName": "售后专员",
    "role": "after_sales"
  }'
```

### 6. 查看导出

#### 批量导出

```bash
curl -X POST http://localhost:3000/api/ledger/export \
  -H "Content-Type: application/json" \
  -d '{
    "role": "area_manager",
    "exportType": "summary"
  }'
```

#### 单条详情导出

```bash
curl -X POST http://localhost:3000/api/ledger/export/你的台账ID \
  -H "Content-Type: application/json" \
  -d '{
    "role": "area_manager"
  }'
```

导出文件保存在 `exports/` 目录下。

## API 接口清单

### 数据导入

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/ledger/import/appointment` | 导入预约单 |
| POST | `/api/ledger/import/technician-location` | 导入师傅定位 |
| POST | `/api/ledger/import/user-review` | 导入用户评价 |
| POST | `/api/ledger/import/second-confirmation` | 导入二次确认单 |

### 状态管理

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/ledger/status/change` | 变更台账状态 |

### 查询接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/ledger/list` | 台账列表（支持筛选、分页） |
| GET | `/api/ledger/detail/:id` | 台账详情（含历史） |
| GET | `/api/ledger/failed-records` | 失败记录列表 |
| GET | `/api/ledger/statistics` | 统计汇总 |

### 导出接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/ledger/export` | 批量导出CSV |
| POST | `/api/ledger/export/:id` | 单条详情导出CSV |

## 状态流转图

```
草稿(draft)
    ↓
已提交(submitted)
    ↓     ↓
驳回(rejected) → 二次确认(second_confirm)
    ↓           ↓
    ↓      只读审计(audit_only)
    ↓           ↑
    └───────────┘
```

### 状态说明

| 状态 | 说明 | 可操作角色 |
|------|------|------------|
| draft | 草稿，数据收集中 | 售后、区域经理 |
| submitted | 已提交，待审核 | 审核员 |
| rejected | 已驳回，需修改 | 售后、区域经理 |
| second_confirm | 二次确认中 | 审核员 |
| audit_only | 只读归档，不可修改 | 仅查看 |

## 角色权限

| 角色 | 说明 | 敏感字段 | 可操作范围 |
|------|------|----------|------------|
| admin | 管理员 | 可见全部 | 全部区域 |
| area_manager | 区域经理 | 脱敏显示 | 本区域数据 |
| after_sales | 售后人员 | 脱敏显示 | 数据录入 |
| auditor | 审核员 | 脱敏显示 | 状态审核 |

## 运行测试

```bash
# 运行全部测试
npm test

# 监听模式
npm run test:watch
```

测试重点：
- 状态流转正确性
- 幂等性（重复请求不重复创建）
- 权限控制（角色权限）
- 数据质量（失败记录隔离）
- 敏感字段脱敏

## 数据库结构

- **ledgers**: 台账主表，唯一键(appointment_no, batch_no)
- **appointment_orders**: 预约单数据
- **technician_locations**: 师傅定位数据
- **user_reviews**: 用户评价数据
- **second_confirmations**: 二次确认数据
- **status_change_logs**: 状态变更审计日志
- **failed_records**: 失败数据记录表

## 目录结构

```
.
├── src/
│   ├── database/          # 数据库连接和表结构
│   ├── routes/            # API 路由
│   ├── services/          # 业务逻辑层
│   ├── types/             # TypeScript 类型定义
│   ├── utils/             # 工具函数（状态机、脱敏）
│   ├── validation/        # 数据校验 Schema
│   ├── scripts/           # 数据填充脚本
│   ├── tests/             # 测试用例
│   └── server.ts          # 服务入口
├── data/                  # 数据库文件
├── exports/               # 导出文件
├── package.json
├── tsconfig.json
└── README.md
```
