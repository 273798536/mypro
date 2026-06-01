## 1. 架构设计

```mermaid
graph TD
    subgraph "前端层"
        A["React 单页应用"]
        A1["数据导入模块"]
        A2["安全校核模块"]
        A3["明细详情模块"]
        A4["复盘分析模块"]
        A --> A1 & A2 & A3 & A4
    end

    subgraph "状态管理层"
        B["Zustand 状态管理"]
        B1["载重记录 Store"]
        B2["油压序列 Store"]
        B3["设备台账 Store"]
        B4["校核结果 Store"]
        B --> B1 & B2 & B3 & B4
    end

    subgraph "数据层"
        C["LocalStorage + IndexedDB"]
        C1["载重记录存储"]
        C2["油压序列存储"]
        C3["设备台账存储（多版本）"]
        C4["校核结果存储"]
        C5["证据链关联存储"]
        C --> C1 & C2 & C3 & C4 & C5
    end

    subgraph "组件库与工具"
        D["UI 组件库 + 工具函数"]
        D1["Ant Design 组件"]
        D2["ECharts 图表"]
        D3["XLSX/CSV 解析"]
        D4["PDF 导出"]
        D --> D1 & D2 & D3 & D4
    end

    A --> B
    B --> C
    A --> D
```

## 2. 技术说明

- **前端框架**：React@18 + TypeScript + Vite
- **构建工具**：Vite@5
- **状态管理**：Zustand（轻量级，适合本地数据管理）
- **UI 组件库**：Ant Design@5
- **图表库**：ECharts@5（油压曲线、趋势图、统计图）
- **数据解析**：xlsx（Excel解析）、papaparse（CSV解析）
- **导出功能**：jspdf（PDF导出）、xlsx（Excel导出）、html2canvas（图表导出）
- **数据存储**：LocalStorage（配置+小数据）、IndexedDB（大量时序数据）
- **路由**：React Router@6
- **样式方案**：TailwindCSS@3 + CSS Modules
- **后端**：无（纯前端应用，数据本地存储）
- **数据库**：无（使用浏览器存储 + Mock 数据）

## 3. 路由定义

| 路由 | 页面 | 功能说明 |
|------|------|----------|
| `/` | 首页/安全校核页 | 校核结果总览、问题列表、快捷操作 |
| `/import` | 数据导入页 | 载重记录、油压序列、设备台账导入，样例数据导入 |
| `/check` | 安全校核页 | 超载核对、油压分析、高度越界检测 |
| `/detail/:id` | 明细详情页 | 单条记录详情、证据链展示、图表展示 |
| `/analysis` | 复盘分析页 | 趋势图表、版本对比、报告导出 |

## 4. 数据类型定义

