## 1. 架构设计

```mermaid
flowchart TD
    "A[React 前端]" --> "B[Zustand 状态管理]"
    "B" --> "C[游戏引擎层（回合推进/事件触发/结算计算）]"
    "C" --> "D[关卡数据（静态JSON）]"
    "C" --> "E[套保计算器]"
    "C" --> "F[报表生成器]"
    "E" --> "G[风险提示引擎]"
    "F" --> "H[CSV/JSON 导出]"
```

纯前端架构，无后端服务。所有模拟逻辑在浏览器端完成。

## 2. 技术选型

- 前端框架：React@18 + TypeScript
- 构建工具：Vite
- 样式方案：Tailwind CSS@3
- 状态管理：Zustand
- 路由：react-router-dom@6
- 图标：lucide-react
- 字体：Google Fonts（Playfair Display + Noto Sans SC）
- 包管理器：npm

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| `/` | 关卡选择页 |
| `/simulate/:levelId` | 模拟主界面 |
| `/review/:levelId` | 结算复盘页 |

## 4. 数据模型

### 4.1 核心类型定义

```typescript
interface GameState {
  levelId: string;
  turn: number;
  maxTurns: number;
  cash: number;
  crops: Crop[];
  warehouse: Warehouse;
  futuresPositions: FuturesPosition[];
  spotOrders: SpotOrder[];
  weatherHistory: WeatherEvent[];
  riskAlerts: RiskAlert[];
  eventLog: EventLogEntry[];
  isFinished: boolean;
}

interface Crop {
  id: string;
  name: string;
  acreage: number;
  expectedYield: number;
  actualYield: number;
  growthStage: "种植" | "生长" | "成熟" | "收割";
  unitPrice: number;
}

interface Warehouse {
  currentStock: number;
  maxCapacity: number;
  unitStorageCost: number;
}

interface FuturesPosition {
  id: string;
  commodity: string;
  direction: "多头" | "空头";
  lots: number;
  contractMultiplier: number;
  openPrice: number;
  currentPrice: number;
  expiryTurn: number;
  isExpired: boolean;
  isSettled: boolean;
}

interface SpotOrder {
  id: string;
  buyer: string;
  commodity: string;
  quantity: number;
  agreedPrice: number;
  deliveryTurn: number;
  isDefaulted: boolean;
  defaultRatio: number;
}

interface WeatherEvent {
  turn: number;
  type: "正常" | "干旱" | "暴雨" | "好天气";
  yieldModifier: number;
  description: string;
}

interface RiskAlert {
  turn: number;
  level: "提示" | "警告" | "危险";
  category: "合约到期" | "仓储超限" | "现货违约" | "基差异常";
  message: string;
}

interface EventLogEntry {
  turn: number;
  timestamp: number;
  message: string;
  type: "info" | "warning" | "danger" | "success";
}
```

### 4.2 关卡配置数据结构

```typescript
interface LevelConfig {
  id: string;
  name: string;
  difficulty: 1 | 2 | 3;
  description: string;
  keyKnowledge: string;
  maxTurns: number;
  initialCash: number;
  crops: Omit<Crop, "actualYield" | "growthStage">[];
  warehouse: Warehouse;
  initialFutures: Omit<FuturesPosition, "currentPrice" | "isExpired" | "isSettled">[];
  initialSpotOrders: SpotOrder[];
  weatherSchedule: WeatherEvent[];
  priceSchedule: PriceSchedule;
  events: ScheduledEvent[];
}

interface PriceSchedule {
  [commodity: string]: {
    [turn: string]: number;
  };
}

interface ScheduledEvent {
  turn: number;
  type: string;
  payload: Record<string, unknown>;
}
```

### 4.3 结算与报表数据结构

