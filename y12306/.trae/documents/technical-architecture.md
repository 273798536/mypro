## 1. 架构设计

```mermaid
graph TD
    subgraph "前端应用层"
        A["React SPA"]
        A1["菜品库管理模块"]
        A2["配餐优化模块"]
        A3["冲突追溯模块"]
        A4["报告导出模块"]
    end
    
    subgraph "状态管理层"
        B["Zustand Store"]
        B1["菜品状态"]
        B2["约束状态"]
        B3["求解状态"]
        B4["追溯状态"]
    end
    
    subgraph "核心算法层"
        C["整数规划求解器"]
        C1["约束建模"]
        C2["分支定界算法"]
        C3["冲突检测"]
        C4["多方案生成"]
    end
    
    subgraph "数据持久层"
        D["LocalStorage + IndexedDB"]
        D1["菜品数据"]
        D2["配置数据"]
        D3["历史方案"]
        D4["追溯日志"]
    end
    
    subgraph "可视化层"
        E["Chart.js + ECharts"]
        E1["营养雷达图"]
        E2["成本趋势图"]
        E3["追溯链路图"]
    end
    
    A --> B
    A1 --> B1
    A2 --> B2
    A2 --> C
    A3 --> B4
    A3 --> E3
    A4 --> E1
    A4 --> E2
    B --> C
    C --> C1
    C --> C2
    C --> C3
    C --> C4
    B --> D
    A --> E
```

## 2. 技术说明

- **前端框架**：React@18 + TypeScript@5
- **构建工具**：Vite@5
- **样式方案**：TailwindCSS@3 + SCSS
- **状态管理**：Zustand（轻量级，避免Redux复杂度）
- **路由管理**：React Router@6
- **UI组件库**：Ant Design@5（按需引入）
- **图表可视化**：ECharts@5（营养雷达图、成本分析）
- **整数规划**：自定义实现分支定界算法 + lpsolve.js（备选）
- **文件导出**：SheetJS (Excel) + jsPDF (PDF)
- **数据持久化**：IndexedDB (dexie.js) + LocalStorage
- **代码规范**：ESLint + Prettier

## 3. 路由定义

| 路由路径 | 页面名称 | 说明 |
|----------|----------|------|
| / | 首页/仪表盘 | 快捷入口、统计概览、最近方案 |
| /dishes | 菜品库管理 | 菜品列表、导入导出、详情编辑 |
| /optimizer | 配餐优化 | 约束配置、求解过程、结果展示 |
| /trace | 冲突追溯 | 冲突列表、追溯链路、方案对比 |
| /report | 报告导出 | 报告预览、多格式导出 |

## 4. 数据模型

### 4.1 数据模型定义

```mermaid
erDiagram
    DISH {
        string id PK
        string name
        string category
        string image
        number cost
        number portion
        object nutrition
        array allergens
        string source
        date createdAt
        date updatedAt
    }
    
    NUTRITION {
        number calories
        number protein
        number fat
        number carbs
        number fiber
        number calcium
        number iron
        number vitaminA
        number vitaminC
    }
    
    OPTIMIZATION_CONFIG {
        string id PK
        string name
        number budget
        number portionCount
        array categoryLimits
        object nutritionTargets
        array excludedAllergens
        array priorityRules
        date createdAt
    }
    
    OPTIMIZATION_RESULT {
        string id PK
        string configId FK
        array selectedDishes
        number totalCost
        object totalNutrition
        array conflicts
        array traceLogs
        number score
        string status
        date createdAt
    }
    
    CONFLICT_RECORD {
        string id PK
        string resultId FK
        string type
        number priority
        string description
        array involvedConstraints
        string resolution
        array alternativePlans
    }
    
    DISH ||--|| NUTRITION : contains
    OPTIMIZATION_RESULT }o--|| OPTIMIZATION_CONFIG : uses
    CONFLICT_RECORD }o--|| OPTIMIZATION_RESULT : belongs
```

### 4.2 TypeScript 类型定义

