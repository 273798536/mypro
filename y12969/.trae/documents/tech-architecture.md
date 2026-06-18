## 1. 架构设计

```mermaid
flowchart LR
    subgraph "前端层 (React 18)"
        A["仪表盘总览"]
        B["备份记录管理"]
        C["异常复核中心"]
        D["索引建议引擎"]
        E["历史记录追溯"]
        F["审计报告导出"]
    end
    subgraph "后端层 (Express 4)"
        G["导入/校验 Controller"]
        H["异常/复核 Controller"]
        I["索引/归因 Controller"]
        J["报告 Controller"]
        K["历史/轮次 Controller"]
    end
    subgraph "数据层 (SQLite + JSON 文件持久化)"
        L["备份记录表"]
        M["异常记录表"]
        N["索引建议表"]
        O["轮次/审计痕迹表"]
        P["状态流转日志"]
    end
    A --> K
    B --> G
    C --> H
    D --> I
    E --> K
    F --> J
    G --> L
    H --> M
    H --> P
    I --> N
    I --> M
    J --> L
    J --> M
    J --> N
    K --> O
    K --> P
```

## 2. 技术描述

- **前端**：React@18 + TypeScript + Vite + tailwindcss@3 + zustand + lucide-react + recharts
- **初始化工具**：vite-init
- **后端**：Express@4 + TypeScript（ESM 格式）
- **数据库**：SQLite（通过 better-sqlite3），服务重启后保留完整处理痕迹
- **图表库**：recharts（2D 图表），自实现 SVG 多层视图模拟三维效果
- **报告导出**：SheetJS (xlsx) 导出 Excel，前端生成结构化 JSON 报告

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 仪表盘总览页 |
| /backup | 备份记录管理页 |
| /review | 异常复核中心 |
| /index | 索引建议引擎 |
| /history | 历史记录追溯 |
| /report | 审计报告导出 |

## 4. API 定义

### 4.1 类型定义

```typescript
export type AuditRoundStatus = 'active' | 'archived';

export type RecordStatus = 'pending' | 'reviewing' | 'resolved' | 'confirmed';

export type AnomalyType = 'type_drift' | 'data_mismatch' | 'missing_record' | 'slow_query';

export type NextAction = 'supply_material' | 'adjust_caliber' | 'skip';

export interface BackupRecord {
  id: string;
  roundId: string;
  tableName: string;
  fieldName: string;
  backupType: string;
  reportType: string;
  backupSize: number;
  reportSize: number;
  hasTypeDrift: boolean;
  hasSizeMismatch: boolean;
  status: RecordStatus;
  createdAt: number;
  updatedAt: number;
}

export interface Anomaly {
  id: string;
  roundId: string;
  recordId: string;
  type: AnomalyType;
  description: string;
  evidence: string;
  suggestedAction: NextAction;
  interceptionRule?: string;
  status: RecordStatus;
  createdAt: number;
  updatedAt: number;
}

export interface IndexSuggestion {
  id: string;
  roundId: string;
  tableName: string;
  suggestedIndex: string;
  reason: string;
  expectedBenefit: string;
  priority: 'high' | 'medium' | 'low';
  relatedWorkOrder?: string;
  isActive: boolean;
  attributionUpdatedAt: number;
  createdAt: number;
}

export interface AuditRound {
  id: string;
  name: string;
  status: AuditRoundStatus;
  startedAt: number;
  archivedAt?: number;
  operator: string;
}

export interface StatusLog {
  id: string;
  roundId: string;
  entityType: 'record' | 'anomaly';
  entityId: string;
  fromStatus: RecordStatus;
  toStatus: RecordStatus;
  operator: string;
  remark: string;
  timestamp: number;
}

export interface CapacityTrendPoint {
  date: string;
  totalSize: number;
  backupSize: number;
  indexSize: number;
  explanation: string;
}
```

### 4.2 接口列表

| Method | Path | 说明 |
|--------|------|------|
| GET | /api/rounds | 获取审计轮次列表 |
| POST | /api/rounds | 创建新一轮审计 |
| POST | /api/rounds/:id/archive | 归档当前轮次 |
| GET | /api/rounds/:id/trend | 获取容量趋势数据 |
| POST | /api/backup/import | 导入备份记录（CSV/JSON） |
| GET | /api/backup/records?roundId= | 获取备份记录列表（含差异对比） |
| GET | /api/backup/records/:id/type-drift | 获取字段类型漂移详情 |
| GET | /api/anomalies?roundId= | 获取异常列表 |
| PUT | /api/anomalies/:id/status | 推进异常状态 |
| POST | /api/anomalies/:id/supply-material | 补充材料并触发归因重算 |
| POST | /api/anomalies/:id/adjust-caliber | 调整统计口径 |
| GET | /api/index-suggestions?roundId= | 获取索引建议列表 |
| POST | /api/index-suggestions/:id/reattribute | 触发索引归因重算 |
| GET | /api/logs?roundId= | 获取状态流转日志 |
| GET | /api/report/:roundId/preview | 预览审计报告 |
| GET | /api/report/:roundId/export.xlsx | 导出 Excel 审计报告 |

