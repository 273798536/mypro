# 广告联盟结算扣量系统

## 项目介绍

这是一个功能完整的广告联盟结算扣量系统，支持广告渠道管理、曝光/点击/转化数据导入、异常检测、结算计算、差异对比、全链路追踪等核心功能。系统采用前后端分离架构，使用 React + Express + SQLite 技术栈，能够帮助广告平台高效完成渠道结算和异常数据处理。

### 核心功能

- **渠道管理**：支持多渠道费率配置、费率历史记录、渠道状态管理
- **数据导入**：支持批量导入曝光日志、点击日志、转化订单
- **异常检测**：自动检测点击缺失、异常点击、重复转化等异常情况
- **智能扣量**：基于规则引擎的灵活扣量配置，支持多种扣量类型
- **结算管理**：支持按时间段批量结算，支持多次结算对比
- **差异分析**：对比不同结算运行的差异，支持基线对比模式
- **全链路追踪**：从曝光→点击→转化的完整归因追踪
- **操作审计**：所有操作均有日志记录，支持 traceId 全链路追踪

## 技术栈

### 前端
- **框架**: React 18 + TypeScript
- **构建工具**: Vite 6
- **状态管理**: Zustand
- **样式方案**: Tailwind CSS 3
- **图表库**: Recharts
- **HTTP 客户端**: Axios
- **UI 组件**: Lucide React Icons

### 后端
- **框架**: Express 4
- **运行时**: Node.js
- **数据库**: SQLite (better-sqlite3)
- **文件处理**: Multer + csv-parser
- **类型安全**: TypeScript

### 开发工具
- **代码检查**: ESLint
- **类型检查**: TypeScript Compiler
- **运行工具**: tsx
- **热重载**: Nodemon
- **并发执行**: Concurrently

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 安装依赖

```bash
npm install
```

### 启动开发环境

```bash
# 同时启动前端和后端开发服务器
npm run dev
```

### 单独启动

```bash
# 仅启动前端 (端口 5173)
npm run client:dev

# 仅启动后端 (端口 3001)
npm run server:dev
```

### 构建生产版本

```bash
npm run build
```

### 代码检查

```bash
# ESLint 检查
npm run lint

# TypeScript 类型检查
npm run check
```

## 目录结构

```
y11810/
├── api/                          # 后端代码
│   ├── dao/                      # 数据访问层
│   │   ├── actionLogDAO.ts       # 操作日志 DAO
│   │   ├── channelDao.ts         # 渠道 DAO
│   │   ├── clickLogDAO.ts        # 点击日志 DAO
│   │   ├── conversionOrderDAO.ts # 转化订单 DAO
│   │   ├── dataDao.ts            # 数据导入 DAO
│   │   ├── deductionRuleDAO.ts   # 扣量规则 DAO
│   │   ├── exceptionDao.ts       # 异常 DAO
│   │   ├── exceptionRecordDAO.ts # 异常记录 DAO
│   │   ├── impressionLogDAO.ts   # 曝光日志 DAO
│   │   ├── rateHistoryDAO.ts     # 费率历史 DAO
│   │   ├── settlementDao.ts      # 结算 DAO
│   │   ├── settlementDetailDAO.ts# 结算明细 DAO
│   │   └── settlementRunDAO.ts   # 结算运行 DAO
│   ├── db/                       # 数据库层
│   │   ├── index.ts              # 数据库连接
│   │   ├── schema.ts             # 数据库 schema
│   │   └── seed.ts               # 初始化数据
│   ├── middleware/               # 中间件
│   │   ├── actionLog.ts          # 操作日志中间件
│   │   ├── auth.ts               # 认证中间件
│   │   ├── errorHandler.ts       # 错误处理中间件
│   │   └── trace.ts              # 追踪中间件
│   ├── routes/                   # 路由层
│   │   ├── auth.ts               # 认证路由
│   │   ├── bills.ts              # 账单路由
│   │   ├── channels.ts           # 渠道路由
│   │   ├── data.ts               # 数据路由
│   │   ├── exceptions.ts         # 异常路由
│   │   └── settlement.ts         # 结算路由
│   ├── services/                 # 服务层
│   │   ├── attributionService.ts # 归因服务
│   │   ├── deductionService.ts   # 扣量服务
│   │   ├── exceptionService.ts   # 异常检测服务
│   │   └── settlementService.ts  # 结算服务
│   ├── types/                    # 类型定义
│   ├── app.ts                    # Express 应用
│   ├── index.ts                  # 服务入口
│   └── server.ts                 # 本地开发服务器
├── scripts/                      # 脚本目录
│   ├── generateSampleData.ts     # 示例数据生成脚本
│   └── testSettlementFlow.ts     # 结算流程测试脚本
├── shared/                       # 共享类型
│   └── types/
│       └── index.ts              # 共享类型定义
├── src/                          # 前端代码
│   ├── api/                      # API 调用层
│   │   ├── bill.ts               # 账单 API
│   │   ├── channel.ts            # 渠道 API
│   │   ├── client.ts             # HTTP 客户端
│   │   ├── data.ts               # 数据 API
│   │   ├── exception.ts          # 异常 API
│   │   └── settlement.ts         # 结算 API
│   ├── assets/                   # 静态资源
│   ├── components/               # 组件
│   │   ├── Layout/               # 布局组件
│   │   └── common/               # 通用组件
│   ├── hooks/                    # 自定义 Hooks
│   ├── lib/                      # 工具库
│   ├── pages/                    # 页面组件
│   ├── store/                    # 状态管理
│   ├── utils/                    # 工具函数
│   │   ├── currency.ts           # 货币格式化工具
│   │   ├── date.ts               # 日期处理工具
│   │   └── trace.ts              # 追踪相关工具
│   ├── App.tsx                   # 根组件
│   ├── main.tsx                  # 入口文件
│   └── index.css                 # 全局样式
├── data/                         # 数据目录
│   ├── ad_network.db             # SQLite 数据库
│   └── sample_data.json          # 示例数据
├── .gitignore
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── vite.config.ts
└── README.md
```

