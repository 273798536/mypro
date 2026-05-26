## 1. 架构设计

```mermaid
graph TD
    subgraph "前端应用层"
        A1["React SPA 单页应用"]
        A2["状态管理 (Zustand)"]
        A3["路由管理 (React Router)"]
        A4["UI 组件库 (Tailwind + Headless UI)"]
        A5["图表库 (Recharts)"]
    end

    subgraph "业务逻辑层"
        B1["数据导入模块"]
        B2["匹配引擎模块"]
        B3["汇损计算模块"]
        B4["异常检测模块"]
        B5["报表导出模块"]
    end

    subgraph "数据持久层"
        C1["IndexedDB (本地存储)"]
        C2["LocalStorage (配置)"]
        C3["CSV 导入/导出"]
    end

    subgraph "工具层"
        D1["日期处理 (date-fns)"]
        D2["币种换算"]
        D3["数据校验"]
        D4["唯一ID生成"]
    end

    A1 --> B1
    A1 --> B2
    A1 --> B3
    A1 --> B4
    A1 --> B5

    B1 --> C1
    B2 --> C1
    B3 --> C1
    B4 --> C1
    B5 --> C3

    B3 --> D1
    B3 --> D2
    B4 --> D3
    B1 --> D4
```

## 2. 技术选型

- **前端框架**：React@18 + TypeScript@5
- **构建工具**：Vite@5
- **样式方案**：TailwindCSS@3 + PostCSS
- **状态管理**：Zustand（轻量级，适合本地数据场景）
- **路由管理**：React Router@6
- **UI 组件**：Headless UI（无样式组件）+ Lucide React（图标）
- **图表库**：Recharts（React 友好，支持联动交互）
- **本地存储**：IndexedDB（dexie.js 封装）+ LocalStorage
- **日期处理**：date-fns（轻量，Tree-shaking 友好）
- **CSV 处理**：papaparse（解析）+ 自定义导出
- **数据校验**：zod（TypeScript 优先的校验库）

## 3. 目录结构

```
src/
├── components/          # 通用组件
│   ├── layout/         # 布局组件（侧边栏、顶部导航）
│   ├── ui/             # 基础UI组件（按钮、表格、卡片等）
│   ├── charts/         # 图表组件
│   └── forms/          # 表单组件
├── pages/              # 页面组件
│   ├── Dashboard.tsx   # 概览看板
│   ├── Import.tsx      # 数据导入
│   ├── Matching.tsx    # 到账匹配
│   ├── ExchangeLoss.tsx # 汇损明细
│   └── Rates.tsx       # 汇率管理
├── store/              # 状态管理
│   ├── useDataStore.ts # 核心数据store
│   └── useUIStore.ts   # UI状态store
├── services/           # 业务逻辑层
│   ├── importService.ts
│   ├── matchingService.ts
│   ├── exchangeService.ts
│   └── exportService.ts
├── db/                 # 数据库层
│   ├── dexie.ts        # IndexedDB 配置
│   └── schema.ts       # 数据模型定义
├── utils/              # 工具函数
│   ├── currency.ts     # 币种换算
│   ├── date.ts         # 日期处理
│   ├── validators.ts   # 数据校验
│   └── csv.ts          # CSV处理
├── types/              # TypeScript 类型定义
│   └── index.ts
├── hooks/              # 自定义Hooks
│   ├── useImport.ts
│   └── useExchange.ts
├── mock/               # Mock 数据
│   └── seed.ts         # 造数脚本
├── App.tsx
├── main.tsx
└── index.css
```

## 4. 路由定义

| 路由路径 | 页面名称 | 说明 |
|----------|----------|------|
| `/` | 概览看板 | 数据统计、趋势图表、异常概览 |
| `/import` | 数据导入 | 多类型数据导入、预览、查重 |
| `/matching` | 到账匹配 | 自动匹配结果、手动调整 |
| `/loss` | 汇损明细 | 汇损列表、异常标记、详情追溯 |
| `/rates` | 汇率管理 | 汇率维护、日期校验 |

## 5. 数据模型

### 5.1 ER 图

