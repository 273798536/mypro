## 1. 架构设计

```mermaid
graph TD
    A["React应用层"] --> B["状态管理层 (Zustand)"]
    A --> C["UI组件层"]
    C --> C1["3D视图组件 (@react-three/fiber)"]
    C --> C2["侧边筛选面板"]
    C --> C3["碰撞检测面板"]
    C --> C4["明细记录表格"]
    C --> C5["顶部工具栏"]
    B --> D["数据层"]
    D --> D1["Mock病例数据"]
    D --> D2["植入物规格数据"]
    D --> D3["CT标注数据"]
    C1 --> E["Three.js渲染层"]
    E --> E1["骨骼模型 (参数化生成)"]
    E --> E2["植入物模型 (参数化生成)"]
    E --> E3["CT标注点云"]
    E --> E4["碰撞检测高亮"]
    E --> E5["轨道控制器"]
```

## 2. 技术描述

- **前端框架**：React@18 + TypeScript
- **构建工具**：Vite@5
- **3D引擎**：Three@0.160 + @react-three/fiber@8 + @react-three/drei@9
- **状态管理**：Zustand@4（轻量级，适合跨组件同步筛选状态）
- **样式方案**：TailwindCSS@3 + CSS变量
- **UI组件**：自定义组件 + Radix UI primitives（滑块、下拉菜单）
- **图标**：Lucide React
- **后端**：无后端，纯前端Mock数据
- **数据持久化**：LocalStorage存储保存的视角

## 3. 路由定义

| Route | 用途 |
|-------|------|
| / | 匹配台主页，包含3D视图+侧边面板 |

## 4. 数据模型

### 4.1 数据模型定义

```mermaid
erDiagram
    PATIENT_CASE ||--o{ IMPLANT : "has"
    PATIENT_CASE ||--o{ CT_ANNOTATION : "has"
    PATIENT_CASE ||--o{ DOCTOR_NOTE : "has"
    PATIENT_CASE ||--o{ COLLISION_ISSUE : "has"
    IMPLANT ||--o{ COLLISION_ISSUE : "causes"
    
    PATIENT_CASE {
        string id
        string name
        string patientId
        string laterality "left/right/bilateral"
        date surgeryDate
    }
    
    IMPLANT {
        string id
        string modelNumber
        string size
        float length_mm
        float width_mm
        float thickness_mm
        string laterality "left/right/universal"
        float position_x
        float position_y
        float position_z
        float rotation_x
        float rotation_y
        float rotation_z
        string material
        string manufacturer
        string source
    }
    
    CT_ANNOTATION {
        string id
        string ctScanId
        string label
        float position_x
        float position_y
        float position_z
        string type "landmark/tumor/nerve/vessel/forbidden_zone"
        float radius_mm
        string description
        string source
    }
    
    DOCTOR_NOTE {
        string id
        string author
        datetime timestamp
        string content
        string relatedImplantId
        string relatedAnnotationId
        string source
    }
    
    COLLISION_ISSUE {
        string id
        string type "size_out_of_bound/side_mismatch/forbidden_zone_collision"
        string severity "warning/critical"
        string implantId
        string annotationId
        string description
        string explanation
    }
    
    SAVED_VIEW {
        string id
        string name
        float cameraX
        float cameraY
        float cameraZ
        float targetX
        float targetY
        float targetZ
        datetime createdAt
    }
```

### 4.2 状态管理结构 (Zustand Store)

```typescript
interface AppState {
  // 筛选状态
  filters: {
    sizeRange: [number, number];
    laterality: 'all' | 'left' | 'right';
    issueTypes: string[];
  };
  
  // 当前选中
  selectedImplantId: string | null;
  selectedIssueId: string | null;
  selectedAnnotationId: string | null;
  
  // 数据
  caseData: PatientCase;
  implants: Implant[];
  annotations: CTAnnotation[];
  notes: DoctorNote[];
  issues: CollisionIssue[];
  savedViews: SavedView[];
  
  // 3D视图状态
  renderMode: 'solid' | 'wireframe' | 'xray';
  showBones: boolean;
  showImplants: boolean;
  showAnnotations: boolean;
  
  // Actions
  setFilters: (filters: Partial<AppState['filters']>) => void;
  selectImplant: (id: string | null) => void;
  selectIssue: (id: string | null) => void;
  saveCurrentView: (name: string, camera: CameraState) => void;
  loadView: (viewId: string) => CameraState | null;
  setRenderMode: (mode: AppState['renderMode']) => void;
  toggleLayer: (layer: 'bones' | 'implants' | 'annotations') => void;
  
  // 筛选后的数据
  getFilteredImplants: () => Implant[];
  getFilteredIssues: () => CollisionIssue[];
}
```

### 4.3 碰撞检测逻辑

1. **尺寸越界检测**：比较植入物尺寸与骨骼可容纳区域的阈值
2. **左右侧混淆检测**：比较植入物侧别与病例侧别是否匹配
3. **禁区碰撞检测**：计算植入物包围盒与禁区标注的距离，小于阈值则判定碰撞

### 4.4 3D模型生成策略

由于没有实际的STL文件，使用Three.js参数化几何体生成演示模型：
- **股骨/胫骨**：使用LatheGeometry生成管状骨骼轮廓，添加关节球头
- **植入物（钢板/螺钉）**：使用BoxGeometry、CylinderGeometry组合，按尺寸参数缩放
- **CT标注**：使用Points点云，不同类型用不同颜色和大小
- **禁区**：使用半透明SphereGeometry或BoxGeometry，带发光材质

## 5. 核心组件结构

```
src/
├── App.tsx
├── main.tsx
├── store/
│   └── useAppStore.ts
├── components/
│   ├── Viewport3D/
│   │   ├── index.tsx
│   │   ├── BoneModel.tsx
│   │   ├── ImplantModel.tsx
│   │   ├── AnnotationPoints.tsx
│   │   ├── CollisionHighlight.tsx
│   │   └── SceneLighting.tsx
│   ├── Sidebar/
│   │   ├── index.tsx
│   │   ├── FilterPanel.tsx
│   │   ├── CollisionPanel.tsx
│   │   └── DetailsTable.tsx
│   └── Toolbar/
│       ├── index.tsx
│       ├── ViewSelector.tsx
│       └── RenderModeToggle.tsx
├── data/
│   ├── mockCase.ts
│   ├── mockImplants.ts
│   ├── mockAnnotations.ts
│   └── mockIssues.ts
├── types/
│   └── index.ts
└── utils/
    ├── collision.ts
    └── viewPersistence.ts
```

## 6. 关键技术点

1. **跨组件筛选同步**：使用Zustand单一数据源，筛选条件变化时，3D视图和侧边列表同时订阅状态更新
2. **点击定位**：点击问题项时，通过状态更新相机位置，使用lerp平滑过渡到目标视角
3. **碰撞可视化**：使用后处理Bloom效果高亮碰撞区域，材质颜色根据问题类型区分
4. **视角持久化**：将相机位置和目标点序列化存入LocalStorage，支持命名保存和加载
5. **参数化模型**：所有3D模型基于数据参数生成，便于筛选时动态调整可见性和高亮状态
