## 1. 架构设计

```mermaid
graph TB
    subgraph 前端层["前端 React 18 + TypeScript"]
        A1["总览看板 Dashboard"]
        A2["批号详情 LotDetail"]
        A3["复核工作台 ReviewStation"]
        A4["并排对比 SideBySide"]
        A5["下载中心 ExportCenter"]
        A6["样例演示 DemoMode"]
        A7["Zustand 全局状态"]
        A8["Recharts 图表引擎"]
        A9["Lucide React 图标"]
    end

    subgraph 后端层["后端 Express 4 + TypeScript"]
        B1["批号路由 /api/lots"]
        B2["条带标注路由 /api/bands"]
        B3["差异分析路由 /api/diff"]
        B4["复核路由 /api/review"]
        B5["导出路由 /api/export"]
        B6["样例数据路由 /api/demo"]
    end

    subgraph 数据层["数据层 Mock + 文件"]
        C1["reagent_lots.json 试剂批号"]
        C2["samples.json 样本信息"]
        C3["bands.json 条带标注"]
        C4["analysis_runs.json 分析轮次"]
        C5["review_logs.json 复核日志"]
        C6["bad_data_cases.json 坏数据样例"]
    end

    A1 --> B1
    A1 --> B3
    A2 --> B1
    A2 --> B2
    A3 --> B4
    A4 --> B1
    A4 --> B3
    A5 --> B5
    A6 --> B6
    B1 --> C1
    B1 --> C2
    B2 --> C3
    B3 --> C3
    B3 --> C4
    B4 --> C5
    B5 --> C1
    B5 --> C2
    B5 --> C3
    B6 --> C6
```

---

## 2. 技术说明

- **前端**：React@18 + TypeScript@5 + Vite@5 + TailwindCSS@3 + Zustand@4 + React Router@6 + Recharts@2 + Lucide React@0.400
- **初始化工具**：vite-init（react-express-ts 模板）
- **后端**：Express@4 + TypeScript@5 + CORS + ts-node 开发运行
- **数据层**：JSON 文件模拟 + 内存缓存，无需数据库
- **设计原则**：前后端类型共享（shared/types 目录），单一数据源，所有图表/表格/下载读取同一份内存数据

---

## 3. 路由定义

| 路由（前端） | 页面组件 | 用途 |
|--------------|----------|------|
| `/` | Dashboard 总览看板 | 统计卡片、质量分布、差异滚动、快捷入口 |
| `/lot/:lotId` | LotDetail 批号详情 | 时间线、关联资源、条带表格、分组统计 |
| `/compare/:oldLotId/:newLotId` | SideBySide 并排对比 | 旧批号 vs 新批号、差异高亮、影响清单 |
| `/review` | ReviewStation 复核工作台 | 三步骤进度、重复运行配置、补录、人工确认 |
| `/export` | ExportCenter 下载中心 | 数据预览、格式选择、导出 |
| `/demo` | DemoMode 样例演示 | 坏数据案例库、演示模式切换 |

| 路由（后端 API） | 方法 | 用途 |
|------------------|------|------|
| `/api/lots` | GET | 获取所有批号列表（含统计） |
| `/api/lots/:id` | GET | 获取单批号详情（样本、照片、地点） |
| `/api/lots/:id/timeline` | GET | 获取批号分析轮次时间线 |
| `/api/lots/compare/:oldId/:newId` | GET | 对比两批号结论，返回差异行 + 影响清单 |
| `/api/bands` | GET | 获取条带标注列表（支持批号、轮次筛选） |
| `/api/bands/:id` | PATCH | 更新条带标注（补录字段） |
| `/api/diff/run` | POST | 触发重复运行分析，返回差异报告 |
| `/api/diff/group-stats/:lotId` | GET | 获取某批号分组统计改前/改后数据 |
| `/api/review/steps` | GET | 获取复核三步骤进度状态 |
| `/api/review/confirm` | POST | 人工确认/驳回条带标注 |
| `/api/review/supplement` | POST | 提交补录数据 |
| `/api/export/preview` | POST | 预览导出数据（行数、字段、批号范围） |
| `/api/export/download` | POST | 下载 CSV/JSON/PDF（同源数据） |
| `/api/demo/cases` | GET | 获取坏数据案例列表 |
| `/api/demo/load/:caseId` | POST | 加载指定案例的模拟数据到内存 |

---

## 4. 数据模型

### 4.1 ER 图

