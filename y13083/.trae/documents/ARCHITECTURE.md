## 1. 架构设计

```mermaid
flowchart TB
    subgraph "前端 (React + TypeScript)"
        A["3D场景层 (Three.js)"] --> A1["剖面渲染"]
        A --> A2["对象拾取"]
        A --> A3["高亮/描边效果"]
        B["状态管理层 (Zustand)"] --> B1["筛选条件持久化"]
        B --> B2["人工备注存储"]
        B --> B3["视图快照管理"]
        C["UI组件层"] --> C1["筛选面板"]
        C --> C2["详情面板"]
        C --> C3["工具栏/引导"]
        D["导出层"] --> D1["Markdown生成"]
        D --> D2["文件下载"]
    end
    subgraph "数据层 (Mock)"
        E["CAD图层数据"]
        F["危险品对象数据"]
        G["异常/重叠标记"]
    end
    subgraph "持久化 (localStorage)"
        H["筛选条件"]
        I["人工备注"]
        J["视图快照"]
    end
    B --> H
    B --> I
    B --> J
    C --> B
    A --> B
    D --> B
```

## 2. 技术描述
- **前端框架**：React@18 + TypeScript@5 + Vite@5
- **状态管理**：Zustand@4 + persist 中间件（localStorage 持久化）
- **3D引擎**：Three@0.160 + @react-three/fiber@8 + @react-three/drei@9 + @react-three/postprocessing@2
- **样式方案**：TailwindCSS@3
- **图标库**：lucide-react@0.309
- **路由**：react-router-dom@6（单页面，/ 为主路由）
- **初始化工具**：vite-init（react-ts 模板）
- **后端**：无，全部使用内置 Mock 数据

## 3. 路由定义
| 路由 | 用途 |
|------|------|
| / | 码头危险品库剖面讲解主页（唯一页面） |

## 4. 数据模型

### 4.1 数据模型定义

```mermaid
erDiagram
    HAZARD_OBJECT {
        string id
        string name
        string type
        string layerId
        string source "cad_old|normal|verbal"
        boolean isAbnormal
        boolean isOverlapping
        string[] overlappingWith
        number[] position "[x,y,z]"
        number[] size "[w,h,d]"
        string color
        string description
    }
    CAD_LAYER {
        string id
        string name
        string version
        boolean visible
        boolean isOldVersion
    }
    MANUAL_NOTE {
        string id
        string objectId
        string content
        string author
        string createdAt
    }
    VIEW_SNAPSHOT {
        string id
        string name
        number[] cameraPosition "[x,y,z]"
        number[] cameraTarget "[x,y,z]"
        object filterState
        string[] visibleLayers
        string createdAt
    }
    FILTER_STATE {
        string[] sources "cad_old|normal|verbal"
        boolean showAbnormalOnly
        boolean showOverlappingOnly
        string[] types
    }
```

### 4.2 TypeScript 类型定义

```typescript
export type DataSource = 'cad_old' | 'normal' | 'verbal';

export interface HazardObject {
  id: string;
  name: string;
  type: 'tank' | 'pipe' | 'valve' | 'storage';
  layerId: string;
  source: DataSource;
  isAbnormal: boolean;
  isOverlapping: boolean;
  overlappingWith: string[];
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  description: string;
}

export interface CadLayer {
  id: string;
  name: string;
  version: string;
  visible: boolean;
  isOldVersion: boolean;
}

export interface ManualNote {
  id: string;
  objectId: string;
  content: string;
  author: string;
  createdAt: string;
}

export interface ViewSnapshot {
  id: string;
  name: string;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  filterState: FilterState;
  visibleLayers: string[];
  createdAt: string;
}

export interface FilterState {
  sources: DataSource[];
  showAbnormalOnly: boolean;
  showOverlappingOnly: boolean;
  types: HazardObject['type'][];
}
```

## 5. 项目结构

```
src/
├── components/
│   ├── Scene3D/           # Three.js 3D场景
│   │   ├── index.tsx
│   │   ├── HazardMesh.tsx
│   │   └── SectionPlane.tsx
│   ├── FilterPanel/       # 左侧筛选面板
│   │   ├── index.tsx
│   │   ├── SourceFilter.tsx
│   │   └── LayerToggle.tsx
│   ├── DetailPanel/       # 右侧详情面板
│   │   ├── index.tsx
│   │   ├── ObjectInfo.tsx
│   │   ├── NoteEditor.tsx
│   │   └── SnapshotList.tsx
│   ├── Toolbar/           # 顶部工具栏
│   │   └── index.tsx
│   ├── GuideBar/          # 底部引导条
│   │   └── index.tsx
│   └── OverlapList/       # 重叠对象独立列表
│       └── index.tsx
├── store/                 # Zustand 状态
│   ├── useAppStore.ts
│   └── persist.ts
├── data/                  # Mock 数据
│   ├── layers.ts
│   ├── objects.ts
│   └── notes.ts
├── types/                 # 类型定义
│   └── index.ts
├── utils/                 # 工具函数
│   ├── markdown.ts
│   ├── overlap.ts
│   └── export.ts
├── App.tsx
├── main.tsx
└── index.css
```
