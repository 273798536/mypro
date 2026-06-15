## 1. 架构设计

```mermaid
flowchart TB
    subgraph 前端["前端 (React + Vite + Tailwind)"]
        A["计算工作台"] --> B["复核面板"]
        A --> C["追溯链路"]
        A --> D["下载导出"]
    end
    subgraph 后端["后端 (Express + TypeScript)"]
        E["计算API"] --> F["复核API"]
        E --> G["追溯API"]
        E --> H["导出API"]
    end
    subgraph 数据层["数据层 (SQLite)"]
        I["计算批次表"]
        J["处理记录表"]
        K["原始数据表"]
        L["复核修正表"]
    end
    前端 -->|"REST API"| 后端
    后端 -->|"SQL"| 数据层
```

## 2. 技术说明

- 前端：React@18 + tailwindcss@3 + vite + zustand
- 初始化工具：vite-init
- 后端：Express@4 + TypeScript (ESM)
- 数据库：SQLite (better-sqlite3)，轻量嵌入式，无需额外服务
- 数据策略：本地 SQLite 存储计算批次与处理记录，前端使用 mock 数据演示浮标数据与巡检照片

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 计算工作台 - 参数录入、计算执行、结果展示与解释 |
| /review | 复核面板 - 材料总览、风浪预报晚到修正、处理意见 |
| /trace | 追溯链路 - 结果追溯、异常回查 |
| /export | 下载导出 - 结果下载、批次管理 |

## 4. API 定义

### 4.1 计算相关

```typescript
interface ComputeRequest {
  buoyData: {
    significantWaveHeight: number;
    peakPeriod: number;
    mainDirection: number;
    windSpeed: number;
    windDirection: number;
    waterTemp: number;
  };
  forecastData?: {
    forecastWaveHeight: number;
    forecastPeriod: number;
    forecastDirection: number;
    arrivalTime: string;
    isLate: boolean;
  };
  inspectionPhotos: string[];
  buoyOfflineEvents: { startTime: string; endTime: string; reason: string }[];
}

interface ComputeResult {
  batchId: string;
  timestamp: string;
  parameters: {
    hs: { value: number; unit: string; explanation: string };
    tp: { value: number; unit: string; explanation: string };
    spectrumType: { value: string; explanation: string };
    windWaveRatio: { value: number; explanation: string };
    swellRatio: { value: number; explanation: string };
    dominantDirection: { value: number; unit: string; explanation: string };
  };
  riskLevel: "low" | "medium" | "high";
  waterQualityAlert: "normal" | "watch" | "warning";
  processingRecordId: string;
}
```

### 4.2 复核相关

```typescript
interface ReviewRequest {
  batchId: string;
  corrections: {
    field: string;
    originalValue: number | string;
    correctedValue: number | string;
    reason: string;
  }[];
  processingOpinion: string;
  vesselTrajectory?: { lat: number; lng: number; timestamp: string }[];
}

interface ReviewRecord {
  batchId: string;
  buoyDataStatus: "verified" | "corrected";
  inspectionPhotosStatus: "verified" | "pending";
  buoyOfflineStatus: "verified" | "needs_attention";
  lateForecastCorrections: CorrectionRecord[];
  processingOpinion: string;
  vesselTrajectory: TrajectoryPoint[];
  reviewedAt: string;
  reviewedBy: string;
}
```

### 4.3 追溯相关

```typescript
interface TraceChain {
  result: ComputeResult;
  computeParams: ComputeRequest;
  rawDataSource: {
    buoyData: { id: string; collectedAt: string; stationId: string };
    forecastData: { id: string; issuedAt: string; arrivalAt: string };
    inspectionPhotos: { id: string; takenAt: string; inspector: string }[];
    buoyOfflineEvents: { id: string; recordedAt: string }[];
  };
  processingRecords: ProcessingRecord[];
  reviewRecords: ReviewRecord[];
}

interface ProcessingRecord {
  id: string;
  batchId: string;
  step: string;
  input: string;
  output: string;
  riskLevel: string;
  waterQualityAlert: string;
  timestamp: string;
}
```

### 4.4 导出相关

```typescript
interface ExportRequest {
  batchId: string;
  format: "csv" | "json";
}

interface ExportInfo {
  batchId: string;
  filename: string;
  content: string;
  createdAt: string;
  previousBatchId: string | null;
}
```

## 5. 数据模型

### 5.1 数据模型定义

```mermaid
erDiagram
    "计算批次" {
        string batch_id PK
        datetime created_at
        string status
        string risk_level
        string water_quality_alert
    }
    "海浪谱参数" {
        string param_id PK
        string batch_id FK
        string param_name
        float param_value
        string param_unit
        string explanation
    }
    "处理记录" {
        string record_id PK
        string batch_id FK
        string step
        string input_summary
        string output_summary
        datetime timestamp
    }
    "原始数据" {
        string data_id PK
        string batch_id FK
        string data_type
        string source
        datetime collected_at
        string content_json
    }
    "复核修正" {
        string correction_id PK
        string batch_id FK
        string field
        string original_value
        string corrected_value
        string reason
        datetime corrected_at
    }
    "处理意见" {
        string opinion_id PK
        string batch_id FK
        string content
        string trajectory_json
        datetime created_at
    }
    "计算批次" ||--o{ "海浪谱参数" : "包含"
    "计算批次" ||--o{ "处理记录" : "产生"
    "计算批次" ||--o{ "原始数据" : "关联"
    "计算批次" ||--o{ "复核修正" : "记录"
    "计算批次" ||--o{ "处理意见" : "附带"
```

### 5.2 数据定义语言

```sql
CREATE TABLE compute_batches (
    batch_id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'computing',
    risk_level TEXT NOT NULL DEFAULT 'low',
    water_quality_alert TEXT NOT NULL DEFAULT 'normal'
);

CREATE TABLE wave_parameters (
    param_id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL REFERENCES compute_batches(batch_id),
    param_name TEXT NOT NULL,
    param_value REAL NOT NULL,
    param_unit TEXT,
    explanation TEXT NOT NULL
);

CREATE TABLE processing_records (
    record_id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL REFERENCES compute_batches(batch_id),
    step TEXT NOT NULL,
    input_summary TEXT,
    output_summary TEXT,
    timestamp TEXT NOT NULL
);

CREATE TABLE raw_data (
    data_id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL REFERENCES compute_batches(batch_id),
    data_type TEXT NOT NULL,
    source TEXT NOT NULL,
    collected_at TEXT NOT NULL,
    content_json TEXT NOT NULL
);

CREATE TABLE corrections (
    correction_id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL REFERENCES compute_batches(batch_id),
    field TEXT NOT NULL,
    original_value TEXT NOT NULL,
    corrected_value TEXT NOT NULL,
    reason TEXT NOT NULL,
    corrected_at TEXT NOT NULL
);

CREATE TABLE processing_opinions (
    opinion_id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL REFERENCES compute_batches(batch_id),
    content TEXT NOT NULL,
    trajectory_json TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX idx_params_batch ON wave_parameters(batch_id);
CREATE INDEX idx_records_batch ON processing_records(batch_id);
CREATE INDEX idx_raw_data_batch ON raw_data(batch_id);
CREATE INDEX idx_corrections_batch ON corrections(batch_id);
CREATE INDEX idx_opinions_batch ON processing_opinions(batch_id);
```
