## 1. 架构设计

```mermaid
graph TD
    subgraph "前端层 (React + Vite)"
        A["预审列表页 /cases"]
        B["预审详情页 /cases/:id"]
        C["历史记录页 /history"]
        D["Zustand 状态管理"]
        E["React Router 路由"]
    end
    subgraph "后端层 (Express + Node.js)"
        F["API 路由层 (/api)"]
        G["Service 业务逻辑层"]
        H["数据持久化（内存存储 + 文件JSON快照）"]
    end
    subgraph "数据层"
        I["预审案件 Case"]
        J["巡检照片 InspectionPhoto"]
        K["时间轴事件 TimelineEvent"]
        L["晚到附件 LateAttachment"]
        M["操作历史 HistoryRecord"]
        N["碰撞对象 CollisionObject"]
    end
    A --> F
    B --> F
    C --> F
    D --> E
    F --> G
    G --> H
    H --> I
    H --> J
    H --> K
    H --> L
    H --> M
    H --> N
```

## 2. 技术描述

- **前端**：React@18 + TypeScript + react-router-dom@6 + zustand@4 + tailwindcss@3 + lucide-react
- **初始化工具**：vite-init（react-express-ts 模板）
- **后端**：Express@4 + TypeScript + ESM
- **数据存储**：内存数据存储 + JSON文件快照持久化（重启不丢失），内置3-4条测试数据
- **HTTP客户端**：fetch API 封装
- **设计系统**：Tailwind CSS 自定义主题（工业风配色方案）

## 3. 路由定义

### 前端路由

| 路由路径 | 页面组件 | 用途 |
|----------|----------|------|
| `/` | 重定向 | 跳转到 /cases |
| `/cases` | CaseListPage | 预审列表页，支持筛选、搜索 |
| `/cases/:id` | CaseDetailPage | 预审详情页，时间轴、照片、改判 |
| `/history` | HistoryPage | 全量操作历史记录 |

### 后端API路由

| Method | 路由路径 | 用途 |
|--------|----------|------|
| GET | `/api/cases` | 获取预审案件列表（支持status、keyword、objectType筛选） |
| GET | `/api/cases/:id` | 获取单个案件详情（含照片、时间轴、附件、碰撞对象） |
| PUT | `/api/cases/:id` | 改判案件状态（写回后端持久化） |
| POST | `/api/cases/:id/photos` | 关联巡检照片到改判记录 |
| GET | `/api/cases/:id/photos` | 获取案件巡检照片列表 |
| GET | `/api/cases/:id/timeline` | 获取案件时间轴事件流 |
| GET | `/api/cases/:id/attachments` | 获取晚到附件列表 |
| GET | `/api/history` | 获取全量操作历史（支持筛选） |
| POST | `/api/history` | 新增操作历史记录（改判时自动调用） |
| GET | `/api/collision-objects/:id` | 获取碰撞对象详情及来源追溯 |

## 4. API 类型定义

```typescript
// 案件状态
type CaseStatus = 'pending' | 'approved' | 'rejected' | 'abnormal';

// 碰撞对象类型
type ObjectType = 'wind_turbine' | 'transmission_tower' | 'cable' | 'access_road';

// 巡检照片
interface InspectionPhoto {
  id: string;
  caseId: string;
  url: string;
  thumbnailUrl: string;
  rowNumber: number;        // 原始二维表行号
  objectId: string | null;  // 关联的碰撞对象ID
  originalNote: string;     // 照片原始说明
  takenAt: string;          // 拍摄时间 ISO
  uploadedAt: string;       // 上传时间 ISO
  isLate: boolean;          // 是否晚到
}

// 时间轴事件
interface TimelineEvent {
  id: string;
  caseId: string;
  timestamp: string;
  type: 'inspection' | 'report' | 'review' | 'rejudge' | 'attachment' | 'gap';
  title: string;
  description: string;
  photoId?: string;         // 关联巡检照片
  objectId?: string;        // 关联碰撞对象
  isGap?: boolean;          // 是否为缺段
  gapReason?: string;       // 缺段原因说明
}

// 晚到附件
interface LateAttachment {
  id: string;
  caseId: string;
  fileName: string;
  fileType: 'image' | 'pdf' | 'excel' | 'other';
  uploadedAt: string;
  uploadedBy: string;
  linkedToConclusion: boolean;  // 是否已与结论绑定
  conclusionId?: string;        // 关联的结论记录
  description: string;
}

// 碰撞对象
interface CollisionObject {
  id: string;
  caseId: string;
  type: ObjectType;
  name: string;
  coordinates: { lng: number; lat: number };
  sourceRow: number;       // 原始二维表行号
  sourcePhotoId: string;   // 来源巡检照片ID
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
}

// 预审案件
interface PreReviewCase {
  id: string;
  caseNumber: string;      // 案件编号
  location: string;        // 位置描述
  status: CaseStatus;
  objectType: ObjectType;
  collisionSummary: string;  // 碰撞简述
  createdAt: string;
  updatedAt: string;
  lastOperator: string;
  photoCount: number;
  hasLateAttachment: boolean;
  rejudgeCount: number;
  photos: InspectionPhoto[];
  timeline: TimelineEvent[];
  attachments: LateAttachment[];
  collisionObjects: CollisionObject[];
}

// 操作历史
interface HistoryRecord {
  id: string;
  caseId: string;
  caseNumber: string;
  action: 'create' | 'review' | 'rejudge' | 'mark_abnormal' | 'supplement';
  operator: string;
  operatedAt: string;
  fromStatus?: CaseStatus;
  toStatus?: CaseStatus;
  reason?: string;
  linkedPhotoIds?: string[];
  linkedObjectIds?: string[];
  isSupplement: boolean;   // 是否为补录记录
}

// 改判请求
interface RejudgeRequest {
  toStatus: CaseStatus;
  reason: string;
  operator: string;
  linkedPhotoIds: string[];
  linkedObjectIds: string[];
  markAbnormal?: boolean;
  abnormalNote?: string;
}

// API响应包装
interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  timestamp: string;
}
```

