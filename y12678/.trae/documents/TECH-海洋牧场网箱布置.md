## 1. 架构设计

```mermaid
flowchart TB
    subgraph "前端展示层"
        A["视角保存页面"]
        B["测量记录页面"]
        C["碰撞检测页面"]
        D["溯源追踪页面"]
        E["数据一致性页面"]
    end
    subgraph "状态管理层"
        F["Zustand Store - 视角/记录/检测状态"]
        G["Mock 数据服务层"]
    end
    subgraph "数据层"
        H["视角快照数据"]
        I["测量记录（含原始行号/来源）"]
        J["碰撞检测结果"]
        K["溯源链路数据"]
        L["一致性校验规则"]
    end
    A --> F
    B --> F
    C --> F
    D --> F
    E --> F
    F --> G
    G --> H
    G --> I
    G --> J
    G --> K
    G --> L
```

## 2. 技术说明

- **前端框架**：React@18 + TypeScript + Vite
- **样式方案**：Tailwind CSS 3 + 自定义 CSS 变量（海洋工程主题色）
- **状态管理**：Zustand
- **路由管理**：React Router DOM
- **图标库**：lucide-react
- **数据来源**：前端 Mock 数据（模拟测量记录、视角快照、碰撞检测结果等）
- **无后端服务**：纯前端实现，所有数据使用 TypeScript 类型定义的 Mock 数据

## 3. 路由定义

| 路由 | 页面名称 | 用途 |
|------|----------|------|
| / | 视角保存首页 | 日常入口，展示视角快照与越界提示 |
| /records | 测量记录页 | 展示测量数据表，含原始行号、坐标系、补录历史 |
| /collision | 碰撞检测页 | 月底/课前检测入口，展示碰撞报告 |
| /trace | 溯源追踪页 | 结论→记录→来源全链路追溯 |
| /consistency | 数据一致性页 | 重复导入检测、补录冲突告警 |

## 4. 数据模型定义

### 4.1 实体关系图

```mermaid
erDiagram
    VIEW_SNAPSHOT ||--o{ MEASUREMENT_RECORD : "关联"
    MEASUREMENT_RECORD ||--o{ SUPPLEMENT_RECORD : "补录历史"
    MEASUREMENT_RECORD ||--o{ COLLISION_RESULT : "参与检测"
    COLLISION_RESULT ||--|| TRACE_LINK : "生成溯源"
    TRACE_LINK ||--|| MEASUREMENT_RECORD : "追溯"
    MEASUREMENT_RECORD ||--o{ DATA_CONFLICT : "产生冲突"

    VIEW_SNAPSHOT {
        string id PK "视角ID"
        string name "视角名称"
        string thumbnailUrl "缩略图"
        string projectName "项目名称"
        string savedAt "保存时间"
        string operator "操作人"
        string rowRange "原始行号范围"
        boolean hasSupplement "含补录"
        number outOfBoundsCount "越界数量"
        string colorState "颜色状态"
    }

    MEASUREMENT_RECORD {
        string id PK "记录ID"
        number originalRowNumber PK "原始行号"
        string cageId "网箱编号"
        string imageName "图片名"
        string sourceNote "来源备注"
        string coordinateSystem "坐标系"
        number x "X坐标"
        number y "Y坐标"
        string status "状态：正常/越界/待确认"
        string createdAt "创建时间"
        string createdBy "创建人"
        boolean isSupplemented "是否补录"
    }

    SUPPLEMENT_RECORD {
        string id PK "补录ID"
        string recordId FK "关联记录ID"
        object diffFields "差异字段"
        string operator "操作人"
        string operatedAt "操作时间"
        string reason "补录原因"
    }

    COLLISION_RESULT {
        string id PK "检测ID"
        string cageA "网箱A编号"
        string cageB "网箱B编号"
        number distance "碰撞距离(米)"
        string screenshotUrl "位置截图"
        string basis "判定依据"
        string detectedAt "检测时间"
        string conclusion "最终结论"
    }

    TRACE_LINK {
        string id PK "链路ID"
        string collisionResultId FK "碰撞结果ID"
        string recordId FK "测量记录ID"
        string[] tracePath "溯源路径"
    }

    DATA_CONFLICT {
        string id PK "冲突ID"
        string recordIdA FK "记录A"
        string recordIdB FK "记录B"
        number similarity "相似度(%)"
        string[] diffFields "差异字段"
        string conflictType "重复/补录冲突/坐标系混用"
        string status "待处理/已裁决"
    }
```

