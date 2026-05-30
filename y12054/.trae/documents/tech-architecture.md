## 1. 架构设计

```mermaid
flowchart TD
    subgraph "前端层"
        "场景选择页" --> "排练主界面"
        "排练主界面" --> "结算复盘页"
    end

    subgraph "游戏引擎层"
        "节拍系统" --> "指令调度器"
        "指令调度器" --> "声部轨道管理器"
        "声部轨道管理器" --> "评分引擎"
    end

    subgraph "状态管理层"
        "Zustand Store" --- "游戏状态"
        "Zustand Store" --- "乐手状态"
        "Zustand Store" --- "指令队列"
        "Zustand Store" --- "事件日志"
        "Zustand Store" --- "评分记录"
    end

    "前端层" --> "游戏引擎层"
    "游戏引擎层" --> "状态管理层"
```

## 2. 技术说明
- 前端：React@18 + TypeScript + Tailwind CSS@3 + Vite
- 初始化工具：vite-init
- 状态管理：Zustand
- 后端：无（纯前端应用）
- 数据：内置场景预设数据，无数据库
- 音频：Web Audio API（生成简单音调表示各声部）
- 导出：前端生成JSON文本文件下载

## 3. 路由定义
| 路由 | 用途 |
|------|------|
| / | 场景选择页，展示4个排练场景卡片 |
| /rehearsal/:sceneId | 排练主界面，核心游戏界面 |
| /result/:sceneId | 结算复盘页，展示扣分明细和分析 |

## 4. 数据模型

### 4.1 场景预设数据
```typescript
interface ScenePreset {
  id: string
  name: string
  difficulty: number
  description: string
  bpm: number
  totalBeats: number
  musicians: MusicianConfig[]
  events: ScheduledEvent[]
}

interface MusicianConfig {
  id: string
  name: string
  role: 'melody' | 'chord' | 'bass' | 'percussion'
  defaultVolume: number
  color: string
  enterBeat: number
  exitBeat: number
}

interface ScheduledEvent {
  beat: number
  type: 'delay' | 'volume_surge' | 'queue_block' | 'normal'
  targetMusicianId?: string
  description: string
  data?: Record<string, number | string>
}
```

### 4.2 游戏运行时数据
```typescript
interface GameState {
  currentScene: string | null
  status: 'idle' | 'playing' | 'paused' | 'finished'
  currentBeat: number
  bpm: number
  musicians: MusicianState[]
  commandQueue: Command[]
  eventLog: EventEntry[]
  scoreRecords: ScoreDeduction[]
  totalScore: number
}

interface MusicianState {
  id: string
  isPlaying: boolean
  volume: number
  enterBeat: number | null
  exitBeat: number | null
  scheduledEnterBeat: number | null
}

interface Command {
  id: string
  type: 'enter' | 'exit' | 'set_volume' | 'wait'
  targetMusicianId?: string
  value?: number
  scheduledBeat: number
  status: 'pending' | 'executing' | 'done' | 'blocked'
}

interface EventEntry {
  beat: number
  type: 'info' | 'warning' | 'error'
  message: string
}

interface ScoreDeduction {
  beat: number
  category: 'delay' | 'volume_overflow' | 'volume_imbalance' | 'queue_block' | 'response_delay'
  description: string
  points: number
  affectedMusicianId?: string
}
```

## 5. 核心引擎模块

### 5.1 节拍系统（BeatSystem）
- 使用 `setInterval` + 时间校正实现精确节拍
- 每拍触发 `onBeat` 回调，驱动整个游戏循环
- 支持暂停/继续/重置

### 5.2 指令调度器（CommandScheduler）
- 接收玩家指令，量化到最近节拍
- 维护指令队列，按节拍顺序执行
- 队列堵塞场景下限制并发执行数

### 5.3 声部轨道管理器（TrackManager）
- 管理各乐手的演奏状态和音量
- 每拍检测声部冲突（音量盖过、延迟进入等）
- 生成事件日志和扣分记录

### 5.4 评分引擎（ScoreEngine）
- 基础分100分
- 每拍检测各类扣分条件
- 实时计算当前分数
- 排练结束生成最终评分报告

### 5.5 音频引擎（AudioEngine）
- 使用 Web Audio API 生成4种简单音色
- 主旋律：正弦波方波混合
- 和声：锯齿波
- 低音：低频正弦波
- 打击乐：噪声+包络
- 音量条与实际音频增益同步

## 6. 项目文件结构
```
src/
  pages/
    SceneSelect.tsx       # 场景选择页
    Rehearsal.tsx         # 排练主界面
    Result.tsx            # 结算复盘页
  components/
    MusicianCard.tsx      # 机器人乐手卡片
    BeatIndicator.tsx     # 节拍器指示器
    VolumeBar.tsx         # 音量条组件
    CommandPanel.tsx      # 指令调度面板
    ControlBar.tsx        # 暂停/继续/重开控制栏
    EventLog.tsx          # 事件日志
    ScoreDetail.tsx       # 扣分明细卡片
    TrackTimeline.tsx     # 声部轨道时间线
    VolumeAnalysis.tsx    # 音量反馈分析
  engine/
    beatSystem.ts         # 节拍系统
    commandScheduler.ts   # 指令调度器
    trackManager.ts       # 声部轨道管理
    scoreEngine.ts        # 评分引擎
    audioEngine.ts        # 音频引擎
  store/
    gameStore.ts          # Zustand游戏状态
  data/
    scenes.ts             # 场景预设数据
  types/
    index.ts              # 类型定义
  App.tsx
  main.tsx
```
