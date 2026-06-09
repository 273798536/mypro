## 1. 架构设计

```mermaid
graph TB
    subgraph "前端层 (React + Vite)"
        A["路由层 (react-router-dom)"]
        B["状态管理层 (zustand)"]
        C["页面组件层"]
        D["通用组件层"]
        E["工具函数层"]
    end
    subgraph "后端层 (Express)"
        F["路由控制器 (Routes)"]
        G["业务服务层 (Services)"]
        H["数据访问层"]
    end
    subgraph "数据层"
        I["内存数据存储 + JSON 文件持久化"]
    end
    subgraph "外部依赖"
        J["Three.js (@react-three/fiber)"]
        K["lucide-react"]
        L["Tailwind CSS 3"]
    end
    A --> B
    B --> C
    C --> D
    D --> E
    A --> F
    F --> G
    G --> H
    H --> I
    C --> J
    D --> K
    C --> L
```

## 2. 技术描述

- **前端**: React@18 + TypeScript + Vite + Tailwind CSS@3 + Zustand + react-router-dom + lucide-react + three + @react-three/fiber + @react-three/drei
- **初始化工具**: vite-init (react-express-ts 模板)
- **后端**: Express@4 + TypeScript (ESM)
- **数据存储**: 内存数据结构 + JSON 文件持久化（本地工作台，无需数据库）
- **图标**: lucide-react

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 重定向至剖切查看页（日常入口） |
| /records | 预演记录列表页 |
| /records/:id | 单条记录详情页（含修正、历史、追溯） |
| /section | 剖切查看页（日常入口） |
| /render-3d | 3D 渲染查看页 |
| /test | 重复导入测试场景 |

后端 API 路由前缀 `/api`：

| 路由 | 方法 | 用途 |
|------|------|------|
| /api/records | GET | 获取预演记录列表（支持过滤） |
| /api/records/:id | GET | 获取单条记录详情（含追溯链） |
| /api/records/:id | PUT | 修正记录（单位换算、备注、结论） |
| /api/records/:id/history | GET | 获取记录历史版本 |
| /api/records/import | POST | 导入记录（含防重校验） |
| /api/records/export | GET | 导出记录 CSV/JSON |
| /api/records/:id/trace | GET | 获取来源追溯链（透明遮挡误读验收用） |

## 4. API 类型定义

```typescript
// 单位类型
export type UnitType = 'meter' | 'feet' | 'lumen' | 'candela' | 'kelvin';

// 设备坐标
export interface DeviceCoord {
  fixtureId: string;
  x: number;
  y: number;
  z: number;
  unit: UnitType;
}

// 单位换算错误
export interface UnitError {
  field: string;
  originalValue: number;
  originalUnit: UnitType;
  expectedUnit: UnitType;
  correctedValue: number | null;
  message: string;
}

// 风险备注
export interface RiskNote {
  id: string;
  content: string;
  author: string;
  createdAt: string;
  linkedConclusionId: string | null;
}

// 最终结论
export interface Conclusion {
  id: string;
  content: string;
  author: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
  linkedRiskNoteId: string | null;
}

// 追溯节点
export interface TraceNode {
  id: string;
  type: 'source' | 'process' | 'result';
  title: string;
  description: string;
  timestamp: string;
  operator: string;
  metadata: Record<string, any>;
}

// 预演记录
export interface LightRecord {
  id: string;
  batchNo: string;
  fixtureName: string;
  coords: DeviceCoord;
  unitErrors: UnitError[];
  riskNotes: RiskNote[];
  conclusions: Conclusion[];
  traceChain: TraceNode[];
  hasDuplicate: boolean;
  duplicateOf: string | null;
  status: 'draft' | 'reviewing' | 'corrected' | 'finalized';
  createdAt: string;
  updatedAt: string;
  operator: string;
  isTransparentOcclusionMisread: boolean; // 验收用：透明遮挡误读标记
}

// 历史版本
export interface HistoryEntry {
  version: number;
  timestamp: string;
  operator: string;
  changes: Partial<LightRecord>;
  diff: string;
}
```

## 5. 后端架构

```mermaid
flowchart LR
    A["Express App"] --> B["/api/records Router"]
    B --> C["RecordController"]
    C --> D["RecordService"]
    D --> E["防重校验 (DedupeService)"]
    D --> F["追溯服务 (TraceService)"]
    D --> G["导出服务 (ExportService)"]
    D --> H["单位换算服务 (UnitConversionService)"]
    E --> I["JSON 持久化层"]
    F --> I
    G --> I
    H --> I
```

## 6. 数据模型

### 6.1 ER 图

```mermaid
erDiagram
    LIGHT_RECORD ||--o{ UNIT_ERROR : contains
    LIGHT_RECORD ||--o{ RISK_NOTE : contains
    LIGHT_RECORD ||--o{ CONCLUSION : contains
    LIGHT_RECORD ||--o{ TRACE_NODE : "trace chain"
    LIGHT_RECORD ||--o{ HISTORY_ENTRY : history
    LIGHT_RECORD ||--o| LIGHT_RECORD : "duplicate of"

    LIGHT_RECORD {
        string id PK
        string batchNo
        string fixtureName
        string status
        boolean hasDuplicate
        string duplicateOf FK
        boolean isTransparentOcclusionMisread
        string operator
        datetime createdAt
        datetime updatedAt
    }
    UNIT_ERROR {
        string field
        number originalValue
        string originalUnit
        string expectedUnit
        number correctedValue
        string message
    }
    RISK_NOTE {
        string id PK
        string content
        string author
        datetime createdAt
        string linkedConclusionId FK
    }
    CONCLUSION {
        string id PK
        string content
        string author
        datetime createdAt
        string status
        string linkedRiskNoteId FK
    }
    TRACE_NODE {
        string id PK
        string type
        string title
        string description
        datetime timestamp
        string operator
    }
    HISTORY_ENTRY {
        number version
        datetime timestamp
        string operator
        string changes
        string diff
    }
```

### 6.2 初始 Mock 数据

包含 15 条预演记录，其中：
- 5 条含单位换算错误（米/英尺/流明混用）
- 3 条重复导入标记（黄色预警）
- 1 条透明遮挡误读记录（用于验收倒查）
- 完整追溯链（来源→处理→结果）
- 每条记录包含设备坐标、风险备注、最终结论
