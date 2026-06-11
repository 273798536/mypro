## 1. 架构设计

```mermaid
flowchart TB
    subgraph "前端层"
        "React App" --> "剖面工作台页"
        "React App" --> "巡检记录页"
    end
    subgraph "状态层"
        "Zustand Store" --> "灯光数据"
        "Zustand Store" --> "筛选状态"
        "Zustand Store" --> "追溯快照"
    end
    subgraph "数据层"
        "Mock数据" --> "巡检记录"
        "Mock数据" --> "灯光参数"
        "Mock数据" --> "撤回记录"
    end
    "剖面工作台页" --> "Zustand Store"
    "巡检记录页" --> "Zustand Store"
    "Zustand Store" --> "Mock数据"
```

## 2. 技术说明

- **前端**：React@18 + TypeScript + Tailwind CSS@3 + Vite
- **初始化工具**：vite-init (react-ts模板)
- **后端**：无（纯前端，数据使用Mock）
- **状态管理**：Zustand
- **路由**：react-router-dom
- **图标**：lucide-react
- **CSV导出**：纯前端生成（Blob + download）

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 剖面工作台主页，含剖面画布+侧边说明+CSV面板 |
| /records | 巡检记录列表页，含筛选和异常标记 |

## 4. 数据模型

### 4.1 核心数据结构

```typescript
interface InspectionRecord {
  id: string
  photoUrl: string
  floor: string
  unit: string
  status: 'normal' | 'anomaly' | 'revoked'
  revokeReason?: string
  timestamp: string
  displayCaseId: string
  lights: LightPoint[]
}

interface LightPoint {
  id: string
  position: { x: number; y: number }
  type: 'top' | 'side' | 'bottom' | 'accent'
  colorTemp: number
  illuminance: number
  label: string
  isAnomaly: boolean
  anomalyNote?: string
}

interface FilterState {
  floor: string
  unit: string
  status: string[]
  needsConfirmation: boolean
  confirmationReason?: string
}

interface TraceSnapshot {
  id: string
  filterState: FilterState
  selectedObjectId: string | null
  timestamp: string
  canvasViewport: { x: number; y: number; zoom: number }
}
```

### 4.2 数据一致性机制

场景标注、侧边说明、CSV明细三处均从同一 Zustand store 的 `LightPoint[]` 渲染：
- **剖面画布标注**：读取 `position` + `label` + `isAnomaly`
- **侧边说明面板**：读取选中 `LightPoint` 的完整字段
- **CSV明细**：读取全部 `LightPoint[]` 生成表格

任何数据变更只修改 store，三处自动同步更新。

## 5. 楼层单位混写检测逻辑

```typescript
function detectMixedInput(input: string): {
  isMixed: boolean
  floor: string
  unit: string
  reason?: string
} {
  const mixedPattern = /^([0-9B]+[F层]?)[-_\s]*([A-Z]区?)$/i
  const match = input.match(mixedPattern)
  if (match) {
    return {
      isMixed: true,
      floor: match[1],
      unit: match[2],
      reason: '检测到楼层与单位混写，需要拆分为独立楼层和单位字段以确保筛选准确'
    }
  }
  return { isMixed: false, floor: input, unit: '' }
}
```

## 6. 截图追溯机制

1. 用户点击"截图追溯"时，将当前 `FilterState` + 选中对象ID + 画布视口状态打包为 `TraceSnapshot`
2. 将 `TraceSnapshot.id` 编码为短码，嵌入截图水印区域
3. 提供"还原追溯"功能：输入短码→查找 `TraceSnapshot`→还原筛选和视口
