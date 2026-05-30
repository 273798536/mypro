## 1. 架构设计

```mermaid
graph TD
    "前端 React SPA" --> "游戏引擎层（Canvas + 状态管理）"
    "游戏引擎层（Canvas + 状态管理）" --> "声波物理模拟模块"
    "游戏引擎层（Canvas + 状态管理）" --> "关卡数据模块"
    "游戏引擎层（Canvas + 状态管理）" --> "回声判定引擎"
    "游戏引擎层（Canvas + 状态管理）" --> "复盘与导出模块"
    "声波物理模拟模块" --> "回声延迟计算"
    "声波物理模拟模块" --> "频率混叠模拟"
    "声波物理模拟模块" --> "能量衰减模型"
```

## 2. 技术说明

- 前端：React@18 + TypeScript + Tailwind CSS + Vite
- 初始化工具：vite-init (react-ts 模板)
- 后端：无（纯前端，数据全部本地计算和存储）
- 状态管理：Zustand
- 图表/渲染：Canvas 2D API（海图绘制）
- 数据导出：JSON 格式本地下载

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 游戏主界面（关卡选择 + 游戏进行） |
| /review | 复盘界面（回声判定记录 + 路径回顾 + 导出） |

## 4. 核心数据模型

### 4.1 游戏状态

```typescript
interface GameState {
  currentLevel: number;
  energy: number;
  turn: number;
  pulses: PulseRecord[];
  detectedObstacles: DetectedObstacle[];
  selectedPath: number | null;
  phase: 'aiming' | 'pulsing' | 'echo' | 'pathSelect' | 'result' | 'complete';
  score: ScoreData;
}

interface PulseRecord {
  id: number;
  turn: number;
  frequency: 'low' | 'mid' | 'high';
  frequencyHz: number;
  intensity: number;
  timestamp: number;
  echoes: EchoData[];
  judgment: 'correct' | 'misjudged' | 'missed' | null;
}

interface EchoData {
  obstacleId: string;
  delay: number;
  frequencyShift: number;
  energyRatio: number;
  isAliased: boolean;
  arrivalOrder: number;
}

interface DetectedObstacle {
  id: string;
  truePosition: { x: number; y: number };
  detectedPosition: { x: number; y: number } | null;
  confidence: number;
  isCorrectlyDetected: boolean;
}

interface PathOption {
  id: number;
  direction: 'left' | 'center' | 'right';
  confidence: number;
  energyCost: number;
  isSafe: boolean;
  obstaclesOnPath: string[];
}

interface ScoreData {
  judgmentAccuracy: number;
  pathScore: number;
  energyRemaining: number;
  totalPulses: number;
  correctJudgments: number;
  misjudgments: number;
  missedDetections: number;
  collisions: number;
}
```

### 4.2 关卡数据

```typescript
interface LevelData {
  id: number;
  name: string;
  description: string;
  obstacles: ObstacleConfig[];
  subStartPosition: { x: number; y: number };
  goalPosition: { x: number; y: number };
  paths: PathConfig[];
  echoInterference: EchoInterferenceConfig;
  initialEnergy: number;
}

interface ObstacleConfig {
  id: string;
  position: { x: number; y: number };
  size: number;
  type: 'rock' | 'mine' | 'current';
  reflectivity: number;
  dopplerShift: number;
}

interface EchoInterferenceConfig {
  delayJitter: number;
  aliasingProbability: number;
  noiseLevel: number;
}

interface PathConfig {
  direction: 'left' | 'center' | 'right';
  waypoints: { x: number; y: number }[];
  obstacleIds: string[];
  isSafe: boolean;
  energyCost: number;
}
```

## 5. 目录结构

```
src/
  components/
    GameCanvas.tsx          - 海图Canvas渲染
    PulsePanel.tsx          - 声波脉冲发射面板
    EchoLog.tsx             - 回声记录面板
    PathSelector.tsx        - 路径选择面板
    StatusBar.tsx           - 状态栏
    LevelSelect.tsx         - 关卡选择
    ReviewPanel.tsx         - 复盘界面
    EchoRecordTable.tsx     - 回声判定记录表格
    PathReplay.tsx          - 路径选择回顾
    ExportPanel.tsx         - 成绩导出面板
  hooks/
    useGameState.ts         - 游戏状态管理
    useSonarEngine.ts       - 声波物理模拟
    useEchoJudgment.ts      - 回声判定逻辑
  pages/
    GamePage.tsx            - 游戏主页面
    ReviewPage.tsx          - 复盘页面
  utils/
    sonarPhysics.ts         - 声波物理计算
    levelData.ts            - 关卡数据定义
    exportUtils.ts          - 导出工具
  store/
    gameStore.ts            - Zustand游戏状态
```

## 6. 核心算法

### 6.1 回声延迟计算
- 声速常量：1500 m/s（水中）
- 延迟 = 2 × 距离 / 声速 + 随机抖动
- 抖动范围由关卡配置决定

### 6.2 频率混叠模拟
- 低频脉冲（1kHz）：波长大，分辨率低，近距离障碍物回声重叠概率高
- 中频脉冲（5kHz）：中等分辨率
- 高频脉冲（15kHz）：分辨率高，但能量衰减快
- 混叠：当两障碍物间距 < λ/2 时，回声频率重叠，判定为混叠

### 6.3 能量衰减
- 衰减 = 初始强度 / (1 + 距离²)
- 高频衰减系数更大
- 低于阈值（10%）的回声标记为"不可读"