```mermaid
erDiagram
    REAGENT_LOT ||--o{ SAMPLE : "包含"
    SAMPLE ||--o{ BAND : "产生"
    REAGENT_LOT ||--o{ ANALYSIS_RUN : "执行"
    ANALYSIS_RUN ||--o{ BAND : "标注"
    BAND ||--o{ REVIEW_LOG : "复核"
    SAMPLE }o--|| SAMPLING_SITE : "采自"

    REAGENT_LOT {
        string id PK "批号ID"
        string lot_number "试剂批号"
        string reagent_name "试剂名称"
        string manufacturer "厂商"
        date production_date "生产日期"
        date expiry_date "有效期"
        string notes "备注"
    }

    SAMPLE {
        string id PK "样本ID"
        string lot_id FK "关联批号"
        string sample_code "样本编号"
        string sampling_site_id FK "采样地点"
        date collection_date "采集日期"
        string micrograph_url "显微照片URL"
        string concentration "浓度"
        boolean is_abnormal "是否异常"
    }

    SAMPLING_SITE {
        string id PK "地点ID"
        string name "地点名称"
        float lat "纬度"
        float lng "经度"
        string description "描述"
    }

    ANALYSIS_RUN {
        string id PK "轮次ID"
        string lot_id FK "批号ID"
        int run_index "第几轮"
        string algorithm_version "算法版本"
        datetime executed_at "执行时间"
        string operator "操作员"
        string parameters "参数JSON"
    }

    BAND {
        string id PK "条带ID"
        string sample_id FK "样本ID"
        string run_id FK "分析轮次"
        float position_mm "位置(mm)"
        float molecular_weight_kda "分子量(kDa)"
        float gray_value "灰度值"
        float quality_score "质量分0-100"
        string label "标注结论"
        string label_category "标注分类：目标/杂带/拖尾/缺失"
        boolean needs_supplement "需补录"
        boolean human_confirmed "人工确认"
        string confirm_status "确认状态：待确认/已确认/已驳回"
        string reviewer "复核人"
        datetime confirmed_at "确认时间"
        string reject_reason "驳回原因"
        string supplement_fields "补录字段JSON"
    }

    REVIEW_LOG {
        string id PK "日志ID"
        string band_id FK "条带ID"
        string action "动作：确认/驳回/补录/改批号"
        string operator "操作人"
        datetime created_at "时间"
        string old_value "原值"
        string new_value "新值"
        string comment "意见"
    }
```

### 4.2 坏数据样例（6 种典型场景）

| Case ID | 场景名称 | 模拟内容 | 教学目的 |
|---------|----------|----------|----------|
| BAD001 | 条带拖尾污染 | 3个样本出现 position_mm 异常偏大 + quality_score<30 + 灰度值连续递增 | 识别电泳拖尾，需人工补录备注 |
| BAD002 | 过曝照片 | 2张 micrograph 标记为 overexposed，灰度值全部>250，无法自动标注 | 触发补录流程，需重新上传照片 |
| BAD003 | 批号笔误 | lot_number 为 "RGT-2024-065" 应为 "RGT-2024-056"，导致 12 个样本挂错批号 | 演示批号修改并排对比，影响范围可视化 |
| BAD004 | 条带缺失 | 5个样本目标条带(45kDa)未检出，label_category="缺失"，needs_supplement=true | 人工确认判断：确为缺失还是算法漏检 |
| BAD005 | 采样地点缺失 | 8个样本 sampling_site_id 为空，采集日期早于生产日期 | 补录关键元数据，交叉验证合理性 |
| BAD006 | 差异分析改写 | 同一批号 Run1 标注 18 条"目标"，Run2 改用新算法后变为 14 条目标+4条杂带 | 分组统计前后变化，高亮 4 条改判样本 |

---

## 5. 前端状态管理（Zustand Store）

```typescript
// src/store/useWorkbenchStore.ts
interface WorkbenchState {
  // 数据
  lots: ReagentLot[];
  samples: Sample[];
  bands: Band[];
  analysisRuns: AnalysisRun[];
  reviewLogs: ReviewLog[];
  samplingSites: SamplingSite[];

  // UI 状态
  currentLotId: string | null;
  compareLotIds: [string | null, string | null];
  reviewStep: 1 | 2 | 3; // 1=重复运行,2=补录,3=人工确认
  isDemoMode: boolean;
  currentDemoCase: string | null;

  // 筛选
  filters: {
    qualityMin: number;
    labelCategory: string[];
    confirmStatus: string[];
    runIndex: number | null;
  };

  // Actions
  fetchAllData: () => Promise<void>;
  selectLot: (id: string) => void;
  setCompareLots: (oldId: string, newId: string) => void;
  triggerDiffRun: (lotId: string, params: any) => Promise<DiffReport>;
  supplementBand: (bandId: string, fields: any) => Promise<void>;
  confirmBand: (bandId: string, pass: boolean, comment?: string) => Promise<void>;
  confirmBatchBands: (ids: string[], pass: boolean) => Promise<void>;
  loadDemoCase: (caseId: string) => Promise<void>;
  toggleDemoMode: () => void;
  exportData: (format: 'csv' | 'json' | 'pdf', opts: any) => Promise<Blob>;
  updateFilters: (patch: Partial<WorkbenchState['filters']>) => void;
}
```

---

## 6. 共享类型（shared/types）

前后端共用的核心接口类型：
- `ReagentLot`, `Sample`, `SamplingSite`, `AnalysisRun`
- `Band`, `ReviewLog`, `DiffReport`, `DiffRow`
- `ExportOptions`, `ExportPreview`, `DemoCase`
- `ReviewStepProgress`, `GroupStats`, `TimelineNode`

保证 API 返回值、Store、UI 组件使用完全相同的类型定义。
