# 水务抢修材料验收回放链路服务

把派工单、阀门库存、现场照片和审批邮件转成能审计的处理记录。

## 快速开始

```bash
# 安装依赖
npm install

# 造数（生成测试数据，含夜间抢修场景）
npm run seed

# 启动服务
npm run dev

# 对账
npm run reconcile

# 导出报表
npm run export

# 回放异常
npm run replay

# 查看差异
npm run diff
```

## 目录结构

```
├── src/
│   ├── entities/           # 数据模型
│   │   ├── WorkOrder.ts    # 派工单
│   │   ├── ValveInventory.ts  # 阀门库存
│   │   ├── SitePhoto.ts    # 现场照片
│   │   ├── MaterialUsage.ts   # 材料使用
│   │   ├── ApprovalEmail.ts   # 审批邮件
│   │   ├── SupplierBill.ts    # 供应商账单
│   │   ├── BillItem.ts        # 账单明细
│   │   ├── DirtyRecord.ts     # 脏记录
│   │   ├── AuditSnapshot.ts   # 审计快照
│   │   └── Reconciliation.ts  # 对账记录
│   ├── services/          # 业务服务
│   │   ├── AuditService.ts     # 审计与差异
│   │   ├── DirtyRecordService.ts  # 脏记录处理
│   │   ├── ReconciliationService.ts  # 对账
│   │   └── ExportService.ts    # 导出
│   ├── routes/            # API路由
│   ├── scripts/           # 命令脚本
│   │   ├── seed.ts        # 造数
│   │   ├── reconcile.ts   # 对账
│   │   ├── export.ts      # 导出
│   │   ├── replay-errors.ts  # 回放异常
│   │   └── diff-check.ts  # 差异检查
│   ├── data-source.ts     # 数据库配置
│   └── index.ts           # 服务入口
├── examples/
│   └── http-requests.http  # HTTP请求示例
└── data/                   # SQLite数据库
```

## 核心链路

### 1. 造数 → 启动服务 → 发请求 → 对账 → 导出 → 回放异常

**命令行链路:**
```bash
# 步骤1: 造数（含5个工单，2个夜间抢修）
npm run seed

# 步骤2: 启动服务
npm run dev

# 步骤3: 对账
npm run reconcile

# 步骤4: 导出报表
npm run export

# 步骤5: 回放异常
npm run replay

# 步骤6: 查看差异
npm run diff
```

**HTTP链路示例** 见 [examples/http-requests.http](examples/http-requests.http)

### 2. 夜间抢修补录场景

| 时间点 | 动作 | 库存状态 | 问题 |
|--------|------|----------|------|
| 23:30 | 夜间报修，现场紧急用料 | 未出库 | - |
| 次日08:00 | 上班后补录库存 | 出库操作 | 操作时间与实际不同步 |
| 次日对账 | 工单vs库存vs账单 | 差异可能出现 | 数量/金额不一致 |

**系统自动处理:**
- 库存记录标记 `isBackfilled = true`
- 脏记录识别 `cross_day` 跨日
- 对账时显示补录标记

## 脏记录类型

| 类型 | 触发条件 | 示例 |
|------|----------|------|
| `missing_field` | 缺少必填字段 | 工单没有siteName |
| `cross_day` | 报修/完成跨日 | 23:30报修，次日02:00完成 |
| `name_changed` | 同编码不同名称 | VLV-001既叫"闸阀"又叫"阀门" |
| `amount_conflict` | 数量×单价≠总金额 | 2×100=200，但记录190 |
| `quantity_conflict` | 负库存或数量异常 | 结余为-5 |

**处理流程:**
1. 创建/更新时自动校验
2. 生成DirtyRecord，保存原始数据
3. 人工或自动修正
4. 应用修正后重新汇总

## 数据一致性保证

### 导出文件、详情接口、历史查询讲同一套事实

- **rawData字段**: 所有实体保存原始输入
- **AuditSnapshot**: 每次变更前后快照
- **diff字段**: 精确到字段级别的变更记录
- **operationId**: 跨表操作关联ID

### 查看变更历史

```bash
# 查看工单变更
GET /api/workorders/:id/history

# 查看审计快照
GET /api/audit/snapshots?targetType=work_order&targetId=xxx
```

## 重点关注：命令脚本、HTTP读写、本地持久化

### 命令脚本清单

| 命令 | 作用 | 输出 |
|------|------|------|
| `npm run seed` | 造数 | 5工单+库存+账单+异常 |
| `npm run reconcile` | 批量对账 | 匹配统计，差异明细 |
| `npm run export` | 导出全部 | 4个Excel到exports/ |
| `npm run replay` | 回放异常 | 异常统计+自动修复建议 |
| `npm run diff` | 差异检查 | 变更历史+字段对比 |

### 主要HTTP接口

```
工单:     GET/POST    /api/workorders
库存:     GET/POST    /api/inventory
对账:     POST        /api/reconciliation/workorder/:no
异常:     GET/POST    /api/dirty-records
审计:     GET         /api/audit/snapshots
导出:     POST        /api/export/*
```

### SQLite本地持久化

```
data/water-repair-audit.db
  ├── work_order          # 派工单
  ├── valve_inventory     # 阀门库存
  ├── material_usage      # 材料使用
  ├── supplier_bill       # 供应商账单
  ├── dirty_record        # 脏记录
  ├── audit_snapshot      # 审计快照
  └── reconciliation      # 对账记录
```

## 失败路径演示

### 场景1: 负库存（夜间抢修补录晚了）

**失败路径:**
1. 库存只有3个VLV-001
2. 夜间现场用了5个（没来得及出库）
3. 次日补录出库5个
4. 系统计算 balanceAfter = 3 - 5 = -2
5. 自动生成脏记录: `quantity_conflict`

**修正方式:**
```bash
# 1. 先做库存入库调整
POST /api/inventory
{ "operation": "in", "quantity": 5, ... }

# 2. 解决异常记录
POST /api/dirty-records/:id/resolve
{ "correctedData": { "balanceAfter": 3 } }
```

### 场景2: 金额计算错误

**失败路径:**
1. 材料: 数量2 × 单价100 = 200
2. 但人工录入 totalAmount = 190
3. 系统检测不一致
4. 生成脏记录: `amount_conflict`

**修正方式:**
```
correctedData: { "totalAmount": 200 }
```

## 报表变化追踪

每次导出前都会创建 `before_export` 审计快照，可以对比:
- 导出内容 vs 数据库当前值
- 本次导出 vs 上次导出
- 报表字段 vs 接口返回字段

Excel报表包含:
- `工单列表` + `材料明细`
- `库存记录`（含补录标记）
- `对账汇总` + `对账明细`
- `异常记录`（含原始数据和处理意见）

## 样例材料清单

| 编码 | 名称 | 规格 | 单价 |
|------|------|------|------|
| VLV-001 | DN50闸阀 | DN50,1.6MPa | 280.00 |
| VLV-002 | DN80闸阀 | DN80,1.6MPa | 450.00 |
| VLV-003 | DN100闸阀 | DN100,1.6MPa | 680.00 |
| PIPE-001 | PE管DN50 | DN50,1.0MPa | 85.00/米 |
| PIPE-002 | PE管DN80 | DN80,1.0MPa | 120.00/米 |
| FIT-001 | 弯头DN50 | 90度 | 25.00 |
| FIT-002 | 三通DN50 | 等径 | 35.00 |
| SEAL-001 | 橡胶密封圈 | DN50 | 8.50 |
