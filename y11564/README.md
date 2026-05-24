# 酒店前台夜审权限追责台账服务

从入住单、押金流水、换房记录和扫码明细开始建账，完整记录半夜换房、延住导致的房费/押金/发票不同步处理过程。所有状态持久化存储，重启不丢失。

## 核心特性

- ✅ **数据持久化**：SQLite 存储，草稿/提交/驳回/确认/审计/导出全状态不丢失
- ✅ **完整追溯**：报表数字可追至单条记录，操作历史全程留痕
- ✅ **坏数据隔离**：校验失败数据存入失败列表，不影响汇总
- ✅ **单一事实源**：导出文件、详情接口、历史查询共用同一数据源
- ✅ **角色视图**：前台脱敏，财务/审计可见完整敏感字段
- ✅ **幂等保障**：重复提交不会产生脏数据
- ✅ **异常标记**：半夜换房自动标记同步问题，需人工核对

## 快速开始

### 1. 环境准备

```bash
# 安装依赖
npm install
```

### 2. 从空库启动服务

```bash
# 开发模式启动（自动建库建表）
npm run dev
```

服务启动后访问：http://localhost:3000/api/health

### 3. 准备样例数据

```bash
# 执行样例数据脚本
npm run seed
```

样例包含：
- 3 条完整台账（张三、李四、王五）
- 1 条半夜换房异常场景（李四 02:30 换房）
- 1 条完整驳回-重提-确认-审计流程（王五）
- 1 条坏数据失败记录

### 4. 走主流程

#### 方式一：API 调用

```bash
# 1. 创建入住单
curl -X POST http://localhost:3000/api/ledgers/check-in \
  -H "Content-Type: application/json" \
  -H "x-operator: 前台小王" \
  -H "x-role: front_desk" \
  -d '{
    "checkInNo": "CI20240524TEST",
    "guestName": "测试客人",
    "guestIdCard": "110101199001011234",
    "roomNo": "2001",
    "roomType": "豪华大床房",
    "checkInTime": "2024-05-24T14:30:00Z",
    "checkOutTime": "2024-05-26T12:00:00Z",
    "expectedDays": 2,
    "roomRate": 388
  }'

# 2. 添加押金
curl -X POST http://localhost:3000/api/ledgers/deposit \
  -H "Content-Type: application/json" \
  -H "x-operator: 前台小王" \
  -H "x-role: front_desk" \
  -d '{
    "depositNo": "DP20240524TEST",
    "checkInNo": "CI20240524TEST",
    "amount": 1000,
    "paymentMethod": "微信支付"
  }'

# 3. 提交审核
curl -X POST http://localhost:3000/api/ledgers/{ledgerId}/submit \
  -H "x-operator: 前台小王" \
  -H "x-role: front_desk"

# 4. 查看台账列表
curl "http://localhost:3000/api/ledgers?page=1&pageSize=10" \
  -H "x-role: finance"

# 5. 查看详情（含操作历史）
curl http://localhost:3000/api/ledgers/{ledgerId} \
  -H "x-role: auditor"
```

#### 方式二：运行测试脚本

```bash
# 运行完整流程测试
npm run test:flow
```

### 5. 制造异常场景

#### 场景 1：半夜换房（自动标记同步问题）

```bash
curl -X POST http://localhost:3000/api/ledgers/room-change \
  -H "Content-Type: application/json" \
  -H "x-operator: 夜班小张" \
  -H "x-role: front_desk" \
  -d '{
    "changeNo": "RC20240524MIDNIGHT",
    "checkInNo": "CI20240524TEST",
    "oldRoomNo": "2001",
    "newRoomNo": "2005",
    "oldRoomType": "豪华大床房",
    "newRoomType": "商务套房",
    "oldRoomRate": 388,
    "newRoomRate": 588,
    "changeTime": "2024-05-25T02:30:00Z",
    "changeReason": "客人投诉空调故障，深夜升级房型"
  }'
```

#### 场景 2：提交数据不完整（存入失败列表）

```bash
curl -X POST http://localhost:3000/api/ledgers/check-in \
  -H "Content-Type: application/json" \
  -H "x-operator: 测试员" \
  -H "x-role: front_desk" \
  -d '{
    "checkInNo": "",
    "guestName": "",
    "roomRate": -100
  }'

# 查看失败记录
curl "http://localhost:3000/api/failed-records?page=1&pageSize=10"
```

#### 场景 3：非法状态流转

```bash
# 已审计的台账不能再次提交
curl -X POST http://localhost:3000/api/ledgers/{auditedLedgerId}/submit \
  -H "x-operator: 测试员" \
  -H "x-role: front_desk"
```

### 6. 查看导出

