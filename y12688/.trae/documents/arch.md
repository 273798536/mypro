## 1. Architecture Design

```mermaid
graph TB
    subgraph "前端层"
        A["React应用"]
        B["路由管理"]
        C["状态管理"]
        D["3D渲染引擎"]
    end
    
    subgraph "数据层"
        E["本地存储"]
        F["Mock数据"]
    end
    
    A --> B
    A --> C
    A --> D
    C --> E
    C --> F
```

## 2. Technology Description
- Frontend: React@18 + TypeScript + tailwindcss@3 + vite
- Initialization Tool: vite-init
- 3D Engine: three.js + @react-three/fiber + @react-three/drei
- State Management: React hooks + localStorage
- File Parsing: xlsx (Excel解析), papaparse (CSV解析)

## 3. Route Definitions
| Route | Purpose |
|-------|---------|
| / | 首页 - 参数联动入口 |
| /import | 数据导入页面 |
| /filter | 异常筛选页面 |
| /detail/:id | 详情页面 |
| /section | 剖切分析页面 |

## 4. Data Model
### 4.1 Data Model Definition
```mermaid
erDiagram
    RECORD {
        string id
        string batchId
        string fileName
        int originalLine
        string sourceRemark
        string type
        json data
        string status
        string processingOpinion
        datetime createdAt
        datetime updatedAt
    }
    
    BATCH {
        string id
        string name
        datetime importTime
        int recordCount
        string status
    }
    
    BATCH ||--o{ RECORD : contains
```

### 4.2 Data Types
```typescript
interface Record {
  id: string;
  batchId: string;
  fileName: string;
  originalLine: number;
  sourceRemark: string;
  type: 'buoy' | 'model' | 'coordinate';
  data: any;
  status: 'normal' | 'duplicate' | 'conflict' | 'missing_camera';
  processingOpinion?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Batch {
  id: string;
  name: string;
  importTime: Date;
  recordCount: number;
  status: 'processing' | 'completed' | 'error';
}

interface SectionData {
  id: string;
  recordId: string;
  sliceData: any;
  conclusion: string;
}
```
