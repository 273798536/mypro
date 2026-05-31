## 1. 架构设计

```mermaid
graph TD
    subgraph "前端 (React + TypeScript)"
        A1["计算主页面"]
        A2["历史记录页面"]
        A3["组件库 (输入框、卡片、图表)"]
        A4["状态管理 (Zustand)"]
        A5["API客户端"]
    end
    
    subgraph "后端 (Express + TypeScript)"
        B1["计算控制器"]
        B2["历史记录控制器"]
        B3["计算服务 (核心算法)"]
        B4["异常检测服务"]
        B5["溯源服务"]
        B6["去重服务"]
        B7["数据访问层"]
    end
    
    subgraph "数据层"
        C1["SQLite 数据库"]
        C2["计算结果表"]
        C3["溯源信息表"]
        C4["异常记录表"]
    end
    
    A1 --> A5
    A2 --> A5
    A5 --> B1
    A5 --> B2
    B1 --> B3
    B1 --> B4
    B1 --> B5
    B1 --> B6
    B2 --> B7
    B3 --> B7
    B4 --> B7
    B5 --> B7
    B6 --> B7
    B7 --> C1
```

## 2. 技术描述

- **前端框架**：React@18 + TypeScript
- **构建工具**：Vite@5
- **样式方案**：TailwindCSS@3
- **状态管理**：Zustand@4
- **路由管理**：React Router DOM@6
- **图标库**：Lucide React
- **后端框架**：Express@4 + TypeScript
- **数据库**：SQLite3 + better-sqlite3
- **ORM**：无，直接使用参数化查询保证性能
- **包管理器**：npm

### 核心算法依赖
- 横摇频率估算：基于船舶静力学公式
- 舒适度评分：ISO 2631-1 标准
- 异常检测：统计过程控制（SPC）方法

## 3. 路由定义

| 路由 | 页面/接口 | 用途 |
|------|----------|------|
| / | 计算主页 | 参数输入、计算执行、结果展示 |
| /history | 历史记录页 | 历史查询、结果对比 |
| /api/calculate | POST 接口 | 执行横摇舒适度计算 |
| /api/history | GET 接口 | 查询历史记录列表 |
| /api/history/:id | GET 接口 | 获取单条历史记录详情 |
| /api/history/:id | DELETE 接口 | 删除单条历史记录 |

## 4. API 定义

### 4.1 计算请求类型

```typescript
interface DataSource {
  name: string;
  file?: string;
  timestamp: string;
}

interface HullParams {
  displacement: number;      // 排水量，单位：吨
  GM: number;                // 初稳心高，单位：m
  rollRadius: number;        // 横摇惯性半径，单位：m
  shipLength: number;        // 船长，单位：m
  shipWidth: number;         // 船宽，单位：m
  source: DataSource;
}

interface WaveParams {
  significantHeight: number | null;  // 有义波高，单位：m（可能缺测）
  wavePeriod: number | null;         // 波浪周期，单位：s（可能缺测）
  waveDirection: number | null;      // 浪向角，单位：°（可能缺测）
  source: DataSource;
}

interface NavigationParams {
  speed: number;             // 航速，单位：节
  speedHistory?: number[];   // 历史航速序列，用于突变检测
  headingAngle: number;      // 航向角，单位：°
  source: DataSource;
}

interface CabinParams {
  longitudinalPos: number;   // 纵向位置，距船舯，单位：m
  verticalPos: number;       // 垂向位置，距基线，单位：m
  deck: number;              // 甲板层
  source: DataSource;
}

interface CalculateRequest {
  shipName: string;
  hullParams: HullParams;
  waveParams: WaveParams;
  navigationParams: NavigationParams;
  cabinParams: CabinParams;
}
```

### 4.2 计算响应类型

```typescript
interface AnomalyInfo {
  type: 'wave_missing' | 'speed_jump' | 'cabin_misalignment';
  severity: 'warning' | 'error';
  message: string;
  affectedField: string;
  rawValue: any;
  source: string;
}

interface TraceInfo {
  field: string;
  value: number;
  unit: string;
  source: string;
  formula: string;
  standard: string;
}

interface CalculateResult {
  rollFrequency: number;           // 横摇固有频率，单位：rad/s
  rollAmplitude: number;           // 横摇幅值，单位：°
  comfortScore: number;            // 舒适度评分，1-10
  comfortLevel: string;            // 舒适度等级描述
  rollFrequencyUnit: string;
  rollAmplitudeUnit: string;
  comfortScoreUnit: string;
  applicableScope: string;         // 适用范围说明
  failureReason?: string;          // 失败原因（如果计算失败）
  calculationSuccess: boolean;
  anomalies: AnomalyInfo[];        // 检测到的异常
  traceability: TraceInfo[];       // 溯源信息
  isDuplicate: boolean;            // 是否为重复计算
  duplicateOf?: string;            // 重复记录ID
  createdAt: string;
  id: string;
}
```

