## 1. 架构设计

```mermaid
graph TD
    A["React 前端层"] --> B["Zustand 状态管理"]
    B --> C["LocalStorage 持久化层"]
    A --> D["组件层"]
    D --> D1["PointList 点位列表"]
    D --> D2["PointDetail 点位详情"]
    D --> D3["Timeline 历史时间线"]
    D --> D4["ImportPanel 导入面板"]
    A --> E["工具函数层"]
    E --> E1["坐标计算 utils"]
    E --> E2["数据导出 utils"]
    E --> E3["演示数据 utils"]
    C --> F["数据模型层"]
    F --> F1["RawPoint 原始点位"]
    F --> F2["MergedPoint 归并点位"]
    F --> F3["HistoryRecord 历史记录"]
```

## 2. 技术描述

- **前端**：React@18 + TypeScript + Vite@5
- **状态管理**：Zustand@4
- **样式**：Tailwind CSS@3
- **图标**：lucide-react@0.344
- **本地存储**：LocalStorage（封装持久化中间件）
- **初始化工具**：vite-init

## 3. 路由定义

| Route | Purpose |
|-------|---------|
| / | 点位列表页（默认） |
| /point/:id | 点位详情页 |
| /timeline | 历史时间线页 |
| /import | 数据导入页 |

## 4. 数据模型

### 4.1 ER图

```mermaid
erDiagram
    RAW_POINT {
        string id PK
        string source "原始来源"
        number sourceLine "来源行号"
        string rawName "原始名称（脏数据保留）"
        number rawLat "原始纬度"
        number rawLng "原始经度"
        string rawData "完整原始数据JSON"
        number influenceRadius "影响范围（米）"
        boolean isOffset "坐标是否偏移"
        number offsetDistance "偏移距离（米）"
        string importBatch "导入批次"
        datetime createdAt "导入时间"
    }
    
    MERGED_POINT {
        string id PK
        string canonicalName "规范名称"
        string status "pending/confirmed/onsite/conflict"
        string[] rawPointIds "关联原始点位ID"
        number canonicalLat "规范纬度"
        number canonicalLng "规范经度"
        string notes "备注"
        boolean hasSupplementaryNote "是否有后补备注"
        datetime createdAt "创建时间"
        datetime updatedAt "更新时间"
    }
    
    HISTORY_RECORD {
        string id PK
        string action "import/confirm/withdraw/merge/note/status"
        string targetType "rawPoint/mergedPoint"
        string targetId "操作目标ID"
        json before "操作前状态"
        json after "操作后状态"
        string operator "操作人"
        datetime timestamp "操作时间"
    }
    
    MERGED_POINT ||--o{ RAW_POINT : "包含多个原始点位"
    HISTORY_RECORD }o--|| RAW_POINT : "记录操作"
    HISTORY_RECORD }o--|| MERGED_POINT : "记录操作"
```

### 4.2 TypeScript 类型定义

```typescript
// 原始点位 - 保留完整脏数据痕迹
export interface RawPoint {
  id: string;
  source: string;
  sourceLine: number;
  rawName: string;
  rawLat: number;
  rawLng: number;
  rawData: Record<string, any>;
  influenceRadius: number;
  isOffset: boolean;
  offsetDistance: number;
  importBatch: string;
  createdAt: string;
}

// 归并后点位
export type PointStatus = 'pending' | 'confirmed' | 'onsite' | 'conflict';

export interface MergedPoint {
  id: string;
  canonicalName: string;
  status: PointStatus;
  rawPointIds: string[];
  canonicalLat: number;
  canonicalLng: number;
  notes: Note[];
  hasSupplementaryNote: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  content: string;
  isSupplementary: boolean;
  createdAt: string;
}

// 历史记录
export type HistoryAction = 'import' | 'confirm' | 'withdraw' | 'merge' | 'note' | 'status';

export interface HistoryRecord {
  id: string;
  action: HistoryAction;
  targetType: 'rawPoint' | 'mergedPoint';
  targetId: string;
  before: any;
  after: any;
  operator: string;
  timestamp: string;
}

// 应用状态
export interface AppState {
  rawPoints: RawPoint[];
  mergedPoints: MergedPoint[];
  history: HistoryRecord[];
  currentBatch: string;
}
```

## 5. 核心数据结构设计原则

### 5.1 原始数据不可修改原则
- `RawPoint` 一旦创建，永不修改
- 所有修改操作作用于 `MergedPoint`
- 历史记录同时保存 `before` 和 `after` 状态

### 5.2 脏数据保留策略
- `rawName` 存储原始名称，包含所有不规范写法
- `rawData` 存储完整原始JSON，保留所有字段
- `isOffset` 和 `offsetDistance` 仅做标记，不修改原始坐标

### 5.3 状态流转
```mermaid
stateDiagram-v2
    [*] --> pending: 导入后默认
    pending --> confirmed: 确认归并
    pending --> onsite: 标记待现场
    pending --> conflict: 标记冲突
    confirmed --> pending: 撤回
    onsite --> pending: 撤回
    onsite --> confirmed: 现场确认
    conflict --> pending: 撤回
    conflict --> confirmed: 冲突解决
```
