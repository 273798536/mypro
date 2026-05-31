## 1. 架构设计

```mermaid
flowchart TD
    subgraph "前端层"
        A["React SPA"] --> B["案件大厅页面"]
        A --> C["案件审查页面"]
        A --> D["报告复盘页面"]
    end
    subgraph "状态管理层"
        E["Zustand Store"] --> F["游戏状态"]
        E --> G["材料数据"]
        E --> H["判定记录"]
        E --> I["回放时间轴"]
    end
    subgraph "数据层"
        J["关卡数据 JSON"] --> K["保单卡模板"]
        J --> L["病历模板"]
        J --> M["发票模板"]
        J --> N["条款模板"]
        J --> O["陷阱规则"]
    end
    A --> E
    J --> A
```

纯前端架构，无后端服务。所有关卡数据和判定逻辑在前端完成，报告导出为JSON文件下载。

## 2. 技术说明

- 前端：React@18 + TypeScript + Tailwind CSS@3 + Vite
- 初始化工具：vite-init
- 后端：无（纯前端项目）
- 数据库：无（使用内存状态 + JSON静态数据）
- 状态管理：Zustand

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 案件大厅，案件列表和侦探档案 |
| /case/:id | 案件审查页面，材料审查和判定 |
| /report/:id | 报告与复盘页面，报告详情、链路追踪、回放、导出 |

## 4. 数据模型

### 4.1 数据模型定义

```mermaid
erDiagram
    "Case" ||--o{ "PolicyCard" : "contains"
    "Case" ||--o{ "MedicalRecord" : "contains"
    "Case" ||--o{ "Invoice" : "contains"
    "Case" ||--o{ "Clause" : "contains"
    "Case" ||--o{ "Trap" : "contains"
    "PolicyCard" ||--o{ "Judgment" : "judged_by"
    "MedicalRecord" ||--o{ "Judgment" : "judged_by"
    "Invoice" ||--o{ "Judgment" : "judged_by"
    "Clause" ||--o{ "Judgment" : "judged_by"
    "Judgment" ||--o{ "TrapHit" : "may_trigger"
    "Judgment" }o--|| "Report" : "included_in"
    "Report" ||--o{ "LinkageEntry" : "contains"
    "Report" ||--o{ "ReplayEvent" : "contains"

    "Case" {
        string id PK
        string title
        string description
        number difficulty
        number timeLimitSeconds
    }
    "PolicyCard" {
        string id PK
        string caseId FK
        string policyNumber
        string insuranceType
        number coverageAmount
        string effectiveDate
        string expirationDate
        number waitingPeriodDays
        string sourcePerson
        string importTime
    }
    "MedicalRecord" {
        string id PK
        string caseId FK
        string policyCardId FK
        string diagnosis
        string visitDate
        string hospitalName
        string sourcePerson
        string importTime
    }
    "Invoice" {
        string id PK
        string caseId FK
        string policyCardId FK
        string invoiceNumber
        number amount
        string invoiceDate
        boolean isDuplicate
        string sourcePerson
        string importTime
    }
    "Clause" {
        string id PK
        string caseId FK
        string clauseName
        string content
        string effectiveDate
        string expirationDate
        boolean isExpired
        string sourcePerson
        string importTime
    }
    "Trap" {
        string id PK
        string caseId FK
        string trapType
        string description
        string relatedMaterialIds
        string correctHandling
    }
    "Judgment" {
        string id PK
        string materialId FK
        string materialType
        string verdict
        string reason
        number timestamp
        boolean isCorrect
        string trapId FK
    }
    "TrapHit" {
        string id PK
        string judgmentId FK
        string trapId FK
        string trapType
        string explanation
    }
    "Report" {
        string id PK
        string caseId FK
        string generatedAt
    }
    "LinkageEntry" {
        string id PK
        string reportId FK
        string policyCardId FK
        string medicalRecordId FK
        string judgmentId FK
        string description
    }
    "ReplayEvent" {
        string id PK
        string reportId FK
        number timestamp
        string action
        string materialId
        string detail
    }
```

### 4.2 核心TypeScript类型

