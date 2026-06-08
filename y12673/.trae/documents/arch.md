## 1. 架构设计

```mermaid
graph TB
    A["前端 React 应用"] --> B["后端 API 服务"]
    B --> C["本地 JSON 文件存储"]
    B --> D["文件系统"]
    
    subgraph 前端层
        A1["页面组件"]
        A2["状态管理"]
        A3["路由管理"]
    end
    
    subgraph 后端层
        B1["RESTful API"]
        B2["业务逻辑层"]
        B3["数据持久化"]
    end
    
    subgraph 数据层
        C1["讲解记录数据"]
        C2["历史版本数据"]
        C3["截图元数据"]
    end
```

## 2. 技术描述

- **前端框架**：React@18 + TypeScript + Vite
- **样式方案**：Tailwind CSS@3 + Framer Motion（动画）
- **富文本编辑**：Quill 或 React Quill
- **后端服务**：Express@4 + TypeScript
- **数据存储**：本地 JSON 文件 + lowdb
- **构建工具**：Vite（前端）、ts-node（后端）
- **包管理器**：pnpm

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 时间回放首页（讲解列表） |
| /record/:id | 讲解详情页 |
| /record/:id/edit | 修正记录页 |
| /record/:id/history | 历史版本页 |
| /download | 数据下载页 |
| /test | 测试场景页 |
| /perspective | 视角保存页 |

## 4. API 定义

### 4.1 数据类型定义

```typescript
interface Screenshot {
  id: string;
  url: string;
  deviceCoordinates: {
    x: number;
    y: number;
    z: number;
  };
  timestamp: string;
  description?: string;
}

interface Conclusion {
  id: string;
  content: string;
  author: string;
  timestamp: string;
}

interface HistoryVersion {
  id: string;
  version: number;
  conclusion: Conclusion;
  reason: string;
  modifiedBy: string;
  modifiedAt: string;
}

interface VolcanoRecord {
  id: string;
  title: string;
  location: string;
  timestamp: string;
  batchId: string;
  screenshots: Screenshot[];
  currentConclusion: Conclusion;
  history: HistoryVersion[];
  perspectives?: Perspective[];
  createdAt: string;
  updatedAt: string;
}

interface Perspective {
  id: string;
  name: string;
  cameraPosition: { x: number; y: number; z: number };
  cameraTarget: { x: number; y: number; z: number };
  timestamp: string;
}
```

### 4.2 API 端点

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/records | 获取讲解记录列表 |
| GET | /api/records/:id | 获取单个讲解记录 |
| POST | /api/records | 创建新讲解记录 |
| PUT | /api/records/:id | 更新讲解记录（含结论修正） |
| GET | /api/records/:id/history | 获取历史版本列表 |
| POST | /api/records/:id/restore | 恢复到指定历史版本 |
| POST | /api/import | 导入点云切片数据（含重复检测） |
| GET | /api/export | 导出数据 |
| GET | /api/perspectives | 获取视角保存列表 |

## 5. 服务器架构

```mermaid
graph LR
    A[API 控制器层] --> B[业务服务层]
    B --> C[数据访问层]
    C --> D[JSON 文件存储]
    
    subgraph 控制器层
        A1[RecordController]
        A2[ImportController]
        A3[ExportController]
        A4[PerspectiveController]
    end
    
    subgraph 服务层
        B1[RecordService]
        B2[DuplicateDetectionService]
        B3[HistoryService]
    end
    
    subgraph 数据层
        C1[RecordRepository]
        C2[HistoryRepository]
    end
```

## 6. 数据模型

### 6.1 ER 图

```mermaid
erDiagram
    VOLCANO_RECORD ||--o{ SCREENSHOT : contains
    VOLCANO_RECORD ||--o{ HISTORY_VERSION : has
    VOLCANO_RECORD ||--o{ PERSPECTIVE : saves
    HISTORY_VERSION ||--|| CONCLUSION : includes
    
    VOLCANO_RECORD {
        string id
        string title
        string location
        string batchId
        datetime createdAt
        datetime updatedAt
    }
    
    SCREENSHOT {
        string id
        string url
        float x
        float y
        float z
        datetime timestamp
    }
    
    CONCLUSION {
        string id
        string content
        string author
        datetime timestamp
    }
    
    HISTORY_VERSION {
        string id
        int version
        string reason
        string modifiedBy
        datetime modifiedAt
    }
    
    PERSPECTIVE {
        string id
        string name
        float camX
        float camY
        float camZ
        float targetX
        float targetY
        float targetZ
        datetime timestamp
    }
```

### 6.2 数据结构

```typescript
// 数据存储结构
{
  "records": [
    {
      "id": "uuid",
      "title": "讲解标题",
      "location": "火山位置",
      "batchId": "批次标识",
      "screenshots": [],
      "currentConclusion": {},
      "history": [],
      "perspectives": [],
      "createdAt": "ISO时间",
      "updatedAt": "ISO时间"
    }
  ]
}
```

### 6.3 重复检测逻辑

- **检测键**：`batchId`（批次标识）
- **检测策略**：
  1. 导入时提取 batchId
  2. 查询已存在记录
  3. 如存在，进入更新流程
  4. 保存历史版本，防止数据冲突