## 5. 服务器架构图

```mermaid
graph LR
    A["API 路由层"] --> B["控制器层"]
    B --> C["服务层"]
    C --> D["数据访问层"]
    D --> E["SQLite 数据库"]
    
    subgraph "控制器层 (Controller)"
        B1["CalculateController"]
        B2["HistoryController"]
    end
    
    subgraph "服务层 (Service)"
        C1["RollCalculationService<br/>横摇频率估算"]
        C2["ComfortScoringService<br/>舒适度评分"]
        C3["AnomalyDetectionService<br/>异常检测"]
        C4["TraceabilityService<br/>溯源管理"]
        C5["DuplicateDetectionService<br/>去重检测"]
    end
    
    subgraph "数据访问层 (Repository)"
        D1["CalculationRepository"]
        D2["AnomalyRepository"]
        D3["TraceRepository"]
    end
    
    B1 --> C1
    B1 --> C2
    B1 --> C3
    B1 --> C4
    B1 --> C5
    B2 --> D1
    
    C1 --> D1
    C2 --> D1
    C3 --> D2
    C4 --> D3
    C5 --> D1
    
    D1 --> E
    D2 --> E
    D3 --> E
```

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    CALCULATION_RESULT ||--o{ ANOMALY_RECORD : has
    CALCULATION_RESULT ||--o{ TRACE_INFO : has
    
    CALCULATION_RESULT {
        string id PK
        string ship_name
        number displacement
        number GM
        number roll_radius
        number ship_length
        number ship_width
        number significant_height
        number wave_period
        number wave_direction
        number speed
        number heading_angle
        number longitudinal_pos
        number vertical_pos
        number deck
        number roll_frequency
        number roll_amplitude
        number comfort_score
        string comfort_level
        string applicable_scope
        string failure_reason
        boolean calculation_success
        boolean is_duplicate
        string duplicate_of
        string params_hash
        datetime created_at
    }
    
    ANOMALY_RECORD {
        string id PK
        string calculation_id FK
        string anomaly_type
        string severity
        string message
        string affected_field
        string raw_value
        string source
        datetime created_at
    }
    
    TRACE_INFO {
        string id PK
        string calculation_id FK
        string field_name
        number value
        string unit
        string source
        string formula
        string standard
        datetime created_at
    }
```

### 6.2 数据定义语言

```sql
-- 计算结果表
CREATE TABLE IF NOT EXISTS calculation_results (
    id TEXT PRIMARY KEY,
    ship_name TEXT NOT NULL,
    displacement REAL NOT NULL,
    GM REAL NOT NULL,
    roll_radius REAL NOT NULL,
    ship_length REAL NOT NULL,
    ship_width REAL NOT NULL,
    significant_height REAL,
    wave_period REAL,
    wave_direction REAL,
    speed REAL NOT NULL,
    heading_angle REAL NOT NULL,
    longitudinal_pos REAL NOT NULL,
    vertical_pos REAL NOT NULL,
    deck INTEGER NOT NULL,
    roll_frequency REAL,
    roll_amplitude REAL,
    comfort_score REAL,
    comfort_level TEXT,
    applicable_scope TEXT,
    failure_reason TEXT,
    calculation_success INTEGER NOT NULL DEFAULT 0,
    is_duplicate INTEGER NOT NULL DEFAULT 0,
    duplicate_of TEXT,
    params_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_calc_ship_name ON calculation_results(ship_name);
CREATE INDEX IF NOT EXISTS idx_calc_params_hash ON calculation_results(params_hash);
CREATE INDEX IF NOT EXISTS idx_calc_created_at ON calculation_results(created_at);

-- 异常记录表
CREATE TABLE IF NOT EXISTS anomaly_records (
    id TEXT PRIMARY KEY,
    calculation_id TEXT NOT NULL,
    anomaly_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    message TEXT NOT NULL,
    affected_field TEXT NOT NULL,
    raw_value TEXT,
    source TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (calculation_id) REFERENCES calculation_results(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_anomaly_calc_id ON anomaly_records(calculation_id);

-- 溯源信息表
CREATE TABLE IF NOT EXISTS trace_info (
    id TEXT PRIMARY KEY,
    calculation_id TEXT NOT NULL,
    field_name TEXT NOT NULL,
    value REAL NOT NULL,
    unit TEXT NOT NULL,
    source TEXT NOT NULL,
    formula TEXT NOT NULL,
    standard TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (calculation_id) REFERENCES calculation_results(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_trace_calc_id ON trace_info(calculation_id);
```
