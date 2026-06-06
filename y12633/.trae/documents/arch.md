
## 1. 架构设计

```mermaid
graph TB
    subgraph "前端应用"
        A["React应用"]
        B["路由管理"]
        C["状态管理"]
        D["UI组件"]
        E["数据存储"]
    end
    subgraph "核心功能"
        F["标注系统"]
        G["撤销重做"]
        H["边界检测"]
        I["报告导出"]
    end
    subgraph "数据层"
        J["本地存储"]
        K["示例数据"]
        L["导出数据"]
    end
    A --> B
    A --> C
    A --> D
    A --> E
    C --> F
    C --> G
    C --> H
    C --> I
    E --> J
    E --> K
    E --> L
```

## 2. 技术描述
- **前端框架**: React@18 + TypeScript + Vite
- **样式方案**: Tailwind CSS@3
- **状态管理**: React Context API + useReducer
- **本地存储**: localStorage + IndexedDB
- **报告生成**: jsPDF + xlsx
- **开发工具**: ESLint + Prettier

## 3. 路由定义
| 路由 | 用途 |
|-------|------|
| / | 首页/日常入口 |
| /level | 关卡页 - 标注操作 |
| /settlement | 结算页 - 结果展示 |

## 4. 数据模型
### 4.1 数据模型定义
```mermaid
erDiagram
    INSPECTION {
        string id
        string title
        string status
        number createdAt
        number updatedAt
    }
    DRAIN_POINT {
        string id
        number x
        number y
        string status
        string notes
    }
    DRAFT {
        string id
        string inspectionId
        json data
        number timestamp
    }
    INSPECTION ||--o{ DRAIN_POINT : contains
    INSPECTION ||--o{ DRAFT : has
```

### 4.2 TypeScript 类型定义
```typescript
interface DrainPoint {
  id: string;
  x: number;
  y: number;
  status: 'pending' | 'inspected' | 'failed';
  notes: string;
  createdAt: number;
}

interface Inspection {
  id: string;
  title: string;
  status: 'draft' | 'completed';
  drainPoints: DrainPoint[];
  createdAt: number;
  updatedAt: number;
}

interface Draft {
  id: string;
  inspectionId: string;
  data: Partial&lt;Inspection&gt;;
  timestamp: number;
}

interface HistoryState {
  past: Draft[];
  present: Inspection;
  future: Draft[];
}
```