```typescript
interface SettlementResult {
  futuresPnL: FuturesPnLDetail[];
  spotPnL: SpotPnLDetail[];
  storageCost: number;
  defaultLoss: number;
  initialCash: number;
  finalCash: number;
  netHedgingEffect: number;
  basisAnalysis: BasisAnalysisDetail[];
}

interface FuturesPnLDetail {
  positionId: string;
  commodity: string;
  direction: "多头" | "空头";
  openPrice: number;
  closePrice: number;
  lots: number;
  multiplier: number;
  pnl: number;
  conclusion: string;
}

interface SpotPnLDetail {
  orderId: string;
  commodity: string;
  agreedPrice: number;
  marketPrice: number;
  quantity: number;
  pnl: number;
  isDefaulted: boolean;
  defaultLoss: number;
  conclusion: string;
}

interface BasisAnalysisDetail {
  turn: number;
  commodity: string;
  spotPrice: number;
  futuresPrice: number;
  basis: number;
  basisChange: number;
}

interface ExportReport {
  levelId: string;
  levelName: string;
  completedAt: string;
  totalTurns: number;
  settlement: SettlementResult;
  riskAlerts: RiskAlert[];
  futuresConclusions: string[];
  summaryConclusion: string;
}
```

## 5. 套保计算引擎

### 5.1 计算流程

```mermaid
flowchart TD
    "A[回合结束]" --> "B[更新市场价格]"
    "B" --> "C[计算期货浮动盈亏]"
    "C" --> "D{合约是否到期?}"
    "D" --> "是" --> "E[标记到期 + 触发风险提示]"
    "D" --> "否" --> "F[继续持有]"
    "E" --> "G{学员选择平仓/交割?}"
    "G" --> "平仓" --> "H[按市价结算 + 记录结论]"
    "G" --> "交割" --> "I[实物交割流程 + 记录结论]"
    "F" --> "J[检查仓储]"
    "H" --> "J"
    "I" --> "J"
    "J" --> "K{仓储超限?}"
    "K" --> "是" --> "L[触发爆仓风险提示 + 计算额外成本]"
    "K" --> "否" --> "M[继续]"
    "L" --> "N[检查现货订单]"
    "M" --> "N"
    "N" --> "O{有违约事件?}"
    "O" --> "是" --> "P[计算违约损失 + 触发风险提示]"
    "O" --> "否" --> "Q[回合结算完成]"
    "P" --> "Q"
```

### 5.2 报表一致性保证

- 界面展示和导出文件使用同一个 `generateReport()` 函数生成数据
- 期货合约结论字符串在计算时即时生成，存入 `FuturesPnLDetail.conclusion`
- 导出时直接读取已计算结论，不做二次计算
- `ExportReport.futuresConclusions` 与界面展示的结论逐条对应

## 6. 项目结构

```
src/
├── components/
│   ├── CropPanel.tsx          # 作物地块面板
│   ├── WeatherBanner.tsx      # 天气事件横幅
│   ├── FuturesTable.tsx       # 期货持仓表
│   ├── SpotOrderBook.tsx      # 现货订单簿
│   ├── WarehouseGauge.tsx     # 仓储指示器
│   ├── ActionPanel.tsx        # 回合操作区
│   ├── EventLog.tsx           # 事件日志
│   ├── RiskAlertTimeline.tsx  # 风险提示时间线
│   ├── SettlementDetail.tsx   # 套保计算明细
│   ├── PnLSummary.tsx         # 综合损益表
│   └── ExportButton.tsx       # 报表导出按钮
├── pages/
│   ├── LevelSelect.tsx        # 关卡选择页
│   ├── Simulation.tsx         # 模拟主界面
│   └── Review.tsx             # 结算复盘页
├── store/
│   └── gameStore.ts           # Zustand 全局状态
├── engine/
│   ├── calculator.ts          # 套保计算引擎
│   ├── riskEngine.ts          # 风险提示引擎
│   ├── reportGenerator.ts     # 报表生成器
│   └── levelConfigs.ts        # 关卡配置数据
├── types/
│   └── index.ts               # 类型定义
├── App.tsx
└── main.tsx
```
