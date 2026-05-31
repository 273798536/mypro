## 1. 架构设计

```mermaid
graph TB
    subgraph "前端层"
        "3D场景（Three.js + R3F）" --> "状态管理（Zustand）"
        "侧边数据面板" --> "状态管理（Zustand）"
        "时间轴控制器" --> "状态管理（Zustand）"
        "遮挡检测引擎" --> "状态管理（Zustand）"
        "截图导出模块" --> "状态管理（Zustand）"
        "溯源日志模块" --> "状态管理（Zustand）"
    end
    subgraph "数据层"
        "状态管理（Zustand）" --> "乐手位置数据"
        "状态管理（Zustand）" --> "乐器声压数据"
        "状态管理（Zustand）" --> "吸声材料数据"
        "状态管理（Zustand）" --> "操作溯源记录"
    end
```

## 2. 技术说明

- 前端：React@18 + TypeScript + Tailwind CSS@3 + Vite
- 3D渲染：Three.js + @react-three/fiber + @react-three/drei + @react-three/postprocessing
- 状态管理：Zustand（单store，分slice管理乐手/材料/遮挡/日志）
- 初始化工具：vite-init
- 后端：无（纯前端，数据内置mock）
- 数据库：无（内存数据 + localStorage持久化溯源日志）

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 主工作台，包含3D场景、数据面板、时间轴、遮挡检测 |

## 4. 数据模型

### 4.1 核心数据结构

```typescript
interface Musician {
  id: string
  name: string
  section: 'strings' | 'woodwinds' | 'brass' | 'percussion'
  position: { x: number; y: number; z: number }
  soundPressure: number
  instrument: string
  radiationAngle: number
  reportNote: string
}

interface AbsorptionMaterial {
  id: string
  name: string
  position: { x: number; y: number; z: number }
  size: { width: number; height: number; depth: number }
  absorptionCoefficients: Record<string, number>
  missingFrequencies: string[]
}

interface OcclusionEvent {
  id: string
  sourceId: string
  targetId: string
  type: 'musician_block' | 'material_block' | 'position_offset'
  reason: string
  suggestion: string
  timestamp: number
}

interface AuditLogEntry {
  id: string
  timestamp: number
  action: string
  parameter: string
  oldValue: unknown
  newValue: unknown
  snapshotUrl?: string
}

interface TimelineState {
  currentTime: number
  duration: number
  sectionEntries: { section: string; enterTime: number }[]
}
```

### 4.2 Zustand Store Slice

- `musiciansSlice`: 乐手CRUD + 位置拖动
- `materialsSlice`: 吸声材料管理
- `occlusionSlice`: 遮挡检测结果
- `auditSlice`: 操作溯源日志
- `timelineSlice`: 时间轴状态
- `filterSlice`: 声部筛选状态
- `screenshotSlice`: 截图导出状态

## 5. 关键算法

### 5.1 声部遮挡检测

对每个乐手的声压辐射锥，检测其路径上是否存在其他乐手或吸声材料阻挡：
1. 以乐手位置为顶点，辐射方向为轴，构建锥体
2. 对锥体做射线采样（多层同心圆射线）
3. 检测射线与场景中其他乐手/材料的交叉
4. 计算遮挡比例，超过阈值则生成OcclusionEvent

### 5.2 参数联动

所有数据变更通过Zustand store统一管理，3D场景通过R3F的useFrame/useEffect订阅store变化自动重渲染，侧边面板同理。

## 6. 目录结构

```
src/
  components/
    Scene3D/          - 3D场景组件（Stage, MusicianMesh, SoundCone, MaterialBlock）
    Panel/            - 侧边数据面板组件
    OcclusionPanel/   - 遮挡检测面板
    Timeline/         - 时间轴控制器
    FilterBar/        - 声部筛选器
    ScreenshotExport/ - 截图导出
    AuditLog/         - 溯源日志
    DetailPanel/      - 乐手↔声压↔报告对应详情
  store/
    index.ts          - Zustand store定义
  data/
    sampleData.ts     - 样例数据（含遮挡/缺失/错误案例）
  utils/
    occlusion.ts      - 遮挡检测算法
    screenshot.ts     - 截图工具函数
  pages/
    Workspace.tsx     - 主工作台页面
```
