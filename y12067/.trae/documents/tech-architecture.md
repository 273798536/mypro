## 1. 架构设计

```mermaid
flowchart TD
    "浏览器前端（React SPA）" --> "游戏引擎层（人流模拟 + 评分引擎）"
    "游戏引擎层（人流模拟 + 评分引擎）" --> "场景数据层（JSON 静态数据 + 脏数据清洗）"
    "场景数据层（JSON 静态数据 + 脏数据清洗）" --> "回放存储层（操作快照 + 评分记录）"
```

纯前端架构，无后端服务。所有游戏逻辑、人流模拟、评分计算均在浏览器端完成。场景数据以 JSON 文件形式内嵌，脏数据在加载时由清洗模块处理。

## 2. 技术说明

- 前端：React 18 + TypeScript + Tailwind CSS 3 + Vite
- 状态管理：Zustand（游戏状态、回放状态、UI 状态分离）
- 地图渲染：Canvas 2D（楼层地图 + 人流粒子）
- 初始化工具：vite-init
- 后端：无
- 数据库：无，使用 JSON 静态文件 + 内存状态

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| `/` | 场景启动页，选择预设场景 |
| `/game/:scenarioId` | 游戏主界面，包含地图、操作面板、人流模拟 |
| `/result/:scenarioId` | 结算回放页，步骤回放 + 评分溯源 + 修正建议 |

## 4. 数据模型

### 4.1 场景数据结构

```typescript
interface FloorPlan {
  id: string;
  name: string;
  width: number;
  height: number;
  grid: number[][];
  exits: Exit[];
  elevators: Elevator[];
  stairs: Stair[];
  fireSource: { x: number; y: number; radius: number };
  notes?: string;
}

interface Exit {
  id: string;
  x: number;
  y: number;
  direction: "north" | "south" | "east" | "west";
  capacity?: number;
  status?: "open" | "blocked" | "missing_field";
  note?: string;
}

interface Elevator {
  id: string;
  x: number;
  y: number;
  floors: number[];
  capacity: number;
  isUsable: boolean;
}

interface Stair {
  id: string;
  x: number;
  y: number;
  width: number;
  capacity: number;
}

interface CrowdGroup {
  id: string;
  floorId: string;
  x: number;
  y: number;
  count: number;
  speed: number;
  targetExitId?: string;
  arrivalTime?: number;
  note?: string;
}

interface Scenario {
  id: string;
  name: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  floors: FloorPlan[];
  crowdGroups: CrowdGroup[];
  timeLimit: number;
  dataIssues: DataIssue[];
}

interface DataIssue {
  type: "missing_exit_field" | "floor_note" | "late_crowd";
  description: string;
  affectedId: string;
}
```

### 4.2 游戏状态结构

```typescript
interface GameState {
  scenarioId: string;
  elapsed: number;
  running: boolean;
  crowdState: CrowdParticle[];
  exitFlows: Record<string, number>;
  congestionLevels: Record<string, number>;
  evacuated: number;
  totalPeople: number;
  operations: Operation[];
  events: GameEvent[];
  score: ScoreDetail;
}

interface Operation {
  step: number;
  timestamp: number;
  type: "broadcast" | "elevator_control" | "exit_redirect";
  target: string;
  params: Record<string, unknown>;
  crowdSnapshot: CrowdParticle[];
  scoreDelta: number;
}

interface GameEvent {
  timestamp: number;
  type: "congestion" | "elevator_misuse" | "broadcast_missed" | "crowd_reflux";
  severity: "warning" | "critical";
  message: string;
  affectedArea: string;
  suggestion: string;
}

interface ScoreDetail {
  total: number;
  deductions: ScoreDeduction[];
}

interface ScoreDeduction {
  step: number;
  reason: string;
  points: number;
  eventType: string;
  suggestion: string;
}
```

## 5. 核心模块说明

### 5.1 脏数据清洗模块 (`dataCleaner.ts`)

- 缺失出口字段：`capacity` 缺失时默认 50 人/分钟，`status` 缺失时默认 `open`
- 楼层备注解析：提取备注中的关键信息（如"北侧出口节假日常拥堵"→标记该出口拥堵系数 ×1.5）
- 晚到人流：`arrivalTime` 不为 0 的人群在游戏进行到对应时间后才出现在地图上

### 5.2 人流模拟引擎 (`simulation.ts`)

- 基于 A* 寻路 + 简化社会力模型
- 每个时间步（1 秒模拟时间）计算：
  - 各人群向目标出口移动
  - 出口流量 = min(出口容量, 排队人数)
  - 拥堵度 = 排队人数 / 出口容量，超过阈值触发拥堵事件
  - 电梯状态影响：未关闭电梯会吸引部分人群前往，形成误用
  - 广播影响：已广播区域的人群改变目标出口

### 5.3 评分引擎 (`scoring.ts`)

- 基础分 100 分
- 扣分项：
  - 电梯误用：每发现 1 人使用电梯 -2 分，触发时给出修正建议"应在该时段关闭 X 号电梯"
  - 广播漏发：未对某个区域发送广播 -5 分，建议"应在第 N 步对 X 区发广播"
  - 出口拥堵：拥堵度超 80% 持续超 10 秒 -3 分，建议"应引导部分人群至 Y 出口"
  - 人群回流：人群因火源扩展被迫折返 -5 分，建议"应更早疏散 X 区"
- 所有扣分项在结算页可溯源到具体操作步骤

### 5.4 回放模块 (`replay.ts`)

- 每次玩家操作保存完整快照（人群位置、出口流量、评分）
- 结算页时间轴可点击任一步骤，恢复当时快照
- 评分溯源：每项扣分关联到触发该扣分的操作步骤编号

## 6. 文件结构

```
src/
├── components/
│   ├── FloorMap.tsx          # Canvas 楼层地图渲染
│   ├── CrowdParticles.tsx    # 人流粒子绘制
│   ├── OperationPanel.tsx    # 操作面板
│   ├── EventLog.tsx          # 事件日志
│   ├── ScoreBoard.tsx        # 计时评分板
│   ├── ScenarioCard.tsx      # 场景卡片
│   ├── ReplayTimeline.tsx    # 回放时间轴
│   ├── ReplaySnapshot.tsx    # 回放快照视图
│   └── SuggestionCard.tsx    # 修正建议卡片
├── pages/
│   ├── ScenarioSelect.tsx    # 场景选择页
│   ├── GamePage.tsx          # 游戏主界面
│   └── ResultPage.tsx        # 结算回放页
├── engine/
│   ├── simulation.ts         # 人流模拟引擎
│   ├── scoring.ts            # 评分引擎
│   ├── dataCleaner.ts        # 脏数据清洗
│   └── replay.ts             # 回放模块
├── data/
│   └── scenarios.ts          # 预设场景数据（含脏数据）
├── store/
│   ├── gameStore.ts          # 游戏状态
│   └── replayStore.ts        # 回放状态
├── types/
│   └── index.ts              # 类型定义
├── App.tsx
└── main.tsx
```
