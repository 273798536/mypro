## 1. 架构设计

```mermaid
graph TD
    "前端层" --> "React + Three.js + Zustand"
    "React + Three.js + Zustand" --> "3D渲染引擎"
    "React + Three.js + Zustand" --> "UI交互层"
    "React + Three.js + Zustand" --> "状态管理"
    "3D渲染引擎" --> "展厅场景"
    "3D渲染引擎" --> "热力映射层"
    "3D渲染引擎" --> "路线动画层"
    "UI交互层" --> "侧边栏"
    "UI交互层" --> "筛选器"
    "UI交互层" --> "报告弹窗"
    "状态管理" --> "数据校验模块"
    "数据层" --> "Mock数据集"
    "Mock数据集" --> "展厅模型数据"
    "Mock数据集" --> "客流计数数据"
    "Mock数据集" --> "楼梯路线数据"
```

## 2. 技术说明

- **前端框架**：React@18 + TypeScript
- **3D渲染**：three + @react-three/fiber + @react-three/drei + @react-three/postprocessing
- **样式方案**：tailwindcss@3
- **状态管理**：zustand（轻量级，适合3D场景状态同步）
- **构建工具**：vite
- **后端**：无（纯前端，使用 Mock 数据）
- **数据格式**：JSON 静态数据集

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 热区主视图页（3D场景 + 侧边栏 + 筛选器） |

单页应用，所有功能集成在一个页面内，通过侧边栏标签页和模态弹窗切换模块。

## 4. 数据模型

### 4.1 数据模型定义

```mermaid
erDiagram
    "楼层" ||--o{ "展厅" : "包含"
    "楼层" {
        string "楼层ID"
        string "名称"
        number "标高"
    }
    "展厅" ||--o{ "客流记录" : "产生"
    "展厅" {
        string "展厅ID"
        string "名称"
        string "楼层ID"
        number "容量上限"
        object "几何范围"
        string "类型"
    }
    "楼梯" ||--o{ "路线段" : "连接"
    "楼梯" {
        string "楼梯ID"
        string "名称"
        string "起始楼层ID"
        string "目标楼层ID"
        object "位置坐标"
    }
    "客流记录" {
        string "记录ID"
        string "展厅ID"
        number "时间戳"
        number "客流量"
        string "数据来源"
        string "数据版本"
    }
    "路线" ||--o{ "路线段" : "组成"
    "路线" {
        string "路线ID"
        string "名称"
        string "类型"
    }
    "路线段" {
        string "段ID"
        string "路线ID"
        string "起点ID"
        string "终点ID"
        number "顺序"
    }
    "校验结果" {
        string "结果ID"
        string "校验类型"
        string "严重等级"
        string "描述"
        array "影响范围"
        string "关联对象ID"
    }
    "数据来源" {
        string "来源ID"
        string "系统名称"
        string "采集时间"
        string "版本号"
        string "口径说明"
    }
```

### 4.2 数据定义

**展厅模型数据** (`museum-data.ts`)

```typescript
interface Floor {
  id: string;
  name: string;
  elevation: number;
}

interface ExhibitionHall {
  id: string;
  name: string;
  floorId: string;
  capacity: number;
  geometry: { x: number; y: number; width: number; depth: number; height: number };
  type: 'permanent' | 'temporary';
}

interface Stairway {
  id: string;
  name: string;
  fromFloorId: string;
  toFloorId: string;
  position: { x: number; y: number; z: number };
}

interface VisitorRecord {
  id: string;
  hallId: string;
  timestamp: number;
  count: number;
  source: string;
  version: string;
}

interface Route {
  id: string;
  name: string;
  type: 'main' | 'secondary' | 'emergency';
  segments: RouteSegment[];
}

interface RouteSegment {
  id: string;
  routeId: string;
  fromId: string;
  toId: string;
  order: number;
}

interface ValidationIssue {
  id: string;
  type: 'floor_mismatch' | 'duplicate_count' | 'route_breakpoint';
  severity: 'warning' | 'error';
  description: string;
  affectedHalls: string[];
  affectedRoutes: string[];
  relatedObjectId: string;
}

interface DataSource {
  id: string;
  systemName: string;
  collectionTime: string;
  version: string;
  calibrationNote: string;
}
```

## 5. 核心模块架构

### 5.1 状态管理 (Zustand Store)

```typescript
interface MuseumStore {
  selectedFloor: string | null;
  selectedHall: string | null;
  selectedTimeRange: [number, number];
  heatmapOpacity: number;
  sidebarTab: 'heatmap' | 'route';
  playingRouteId: string | null;
  routePlaybackSpeed: number;
  validationIssues: ValidationIssue[];
  dataSources: DataSource[];

  setSelectedFloor: (floorId: string | null) => void;
  setSelectedHall: (hallId: string | null) => void;
  setSelectedTimeRange: (range: [number, number]) => void;
  setHeatmapOpacity: (opacity: number) => void;
  setSidebarTab: (tab: 'heatmap' | 'route') => void;
  setPlayingRouteId: (routeId: string | null) => void;
  setRoutePlaybackSpeed: (speed: number) => void;
}
```

### 5.2 数据校验模块

独立校验函数，数据加载时自动执行：

1. **楼层错配检测**：遍历客流记录，校验其关联展厅的楼层与记录标注楼层是否一致
2. **客流重复检测**：同一展厅同一时间窗口内是否存在多条来源不同的计数记录
3. **路线断点检测**：检查路线段之间的连接是否连续，相邻段终点与起点是否匹配

校验结果存入 Store 的 `validationIssues`，UI 层在对应对象上渲染警告标签。

### 5.3 截图模块

使用 Three.js renderer 的 `domElement.toDataURL()` 配合 `preserveDrawingBuffer: true`，捕获当前3D视图。叠加 HTML 信息层（筛选状态、时间戳）后合成下载。

### 5.4 报告生成模块

基于当前筛选状态生成结构化报告对象，包含：
- 热区摘要（各展厅客流密度排名）
- 热力映射口径（数据来源、采样频率、归一化方法）
- 校验结果摘要
- 数据来源清单

报告以模态弹窗展示，支持"复制文本"与"下载PDF"（使用浏览器 window.print() 的打印为 PDF 方案）。

## 6. 性能策略

- 3D场景使用 InstancedMesh 复用展厅几何体
- 热力贴图使用 DataTexture 动态更新，分辨率 512x512
- 非当前楼层展厅设置 visible=false 而非移除
- 路线粒子数量控制在 500 以内
- 使用 React.memo 和 useMemo 优化组件重渲染