```typescript
// 菜品相关
interface Nutrition {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  calcium: number;
  iron: number;
  vitaminA: number;
  vitaminC: number;
}

interface Dish {
  id: string;
  name: string;
  category: '主食' | '荤菜' | '素菜' | '汤品' | '水果' | '奶制品';
  image?: string;
  cost: number;
  portion: number;
  nutrition: Nutrition;
  allergens: string[];
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

// 优化配置
interface NutritionTarget {
  nutrient: keyof Nutrition;
  min?: number;
  max?: number;
  weight: number;
}

interface PriorityRule {
  type: 'budget' | 'allergy' | 'nutrition' | 'category';
  priority: number;
  description: string;
}

interface OptimizationConfig {
  id: string;
  name: string;
  budget: number;
  portionCount: number;
  categoryLimits: { category: string; min?: number; max?: number }[];
  nutritionTargets: NutritionTarget[];
  excludedAllergens: string[];
  priorityRules: PriorityRule[];
  createdAt: Date;
}

// 优化结果
interface Conflict {
  id: string;
  type: 'budget_exceed' | 'allergy_violation' | 'nutrition_deficit' | 'category_violation';
  priority: number;
  description: string;
  involvedConstraints: string[];
  severity: 'high' | 'medium' | 'low';
}

interface TraceLog {
  step: number;
  timestamp: Date;
  type: 'constraint' | 'decision' | 'conflict' | 'resolution';
  description: string;
  details: Record<string, any>;
}

interface AlternativePlan {
  id: string;
  name: string;
  selectedDishes: string[];
  totalCost: number;
  tradeoffs: string[];
  score: number;
}

interface OptimizationResult {
  id: string;
  configId: string;
  selectedDishes: { dishId: string; quantity: number }[];
  totalCost: number;
  totalNutrition: Nutrition;
  conflicts: Conflict[];
  traceLogs: TraceLog[];
  alternativePlans: AlternativePlan[];
  score: number;
  status: 'optimal' | 'suboptimal' | 'infeasible';
  createdAt: Date;
}
```

## 5. 核心算法设计

### 5.1 整数规划求解器架构

```mermaid
graph TD
    A["输入: 菜品库 + 约束配置"] --> B["约束建模"]
    B --> C["生成目标函数"]
    C --> D["分支定界求解"]
    D --> E{"找到可行解?"}
    E -->|是| F["计算最优值"]
    E -->|否| G["冲突检测"]
    G --> H["松弛低优先级约束"]
    H --> D
    F --> I["生成备选方案"]
    I --> J["记录追溯日志"]
    J --> K["输出: 优化结果"]
```

### 5.2 冲突优先级判定规则
1. **过敏约束 (优先级1)** - 不可松弛，必须满足
2. **预算上限 (优先级2)** - 可轻微松弛，记录超限
3. **营养下限 (优先级3)** - 关键营养不可松弛，次要可调整
4. **品类数量 (优先级4)** - 可灵活调整

## 6. 项目目录结构

```
src/
├── assets/              # 静态资源
├── components/          # 通用组件
│   ├── DishCard.tsx
│   ├── NutritionRadar.tsx
│   ├── ConflictBadge.tsx
│   ├── TraceTimeline.tsx
│   └── ProgressRing.tsx
├── pages/               # 页面组件
│   ├── Dashboard.tsx
│   ├── DishLibrary/
│   │   ├── DishList.tsx
│   │   ├── DishDetail.tsx
│   │   └── ImportModal.tsx
│   ├── Optimizer/
│   │   ├── ConstraintForm.tsx
│   │   ├── SolverPanel.tsx
│   │   └── ResultDisplay.tsx
│   ├── TraceCenter/
│   │   ├── ConflictList.tsx
│   │   └── TraceViewer.tsx
│   └── Report/
│       ├── ReportPreview.tsx
│       └── ExportPanel.tsx
├── store/               # 状态管理
│   ├── dishStore.ts
│   ├── optimizerStore.ts
│   └── traceStore.ts
├── solver/              # 整数规划求解器
│   ├── types.ts
│   ├── model.ts
│   ├── branchAndBound.ts
│   ├── conflictDetector.ts
│   └── index.ts
├── utils/               # 工具函数
│   ├── export.ts
│   ├── nutrition.ts
│   └── validation.ts
├── hooks/               # 自定义Hooks
├── types/               # 类型定义
├── App.tsx
├── main.tsx
└── routes.tsx
```