```typescript
type MaterialType = 'policyCard' | 'medicalRecord' | 'invoice' | 'clause'
type Verdict = 'approved' | 'rejected' | 'pending_review'
type TrapType = 'waiting_period' | 'invoice_duplicate' | 'clause_expired'

interface MaterialBase {
  id: string
  caseId: string
  sourcePerson: string
  importTime: string
}

interface PolicyCard extends MaterialBase {
  materialType: 'policyCard'
  policyNumber: string
  insuranceType: string
  coverageAmount: number
  effectiveDate: string
  expirationDate: string
  waitingPeriodDays: number
}

interface MedicalRecord extends MaterialBase {
  materialType: 'medicalRecord'
  policyCardId: string
  diagnosis: string
  visitDate: string
  hospitalName: string
}

interface Invoice extends MaterialBase {
  materialType: 'invoice'
  policyCardId: string
  invoiceNumber: string
  amount: number
  invoiceDate: string
  isDuplicate: boolean
}

interface Clause extends MaterialBase {
  materialType: 'clause'
  clauseName: string
  content: string
  effectiveDate: string
  expirationDate: string
  isExpired: boolean
}

interface Judgment {
  id: string
  materialId: string
  materialType: MaterialType
  verdict: Verdict
  reason: string
  timestamp: number
  isCorrect: boolean
  trapId?: string
}

interface Trap {
  id: string
  caseId: string
  trapType: TrapType
  description: string
  relatedMaterialIds: string[]
  correctHandling: string
  checkFn: (judgments: Judgment[]) => boolean
}

interface LinkageEntry {
  policyCardId: string
  medicalRecordId?: string
  invoiceId?: string
  clauseId?: string
  judgmentId: string
  description: string
}

interface ReplayEvent {
  timestamp: number
  action: string
  materialId?: string
  materialType?: MaterialType
  detail: string
}

interface GameReport {
  reportMeta: {
    caseId: string
    caseTitle: string
    detectiveName: string
    reviewTime: string
    timeUsed: number
  }
  policyCards: PolicyCard[]
  medicalRecords: MedicalRecord[]
  invoices: Invoice[]
  clauses: Clause[]
  judgments: Judgment[]
  traps: Array<{
    trapType: TrapType
    description: string
    relatedMaterialIds: string[]
    correctHandling: string
    wasTriggered: boolean
  }>
  linkageMap: LinkageEntry[]
  replayTimeline: ReplayEvent[]
}
```

## 5. 判定逻辑架构

### 5.1 陷阱检测规则

| 陷阱类型 | 检测逻辑 | 涉及材料 |
|----------|----------|----------|
| 等待期误判 | 病历就诊日期 - 保单生效日期 < 等待期天数 | 保单卡.waitingPeriodDays + 病历.visitDate + 保单卡.effectiveDate |
| 发票重复 | 同一案件内存在相同invoiceNumber的发票 | Invoice.invoiceNumber |
| 条款过期 | 条款expirationDate < 当前案件日期 | Clause.expirationDate + Case模拟日期 |

### 5.2 判定正确性校验

每项材料对应一个预期判定，玩家判定与预期匹配则为正确。陷阱类材料需额外校验玩家是否识别出陷阱。

## 6. 项目目录结构

```
src/
├── pages/
│   ├── CaseHall.tsx          # 案件大厅
│   ├── CaseReview.tsx        # 案件审查
│   └── ReportReplay.tsx      # 报告复盘
├── components/
│   ├── MaterialPanel.tsx     # 材料面板（标签切换）
│   ├── MaterialCard.tsx      # 单条材料卡片
│   ├── JudgmentPanel.tsx     # 判定操作台
│   ├── JudgmentFeedback.tsx  # 判定反馈弹窗
│   ├── Timer.tsx             # 计时器
│   ├── LinkageView.tsx       # 链路追踪可视化
│   ├── ReplayTimeline.tsx    # 回放时间轴
│   ├── ReportExport.tsx      # 报告导出
│   └── TrapAlert.tsx         # 陷阱提示
├── store/
│   └── gameStore.ts          # Zustand游戏状态
├── data/
│   └── cases.ts              # 关卡数据
├── utils/
│   ├── trapChecker.ts        # 陷阱检测逻辑
│   ├── judgmentValidator.ts  # 判定校验逻辑
│   └── reportExporter.ts     # 报告导出逻辑
└── types/
    └── index.ts              # TypeScript类型定义
```
