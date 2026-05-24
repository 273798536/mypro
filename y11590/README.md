# 仓内波次缺货回补核算服务

保留波次单、拣货差异、复核扫描和库位占用异常记录，避免拆单后绩效和库存占用失真。

## 核心功能

- ✅ **波次管理**: 创建波次、状态流转、拣货记录
- ✅ **缺货处理**: 标记缺货、拆分回补任务、确认补拣
- ✅ **库存管理**: 库位占用、释放冻结、防重复释放
- ✅ **绩效核算**: 拣货绩效、回补绩效、重算机制
- ✅ **申诉流程**: 班组申诉、主管审核、缺货改判
- ✅ **审计追踪**: 操作历史、状态变更、幂等记录
- ✅ **报表导出**: 按班组/库区/商品维度差异表

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
npm start
# 或开发模式
npm run dev
```

服务地址: http://localhost:3000

### 4. 加载样例数据

```bash
npm run sample-data
```

样例包含三个典型场景：
- **场景1**: 部分补回（先补20再补10）
- **场景2**: 补拣失败（补货位也无货）
- **场景3**: 主管改判（申诉通过后修正缺货原因）

### 5. 运行测试

```bash
npm test
```

测试覆盖：
- `tests/idempotent.test.js`: 幂等性测试（防重复补录）
- `tests/state.test.js`: 状态机测试（防非法流转）
- `tests/consistency.test.js`: 数据一致性测试（历史/库存/报表）

---

## 完整请求流程

### 从空库到导出的标准流程

#### 步骤1: 创建波次

```bash
curl -X POST http://localhost:3000/api/waves \
  -H "Content-Type: application/json" \
  -H "x-operator: planner01" \
  -H "x-idempotent-key: wave-create-001" \
  -d '{
    "waveNo": "W20260525001",
    "warehouseCode": "WH001",
    "zoneCode": "ZONE-A",
    "teamCode": "TEAM-01",
    "createdBy": "planner01",
    "items": [
      { "skuCode": "SKU001", "skuName": "商品A", "locationCode": "A-01-01", "planQty": 100 },
      { "skuCode": "SKU002", "skuName": "商品B", "locationCode": "A-01-02", "planQty": 50 }
    ]
  }'
```

#### 步骤2: 记录拣货

```bash
curl -X POST http://localhost:3000/api/waves/{waveId}/picking \
  -H "Content-Type: application/json" \
  -H "x-operator: picker01" \
  -d '{
    "waveItemId": "{waveItemId}",
    "pickerCode": "picker01",
    "locationCode": "A-01-01",
    "skuCode": "SKU001",
    "planQty": 100,
    "actualQty": 70,
    "diffType": "SHORTAGE"
  }'
```

#### 步骤3: 复核标记缺货

```bash
curl -X POST http://localhost:3000/api/waves/{waveId}/shortage \
  -H "Content-Type: application/json" \
  -H "x-operator: reviewer01" \
  -H "x-idempotent-key: shortage-001" \
  -d '{
    "waveItemId": "{waveItemId}",
    "shortageQty": 30,
    "shortageReason": "INVENTORY_SHORTAGE",
    "reviewerCode": "reviewer01",
    "scanQty": 70
  }'
```

缺货原因可选:
- `INVENTORY_SHORTAGE`: 库存不足
- `LOCATION_ERROR`: 库位错误
- `SKU_DAMAGE`: 商品损坏
- `PICKER_ERROR`: 拣货员错误
- `SYSTEM_ERROR`: 系统错误
- `OTHER`: 其他

#### 步骤4: 创建回补任务

```bash
curl -X POST http://localhost:3000/api/waves/{waveId}/replenishment \
  -H "Content-Type: application/json" \
  -H "x-operator: planner01" \
  -H "x-idempotent-key: replenish-create-001" \
  -d '{
    "waveItemId": "{waveItemId}",
    "fromLocation": "B-01-01",
    "toLocation": "A-01-01",
    "shortageQty": 30,
    "skuCode": "SKU001"
  }'
```

**重要**: 同一商品存在未完成回补任务时，系统会拒绝重复创建。

#### 步骤5: 确认回补

```bash
# 部分回补
curl -X POST http://localhost:3000/api/waves/replenishment/{taskId}/confirm \
  -H "Content-Type: application/json" \
  -H "x-operator: replenisher01" \
  -H "x-idempotent-key: replenish-confirm-001" \
  -d '{
    "replenishQty": 20,
    "pickerCode": "replenisher01",
    "isPartial": true
  }'

