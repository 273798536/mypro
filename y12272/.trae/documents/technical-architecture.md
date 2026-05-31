## 1. 架构设计

```mermaid
flowchart TB
    subgraph "前端层"
        A["React App"] --> B["3D管线主视图<br/>@react-three/fiber"]
        A --> C["侧边栏面板<br/>剖切/筛选/冲突"]
        A --> D["明细弹窗<br/>管线详情"]
        A --> E["导出模块<br/>截图+报告"]
        A --> F["协调记录<br/>处理追溯"]
    end
    subgraph "状态层"
        G["Zustand Store"] --> H["管线数据状态"]
        G --> I["筛选状态"]
        G --> J["冲突检测结果"]
        G --> K["剖切面状态"]
        G --> L["选中管线状态"]
        G --> M["协调记录状态"]
    end
    subgraph "数据层"
        N["管线模拟数据<br/>燃气/电力/雨水/给水/通信"]
        O["冲突检测引擎<br/>标高错配/旧图/交叉"]
        P["数据溯源标记<br/>原始材料/处理结果"]
    end
    A -.->|"读写"| G
    N --> O
    O --> J
```

## 2. 技术说明

- **前端框架**：React@18 + TypeScript + Vite
- **3D渲染**：three + @react-three/fiber + @react-three/drei + @react-three/postprocessing
- **样式方案**：tailwindcss@3
- **状态管理**：zustand
- **路由**：react-router-dom（单页面，预留扩展）
- **后端**：无（纯前端，数据使用模拟数据）
- **字体**：JetBrains Mono（数据）+ DM Sans（UI）

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 主页面，包含3D管线视图、侧边栏、冲突检测与导出功能 |

## 4. 数据模型

### 4.1 管线数据模型

```typescript
interface Pipeline {
  id: string
  name: string
  type: "gas" | "electric" | "stormwater" | "watersupply" | "telecom"
  version: string
  versionStatus: "current" | "superseded" | "draft"
  material: string
  diameter: number
  segments: PipelineSegment[]
  riskLevel: "high" | "medium" | "low"
  dataSource: "original" | "processed"
  sourceDescription: string
  lastUpdated: string
  color: string
}

interface PipelineSegment {
  id: string
  startPoint: [number, number, number]
  endPoint: [number, number, number]
  elevation: number
  depth: number
}

interface Conflict {
  id: string
  type: "elevation_mismatch" | "outdated_drawing" | "pipeline_crossing"
  severity: "critical" | "warning" | "info"
  description: string
  involvedPipelines: string[]
  location: [number, number, number]
  elevationExpected?: number
  elevationActual?: number
  status: "unresolved" | "in_progress" | "resolved"
  coordinationRecords: CoordinationRecord[]
}

interface CoordinationRecord {
  id: string
  conflictId: string
  action: string
  handler: string
  timestamp: string
  snapshotUrl?: string
  result: string
  pipelineChanges?: {
    pipelineId: string
    field: string
    oldValue: string
    newValue: string
  }[]
}

interface ClippingPlane {
  enabled: boolean
  position: [number, number, number]
  direction: "x" | "y" | "z"
}

interface FilterState {
  pipelineTypes: string[]
  versions: string[]
  riskLevels: string[]
  showConflictsOnly: boolean
}
```

### 4.2 模拟数据说明

- 5种管线类型各2-3条管线，共约12条管线
- 每条管线3-5个管段
- 预设6-8个冲突（标高错配2个、旧图未作废2个、管线交叉3个）
- 3-4条协调记录
