## 1. 架构设计

```mermaid
graph TB
    subgraph "前端层"
        A["React 18 应用"]
        B["3D渲染引擎 Three.js/R3F"]
        C["状态管理 Zustand"]
    end
    subgraph "数据层"
        D["Mock数据集"]
        E["异常检测引擎"]
        F["修正痕迹存储"]
    end
    subgraph "导出层"
        G["截图导出 html2canvas"]
    end
    A --> B
    A --> C
    C --> D
    C --> E
    C --> F
    A --> G
```

## 2. 技术说明

- 前端：React@18 + TypeScript + Tailwind CSS@3 + Vite
- 3D渲染：three + @react-three/fiber + @react-three/drei + @react-three/postprocessing
- 状态管理：Zustand
- 截图导出：html2canvas
- 初始化工具：vite-init
- 后端：无（纯前端，Mock数据）
- 数据库：无（内存数据集）

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 漏斗主页面，包含3D漏斗、筛选面板、节点明细、历史对比、导出截图 |

## 4. 数据模型

### 4.1 数据模型定义

```mermaid
erDiagram
    "Application" {
        string id PK
        string applicantName
        string channelCode FK
        string productCode FK
        date applyDate
        string status
    }
    "Channel" {
        string code PK
        string name
        string type
    }
    "Product" {
        string code PK
        string name
        string category
    }
    "ApprovalNode" {
        string id PK
        string applicationId FK
        string nodeName
        int enterCount
        int passCount
        int rejectCount
        date timestamp
    }
    "RejectionReason" {
        string id PK
        string applicationId FK
        string code
        string description
        boolean isOverwritten
        string originalDescription
        date overwrittenAt
    }
    "FunnelReport" {
        string id PK
        string period
        date generatedAt
        json snapshot
    }
    "CorrectionLog" {
        string id PK
        string targetId
        string targetType
        string field
        string oldValue
        string newValue
        string reason
        string operator
        date correctedAt
    }
    "Application" }o--|| "Channel" : "belongsTo"
    "Application" }o--|| "Product" : "belongsTo"
    "Application" ||--o{ "ApprovalNode" : "has"
    "Application" ||--o{ "RejectionReason" : "has"
    "FunnelReport" }o--|| "Application" : "covers"
    "CorrectionLog" }o--o| "Application" : "tracks"
```

### 4.2 异常检测规则

| 异常类型 | 检测逻辑 | 提示级别 |
|----------|----------|----------|
| 节点重复 | 同一申请在同一审批节点出现>=2条记录 | 错误（红色） |
| 渠道错归 | 申请渠道编码与渠道名称映射不匹配 | 警告（橙色） |
| 拒绝原因覆盖 | RejectionReason.isOverwritten=true | 错误（红色） |

## 5. 组件架构

```mermaid
graph TD
    "App" --> "FunnelPage"
    "FunnelPage" --> "FilterPanel"
    "FunnelPage" --> "FunnelScene3D"
    "FunnelPage" --> "NodeDetailPanel"
    "FunnelPage" --> "HistoryPanel"
    "FunnelPage" --> "AnomalyAlert"
    "FunnelPage" --> "ExportButton"
    "FunnelScene3D" --> "FunnelMesh"
    "FunnelScene3D" --> "FunnelLayer"
    "FunnelScene3D" --> "ParticleEffect"
    "FunnelScene3D" --> "SceneLighting"
    "FunnelScene3D" --> "PostProcessing"
    "NodeDetailPanel" --> "MetricCard"
    "NodeDetailPanel" --> "RejectionChart"
    "NodeDetailPanel" --> "SourceTimeline"
    "NodeDetailPanel" --> "CorrectionLogList"
    "HistoryPanel" --> "PeriodSelector"
    "HistoryPanel" --> "DiffHighlight"
```

## 6. 状态管理设计

使用Zustand管理以下状态切片：

- `funnelStore`：漏斗数据、筛选条件、选中节点、异常列表
- `historyStore`：历史报告列表、对比期次、差异结果
- `correctionStore`：修正日志、修正操作