## 核心功能说明

### 1. 渠道管理

系统支持多渠道管理，每个渠道可以独立配置费率。费率变更会自动记录历史，结算时根据转化时间自动匹配当时的费率。

### 2. 数据导入

支持批量导入三种数据：
- **曝光日志**：广告展示记录，包含 requestId、IP、UserAgent 等信息
- **点击日志**：用户点击记录，与曝光通过 requestId 关联
- **转化订单**：实际产生的订单，与点击通过 clickId 关联

### 3. 异常检测

系统自动检测以下异常情况：
- **点击缺失**：曝光后未产生对应的点击
- **异常点击**：高频点击、IP 异常、设备指纹异常等
- **重复转化**：相同订单号多次上报
- **规则变更**：扣量规则在结算周期内发生变更

### 4. 扣量规则

内置多种扣量规则，支持灵活配置：
- 异常点击扣量：100% 扣除异常点击产生的转化
- 重复转化扣量：100% 扣除重复订单
- IP 欺诈扣量：50% 扣除疑似欺诈 IP 的转化
- 时间异常扣量：30% 扣除点击后立即转化的订单

### 5. 结算流程

结算流程包括以下步骤：
1. 创建结算运行（指定渠道和时间范围）
2. 执行结算（自动归因、计算佣金、应用扣量规则）
3. 查看结算结果和明细
4. 导出结算明细（CSV 格式）
5. 确认结算

### 6. 差异对比

支持基线对比模式：
- 以某次结算为基线，创建新的结算运行
- 自动对比两次结算的差异
- 差异包括：新增/移除的转化、金额变化、扣量变化等

### 7. 全链路追踪

每条结算明细都包含完整的归因链路：
- 曝光记录 → 点击记录 → 转化记录
- 费率快照（结算时使用的费率）
- 扣量明细（应用的扣量规则和金额）

## 示例数据生成和测试方法

### 生成示例数据

系统提供了示例数据生成脚本，可以快速生成覆盖各种业务场景的测试数据。

```bash
# 仅生成示例数据文件（保存为 JSON）
npm run generate:sample

# 生成数据并直接插入数据库
npm run generate:sample -- --insert
# 或
npm run generate:sample -- -i
```

#### 生成的数据包括：
- **3 个渠道**：字节跳动（15%）、腾讯广告（12%）、快手（10%）
- **1000 条曝光日志**：时间范围 2026-05-19 至 2026-05-25
- **800 条点击日志**：其中 5% 为异常点击
- **150 条转化单**：其中 5% 为重复转化
- **两次结算运行**：第二次结算故意制造差异（新增转化、调整费率、修改扣量规则）

#### 数据保存位置：
```
data/sample_data.json
```

### 测试完整结算流程

系统提供了完整的结算流程测试脚本，覆盖从渠道创建到结算导出的全流程。

```bash
npm run test:flow
# 或
npm run test:api
```