### 4.2 TypeScript 类型定义

```typescript
export type CoordinateSystem = 'WGS84' | 'CGCS2000' | 'LOCAL';
export type RecordStatus = 'normal' | 'out-of-bounds' | 'pending';
export type ConflictType = 'duplicate' | 'supplement-conflict' | 'coordinate-mismatch';

export interface ViewSnapshot {
  id: string;
  name: string;
  thumbnailUrl: string;
  projectName: string;
  savedAt: string;
  operator: string;
  rowRange: string;
  hasSupplement: boolean;
  outOfBoundsCount: number;
  recordIds: string[];
}

export interface MeasurementRecord {
  id: string;
  originalRowNumber: number;
  cageId: string;
  imageName: string;
  sourceNote: string;
  coordinateSystem: CoordinateSystem;
  x: number;
  y: number;
  status: RecordStatus;
  createdAt: string;
  createdBy: string;
  isSupplemented: boolean;
}

export interface SupplementRecord {
  id: string;
  recordId: string;
  diffFields: Record<string, { old: any; new: any }>;
  operator: string;
  operatedAt: string;
  reason: string;
}

export interface CollisionResult {
  id: string;
  cageA: string;
  cageB: string;
  distance: number;
  screenshotUrl: string;
  basis: string;
  detectedAt: string;
  conclusion: string;
  relatedRecordIds: string[];
}

export interface DataConflict {
  id: string;
  recordIdA: string;
  recordIdB: string;
  similarity: number;
  diffFields: string[];
  conflictType: ConflictType;
  status: 'pending' | 'resolved';
}
```

## 5. 前端工程结构

```
src/
├── components/
│   ├── layout/
│   │   ├── SidebarNav.tsx       # 左侧导航栏
│   │   └── PageHeader.tsx       # 页面顶部标题栏
│   ├── view/
│   │   ├── ViewSnapshotCard.tsx # 视角快照卡片
│   │   ├── ColorLegend.tsx      # 颜色图例说明
│   │   └── OutOfBoundsBanner.tsx# 越界提示横幅
│   ├── record/
│   │   ├── RecordTable.tsx      # 测量记录表格
│   │   ├── CoordBadge.tsx       # 坐标系标记徽章
│   │   └── SupplementSidebar.tsx# 补录记录侧栏
│   ├── collision/
│   │   ├── DetectionPanel.tsx   # 检测执行面板
│   │   └── CollisionReportCard.tsx # 碰撞报告卡片
│   ├── trace/
│   │   ├── TraceTimeline.tsx    # 溯源时间线
│   │   └── CoordMismatchSearch.tsx # 坐标系混用倒查
│   └── consistency/
│       ├── DuplicateCompareCard.tsx # 重复对比卡片
│       └── ConflictAlertList.tsx    # 冲突告警列表
├── pages/
│   ├── ViewSnapshotPage.tsx      # 视角保存首页
│   ├── RecordPage.tsx            # 测量记录页
│   ├── CollisionPage.tsx         # 碰撞检测页
│   ├── TracePage.tsx             # 溯源追踪页
│   └── ConsistencyPage.tsx       # 数据一致性页
├── store/
│   └── useAppStore.ts            # Zustand 全局状态
├── data/
│   └── mockData.ts               # Mock 数据
├── types/
│   └── index.ts                  # TypeScript 类型定义
├── App.tsx
├── main.tsx
└── index.css
```
