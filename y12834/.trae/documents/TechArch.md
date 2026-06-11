## 1. 架构设计

```mermaid
flowchart TB
    subgraph "前端应用层"
        A["React 页面组件"]
        B["UI 组件库"]
        C["状态管理 (Zustand)"]
        D["路由 (React Router)"]
    end
    subgraph "业务逻辑层"
        E["AI/ML 工作流引擎"]
        F["报告导出服务"]
        G["异常检测服务"]
        H["物种名校验服务"]
    end
    subgraph "数据持久层"
        I["LocalStorage 适配器"]
        J["数据序列化模块"]
        K["版本快照管理"]
    end
    subgraph "外部依赖"
        L["Lucide Icons"]
        M["Chart.js 图表"]
        N["HTML2Canvas / jsPDF"]
    end
    A --> B
    A --> D
    A --> C
    C --> E
    C --> F
    C --> G
    C --> H
    E --> I
    F --> I
    G --> I
    H --> I
    I --> J
    I --> K
    A --> L
    A --> M
    F --> N
```

## 2. 技术描述

- 前端：React@18 + TypeScript@5 + tailwindcss@3 + Vite@5
- 状态管理：Zustand@4
- 路由：react-router-dom@6
- 图表：chart.js@4 + react-chartjs-2@5
- 报告导出：html2canvas + jspdf
- 图标：lucide-react
- 后端：无（纯前端应用）
- 数据库：浏览器 LocalStorage（JSON 序列化存储）

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 投喂日历主页：日历视图、异常概览、最近运行 |
| /samples | 样本管理页：样本列表、筛选、详情查看与编辑 |
| /samples/:id | 样本详情页：图像标注编辑器、病理备注、版本历史 |
| /workflow | AI/ML 工作流页：运行配置、进度追踪、版本对比、人工修正 |
| /review | 复核与报告页：异常明细、物种名同义解释、报告导出 |

## 4. 数据模型

### 4.1 数据模型 ER 图

```mermaid
erDiagram
    FEEDING_RECORD ||--o{ SAMPLE : contains
    SAMPLE ||--o{ SAMPLE_VERSION : has
    SAMPLE_VERSION ||--o{ IMAGE_ANNOTATION : has
    SAMPLE_VERSION ||--o{ PATHOLOGY_NOTE : has
    SAMPLE_VERSION ||--o{ CORRECTION_LOG : has
    WORKFLOW_RUN ||--o{ SAMPLE_VERSION : references
    WORKFLOW_RUN ||--o{ ANOMALY : produces
    WORKFLOW_RUN ||--o{ SPECIES_SYNONYM_CHECK : produces
    ANOMALY }o--|| SAMPLE : relates_to

    FEEDING_RECORD {
        string id PK
        string date
        string researcher
        string group_id
        string notes
        string created_at
        string updated_at
    }

    SAMPLE {
        string id PK
        string feeding_record_id FK
        string species_name
        string standard_species_name
        string group
        string image_url
        string current_version_id
        string created_at
        string updated_at
    }

    SAMPLE_VERSION {
        string id PK
        string sample_id FK
        int version_number
        string run_id FK
        string status
        string created_at
        string created_by
    }

    IMAGE_ANNOTATION {
        string id PK
        string version_id FK
        float x
        float y
        float width
        float height
        string label
        string confidence
        string source
        string created_at
    }

    PATHOLOGY_NOTE {
        string id PK
        string version_id FK
        string content
        string annotation_id FK
        string created_at
        string created_by
    }

    CORRECTION_LOG {
        string id PK
        string version_id FK
        string field_name
        string old_value
        string new_value
        string reason
        string created_at
        string created_by
    }

    WORKFLOW_RUN {
        string id PK
        string version_label
        string model_version
        string group_filter
        string status
        string started_at
        string completed_at
        string created_by
    }

    ANOMALY {
        string id PK
        string run_id FK
        string sample_id FK
        string type
        string severity
        string description
        string next_action
        string resolved
        string resolved_at
    }

    SPECIES_SYNONYM_CHECK {
        string id PK
        string run_id FK
        string input_name
        string standard_name
        string[] synonyms
        string dictionary_version
        string reason_blocked
        string resolved
    }
```

### 4.2 LocalStorage 存储键

| 键名 | 说明 |
|------|------|
| feeding_records | 投喂记录数组 |
| samples | 样本数组 |
| sample_versions | 样本版本数组 |
| image_annotations | 图像标注数组 |
| pathology_notes | 病理备注数组 |
| correction_logs | 人工修正日志数组 |
| workflow_runs | AI/ML 工作流运行记录数组 |
| anomalies | 异常记录数组 |
| species_synonym_checks | 物种名同义校验记录数组 |
| app_settings | 应用设置（当前角色、视图偏好等） |

## 5. 核心模块划分

### 5.1 目录结构

```
src/
├── components/           # 可复用组件
│   ├── layout/           # 布局组件（导航、侧边栏、页头）
│   ├── calendar/         # 日历相关组件
│   ├── sample/           # 样本相关组件（卡片、筛选器、标注编辑器）
│   ├── workflow/         # 工作流相关组件（进度条、版本对比、修正面板）
│   ├── review/           # 复核相关组件（异常列表、图表解释、报告导出）
│   └── ui/               # 基础 UI 组件（按钮、卡片、模态框、标签）
├── pages/                # 页面级组件
│   ├── CalendarPage.tsx
│   ├── SamplesPage.tsx
│   ├── SampleDetailPage.tsx
│   ├── WorkflowPage.tsx
│   └── ReviewPage.tsx
├── store/                # Zustand 状态管理
│   ├── useFeedingStore.ts
│   ├── useSampleStore.ts
│   ├── useWorkflowStore.ts
│   ├── useReviewStore.ts
│   └── useAppStore.ts
├── hooks/                # 自定义 React Hooks
│   ├── useLocalStorage.ts
│   ├── useVersionDiff.ts
│   └── useReportExport.ts
├── utils/                # 工具函数
│   ├── storage.ts        # LocalStorage 封装
│   ├── version.ts        # 版本号生成与对比
│   ├── species.ts        # 物种名校验与同义处理
│   ├── anomaly.ts        # 异常检测与分类
│   └── export.ts         # 报告导出工具
├── types/                # TypeScript 类型定义
│   └── index.ts
├── data/                 # Mock 初始数据
│   └── mockData.ts
├── App.tsx
├── main.tsx
└── index.css
```

### 5.2 状态管理划分

| Store | 职责 |
|-------|------|
| useAppStore | 全局应用状态：当前用户角色、选中版本号、页面主题 |
| useFeedingStore | 投喂记录：CRUD 操作、按日期查询 |
| useSampleStore | 样本与版本：样本管理、版本快照、图像标注、病理备注、人工修正记录 |
| useWorkflowStore | AI/ML 工作流：运行配置、进度模拟、版本对比、人工修正面板 |
| useReviewStore | 复核与报告：异常查询、下一步操作、物种名同义解释、报告导出配置 |