#### 测试流程包括：

| 步骤 | 名称 | 说明 |
|------|------|------|
| 1 | 创建渠道并设置费率 | 创建测试渠道，费率 15% |
| 2 | 导入曝光日志 | 导入 500 条曝光数据 |
| 3 | 导入点击日志 | 导入 350 条点击数据，故意制造 80 条无曝光关联的点击 |
| 4 | 运行点击缺失检测 | 检测曝光与点击的匹配情况 |
| 5 | 导入转化单 | 导入 80 条转化数据，含 4 条重复转化 |
| 6 | 创建第一次结算运行 | 创建结算批次 |
| 7 | 执行第一次结算 | 自动归因、计算佣金、应用扣量 |
| 8 | 补充更多转化单 | 补充 25 条转化数据 |
| 9 | 调整费率 | 将费率从 15% 调整为 18%（生效日期 2026-05-22） |
| 10 | 创建第二次结算运行 | 以第一次结算为基线 |
| 11 | 执行第二次结算 | 使用新费率和新增数据重新结算 |
| 12 | 对比两次运行差异 | 自动对比并显示所有差异项 |
| 13 | 验证全链路追踪 | 检查归因链路和费率快照 |
| 14 | 导出结算明细 | 导出 CSV 格式的结算明细 |

#### 测试输出：
- 每一步的执行结果和耗时
- 关键数据指标（曝光数、点击数、转化数、结算金额等）
- 两次结算的差异对比
- 完整的测试执行总结表格

## 工具函数说明

### 货币格式化工具 (`src/utils/currency.ts`)

```typescript
// 格式化金额
formatCurrency(amount: number, currency?: string): string
// 示例: formatCurrency(1234.56) → "¥1,234.56"

// 格式化百分比
formatPercent(value: number): string
// 示例: formatPercent(0.15) → "15.00%"

// 格式化数字
formatNumber(num: number, decimals?: number): string
// 示例: formatNumber(1234.5678, 2) → "1,234.57"
```

### 日期处理工具 (`src/utils/date.ts`)

```typescript
// 格式化日期
formatDate(date: Date | string | number, format?: string): string
// 示例: formatDate(new Date(), 'YYYY-MM-DD') → "2026-05-28"

// 格式化日期时间
formatDateTime(date: Date | string | number): string
// 示例: formatDateTime(new Date()) → "2026-05-28 14:30:00"

// 获取最近 N 天的日期范围
getDateRange(days: number): { startDate: string; endDate: string }
// 示例: getDateRange(7) → { startDate: "2026-05-22", endDate: "2026-05-28" }

// 解析日期字符串
parseDate(dateStr: string): Date
// 示例: parseDate("2026-05-28") → Date 对象
```

### 追踪相关工具 (`src/utils/trace.ts`)

```typescript
// 生成 traceId
generateTraceId(): string

// 设置/获取当前 traceId
setTraceId(traceId: string | null): void
getTraceId(): string | null

// 设置/获取当前操作员
setOperator(operator: OperatorInfo | null): void
getOperator(): OperatorInfo | null

// 带追踪的 API 请求（自动记录操作日志）
traceRequest<T>(config: RequestConfig, actionName?: string): Promise<T>

// 记录操作日志
logAction(entry: ActionLogEntry): void

// 获取/清空操作日志
getActionLogs(): ActionLogEntry[]
clearActionLogs(): void

// 包装函数执行，自动管理 traceId
withTrace<T>(fn: () => Promise<T>, customTraceId?: string): Promise<T>
```

## 数据库 Schema

系统使用 SQLite 数据库，包含以下核心表：

- `channel` - 渠道表
- `rate_history` - 费率历史表
- `impression_log` - 曝光日志表
- `click_log` - 点击日志表
- `conversion_order` - 转化订单表
- `deduction_rule` - 扣量规则表
- `settlement_run` - 结算运行表
- `settlement_detail` - 结算明细表
- `deduction_item` - 扣量项目表
- `exception_record` - 异常记录表
- `action_log` - 操作日志表

## 开发说明

### 代码规范

- 使用 TypeScript 编写，确保类型安全
- 遵循 ESLint 代码规范
- 组件和函数应保持单一职责
- 所有脚本使用 ESM 模块

### 注意事项

- 数据库文件位于 `data/ad_network.db`
- 首次启动时会自动创建数据库表和初始化数据
- 测试脚本会清理测试数据，请在开发环境使用
- 所有 API 响应包含 `traceId`，可用于问题排查

## License

MIT
