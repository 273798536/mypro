## 1. 架构设计

```mermaid
graph TD
    subgraph "前端层"
        A["React 18 + TypeScript"] --> B["Three.js / @react-three/fiber"]
        A --> C["Zustand 状态管理"]
        A --> D["Tailwind CSS"]
        B --> E["3D冷库场景"]
        B --> F["温度色带渲染"]
        B --> G["探头交互"]
    end
    subgraph "数据层"
        C --> H["Mock数据服务"]
        H --> I["温场报告数据"]
        H --> J["风机状态数据"]
        H --> K["货架模型数据"]
        H --> L["探头数据（含离线脏样本）"]
    end
```

## 2. 技术说明

- **前端框架**：React@18 + TypeScript + Vite
- **初始化工具**：vite-init（react-ts 模板）
- **3D渲染**：three + @react-three/fiber + @react-three/drei + @react-three/postprocessing
- **状态管理**：Zustand
- **样式方案**：Tailwind CSS@3
- **后端**：无（纯前端，Mock数据）
- **数据库**：无（前端内嵌JSON样例数据）

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 3D温场巡检主界面（唯一页面，所有功能集成） |

## 4. 数据模型

### 4.1 数据模型定义

```mermaid
erDiagram
    "ColdStorage" {
        string id "冷库ID"
        string name "冷库名称"
        float width "宽度(m)"
        float depth "深度(m)"
        float height "高度(m)"
    }
    "Shelf" {
        string id "货架ID"
        string coldStorageId "所属冷库"
        int layerCount "层数"
        float posX "X坐标"
        float posZ "Z坐标"
        string sourceFile "模型来源文件"
    }
    "Probe" {
        string id "探头ID"
        string shelfId "所属货架"
        int layer "所在层"
        float posX "X坐标"
        float posY "Y坐标"
        float posZ "Z坐标"
    }
    "ProbeReading" {
        string id "记录ID"
        string probeId "探头ID"
        string timestamp "时间戳"
        float temperature "温度(°C)"
        string status "状态: online|offline|overtemp"
        string sourceReportId "温场报告编号"
    }
    "Fan" {
        string id "风机ID"
        string coldStorageId "所属冷库"
        float posX "X坐标"
        float posY "Y坐标"
        float posZ "Z坐标"
    }
    "FanStatus" {
        string id "记录ID"
        string fanId "风机ID"
        string timestamp "时间戳"
        string status "状态: running|stopped"
        string sourceRecordId "状态记录ID"
    }
    "AnomalyEvent" {
        string id "事件ID"
        string timestamp "时间戳"
        string type "类型: probe_offline|fan_stopped|product_occlusion"
        string description "描述"
        string relatedProbeId "关联探头"
        string relatedFanId "关联风机"
        string sourceId "来源ID"
        string sourceType "来源类型: shelf_model|fan_status|temp_report"
    }
    "ColdStorage" ||--o{ "Shelf" : "包含"
    "ColdStorage" ||--o{ "Fan" : "包含"
    "Shelf" ||--o{ "Probe" : "安装"
    "Probe" ||--o{ "ProbeReading" : "产生"
    "Fan" ||--o{ "FanStatus" : "产生"
```

### 4.2 核心TypeScript类型

```typescript
type ProbeStatus = 'online' | 'offline' | 'overtemp'
type FanStatus = 'running' | 'stopped'
type AnomalyType = 'probe_offline' | 'fan_stopped' | 'product_occlusion'
type SourceType = 'shelf_model' | 'fan_status' | 'temp_report'

interface ColdStorage {
  id: string
  name: string
  width: number
  depth: number
  height: number
}

interface Shelf {
  id: string
  coldStorageId: string
  layerCount: number
  posX: number
  posZ: number
  sourceFile: string
}

interface Probe {
  id: string
  shelfId: string
  layer: number
  posX: number
  posY: number
  posZ: number
}

interface ProbeReading {
  id: string
  probeId: string
  timestamp: string
  temperature: number
  status: ProbeStatus
  sourceReportId: string
}

interface Fan {
  id: string
  coldStorageId: string
  posX: number
  posY: number
  posZ: number
}

interface FanStatusRecord {
  id: string
  fanId: string
  timestamp: string
  status: FanStatus
  sourceRecordId: string
}

interface AnomalyEvent {
  id: string
  timestamp: string
  type: AnomalyType
  description: string
  relatedProbeId?: string
  relatedFanId?: string
  sourceId: string
  sourceType: SourceType
}
```

## 5. 状态管理设计（Zustand Store）

```typescript
interface AppStore {
  currentTimeIndex: number
  isPlaying: boolean
  filters: {
    layers: number[]
    areas: string[]
    probeStatuses: ProbeStatus[]
    fanStatuses: FanStatus[]
  }
  selectedProbeId: string | null
  setTimeIndex: (index: number) => void
  togglePlay: () => void
  setFilters: (filters: Partial<AppStore['filters']>) => void
  setSelectedProbe: (id: string | null) => void
}
```

## 6. 关键技术决策

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 温度色带渲染 | 自定义ShaderMaterial在货架层平面上渲染 | 性能优于逐像素更新纹理，支持实时插值 |
| 探头交互 | @react-three/drei的Html组件 + Raycaster | 点击探头弹出溯源浮窗，hover高亮 |
| 时间轴 | 自定义React组件 | 需要在进度条上标注异常事件点 |
| 数据溯源 | 统一sourceId/sourceType字段 | 所有数据实体携带来源信息，保证可追溯 |
| 异常区分 | AnomalyEvent.type严格区分probe_offline/fan_stopped/product_occlusion | 防止错误合并不同类型异常 |
| 探头离线处理 | 离线探头无温度数据，3D中用红色闪烁球体 | 区别于超温探头（橙色脉冲），不伪造数据 |