```mermaid
erDiagram
    CUSTOMER_ORDER ||--o{ MATCHING_RECORD : matches
    BANK_STATEMENT ||--o{ MATCHING_RECORD : matched_by
    PLATFORM_BILL ||--o{ MATCHING_RECORD : includes
    MATCHING_RECORD ||--|| EXCHANGE_LOSS : generates
    EXCHANGE_RATE ||--o{ EXCHANGE_LOSS : used_in
    EXCHANGE_LOSS ||--o{ AUDIT_LOG : has

    CUSTOMER_ORDER {
        string id PK
        string order_no
        string customer_name
        string currency
        decimal amount
        date order_date
        string source
        datetime created_at
    }

    BANK_STATEMENT {
        string id PK
        string transaction_no
        date transaction_date
        string currency
        decimal amount
        string bank_account
        string payer_info
        string source
        datetime created_at
    }

    PLATFORM_BILL {
        string id PK
        string bill_no
        string platform
        date bill_date
        string currency
        decimal gross_amount
        decimal fee_amount
        decimal net_amount
        string order_no
        string source
        datetime created_at
    }

    EXCHANGE_RATE {
        string id PK
        string from_currency
        string to_currency
        decimal rate
        date rate_date
        string source
        boolean is_manual
        datetime created_at
    }

    MATCHING_RECORD {
        string id PK
        string order_id FK
        string statement_id FK
        string bill_id FK
        decimal matched_amount
        string match_status
        decimal match_confidence
        boolean is_partial
        datetime matched_at
    }

    EXCHANGE_LOSS {
        string id PK
        string matching_id FK
        string rate_id FK
        decimal expected_amount
        decimal actual_amount
        decimal loss_amount
        decimal loss_rate
        string loss_type
        string anomaly_type
        string anomaly_description
        date calculation_date
        string status
    }

    AUDIT_LOG {
        string id PK
        string loss_id FK
        string field_name
        string old_value
        string new_value
        string operator
        datetime operated_at
        string remark
    }
```

### 5.2 核心数据结构定义

```typescript
// 客户订单
interface CustomerOrder {
  id: string;
  orderNo: string;
  customerName: string;
  currency: string;
  amount: number;
  orderDate: string;
  source: string;
  createdAt: string;
}

// 银行水单
interface BankStatement {
  id: string;
  transactionNo: string;
  transactionDate: string;
  currency: string;
  amount: number;
  bankAccount: string;
  payerInfo: string;
  source: string;
  createdAt: string;
}

// 平台账单
interface PlatformBill {
  id: string;
  billNo: string;
  platform: string;
  billDate: string;
  currency: string;
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  orderNo: string;
  source: string;
  createdAt: string;
}

// 汇率
interface ExchangeRate {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  rateDate: string;
  source: string;
  isManual: boolean;
  createdAt: string;
}

// 匹配记录
type MatchStatus = 'full' | 'partial' | 'unmatched' | 'manual';

interface MatchingRecord {
  id: string;
  orderId: string;
  statementId: string;
  billId?: string;
  matchedAmount: number;
  matchStatus: MatchStatus;
  matchConfidence: number;
  isPartial: boolean;
  matchedAt: string;
}

// 汇损记录
type LossType = 'normal' | 'fee' | 'rate' | 'partial';
type AnomalyType = 'none' | 'rate_date_mismatch' | 'partial_receipt' | 'fee_deducted' | 'duplicate' | 'rate_abnormal';

interface ExchangeLoss {
  id: string;
  matchingId: string;
  rateId: string;
  expectedAmount: number;
  actualAmount: number;
  lossAmount: number;
  lossRate: number;
  lossType: LossType;
  anomalyType: AnomalyType;
  anomalyDescription: string;
  calculationDate: string;
  status: 'pending' | 'confirmed' | 'adjusted';
}

// 审计日志
interface AuditLog {
  id: string;
  lossId: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  operator: string;
  operatedAt: string;
  remark: string;
}
```

## 6. 核心算法说明

### 6.1 匹配算法
- **主键匹配**：通过订单号关联订单、水单、账单
- **金额匹配**：允许 ±1% 容差的金额模糊匹配
- **日期匹配**：交易日期前后7天内的时间窗口匹配
- **置信度计算**：多维度加权评分，超过80分自动匹配

### 6.2 汇损计算
```
预期到账金额 = 订单外币金额 × 订单日汇率
实际到账金额 = 水单到账金额 - 平台手续费
汇损金额 = 预期到账金额 - 实际到账金额
汇损率 = 汇损金额 / 预期到账金额 × 100%
```

### 6.3 异常检测规则
- **汇率日期异常**：使用的汇率日期与交易日期相差超过3天
- **部分到账**：实际到账金额 < 订单金额的95%
- **手续费内扣**：手续费占比超过正常范围（>5%）
- **重复导入**：相同交易号、金额、日期的记录已存在
- **汇率异常**：当日汇率与近30天平均汇率偏差超过10%