```bash
# 导出台账列表
curl -X POST http://localhost:3000/api/export/ledgers \
  -H "Content-Type: application/json" \
  -H "x-operator: 财务员" \
  -H "x-role: finance" \
  -d '{}'

# 导出单条详情
curl -X POST http://localhost:3000/api/export/ledgers/{ledgerId} \
  -H "x-operator: 财务员" \
  -H "x-role: finance"

# 导出失败记录
curl -X POST http://localhost:3000/api/export/failed-records \
  -H "x-operator: 管理员" \
  -H "x-role: auditor"

# 查看已导出文件列表
curl http://localhost:3000/api/export/files

# 下载文件
curl -O http://localhost:3000/api/export/download/{filename}
```

导出文件保存在 `exports/` 目录下。

## API 接口说明

### 身份标识（Header）

| 字段 | 说明 | 可选值 |
|------|------|--------|
| `x-operator` | 操作人姓名 | 任意字符串 |
| `x-role` | 操作人角色 | `front_desk` / `supervisor` / `finance` / `auditor` |

### 台账操作

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/ledgers/check-in` | 创建入住单及台账 |
| POST | `/api/ledgers/deposit` | 添加押金流水 |
| POST | `/api/ledgers/room-change` | 添加换房记录 |
| POST | `/api/ledgers/:id/submit` | 提交审核 |
| POST | `/api/ledgers/:id/reject` | 驳回（需传 reason） |
| POST | `/api/ledgers/:id/confirm` | 二次确认 |
| POST | `/api/ledgers/:id/audit` | 夜审通过 |

### 查询接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/ledgers` | 台账列表（支持 status / hasSyncIssue 筛选） |
| GET | `/api/ledgers/:id` | 台账详情（含关联数据 + 脱敏） |
| GET | `/api/ledgers/:id/history` | 操作历史 |
| GET | `/api/failed-records` | 失败记录列表 |
| GET | `/api/report/summary` | 报表汇总 |

### 导出接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/export/ledgers` | 批量导出台账 |
| POST | `/api/export/ledgers/:id` | 导出单条台账详情 |
| POST | `/api/export/failed-records` | 导出失败记录 |
| GET | `/api/export/files` | 列出导出文件 |
| GET | `/api/export/download/:filename` | 下载文件 |

## 状态流转图

```
草稿(draft)
    ↓
提交(submitted) ←────┐
    ↓   ↓            │
驳回(rejected) → 重新提交
    ↓
确认(confirmed)
    ↓
审计(audited)
    ↓
导出(exported)
```

## 财务夜审重点查看

1. **角色视图**
   - 前台：身份证号脱敏显示
   - 财务/审计：可见完整敏感信息

2. **变更原因**
   - 查看 `histories` 表 `changeReason` 字段
   - 重点关注半夜换房、驳回重提的原因说明

3. **敏感字段处理**
   - 身份证号脱敏规则：前6位 + ******** + 后4位
   - 导出文件自动根据角色脱敏

4. **同步问题标记**
   - `hasSyncIssue = true` 的台账需人工核对
   - 半夜换房（00:00-06:00）自动标记异常

## 测试重点

### 1. 状态变化测试

```bash
npm run test:flow
```

验证：
- 合法状态流转（草稿→提交→驳回→重提→确认→审计）
- 非法状态流转被阻止
- 每次状态变更产生历史记录
- 版本号递增

### 2. 幂等性测试

验证：
- 相同入住单号重复提交被拒绝
- 相同押金单号重复提交被拒绝
- 相同换房单号重复提交被拒绝
- 失败后重试不产生脏数据

### 3. 数据一致性测试

验证：
- 台账余额 = 押金总额 - 房费总额 - 发票总额
- 导出文件数据 = 详情接口数据
- 汇总报表数据 = 单条记录之和
- 坏数据不进入汇总计算

## 目录结构

```
.
├── src/
│   ├── api/routes.ts          # API 路由
│   ├── database/connection.ts # 数据库连接
│   ├── services/
│   │   ├── ledger-service.ts  # 台账核心服务
│   │   └── export-service.ts  # 导出服务
│   ├── types/index.ts         # 类型定义
│   └── index.ts               # 服务入口
├── scripts/seed-data.ts       # 样例数据脚本
├── tests/main-flow.ts         # 主流程测试
├── data/                      # SQLite 数据库文件
├── exports/                   # 导出文件目录
└── README.md
```

## 数据表说明

| 表名 | 说明 |
|------|------|
| `ledgers` | 台账主表（状态、金额、版本） |
| `check_in_records` | 入住单记录 |
| `deposit_records` | 押金流水记录 |
| `room_change_records` | 换房记录 |
| `scan_code_records` | 扫码明细（预留） |
| `ledger_histories` | 操作历史（全量留痕） |
| `failed_records` | 失败记录（原始数据 + 原因） |

## 后续扩展

- [ ] 扫码明细录入接口
- [ ] 延住记录处理
- [ ] 发票金额同步
- [ ] 差异调整流程
- [ ] 每日夜审自动任务
