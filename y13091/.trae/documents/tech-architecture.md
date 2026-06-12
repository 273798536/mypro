## 1. 架构设计

```mermaid
graph TD
    "前端 React SPA" --> "Mock数据层"
    "前端 React SPA" --> "localStorage 筛选持久化"
    "Mock数据层" --> "传感器记录数据"
    "Mock数据层" --> "接口返回模拟"
    "前端 React SPA" --> "3D渲染引擎"
    "3D渲染引擎" --> "Three.js / R3F"
```

## 2. 技术说明

- 前端：React@18 + TailwindCSS@3 + Vite
- 初始化工具：Vite + React + TypeScript 模板
- 3D渲染：three + @react-three/fiber + @react-three/drei + @react-three/postprocessing
- 后端：无（纯前端，使用Mock数据）
- 数据库：无（使用内存数据 + localStorage持久化筛选条件）

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 时序回放主页面（单页应用，无需多路由） |

## 4. 数据模型

### 4.1 传感器记录（SensorRecord）

```typescript
interface SensorRecord {
  id: string
  sensorName: string
  apiReturnName: string
  sensorType: "deflection" | "strain" | "crack" | "temperature"
  timeSegments: TimeSegment[]
  status: "processed" | "pending_material" | "manual_judgment"
  manualNote: string
  position3D: { x: number; y: number; z: number }
}

interface TimeSegment {
  start: string
  end: string
  isGap: boolean
  values: number[]
}
```

### 4.2 筛选条件（FilterState）

```typescript
interface FilterState {
  sensorTypes: string[]
  timeRange: { start: string; end: string }
  statuses: string[]
}
```

### 4.3 接口返回项（ApiReturnItem）

```typescript
interface ApiReturnItem {
  recordId: string
  sensorName: string
  apiReturnName: string
  timestamp: string
  status: "processed" | "pending_material" | "manual_judgment"
  filterSnapshot: FilterState
  manualNote: string
  nameMismatch: boolean
}
```

### 4.4 Mock数据

```typescript
const MOCK_RECORDS: SensorRecord[] = [
  {
    id: "S-001",
    sensorName: "挠度传感器-A3",
    apiReturnName: "挠度传感器-A3",
    sensorType: "deflection",
    timeSegments: [
      { start: "2025-03-10 08:00", end: "2025-03-10 08:30", isGap: false, values: [...] }
    ],
    status: "processed",
    manualNote: "",
    position3D: { x: 5, y: 2, z: 0 }
  },
  {
    id: "S-002",
    sensorName: "应变传感器-B7",
    apiReturnName: "应变传感器-B7",
    sensorType: "strain",
    timeSegments: [
      { start: "2025-03-10 09:00", end: "2025-03-10 09:10", isGap: false, values: [...] },
      { start: "2025-03-10 09:10", end: "2025-03-10 09:15", isGap: true, values: [] },
      { start: "2025-03-10 09:15", end: "2025-03-10 09:25", isGap: false, values: [...] }
    ],
    status: "pending_material",
    manualNote: "09:10-09:15数据缺失，需补录",
    position3D: { x: -3, y: 1, z: 5 }
  },
  {
    id: "S-003",
    sensorName: "裂缝监测-C5",
    apiReturnName: "裂缝-C5",
    sensorType: "crack",
    timeSegments: [
      { start: "2025-03-10 10:00", end: "2025-03-10 10:20", isGap: false, values: [...] }
    ],
    status: "manual_judgment",
    manualNote: "接口返回名称'裂缝-C5'与录入'裂缝监测-C5'不一致，人工改判为同一传感器",
    position3D: { x: 8, y: 3, z: -2 }
  },
  {
    id: "S-004",
    sensorName: "温湿度-D2",
    apiReturnName: "温湿度-D2",
    sensorType: "temperature",
    timeSegments: [
      { start: "2025-03-10 11:00", end: "2025-03-10 11:15", isGap: false, values: [...] }
    ],
    status: "processed",
    manualNote: "",
    position3D: { x: -6, y: 4, z: -3 }
  }
]
```

## 5. 组件架构

```mermaid
graph TD
    "App" --> "FilterPanel 筛选面板"
    "App" --> "TimelineView 时间轴"
    "App" --> "DetailPanel 侧边明细"
    "App" --> "BridgeModel3D 3D模型"
    "App" --> "ApiReturnPanel 接口返回面板"
    "TimelineView" --> "TimelineSegment 时间段落"
    "ApiReturnPanel" --> "ReturnCard 返回卡片"
    "BridgeModel3D" --> "SensorMarker 传感器标记"
```

## 6. 状态管理

使用 React Context + useReducer 管理全局状态：

- `filterState`: 当前筛选条件（持久化到localStorage）
- `selectedRecordId`: 当前选中的传感器记录ID
- `selectedSegmentIndex`: 当前选中的时间轴段落索引
- `records`: 传感器记录列表
- `apiReturns`: 接口返回列表

关键联动逻辑：
1. 筛选条件变更 → 更新时间轴显示 + 同步到接口返回面板的筛选快照
2. 时间轴段落点击 → 更新selectedRecordId + selectedSegmentIndex → 触发侧边明细更新 + 3D高亮更新
3. 人工备注编辑 → 同步更新记录状态 + 接口返回面板对应条目