# 完成剩余回补
curl -X POST http://localhost:3000/api/waves/replenishment/{taskId}/confirm \
  -H "Content-Type: application/json" \
  -H "x-operator: replenisher01" \
  -H "x-idempotent-key: replenish-confirm-002" \
  -d '{
    "replenishQty": 10,
    "pickerCode": "replenisher01"
  }'
```

**回补失败场景**:
```bash
curl -X POST http://localhost:3000/api/waves/replenishment/{taskId}/confirm \
  -H "Content-Type: application/json" \
  -H "x-operator: replenisher01" \
  -d '{
    "replenishQty": 0,
    "pickerCode": "replenisher01"
  }'
```
→ 系统自动释放库位占用，状态变为 `FAILED`

#### 步骤6: 重算绩效

```bash
curl -X POST http://localhost:3000/api/waves/{waveId}/performance/recalculate \
  -H "Content-Type: application/json" \
  -H "x-operator: supervisor" \
  -H "x-idempotent-key: perf-recalc-001" \
  -d '{}'
```

#### 步骤7: 班组申诉

```bash
curl -X POST http://localhost:3000/api/waves/{waveId}/appeals \
  -H "Content-Type: application/json" \
  -H "x-operator: picker01" \
  -d '{
    "waveItemId": "{waveItemId}",
    "appealReason": "实际是库位库存不准，非拣货员错误，有监控为证",
    "appellant": "picker01"
  }'
```

#### 步骤8: 主管审核改判

```bash
curl -X PATCH http://localhost:3000/api/waves/appeals/{appealId}/review \
  -H "Content-Type: application/json" \
  -H "x-operator: manager01" \
  -d '{
    "reviewResult": "APPROVED",
    "reviewComment": "申诉成立，改为系统库存误差",
    "correctShortage": true
  }'
```

→ 系统自动更新缺货原因并重算绩效，旧绩效标记为无效但保留记录。

#### 步骤9: 查看操作历史

```bash
curl http://localhost:3000/api/waves/{waveId}/history
```

#### 步骤10: 导出差异报表

```bash
# JSON格式
curl "http://localhost:3000/api/waves/report/variance?teamCode=TEAM-01"

# CSV导出
curl "http://localhost:3000/api/waves/report/variance/export?teamCode=TEAM-01" \
  -o variance_report.csv
```

查询参数:
- `teamCode`: 按班组筛选
- `zoneCode`: 按库区筛选
- `warehouseCode`: 按仓库筛选
- `skuCode`: 按商品筛选
- `hasShortage=1`: 只看有缺货的
- `startDate` / `endDate`: 日期范围

---

## API 接口列表

### 波次管理

| 方法 | 路径 | 说明 | 幂等 |
|------|------|------|------|
| POST | `/api/waves` | 创建波次 | ✅ |
| GET | `/api/waves` | 波次列表 | - |
| GET | `/api/waves/:waveId` | 波次详情 | - |
| GET | `/api/waves/no/:waveNo` | 按波号查询 | - |
| GET | `/api/waves/:waveId/full` | 完整详情（含所有关联） | - |
| PATCH | `/api/waves/:waveId/status` | 更新波次状态 | - |

### 拣货与缺货

| 方法 | 路径 | 说明 | 幂等 |
|------|------|------|------|
| POST | `/api/waves/:waveId/picking` | 记录拣货 | - |
| POST | `/api/waves/:waveId/shortage` | 标记缺货 | ✅ |

### 回补任务

| 方法 | 路径 | 说明 | 幂等 |
|------|------|------|------|
| POST | `/api/waves/:waveId/replenishment` | 创建回补任务 | ✅ |
| GET | `/api/waves/:waveId/replenishment` | 回补任务列表 | - |
| POST | `/api/waves/replenishment/:taskId/confirm` | 确认回补 | ✅ |

### 库位占用

| 方法 | 路径 | 说明 | 幂等 |
|------|------|------|------|
| GET | `/api/waves/:waveId/occupations` | 库位占用列表 | - |
| PATCH | `/api/waves/occupations/:occupationId/release` | 释放占用 | - |

### 绩效核算

| 方法 | 路径 | 说明 | 幂等 |
|------|------|------|------|
| POST | `/api/waves/:waveId/performance/recalculate` | 重算绩效 | ✅ |
| GET | `/api/waves/:waveId/performance` | 波次绩效 | - |
| GET | `/api/waves/performance/summary` | 绩效汇总 | - |

### 申诉管理

| 方法 | 路径 | 说明 | 幂等 |
|------|------|------|------|
| POST | `/api/waves/:waveId/appeals` | 创建申诉 | - |
| GET | `/api/waves/appeals` | 申诉列表 | - |
| PATCH | `/api/waves/appeals/:appealId/review` | 审核申诉 | - |
| PATCH | `/api/waves/:waveId/items/:waveItemId/shortage-reason` | 改判缺货原因 | ✅ |

### 审计与报表

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/waves/:waveId/history` | 操作历史 |
| GET | `/api/waves/report/variance` | 差异报表（JSON） |
| GET | `/api/waves/report/variance/export` | 差异报表（CSV导出） |

