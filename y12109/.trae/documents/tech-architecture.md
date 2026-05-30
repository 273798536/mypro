## 1. 架构设计

```mermaid
flowchart TB
    "前端 React" --> "模拟引擎 (纯前端计算)"
    "前端 React" --> "状态管理 Zustand"
    "模拟引擎" --> "Chart.js 可视化"
    "模拟引擎" --> "风险诊断模块"
    "风险诊断模块" --> "材料追溯结果"
```

纯前端架构，所有模拟计算在浏览器端完成，无需后端服务。

## 2. 技术说明

- 前端：React@18 + TypeScript + Tailwind CSS@3 + Vite
- 初始化工具：vite-init
- 后端：无（纯前端）
- 数据：本地 CSV 粘贴/上传，内存计算
- 图表：Chart.js + react-chartjs-2
- 状态管理：Zustand

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 模拟工作台（保单导入、参数配置、模拟运行、结果展示） |
| /diagnostics | 风险诊断面板（材料追溯、参数敏感度） |

## 4. 数据模型

### 4.1 保单样本数据结构

```typescript
interface PolicySample {
  id: string;
  premium: number;
  sumInsured: number;
  claimCount: number;
  claimAmounts: number[];
  lineOfBusiness: string;
}

interface SimulationParams {
  deductible: number;
  limit: number;
  expenseRatio: number;
  safetyLoading: number;
  iterations: number;
}

interface SimulationResult {
  purePremium: number;
  grossPremium: number;
  combinedRatio: number;
  var95: number;
  var99: number;
  tvar95: number;
  tvar99: number;
  lossDistribution: number[];
  extremeClaims: ExtremeClaim[];
  sampleWarnings: SampleWarning[];
}

interface ExtremeClaim {
  simulationIndex: number;
  rawAmount: number;
  cappedAmount: number;
  deductibleApplied: number;
  sourcePolicyId: string;
  sourceField: string;
  severity: 'high' | 'critical';
}

interface SampleWarning {
  type: 'insufficient_sample' | 'deductible_boundary' | 'thin_tail';
  message: string;
  affectedPolicies: string[];
  suggestedAction: string;
}
```

## 5. 模拟引擎核心模块

### 5.1 赔付频率估计

从保单样本的总索赔次数和保单数估计 λ = Σ(claims) / Σ(exposure)

### 5.2 赔付金额抽样

1. 从样本赔付金额构建经验 CDF
2. 用逆变换法抽样：U~Uniform(0,1) → X = F⁻¹(U)
3. 尾部（超过样本最大值的概率）用 Pareto 分布补充：P(X > x) = (x_m / x)^α

### 5.3 免赔限额应用

```
adjusted_claim(claim, deductible, limit) = 
  if claim <= deductible: 0 (被免赔拦截)
  else if claim - deductible >= limit: limit (被限额封顶)
  else: claim - deductible
```

### 5.4 极端赔付拦截诊断

1. 每次模拟中，记录超过 99 分位数的赔付
2. 反查该赔付对应的源保单ID和材料字段
3. 标注拦截类型：被免赔拦截 / 被限额拦截 / 未被拦截但异常大
4. 当某份保单在多次模拟中反复出现极端赔付，标注为高风险来源

### 5.5 样本不足检测

- 样本总量 < 30：标注"样本不足，频率估计不可靠"
- 尾部数据点（超过 90 分位数）< 5：标注"尾部稀疏，极端赔付估计不可靠"
- 免赔额附近数据密度不足：标注"免赔边界数据稀疏，建议补充该区间样本"
