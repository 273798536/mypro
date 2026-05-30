## 1. 架构设计

```mermaid
flowchart TB
    subgraph "前端层"
        "关卡选择页" --> "训练试玩页"
        "训练试玩页" --> "成绩复盘页"
    end

    subgraph "核心引擎层"
        "节奏引擎" --> "节奏判定器"
        "节奏引擎" --> "音量检测器"
        "节奏引擎" --> "延迟进入检测器"
        "节奏引擎" --> "休止误判检测器"
        "节奏引擎" --> "音量失衡检测器"
    end

    subgraph "数据层"
        "关卡数据" --> "声部轨数据"
        "关卡数据" --> "节拍线数据"
        "声部轨数据" --> "合并冲突检测器"
        "节拍线数据" --> "合并冲突检测器"
        "合并冲突检测器" --> "冲突报告"
    end

    subgraph "导出层"
        "成绩结算器" --> "判定汇总"
        "成绩结算器" --> "口径说明"
        "成绩结算器" --> "导出格式化器"
    end

    "训练试玩页" --> "节奏引擎"
    "节奏引擎" --> "成绩结算器"
    "关卡选择页" --> "合并冲突检测器"
```

## 2. 技术说明

- **前端**：React@18 + TypeScript + Tailwind CSS@3 + Vite
- **初始化工具**：vite-init（react-ts 模板）
- **状态管理**：Zustand
- **后端**：无（纯前端原型，数据内嵌）
- **数据库**：无（使用内存数据 + JSON 导出）
- **音频**：Web Audio API（音量采集）+ 交互式点击输入

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| `/` | 关卡选择页，展示可用关卡列表 |
| `/play/:levelId` | 训练试玩页，核心节奏训练界面 |
| `/review/:levelId` | 成绩复盘页，判定详情与导出 |

## 4. 数据模型

### 4.1 核心数据结构

```typescript
interface BeatLine {
  id: string;
  tick: number;
  label: string;
  isRest: boolean;
}

interface PartTrack {
  id: string;
  name: string;
  color: string;
  notes: NoteEvent[];
  volumeProfile: VolumePoint[];
}

interface NoteEvent {
  id: string;
  tick: number;
  duration: number;
  isEntry: boolean;
}

interface VolumePoint {
  tick: number;
  volume: number;
}

interface ConflictItem {
  type: "timing_mismatch" | "rest_overlap" | "entry_mismatch";
  partTrackId: string;
  beatLineTick: number;
  partTrackValue: string;
  beatLineValue: string;
  description: string;
}

interface JudgmentResult {
  tick: number;
  partTrackId: string;
  judgment: "perfect" | "early" | "late" | "miss";
  offsetMs: number;
  volume: number;
  isDelayedEntry: boolean;
  isRestViolation: boolean;
  isVolumeImbalance: boolean;
}

interface ScoreReport {
  levelId: string;
  timestamp: string;
  judgments: JudgmentResult[];
  criteria: JudgmentCriteria;
  summary: {
    totalNotes: number;
    perfectCount: number;
    earlyCount: number;
    lateCount: number;
    missCount: number;
    delayedEntryCount: number;
    restViolationCount: number;
    volumeImbalanceCount: number;
  };
}

interface JudgmentCriteria {
  perfectWindowMs: number;
  earlyWindowMs: number;
  lateWindowMs: number;
  volumeImbalanceThreshold: number;
  restVolumeThreshold: number;
}
```

### 4.2 关卡数据

```typescript
interface LevelData {
  id: string;
  name: string;
  difficulty: "basic" | "intermediate" | "advanced";
  focusTag: string;
  bpm: number;
  beatsPerBar: number;
  totalBars: number;
  beatLines: BeatLine[];
  partTracks: PartTrack[];
  criteria: JudgmentCriteria;
}
```

## 5. 判定口径定义

| 判定项 | 口径 | 默认值 |
|--------|------|--------|
| 精准窗口 | 输入时间与目标时间偏差绝对值 ≤ 此值 | ±80ms |
| 偏早窗口 | 偏差在负方向且超过精准窗口 | -80ms ~ -200ms |
| 偏晚窗口 | 偏差在正方向且超过精准窗口 | +80ms ~ +200ms |
| 遗漏 | 目标时间 ±200ms 内无输入 | >200ms |
| 延迟进入 | 声部应进入时刻后首次输入时间差 > 晚窗口 | >200ms |
| 音量失衡 | 声部音量与均值偏差超过阈值 | >40% |
| 休止误判 | 休止区间内检测到音量超过阈值 | >15% |
