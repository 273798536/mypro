## 1. 架构设计

```mermaid
graph TD
    subgraph "前端层"
        A["React 18 + TypeScript"]
        B["Three.js 3D渲染引擎"]
        C["Zustand 状态管理"]
        D["Tailwind CSS 样式"]
        E["React Router 路由"]
    end
    
    subgraph "业务组件层"
        F["NetworkGraph 3D网络图组件"]
        G["ControlPanel 控制面板"]
        H["InfoPanel 信息面板"]
        I["Toolbar 工具栏"]
        J["StatusBar 状态栏"]
    end
    
    subgraph "数据层"
        K["MockData 模拟数据生成器"]
        L["DataProcessor 数据处理器"]
        M["AnomalyDetector 异常检测器"]
        N["PathFinder 路径分析器"]
    end
    
    subgraph "存储层"
        O["LocalStorage 参数持久化"]
        P["File API 报告导出"]
    end
    
    A --> B
    A --> C
    A --> D
    A --> E
    B --> F
    C --> F
    C --> G
    C --> H
    C --> I
    C --> J
    K --> L
    L --> M
    L --> N
    M --> C
    N --> C
    C --> O
    C --> P
```

## 2. 技术描述
- **前端**：React@18 + TypeScript + Vite
- **3D引擎**：three@^0.160.0 + @react-three/fiber@^8.15.0 + @react-three/drei@^9.92.0
- **状态管理**：zustand@^4.4.0
- **样式**：tailwindcss@^3.4.0
- **路由**：react-router-dom@^6.21.0
- **图标**：lucide-react@^0.294.0
- **后端**：纯前端应用，无后端服务
- **数据**：内置模拟数据生成器，支持JSON导入

## 3. 路由定义
| 路由 | 用途 |
|------|------|
| / | 主工作台页面 |
| /help | 使用帮助页面 |

## 4. 数据模型

### 4.1 数据模型定义

```mermaid
erDiagram
    CUSTOMER ||--o{ LOAN_APPLICATION : "发起"
    CUSTOMER ||--o{ PHONE : "使用"
    CUSTOMER ||--o{ DEVICE : "使用"
    CUSTOMER ||--o{ GUARANTOR : "担保"
    LOAN_APPLICATION ||--|| INVESTIGATION : "生成"
    CUSTOMER {
        string id PK
        string name
        string idCard
        string riskLevel
        boolean isBlacklist
        datetime createdAt
        string source
    }
    PHONE {
        string id PK
        string number
        string carrier
        datetime registeredAt
        string source
    }
    DEVICE {
        string id PK
        string deviceId
        string deviceType
        string ipAddress
        datetime lastActive
        string source
    }
    GUARANTOR {
        string id PK
        string name
        string idCard
        string relation
        string source
    }
    LOAN_APPLICATION {
        string id PK
        string customerId FK
        decimal amount
        string status
        datetime applyTime
        string source
    }
    INVESTIGATION {
        string id PK
        string applicationId FK
        string conclusion
        string riskLevel
        datetime createdAt
        string investigator
        string source
    }
    RELATION {
        string id PK
        string sourceId FK
        string targetId FK
        string relationType
        datetime createdAt
        string source
        int confidence
    }
```

### 4.2 节点类型定义

```typescript
type NodeType = 'customer' | 'phone' | 'device' | 'guarantor' | 'loan' | 'investigation';
type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

interface BaseNode {
  id: string;
  type: NodeType;
  label: string;
  riskLevel: RiskLevel;
  isBlacklist: boolean;
  source: string;
  createdAt: string;
  position?: { x: number; y: number; z: number };
}

interface CustomerNode extends BaseNode {
  type: 'customer';
  idCard: string;
  phone?: string;
}

interface PhoneNode extends BaseNode {
  type: 'phone';
  number: string;
  carrier: string;
}

interface DeviceNode extends BaseNode {
  type: 'device';
  deviceId: string;
  deviceType: string;
  ipAddress: string;
}

interface GuarantorNode extends BaseNode {
  type: 'guarantor';
  idCard: string;
  relation: string;
}

interface LoanNode extends BaseNode {
  type: 'loan';
  amount: number;
  status: string;
  applyTime: string;
}

interface InvestigationNode extends BaseNode {
  type: 'investigation';
  conclusion: string;
  investigator: string;
}

type NetworkNode = CustomerNode | PhoneNode | DeviceNode | GuarantorNode | LoanNode | InvestigationNode;

interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  relationType: string;
  confidence: number;
  source: string;
  createdAt: string;
  isDuplicate?: boolean;
}

interface Anomaly {
  id: string;
  type: 'duplicate_relation' | 'dense_cluster' | 'blacklist_missing' | 'high_risk_path';
  severity: 'warning' | 'error' | 'info';
  message: string;
  relatedNodes: string[];
  relatedEdges: string[];
  detectedAt: string;
}

interface AnalysisState {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  anomalies: Anomaly[];
  selectedNode: string | null;
  selectedPath: string[];
  filters: {
    nodeTypes: NodeType[];
    riskLevels: RiskLevel[];
    showBlacklistOnly: boolean;
    searchQuery: string;
  };
  viewParams: {
    autoLayout: boolean;
    showLabels: boolean;
    showEdges: boolean;
    animationEnabled: boolean;
  };
  operationHistory: OperationRecord[];
}

interface OperationRecord {
  id: string;
  type: 'select' | 'filter' | 'mark' | 'path_find' | 'export' | 'save_params';
  description: string;
  timestamp: string;
  operator: string;
}
```

## 5. 核心模块说明

### 5.1 3D网络图模块 (NetworkGraph)
- 基于 @react-three/fiber 封装的3D场景
- 使用 Force-directed 布局算法自动排布节点
- 支持节点拖拽、缩放、旋转、选中
- 节点按类型和风险等级着色
- Bloom发光后处理效果

### 5.2 异常检测模块 (AnomalyDetector)
- 关系重复检测：检测同一对节点间的重复关系
- 节点过密检测：检测连接数超过阈值的节点簇
- 黑名单检测：检测黑名单节点是否未高亮
- 高风险路径检测：检测包含多个高风险节点的路径

### 5.3 路径分析模块 (PathFinder)
- BFS/DFS 路径查找算法
- 支持最短路径、所有路径查找
- 路径高亮展示
- 路径风险评估

### 5.4 数据持久化模块
- LocalStorage 存储视图参数和筛选条件
- JSON 格式导入导出分析结果
- 操作历史记录保存