## 5. 服务端架构

```mermaid
graph LR
    A["Express Router"] --> B["CaseController"]
    A --> C["HistoryController"]
    B --> D["CaseService"]
    C --> E["HistoryService"]
    D --> F["DataStore"]
    E --> F
    F --> G["内存Map存储"]
    F --> H["JSON文件快照持久化"]
```

- **Controller层**：参数校验、请求响应封装
- **Service层**：业务逻辑（改判校验、时间轴生成、晚到附件关联检查）
- **DataStore层**：统一数据访问、内存+文件双写、初始化Mock数据

## 6. 数据模型

### 6.1 ER图

```mermaid
erDiagram
    PRE_REVIEW_CASE ||--o{ INSPECTION_PHOTO : contains
    PRE_REVIEW_CASE ||--o{ TIMELINE_EVENT : contains
    PRE_REVIEW_CASE ||--o{ LATE_ATTACHMENT : contains
    PRE_REVIEW_CASE ||--o{ COLLISION_OBJECT : contains
    PRE_REVIEW_CASE ||--o{ HISTORY_RECORD : generates
    INSPECTION_PHOTO }o--o| COLLISION_OBJECT : references
    TIMELINE_EVENT }o--o| INSPECTION_PHOTO : references
    TIMELINE_EVENT }o--o| COLLISION_OBJECT : references
    LATE_ATTACHMENT }o--o| HISTORY_RECORD : links_to
    HISTORY_RECORD }o--o{ INSPECTION_PHOTO : links
    HISTORY_RECORD }o--o{ COLLISION_OBJECT : links

    PRE_REVIEW_CASE {
        string id PK
        string case_number
        string location
        string status
        string object_type
        string collision_summary
        datetime created_at
        datetime updated_at
        string last_operator
        int photo_count
        boolean has_late_attachment
        int rejudge_count
    }

    INSPECTION_PHOTO {
        string id PK
        string case_id FK
        string url
        string thumbnail_url
        int row_number
        string object_id FK
        string original_note
        datetime taken_at
        datetime uploaded_at
        boolean is_late
    }

    TIMELINE_EVENT {
        string id PK
        string case_id FK
        datetime timestamp
        string type
        string title
        string description
        string photo_id FK
        string object_id FK
        boolean is_gap
        string gap_reason
    }

    LATE_ATTACHMENT {
        string id PK
        string case_id FK
        string file_name
        string file_type
        datetime uploaded_at
        string uploaded_by
        boolean linked_to_conclusion
        string conclusion_id FK
        string description
    }

    COLLISION_OBJECT {
        string id PK
        string case_id FK
        string type
        string name
        float lng
        float lat
        int source_row
        string source_photo_id FK
        string description
        string risk_level
    }

    HISTORY_RECORD {
        string id PK
        string case_id FK
        string case_number
        string action
        string operator
        datetime operated_at
        string from_status
        string to_status
        string reason
        string linked_photo_ids
        string linked_object_ids
        boolean is_supplement
    }
```

### 6.2 初始化数据

系统启动时自动写入3-4条测试数据，覆盖以下场景：

1. **案件 BH-2024-001**（待复核）：含3张巡检照片、完整时间轴、1个晚到附件未关联结论、2个碰撞对象
2. **案件 BH-2024-002**（已通过）：含4张巡检照片、时间轴有1处缺段警告、晚到附件已关联结论、1个碰撞对象
3. **案件 BH-2024-003**（异常）：含2张巡检照片、时间轴有2处缺段、无晚到附件、3个碰撞对象、已有改判记录
4. **案件 BH-2024-004**（已驳回）：含5张巡检照片、完整时间轴、有补录记录、2个碰撞对象

所有数据真实可交互，改判操作会真实写回内存并持久化到JSON快照文件。
