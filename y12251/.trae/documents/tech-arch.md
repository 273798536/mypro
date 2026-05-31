## 1. 架构设计

```mermaid
flowchart TB
    subgraph "前端层"
        "赛道画布引擎" --> "物理模拟器"
        "材料面板" --> "判定锁定器"
        "异常清单" --> "异常分类器"
        "复盘页面" --> "参数快照器"
    end
    subgraph "数据层"
        "关卡数据" --> "磁场板"
        "关卡数据" --> "电流条"
        "关卡数据" --> "靶门"
        "异常记录" --> "方向反判"
        "异常记录" --> "能量超限"
        "异常记录" --> "质量缺失"
        "参数快照" --> "修改前"
        "参数快照" --> "修改后"
    end
    "物理模拟器" --> "关卡数据"
    "判定锁定器" --> "关卡数据"
    "异常分类器" --> "异常记录"
    "参数快照器" --> "参数快照"
```

## 2. 技术说明

- 前端：React@18 + TailwindCSS@3 + Vite
- 初始化工具：Vite + React 模板
- 后端：无（纯前端，数据使用 localStorage 持久化）
- 数据库：无（使用内存状态 + localStorage 快照）
- Canvas 渲染：原生 Canvas 2D API（磁场、轨迹、小车渲染）
- 物理计算：自研轻量物理引擎（洛伦兹力、圆弧轨迹、能量守恒校验）

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 赛道首页，进入关卡选择 |
| /race/:id | 赛道页面，磁场板画布 + 材料面板 + 异常清单 |
| /anomalies | 异常清单页面，分类查看待确认/异常/已归档 |
| /review/:id | 复盘页面，规则定位 + 参数对比 |

## 4. API 定义

无后端 API，所有数据通过前端状态管理。核心数据接口定义如下：

```typescript
interface MagneticBoard {
  id: string
  direction: "into" | "outof"
  strength: number
  locked: boolean
  arrivalOrder: number
}

interface CurrentBar {
  id: string
  current: number
  direction: "up" | "down"
  locked: boolean
  arrivalOrder: number
}

interface TargetGate {
  id: string
  x: number
  y: number
  width: number
  locked: boolean
  arrivalOrder: number
}

type AnomalyType = "direction_misjudgment" | "energy_overflow" | "mass_deficiency"
type AnomalyStatus = "pending" | "anomaly" | "archived"

interface AnomalyRecord {
  id: string
  type: AnomalyType
  status: AnomalyStatus
  ruleId: string
  ruleDescription: string
  playerInput: string
  correctValue: string
  timestamp: number
  snapshotId: string
}

interface ParameterSnapshot {
  id: string
  timestamp: number
  boards: MagneticBoard[]
  bars: CurrentBar[]
  gates: TargetGate[]
  trajectoryPoints: { x: number; y: number }[]
}

interface RuleViolation {
  ruleId: string
  category: "force_direction" | "trajectory" | "energy"
  description: string
  expected: string
  actual: string
}
```

## 5. 服务端架构图

无后端服务，纯前端应用。

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    "关卡" ||--o{ "磁场板" : "包含"
    "关卡" ||--o{ "电流条" : "包含"
    "关卡" ||--o{ "靶门" : "包含"
    "关卡" ||--o{ "异常记录" : "产生"
    "关卡" ||--o{ "参数快照" : "记录"
    "异常记录" }o--|| "规则条目" : "引用"
    "参数快照" ||--o{ "快照项" : "包含"
    "磁场板" {
        "string id PK"
        "string direction"
        "float strength"
        "boolean locked"
        "int arrivalOrder"
    }
    "电流条" {
        "string id PK"
        "float current"
        "string direction"
        "boolean locked"
        "int arrivalOrder"
    }
    "靶门" {
        "string id PK"
        "float x"
        "float y"
        "float width"
        "boolean locked"
        "int arrivalOrder"
    }
    "异常记录" {
        "string id PK"
        "string type"
        "string status"
        "string ruleId FK"
        "string snapshotId FK"
    }
    "规则条目" {
        "string id PK"
        "string category"
        "string description"
    }
    "参数快照" {
        "string id PK"
        "int timestamp"
    }
```

### 6.2 数据定义语言

使用 localStorage 键值存储：

- `mfr_levels`：关卡列表 JSON
- `mfr_anomalies`：异常记录 JSON
- `mfr_snapshots`：参数快照 JSON
- `mfr_rules`：规则条目 JSON（内置初始数据）

初始规则条目：

```json
[
  { "id": "R01", "category": "force_direction", "description": "左手法则：磁场B指向手心，四指沿电流I方向，拇指指向洛伦兹力F方向（正电荷）" },
  { "id": "R02", "category": "force_direction", "description": "负电荷受力方向与左手法则判断方向相反" },
  { "id": "R03", "category": "trajectory", "description": "带电粒子在匀强磁场中做匀速圆周运动，半径 r = mv/(qB)" },
  { "id": "R04", "category": "trajectory", "description": "轨迹圆心在洛伦兹力方向上，距粒子距离为 r" },
  { "id": "R05", "category": "energy", "description": "洛伦兹力不做功，粒子动能不变，速率恒定" },
  { "id": "R06", "category": "energy", "description": "粒子总能量 E = 0.5mv²，不得超过关卡能量上限" },
  { "id": "R07", "category": "force_direction", "description": "电流方向反转时，洛伦兹力方向同时反转" },
  { "id": "R08", "category": "trajectory", "description": "磁场方向反转时，圆弧偏转方向反转，半径不变" }
]
```
