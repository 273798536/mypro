## 1. 架构设计

```mermaid
graph TB
    subgraph "前端层"
        A["React 18 SPA"]
        A1["组合管理页"]
        A2["风险预算页"]
        A3["修正留痕页"]
        A4["报告导出页"]
    end
    subgraph "状态管理层"
        B["Zustand Store"]
        B1["组合数据 Store"]
        B2["约束检查 Store"]
        B3["修正留痕 Store"]
        B4["报告 Store"]
    end
    subgraph "业务逻辑层"
        C["约束检查引擎"]
        C1["权重校验"]
        C2["行业超限校验"]
        C3["禁买标的校验"]
        D["风险计算引擎"]
        D1["波动率计算"]
        D2["最大回撤计算"]
        D3["风险分数计算"]
        E["修正留痕引擎"]
        E1["差异快照"]
        E2["时间线管理"]
    end
    subgraph "数据层"
        F["LocalStorage 持久化"]
        F1["组合数据"]
        F2["修正历史"]
        F3["报告归档"]
    end
    A --> B
    B --> C
    B --> D
    B --> E
    C --> B2
    D --> B2
    E --> B3
    B --> F
```

## 2. 技术说明
- 前端：React@18 + TypeScript + Tailwind CSS@3 + Vite
- 初始化工具：vite-init（react-ts 模板）
- 后端：无（纯前端，数据存 LocalStorage）
- 状态管理：Zustand
- 图表库：recharts
- 数据持久化：LocalStorage（组合、修正历史、报告归档）

## 3. 路由定义
| 路由 | 用途 |
|------|------|
| / | 组合管理页：样例导入、基金持仓编辑、行业分布 |
| /risk-budget | 风险预算页：约束检查、风险分数、图表 |
| /audit-trail | 修正留痕页：修正时间线、差异对比 |
| /report | 报告导出页：报告预览、导出、历史版本 |

## 4. 数据模型

### 4.1 数据模型定义

```mermaid
erDiagram
    Portfolio ||--o{ FundHolding : contains
    Portfolio ||--o{ AuditRecord : has
    Portfolio ||--o{ Report : generates
    FundHolding }o--|| IndustryClassification : belongs_to
    Portfolio {
        string id PK
        string name
        string description
        date createdAt
        date updatedAt
    }
    FundHolding {
        string id PK
        string portfolioId FK
        string fundCode
        string fundName
        number weight
        string industryId FK
        boolean isProhibited
    }
    IndustryClassification {
        string id PK
        string name
        number maxWeight
    }
    ConstraintCheck {
        string id PK
        string portfolioId FK
        string auditId FK
        string checkType
        boolean passed
        string detail
        date checkedAt
    }
    AuditRecord {
        string id PK
        string portfolioId FK
        string operation
        string field
        string oldValue
        string newValue
        string reason
        date createdAt
    }
    RiskBudget {
        string id PK
        string portfolioId FK
        number volatilityLimit
        number drawdownLimit
        number industryConcentration
    }
    Report {
        string id PK
        string portfolioId FK
        string content
        string version
        date generatedAt
    }
```

### 4.2 数据定义

#### FundHolding（基金持仓）
```typescript
interface FundHolding {
  id: string
  portfolioId: string
  fundCode: string
  fundName: string
  weight: number
  industryId: string
  industryName: string
  isProhibited: boolean
}
```

#### IndustryClassification（行业分类）
```typescript
interface IndustryClassification {
  id: string
  name: string
  maxWeight: number
}
```

#### ConstraintCheckResult（约束检查结果）
```typescript
interface ConstraintCheckResult {
  id: string
  auditId: string
  weightCheck: { passed: boolean; totalWeight: number; detail: string }
  industryCheck: { passed: boolean; violations: IndustryViolation[]; detail: string }
  prohibitedCheck: { passed: boolean; prohibitedFunds: string[]; detail: string }
  checkedAt: string
}
```

#### AuditRecord（修正留痕）
```typescript
interface AuditRecord {
  id: string
  portfolioId: string
  operation: string
  field: string
  oldValue: string
  newValue: string
  reason: string
  constraintCheckId: string
  createdAt: string
}
```

#### RiskBudget（风险预算配置）
```typescript
interface RiskBudget {
  id: string
  portfolioId: string
  volatilityLimit: number
  drawdownLimit: number
  industryConcentration: number
}
```

#### RiskScore（风险分数）
```typescript
interface RiskScore {
  concentration: number
  volatility: number
  drawdown: number
  liquidity: number
  compliance: number
  overall: number
  explanations: Record<string, string>
}
```

#### Report（报告）
```typescript
interface Report {
  id: string
  portfolioId: string
  version: string
  generatedAt: string
  constraintChecks: ConstraintCheckResult[]
  riskScore: RiskScore
  holdings: FundHolding[]
  riskBudget: RiskBudget
}
```

## 5. 核心算法

### 5.1 约束检查引擎
1. **权重检查**：遍历所有持仓权重，判断 sum(weights) === 100，容差 ±0.01
2. **行业超限检查**：按行业聚合权重，若某行业权重 > 该行业 maxWeight，标记违规
3. **禁买标的检查**：遍历持仓，若 isProhibited === true，标记违规

### 5.2 风险分数计算
- 集中度 = 1 - HHI（赫芬达尔指数），越高越分散
- 波动率 = sqrt(sum(wi^2 * σi^2 + 2*sum(wi*wj*σi*σj*ρij)))，简化为等权相关
- 回撤 = 基于历史模拟的最大回撤
- 流动性 = 加权平均赎回天数
- 合规 = 1 - 违规数 / 总检查项

### 5.3 修正留痕
- 每次编辑持仓/风险预算参数，自动生成 AuditRecord
- AuditRecord 记录：操作类型、修改字段、旧值、新值、触发原因（关联约束检查）