## 5. 服务端架构图

```mermaid
flowchart TD
    A["Express Router"] --> B["Controller 层"]
    B --> C["Service 层"]
    C --> D["Repository 层"]
    D --> E["SQLite (better-sqlite3)"]
    C --> F["业务规则引擎"]
    F --> G["类型漂移检测"]
    F --> H["差异比对算法"]
    F --> I["索引归因分析"]
    C --> J["状态机 (RecordStatus)"]
    J --> K["流转日志记录"]
```

## 6. 数据模型

### 6.1 ER 图

```mermaid
erDiagram
    AUDIT_ROUND ||--o{ BACKUP_RECORD : contains
    AUDIT_ROUND ||--o{ ANOMALY : contains
    AUDIT_ROUND ||--o{ INDEX_SUGGESTION : contains
    AUDIT_ROUND ||--o{ STATUS_LOG : contains
    BACKUP_RECORD ||--o{ ANOMALY : triggers
    BACKUP_RECORD ||--o{ STATUS_LOG : generates
    ANOMALY ||--o{ INDEX_SUGGESTION : relates
    ANOMALY ||--o{ STATUS_LOG : generates

    AUDIT_ROUND {
        string id PK
        string name
        string status
        number startedAt
        number archivedAt
        string operator
    }

    BACKUP_RECORD {
        string id PK
        string roundId FK
        string tableName
        string fieldName
        string backupType
        string reportType
        number backupSize
        number reportSize
        boolean hasTypeDrift
        boolean hasSizeMismatch
        string status
        number createdAt
        number updatedAt
    }

    ANOMALY {
        string id PK
        string roundId FK
        string recordId FK
        string type
        string description
        string evidence
        string suggestedAction
        string interceptionRule
        string status
        number createdAt
        number updatedAt
    }

    INDEX_SUGGESTION {
        string id PK
        string roundId FK
        string tableName
        string suggestedIndex
        string reason
        string expectedBenefit
        string priority
        string relatedWorkOrder
        boolean isActive
        number attributionUpdatedAt
        number createdAt
    }

    STATUS_LOG {
        string id PK
        string roundId FK
        string entityType
        string entityId
        string fromStatus
        string toStatus
        string operator
        string remark
        number timestamp
    }
```

### 6.2 DDL 语句

```sql
CREATE TABLE IF NOT EXISTS audit_round (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  started_at INTEGER NOT NULL,
  archived_at INTEGER,
  operator TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS backup_record (
  id TEXT PRIMARY KEY,
  round_id TEXT NOT NULL,
  table_name TEXT NOT NULL,
  field_name TEXT NOT NULL,
  backup_type TEXT NOT NULL,
  report_type TEXT NOT NULL,
  backup_size INTEGER NOT NULL,
  report_size INTEGER NOT NULL,
  has_type_drift INTEGER NOT NULL DEFAULT 0,
  has_size_mismatch INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (round_id) REFERENCES audit_round(id)
);

CREATE TABLE IF NOT EXISTS anomaly (
  id TEXT PRIMARY KEY,
  round_id TEXT NOT NULL,
  record_id TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence TEXT NOT NULL,
  suggested_action TEXT NOT NULL,
  interception_rule TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (round_id) REFERENCES audit_round(id),
  FOREIGN KEY (record_id) REFERENCES backup_record(id)
);

CREATE TABLE IF NOT EXISTS index_suggestion (
  id TEXT PRIMARY KEY,
  round_id TEXT NOT NULL,
  table_name TEXT NOT NULL,
  suggested_index TEXT NOT NULL,
  reason TEXT NOT NULL,
  expected_benefit TEXT NOT NULL,
  priority TEXT NOT NULL,
  related_work_order TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  attribution_updated_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (round_id) REFERENCES audit_round(id)
);

CREATE TABLE IF NOT EXISTS status_log (
  id TEXT PRIMARY KEY,
  round_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  operator TEXT NOT NULL,
  remark TEXT,
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (round_id) REFERENCES audit_round(id)
);

CREATE INDEX IF NOT EXISTS idx_backup_record_round ON backup_record(round_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_round ON anomaly(round_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_record ON anomaly(record_id);
CREATE INDEX IF NOT EXISTS idx_index_suggestion_round ON index_suggestion(round_id);
CREATE INDEX IF NOT EXISTS idx_status_log_round ON status_log(round_id);
CREATE INDEX IF NOT EXISTS idx_status_log_entity ON status_log(entity_type, entity_id);
```