---

## 状态机说明

### 波次状态流转

```
CREATED → PICKING → REVIEWING → SHORTAGE → REPLENISHING → COMPLETED
                          ↓          ↓
                          └──────────┴──────────────────→ COMPLETED
```

状态说明:
- `CREATED`: 已创建
- `PICKING`: 拣货中
- `REVIEWING`: 复核中
- `SHORTAGE`: 缺货待处理
- `REPLENISHING`: 回补中
- `COMPLETED`: 已完成
- `CANCELLED`: 已取消

### 回补任务状态流转

```
PENDING → PICKING → PARTIAL → COMPLETED
              ↓         ↓
              └─────────┴──→ FAILED
```

---

## 关键设计要点

### 1. 幂等性保证

- 所有写操作支持 `x-idempotent-key` 请求头
- 相同幂等键重复请求直接返回首次结果
- 幂等记录存储在 `operation_history` 表中

### 2. 防重复补录

- 创建回补任务时检查未完成任务
- 同一商品只能有一个进行中的回补任务
- 状态机防止已完成任务重复确认

### 3. 库存占用管理

- 创建回补任务时自动占用源库位
- 回补完成/失败时自动释放
- 支持手动释放（异常场景）

### 4. 绩效可追溯

- 重算绩效时旧记录标记为无效但保留
- 可通过 `is_valid` 字段区分有效/无效
- 完整记录每次计算的时间和操作人

### 5. 主管改判机制

- 申诉通过后自动更新缺货原因
- 触发绩效重算，保证报表一致性
- 操作历史完整记录改判过程

---

## 数据库表结构

| 表名 | 说明 |
|------|------|
| `waves` | 波次单主表 |
| `wave_items` | 波次商品明细 |
| `picking_records` | 拣货记录 |
| `review_scans` | 复核扫描记录 |
| `replenishment_tasks` | 回补任务 |
| `location_occupations` | 库位占用记录 |
| `performance_records` | 绩效记录 |
| `operation_history` | 操作历史（含幂等键） |
| `appeals` | 申诉记录 |

---

## 目录结构

```
.
├── src/
│   ├── config/
│   │   └── database.js          # 数据库配置
│   ├── controllers/
│   │   └── waveController.js    # 接口控制器
│   ├── middleware/
│   │   ├── idempotent.js        # 幂等中间件
│   │   └── errorHandler.js      # 错误处理
│   ├── routes/
│   │   └── waves.js             # 路由定义
│   ├── services/
│   │   ├── waveService.js       # 波次服务
│   │   ├── replenishmentService.js  # 回补服务
│   │   ├── performanceService.js    # 绩效服务
│   │   ├── appealService.js     # 申诉服务
│   │   ├── reportService.js     # 报表服务
│   │   └── historyService.js    # 历史服务
│   ├── utils/
│   │   ├── constants.js         # 常量定义
│   │   └── helpers.js           # 工具函数
│   ├── app.js                   # Express应用
│   └── server.js                # 服务入口
├── scripts/
│   ├── init-db.js               # 数据库初始化
│   └── sample-data.js           # 样例数据
├── tests/
│   ├── idempotent.test.js       # 幂等性测试
│   ├── state.test.js            # 状态机测试
│   └── consistency.test.js      # 一致性测试
├── package.json
└── README.md
```

---

## 健康检查

```bash
curl http://localhost:3000/api/health
```

---

**注意**: 生产环境请替换 SQLite 为 MySQL/PostgreSQL，并添加认证鉴权中间件。
