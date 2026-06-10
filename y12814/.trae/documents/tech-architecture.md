## 1. 架构设计

```mermaid
graph TB
    "前端 React 应用" --> "状态管理 Zustand"
    "状态管理 Zustand" --> "本地数据引擎"
    "本地数据引擎" --> "物种同义词表"
    "本地数据引擎" --> "污染检测规则"
    "本地数据引擎" --> "样本数据存储"
    "本地数据引擎" --> "试剂批号索引"
```

纯前端应用，所有数据与逻辑在浏览器端完成，无需后端服务。

## 2. 技术说明

- 前端：React@18 + Tailwind CSS@3 + Vite
- 初始化工具：Vite (React + TypeScript)
- 后端：无（纯前端，数据内嵌）
- 数据库：无（使用 Zustand 管理内存状态 + localStorage 持久化）
- 图表：Recharts（柱状图、响应式）
- 导出：SheetJS (xlsx) 用于 Excel 导出，html2canvas 用于报告截图
- 日期处理：dayjs

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 复核看板页：试剂批号筛选、滴度图表+明细、样本清单 |
| /supplement | 样本补录页：追加样本、自动检测、实时刷新 |
| /export | 导出报告页：报告预览、下载 |

## 4. API 定义

无后端 API，数据通过本地状态管理。以下为内部数据接口定义：

```typescript
interface Sample {
  id: string
  speciesName: string
  standardName: string | null
  titerValue: number
  batchNo: string
  status: "pass" | "pending" | "bad"
  blockReason: string | null
  isSynonym: boolean
  isContaminated: boolean
  createdAt: string
}

interface BatchSummary {
  batchNo: string
  total: number
  passCount: number
  pendingCount: number
  badCount: number
}

interface SynonymRule {
  standardName: string
  synonyms: string[]
}

interface RunRecord {
  runId: string
  batchNo: string
  timestamp: string
  samples: Sample[]
}
```

## 5. 服务器架构

不适用，纯前端应用。

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    "试剂批次" ||--o{ "样本记录" : "包含"
    "物种同义词表" ||--o{ "样本记录" : "匹配"
    "运行记录" ||--|{ "样本记录" : "快照"

    "试剂批次" {
        string "批号" PK
        string "创建日期"
    }

    "样本记录" {
        string "样本ID" PK
        string "物种名"
        string "标准名"
        number "滴度值"
        string "批号" FK
        string "状态"
        string "拦截原因"
        boolean "是否同义名"
        boolean "是否污染"
    }

    "物种同义词表" {
        string "标准名" PK
        string "同义名列表"
    }

    "运行记录" {
        string "运行ID" PK
        string "批号" FK
        string "时间戳"
    }
```

### 6.2 初始数据

三条样例数据：

| 样本ID | 物种名 | 标准名 | 滴度值 | 批号 | 状态 | 拦截原因 |
|--------|--------|--------|--------|------|------|----------|
| S001 | Mus musculus | null | 1:640 | B20240315 | 通过 | 无 |
| S002 | Mus musculus domesticus | Mus musculus | 1:320 | B20240315 | 待确认 | 物种名同义：Mus musculus domesticus 是 Mus musculus 的同义名，需确认是否为同一物种 |
| S003 | Gallus gallus | null | 1:20 | B20240315 | 坏数据 | 污染样本：Gallus gallus（家鸡）不属于本批次预期物种范围，疑似样本混入 |

同义词表：
- Mus musculus ← [Mus musculus domesticus, Mus musculus castaneus]
- Rattus norvegicus ← [Rattus norvegicus albus, Epimys norvegicus]
