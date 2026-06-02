# 分段电价逆向核算系统

从总电费和电价表，逆向求解各档位用电量；对峰谷电价，使用峰谷平用量正向计算。
支持版本追踪、异常检测、数据溯源。

## 快速开始

```bash
npm install
npm run check          # TypeScript 类型检查
npm run dev            # 启动后端 (3001) + 前端 (Vite)
```

或分开启动：

```bash
npm run server:dev     # 后端 API: http://localhost:3001
npm run client:dev     # 前端: http://localhost:5173
```

## 核心功能

| 电价类型 | 计算模式 | 说明 |
|---------|---------|------|
| 阶梯电价 (step) | 逆向求解 (reverse) | 从总电费反推各档位用电量 |
| 峰谷电价 (tou) | 正向计算 (forward) | 用峰/谷/平时段用量 × 对应单价 |

### 异常检测

| 类型 | 级别 | 说明 |
|------|------|------|
| `expired_tariff` | warning | 电价表已过期 |
| `boundary_tier` | info | 用量恰好落在档位边界 |
| `negative_usage` | error | 用量为负，疑似抄表错误 |
| `missing_period_usage` | error | 峰谷时段用量缺失（tou 模式） |
| `period_sum_mismatch` | warning | 峰谷平用量之和与总用量不一致 |
| `bill_mismatch` | warning | 计算总电费与账单总电费不匹配 |

## API 接口

### 执行核算

```bash
curl -X POST http://localhost:3001/api/calculate \
  -H "Content-Type: application/json" \
  -d '{"tariffTableId":"tariff-003","usageRecordId":"usage-005","versionName":"测试"}'
```

### 其他接口

```bash
GET  /api/tariffs                     # 电价表列表
GET  /api/tariffs/:id                 # 电价表明细
GET  /api/usage-records               # 用电记录列表
GET  /api/usage-records/:id           # 用电记录明细
GET  /api/versions                    # 核算版本列表
GET  /api/versions/:id                # 核算版本明细
GET  /api/versions/:id/trace          # 版本溯源树
DELETE /api/versions/:id              # 删除版本
```

## 样例数据

### 阶梯电价（4条）

| 记录 | 场景 | 预期异常 |
|------|------|---------|
| `tariff-001` + `usage-001` | 正常记录 | mismatch_total:warning |
| `tariff-002` + `usage-002` | 电价表过期 | expired_tariff:warning |
| `tariff-001` + `usage-003` | 边界档位 | boundary_tier:info |
| `tariff-001` + `usage-004` | 用量为负 | negative_usage:error |

### 峰谷电价（3条）

| 记录 | 场景 | 预期异常 |
|------|------|---------|
| `tariff-003` + `usage-005` | 峰谷正常 | 无异常 |
| `tariff-003` + `usage-006` | 电费不符 | period_sum_mismatch + bill_mismatch |
| `tariff-003` + `usage-007` | 数据缺失 | missing_period_usage:error |

## 目录结构

```
.
├── api/
│   ├── server.ts              # Express 入口
│   ├── routes/
│   │   ├── calculate.ts       # /api/calculate
│   │   ├── tariffs.ts         # /api/tariffs
│   │   ├── usage-records.ts   # /api/usage-records
│   │   └── versions.ts        # /api/versions
│   └── services/
│       ├── ReverseCalculationEngine.ts   # 双模式核算引擎
│       ├── TariffService.ts              # 电价表服务
│       ├── UsageRecordService.ts         # 用电记录服务
│       └── VersionService.ts             # 版本快照服务
├── data/
│   ├── tariffs.json         # 电价表（含 type/periodType）
│   ├── usage-records.json   # 用电记录（含 peak/valley/flat）
│   └── versions/            # 核算版本快照
├── shared/
│   └── types.ts             # 共享类型定义
└── src/                     # React 前端
    ├── pages/
    │   ├── CalculatorWorkbench.tsx   # 核算工作台
    │   ├── DataImport.tsx            # 数据导入
    │   ├── VersionHistory.tsx        # 版本追踪
    │   └── DataManagement.tsx        # 管理数据
    └── store/
        └── useStore.ts               # Zustand 状态管理
```

## 验证脚本

```bash
# 1. 阶梯-正常
curl -s -X POST http://localhost:3001/api/calculate \
  -H "Content-Type: application/json" \
  -d '{"tariffTableId":"tariff-001","usageRecordId":"usage-001","versionName":"样例1"}'

# 2. 峰谷-正常
curl -s -X POST http://localhost:3001/api/calculate \
  -H "Content-Type: application/json" \
  -d '{"tariffTableId":"tariff-003","usageRecordId":"usage-005","versionName":"样例5"}'

# 3. 峰谷-电费不符
curl -s -X POST http://localhost:3001/api/calculate \
  -H "Content-Type: application/json" \
  -d '{"tariffTableId":"tariff-003","usageRecordId":"usage-006","versionName":"样例6"}'

# 4. 峰谷-数据缺失
curl -s -X POST http://localhost:3001/api/calculate \
  -H "Content-Type: application/json" \
  -d '{"tariffTableId":"tariff-003","usageRecordId":"usage-007","versionName":"样例7"}'
```