```typescript
// 载重记录
interface LoadRecord {
  id: string;
  recordNo: string;
  deviceId: string;
  deviceName: string;
  loadTime: string;
  loadWeight: number;
  ratedLoad: number;
  isOverload: boolean;
  height: number;
  maxHeight: number;
  isHeightOver: boolean;
  remark: string;
  remarkHistory: RemarkHistory[];
  ledgerVersion: string;
  createTime: string;
  updateTime: string;
  status: 'pending' | 'confirmed' | 'disputed';
}

interface RemarkHistory {
  id: string;
  content: string;
  operator: string;
  operateTime: string;
}

// 油压序列
interface OilPressureSeries {
  id: string;
  deviceId: string;
  recordNo: string;
  startTime: string;
  endTime: string;
  sampleInterval: number;
  dataPoints: OilPressurePoint[];
  anomalies: PressureAnomaly[];
  ledgerVersion: string;
  importTime: string;
}

interface OilPressurePoint {
  timestamp: string;
  pressure: number;
  temperature?: number;
}

interface PressureAnomaly {
  id: string;
  startTime: string;
  endTime: string;
  maxPressure: number;
  minPressure: number;
  fluctuation: number;
  type: 'spike' | 'drop' | 'fluctuation' | 'over_limit';
  severity: 'low' | 'medium' | 'high';
}

// 设备台账
interface DeviceLedger {
  id: string;
  deviceId: string;
  deviceName: string;
  version: string;
  versionName: string;
  ratedLoad: number;
  maxHeight: number;
  ratedPressure: number;
  pressureWarning: number;
  pressureAlarm: number;
  effectiveDate: string;
  isCurrent: boolean;
  createTime: string;
  remark: string;
}

// 校核结果
interface CheckResult {
  id: string;
  recordNo: string;
  loadRecordId: string;
  oilPressureId: string;
  ledgerVersion: string;
  checkTime: string;
  overloadCheck: CheckItem;
  pressureCheck: CheckItem;
  heightCheck: CheckItem;
  conclusion: 'normal' | 'warning' | 'danger';
  conclusionConsistent: boolean;
  maintenanceRemark: string;
  evidenceChain: EvidenceItem[];
  operator: string;
  status: 'draft' | 'confirmed' | 'archived';
}

interface CheckItem {
  passed: boolean;
  value: number;
  threshold: number;
  detail: string;
}

interface EvidenceItem {
  id: string;
  type: 'load_record' | 'oil_pressure' | 'maintenance_remark' | 'report';
  refId: string;
  description: string;
  timestamp: string;
  operator: string;
}

// 导出报告
interface ExportReport {
  id: string;
  reportNo: string;
  checkResultIds: string[];
  generateTime: string;
  format: 'pdf' | 'excel';
  operator: string;
  includeEvidence: boolean;
}
```

## 5. 数据模型

### 5.1 实体关系图

```mermaid
erDiagram
    LOAD_RECORD ||--o{ REMARK_HISTORY : has
    LOAD_RECORD }o--|| DEVICE_LEDGER : "uses version"
    LOAD_RECORD ||--|| OIL_PRESSURE_SERIES : "linked by"
    OIL_PRESSURE_SERIES ||--o{ PRESSURE_ANOMALY : contains
    OIL_PRESSURE_SERIES }o--|| DEVICE_LEDGER : "uses version"
    CHECK_RESULT ||--|| LOAD_RECORD : references
    CHECK_RESULT ||--|| OIL_PRESSURE_SERIES : references
    CHECK_RESULT ||--o{ EVIDENCE_ITEM : "has chain"
    DEVICE_LEDGER ||--o{ DEVICE_LEDGER : "supersedes"
    EXPORT_REPORT ||--o{ CHECK_RESULT : includes

    LOAD_RECORD {
        string id PK
        string recordNo
        string deviceId
        number loadWeight
        number height
        string ledgerVersion FK
        string status
    }

    REMARK_HISTORY {
        string id PK
        string loadRecordId FK
        string content
        string operateTime
    }

    OIL_PRESSURE_SERIES {
        string id PK
        string recordNo
        string deviceId
        string ledgerVersion FK
    }

    PRESSURE_ANOMALY {
        string id PK
        string seriesId FK
        string type
        string severity
    }

    DEVICE_LEDGER {
        string id PK
        string deviceId
        string version
        number ratedLoad
        number maxHeight
        boolean isCurrent
    }

    CHECK_RESULT {
        string id PK
        string loadRecordId FK
        string oilPressureId FK
        string conclusion
        boolean conclusionConsistent
        string maintenanceRemark
    }

    EVIDENCE_ITEM {
        string id PK
        string checkResultId FK
        string type
        string refId
        string timestamp
    }

    EXPORT_REPORT {
        string id PK
        string reportNo
        string format
    }
```

### 5.2 核心业务规则

1. **多版本管理**：设备台账支持多版本，新版本不覆盖旧版本，校核结果绑定具体版本号
2. **证据链关联**：每条校核结果必须关联对应的载重记录ID、油压序列ID和检修备注
3. **一致性判断**：当载重记录结论与油压序列结论不一致时，必须填写检修备注作为补充证据
4. **历史追溯**：载重记录的备注修改历史必须完整保留，不可删除或篡改
5. **高度越界保护**：高度越界记录与台账版本绑定，新版本不会覆盖旧版本的越界记录
6. **报告可追溯**：导出的报告需记录包含的校核结果ID列表，便于后续复核追溯
