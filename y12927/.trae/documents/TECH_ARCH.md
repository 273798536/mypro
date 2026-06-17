## 1. 架构设计

```mermaid
graph TD
    subgraph "前端层 (React 18)"
        A["App 路由入口"]
        B["检查概览页 /overview"]
        C["异常详情页 /anomaly/:id"]
        D["人工修正工作台 /correction"]
        E["报告导出面板 /export"]
        F["公共组件：卡片/表格/图表/时间轴"]
        G["Zustand 全局状态：当前批次、筛选条件、修正记录"]
    end
    subgraph "后端层 (Express 4)"
        H["REST API 路由"]
        I["批次管理接口"]
        J["异常查询接口"]
        K["修正记录接口"]
        L["报告生成接口"]
        M["服务层：数据聚合、人话转换、报告渲染"]
    end
    subgraph "数据层 (Mock JSON)"
        N["批次元数据 batches.json"]
        O["异常记录 anomalies.json"]
        P["模型日志 model_logs.json"]
        Q["修正记录 corrections.json"]
        R["复现样例 examples.json"]
    end
    A --> B & C & D & E
    B & C & D & E --> F
    B & C & D & E --> G
    H --> I & J & K & L
    I & J & K & L --> M
    M --> N & O & P & Q & R
```

## 2. 技术说明

- **前端**：React@18 + TypeScript + tailwindcss@3 + react-router-dom + zustand + lucide-react + recharts
- **后端**：Express@4 + TypeScript
- **初始化工具**：vite-init（react-express-ts 模板）
- **数据存储**：本地 JSON Mock 数据，无需数据库
- **报告导出**：Excel 用 xlsx 库，HTML 用模板字符串渲染

## 3. 路由定义

| 前端路由 | 页面组件 | 用途 |
|----------|----------|------|
| / | Redirect 到 /overview | 首页跳转 |
| /overview | OverviewPage | 检查概览：批次选择、异常分布、异常列表 |
| /anomaly/:id | AnomalyDetailPage | 异常详情：原因说明、复现样例、模型日志、图表 |
| /correction | CorrectionPage | 人工修正：待处理/已处理、批量操作、意见录入 |
| /export | ExportPage | 报告导出：格式选择、文件名预览、下载 |

| 后端 API | 方法 | 用途 |
|----------|------|------|
| /api/batches | GET | 获取所有运行批次列表 |
| /api/batches/:id | GET | 获取单个批次详情 |
| /api/anomalies | GET | 按批次+类型筛选异常列表 |
| /api/anomalies/:id | GET | 获取单条异常完整信息（含日志、样例） |
| /api/corrections | GET | 获取修正记录（与报告共用） |
| /api/corrections | POST | 保存/更新修正记录 |
| /api/report/excel | POST | 生成 Excel 报告下载 |
| /api/report/html | POST | 生成 HTML 报告下载 |

## 4. 数据模型

```mermaid
erDiagram
    BATCH ||--o{ ANOMALY : contains
    ANOMALY ||--o{ MODEL_LOG : has
    ANOMALY ||--o{ CORRECTION : "0 or 1"
    ANOMALY ||--o{ EXAMPLE : references

    BATCH {
        string id PK "批次号，如 RUN-20260617-001"
        string fileName "文件名，用于区分新旧运行"
        string summary "摘要说明"
        string runAt "运行时间 ISO"
        number totalSamples "总样本数"
        number anomalyCount "异常数"
    }

    ANOMALY {
        string id PK "异常ID"
        string batchId FK "所属批次"
        string type "异常类型：duplicate/rule_missing/format_error/leak"
        string rawCode "原始字段码"
        string humanReason "人话解释"
        string severity "严重程度：high/medium/low"
        string originalText "样本原文"
        string status "处理状态：pending/processing/resolved/ignored"
        object metrics "图表指标 {similarity, coverage, ...}"
    }

    MODEL_LOG {
        string id PK
        string anomalyId FK
        number stepIndex "步骤序号"
        string stepName "步骤名称"
        string status "pass/warn/fail"
        string value "判定值"
        string description "人话说明"
        string timestamp "发生时间"
    }

    CORRECTION {
        string id PK
        string anomalyId FK "关联异常，一一对应"
        string action "修正动作"
        string opinion "处理意见"
        string operator "操作人"
        string correctedAt "修正时间"
        boolean isExported "是否已进报告（保证界面和报告一致）"
    }

    EXAMPLE {
        string id PK
        string anomalyType "关联异常类型"
        string scenario "场景名：旧表/补录备注/漏填单位"
        string title "样例标题"
        string description "描述"
        object data "样例数据"
    }
```

## 5. 命名规范（区分运行批次）

- 文件名格式：`训练切分隔离检查_YYYYMMDD_HHMMSS_{batchId}.{xlsx|html}`
- 示例：`训练切分隔离检查_20260617_143052_RUN-20260617-001.xlsx`
- 文件内容页眉含：生成时间、批次号、操作人、异常总数、已处理数
