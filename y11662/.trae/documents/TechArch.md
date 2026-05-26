## 1. 架构设计

```mermaid
flowchart TD
    "UI层" --> "状态层(Zustand)"
    "UI层" --> "3D渲染层(React-Three-Fiber)"
    "状态层" --> "数据验证引擎"
    "3D渲染层" --> "场景管理(Three.js)"
    "数据验证引擎" --> "异常标记系统"
    "异常标记系统" --> "明细联动面板"
    "导出模块" --> "状态层"
```

## 2. 技术说明
- 前端：React@18 + TypeScript + Vite + Tailwind CSS@3
- 3D引擎：Three.js + @react-three/fiber + @react-three/drei + @react-three/postprocessing
- 状态管理：Zustand
- 图标：lucide-react
- 后端：无（纯前端应用，数据通过文件上传导入）
- 数据库：无（使用浏览器localStorage存储情景参数和修正历史）

## 3. 路由定义
| 路由 | 用途 |
|------|------|
| / | 主页面（3D瀑布图 + 所有面板） |

## 4. 数据模型

### 4.1 债券持仓数据模型
```typescript
interface BondHolding {
  bondCode: string;          // 债券代码
  bondName: string;          // 债券名称
  holdingAmount: number;     // 持仓金额
  rating: string;            // 评级 (AAA, AA, A, BBB, BB, B, CCC)
  duration: number;          // 久期
  yieldRate: number;         // 收益率
  issueDate: string;         // 发行日期
  maturityDate: string;      // 到期日期
  source: string;            // 数据来源（文件名）
  sourceLine: number;        // 原始行号
}
```

### 4.2 现金流数据模型
```typescript
interface CashFlow {
  id: string;
  bondCode: string;          // 关联债券
  flowDate: string;          // 现金流日期
  amount: number;            // 现金流金额（正为流入，负为流出）
  flowType: 'coupon' | 'principal' | 'call' | 'put';
  scenarioId: string;        // 关联情景
  source: string;            // 数据来源
  sourceLine: number;        // 原始行号
  anomaly?: AnomalyType;     // 异常标记
  anomalyDesc?: string;      // 异常描述
}
```

### 4.3 利率情景数据模型
```typescript
interface RateScenario {
  id: string;
  name: string;              // 情景名称（如"基准"、"加息50bp"、"降息50bp"）
  rateOffset: number;        // 利率偏移（基点）
  yieldCurve: number[];      // 收益率曲线数据
  description: string;       // 情景描述
  isActive: boolean;         // 是否当前激活
  createdAt: string;
  updatedAt: string;
}
```

### 4.4 修正历史模型
```typescript
interface CorrectionRecord {
  id: string;
  timestamp: string;
  field: string;             // 修正的字段
  oldValue: string;
  newValue: string;
  reason: string;            // 修正原因
  source: string;            // 来源位置
  sourceLine: number;        // 原始行号
  operator: string;           // 操作人
}
```

### 4.5 异常类型
```typescript
type AnomalyType = 
  | 'date_misalignment'       // 日期错位
  | 'scenario_duplicate'      // 情景重复
  | 'negative_cashflow'       // 负现金流
  | 'missing_rating'          // 缺失评级
  | 'outlier_amount'          // 金额异常
  | 'invalid_date_format';    // 日期格式无效
```

## 5. 项目结构

```
src/
├── components/
│   ├── three/
│   │   ├── WaterfallScene.tsx      # 3D场景主组件
│   │   ├── CashFlowBar.tsx         # 单根柱子组件
│   │   ├── AxisSystem.tsx          # 坐标轴系统
│   │   └── SceneLighting.tsx       # 光照配置
│   ├── panels/
│   │   ├── DataImportPanel.tsx     # 数据导入面板
│   │   ├── ScenarioSwitcher.tsx    # 情景切换面板
│   │   ├── DetailPanel.tsx         # 明细联动面板
│   │   ├── AnomalyBar.tsx          # 异常提示栏
│   │   └── ExportToolbar.tsx       # 导出工具栏
│   └── common/
│       ├── DataTable.tsx           # 通用数据表格
│       └── FileUpload.tsx          # 文件上传组件
├── hooks/
│   ├── useBondData.ts              # 债券数据处理Hook
│   ├── useCashFlowData.ts          # 现金流数据处理Hook
│   └── useScenario.ts              # 情景管理Hook
├── stores/
│   ├── bondStore.ts                # 债券数据状态
│   ├── scenarioStore.ts            # 情景状态
│   └── uiStore.ts                  # UI状态
├── utils/
│   ├── dataValidator.ts            # 数据验证引擎
│   ├── anomalyDetector.ts          # 异常检测引擎
│   ├── colorMapper.ts              # 颜色映射工具
│   ├── exportUtils.ts              # 导出工具
│   └── sampleData.ts               # 示例数据
├── types/
│   └── index.ts                    # 类型定义
└── pages/
    └── MainPage.tsx                # 主页面
```