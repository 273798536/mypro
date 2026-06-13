## 1. 架构设计

```mermaid
graph TD
    A["React 前端应用"] --> B["状态管理层 (useReducer + Context)"]
    B --> C["图表渲染模块 (recharts)"]
    B --> D["版本时间线模块"]
    B --> E["异常追溯模块"]
    B --> F["摘要生成模块"]
    B --> G["Mock 数据源 (本地 JSON)"]
```

## 2. 技术说明

- 前端：React@18 + TypeScript + Vite
- 样式：TailwindCSS@3 + CSS 自定义动画
- 图表：recharts（React 生态轻量图表库）
- 状态：React Context + useReducer 本地状态管理
- 数据：内置 Mock 数据，无需后端服务
- 初始化工具：npm create vite@latest

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 激光散斑参数回放主页（单页应用，仅此一个路由） |

## 4. 数据模型

### 4.1 数据结构定义

```mermaid
erDiagram
    SPECKLE_DATA ||--o{ DATA_POINT : contains
    SPECKLE_DATA ||--o{ VERSION_ENTRY : has
    DATA_POINT ||--o| ANOMALY_INFO : may_have
    ANOMALY_INFO ||--o{ EVIDENCE : references

    SPECKLE_DATA {
        string id PK
        string deviceName
        string materialName
    }
    DATA_POINT {
        number timestamp PK
        number intensity
        number contrast
        number stability
        string sourceRow
    }
    ANOMALY_INFO {
        string id PK
        string type
        string description
        number affectedRangeStart
        number affectedRangeEnd
    }
    EVIDENCE {
        string id PK
        string sourceName
        string sourceType
        string content
        number lineNumber
    }
    VERSION_ENTRY {
        string id PK
        string version
        string timestamp
        string changeType
        string description
        string operatorName
    }
```

### 4.2 核心 TypeScript 类型

```typescript
interface DataPoint {
  timestamp: number;
  intensity: number;
  contrast: number;
  stability: number;
  sourceRow: string;
  anomaly?: AnomalyInfo;
}

interface AnomalyInfo {
  id: string;
  type: 'extreme' | 'noise' | 'missing';
  description: string;
  affectedRangeStart: number;
  affectedRangeEnd: number;
  evidences: Evidence[];
}

interface Evidence {
  id: string;
  sourceName: string;
  sourceType: '铭牌' | '材料报告' | '操作日志';
  content: string;
  lineNumber: number;
}

interface VersionEntry {
  id: string;
  version: string;
  timestamp: string;
  changeType: '初始' | '补充' | '修正';
  description: string;
  operatorName: string;
}

interface SpeckleDataset {
  id: string;
  deviceName: string;
  materialName: string;
  dataPoints: DataPoint[];
  versions: VersionEntry[];
  summary: {
    paramVersion: string;
    anomalyCount: number;
    conclusion: string;
  };
}
```
