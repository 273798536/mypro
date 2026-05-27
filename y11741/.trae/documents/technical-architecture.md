## 1. 架构设计

```mermaid
flowchart TD
    subgraph "前端层"
        A["React 应用"]
        A1["仪表盘 Dashboard"]
        A2["摊销列表 AmortizationList"]
        A3["摊销详情 AmortizationDetail"]
        A4["摊销编辑 AmortizationEdit"]
        A5["历史记录 History"]
        A6["数据导入 DataImport"]
        A7["导出报告 Export"]
    end
    subgraph "状态管理层"
        B["Zustand Store"]
        B1["摊销数据 Store"]
        B2["导入数据 Store"]
        B3["UI 状态 Store"]
    end
    subgraph "持久化层"
        C["LocalStorage"]
        C1["摊销记录"]
        C2["修正历史"]
        C3["导入日志"]
    end
    subgraph "计算引擎"
        D["摊销计算 Service"]
        D1["标签归因"]
        D2["预留抵扣分摊"]
        D3["共享网关分摊"]
        D4["异常检测"]
    end
```

## 2. 技术说明

- **前端框架**: React@18 + TypeScript
- **构建工具**: Vite@5
- **样式方案**: TailwindCSS@3
- **状态管理**: Zustand（轻量、支持持久化）
- **图表库**: Recharts（轻量、React 友好）
- **图标库**: Lucide React
- **路由**: React Router@6
- **日期处理**: date-fns
- **后端**: 无（纯前端应用，数据持久化到 LocalStorage，支持导入导出 JSON/CSV）
- **数据库**: 无（Mock 数据 + LocalStorage）

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| `/` | 仪表盘 - 成本趋势、异常提醒、待处理事项 |
| `/amortization` | 摊销列表 - 按月/项目查看摊销记录 |
| `/amortization/:id` | 摊销详情 - 来源追溯、修正历史、异常标注 |
| `/amortization/:id/edit` | 摊销编辑 - 调整规则、修正异常 |
| `/history` | 历史记录 - 全量操作审计日志 |
| `/import` | 数据导入 - 多来源导入、冲突处理 |
| `/export` | 导出报告 - 格式选择、范围选择 |

## 4. 数据模型

### 4.1 数据模型定义

```mermaid
erDiagram
    CLOUD_BILL ||--o{ AMORTIZATION_RECORD : "生成"
    RESOURCE_TAG ||--o{ AMORTIZATION_RECORD : "归因"
    RESERVED_INSTANCE ||--o{ AMORTIZATION_RECORD : "抵扣"
    SHARED_GATEWAY ||--o{ AMORTIZATION_RECORD : "分摊"
    PROJECT ||--o{ AMORTIZATION_RECORD : "归属"
    AMORTIZATION_RECORD ||--o{ CORRECTION : "修正"
    IMPORT_LOG ||--o{ CORRECTION : "记录"

    CLOUD_BILL {
        string id PK
        string month
        string provider
        number total_cost
        string raw_data
        string imported_at
    }

    RESOURCE_TAG {
        string id PK
        string resource_id
        string project_key
        string tag_value
        string source
    }

    RESERVED_INSTANCE {
        string id PK
        string instance_type
        string region
        number monthly_cost
        number utilized_cost
        date start_date
        date end_date
    }

    SHARED_GATEWAY {
        string id PK
        string gateway_name
        number total_cost
        string allocation_method
        string project_keys
    }

    PROJECT {
        string id PK
        string name
        string key UK
        string owner
        string status
    }

    AMORTIZATION_RECORD {
        string id PK
        string month
        string project_key FK
        number raw_cost
        number reserved_deduction
        number shared_allocation
        number net_cost
        string status
        json anomalies
        string created_at
        string updated_at
    }

    CORRECTION {
        string id PK
        string amortization_id FK
        string field
        number old_value
        number new_value
        string reason
        string operator
        string created_at
    }

    IMPORT_LOG {
        string id PK
        string source_type
        string file_name
        number record_count
        string conflict_strategy
        string status
        string created_at
    }
```

### 4.2 数据定义语言

```typescript
interface CloudBill {
  id: string;
  month: string;
  provider: 'aliyun' | 'aws' | 'tencent' | 'huawei';
  totalCost: number;
  rawData: Record<string, unknown>;
  importedAt: string;
}

interface ResourceTag {
  id: string;
  resourceId: string;
  projectKey: string;
  tagValue: string;
  source: 'manual' | 'auto' | 'import';
}

interface ReservedInstance {
  id: string;
  instanceType: string;
  region: string;
  monthlyCost: number;
  utilizedCost: number;
  startDate: string;
  endDate: string;
}

interface SharedGateway {
  id: string;
  gatewayName: string;
  totalCost: number;
  allocationMethod: 'equal' | 'weighted' | 'custom';
  projectKeys: string[];
}

interface Project {
  id: string;
  name: string;
  key: string;
  owner: string;
  status: 'active' | 'archived';
}

interface Anomaly {
  type: 'missing_tag' | 'duplicate_allocation' | 'deduction_error' | 'peak_cost';
  severity: 'warning' | 'error' | 'info';
  message: string;
  details?: Record<string, unknown>;
}

interface AmortizationRecord {
  id: string;
  month: string;
  projectKey: string;
  rawCost: number;
  reservedDeduction: number;
  sharedAllocation: number;
  netCost: number;
  status: 'normal' | 'anomaly' | 'pending';
  anomalies: Anomaly[];
  sources: {
    cloudBillIds: string[];
    tagIds: string[];
    reservedInstanceIds: string[];
    gatewayIds: string[];
  };
  createdAt: string;
  updatedAt: string;
}

interface Correction {
  id: string;
  amortizationId: string;
  field: 'reservedDeduction' | 'sharedAllocation' | 'rawCost';
  oldValue: number;
  newValue: number;
  reason: string;
  operator: string;
  createdAt: string;
}

interface ImportLog {
  id: string;
  sourceType: 'cloud_bill' | 'resource_tag' | 'reserved_instance' | 'shared_gateway' | 'project';
  fileName: string;
  recordCount: number;
  conflictStrategy: 'ignore' | 'overwrite' | 'append';
  status: 'success' | 'partial' | 'failed';
  createdAt: string;
}
```
