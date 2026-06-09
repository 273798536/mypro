# 海冰厚度立体切片 - 技术架构文档

## 1. 系统架构概览

### 1.1 架构设计原则
- **模块化**：清晰的功能边界，便于维护和扩展
- **响应式**：基于状态驱动，UI自动同步数据变化
- **可追溯**：内置审计日志，支持任意时间点回溯
- **高性能**：3D渲染优化，确保流畅的交互体验

### 1.2 技术选型

| 层级 | 技术选型 | 理由 |
|------|---------|------|
| 框架 | React 18+ | 组件化、Hooks生态丰富 |
| 3D渲染 | Three.js + React-Three-Fiber | 声明式3D场景编写 |
| 状态管理 | Zustand | 轻量、支持时间旅行 |
| 样式 | CSS Modules + CSS Variables | 作用域隔离、主题支持 |
| 可视化 | D3.js | 时间轴、统计图表 |
| 打包 | Vite | 快速热更新、生产优化 |

### 1.3 项目结构

```
src/
├── components/
│   ├── core/
│   │   ├── Header/           # 顶部工具栏
│   │   ├── Timeline/         # 时间轴控制器
│   │   ├── StatusBar/        # 底部状态栏
│   │   └── Modal/            # 确认对话框
│   ├── visualization/
│   │   ├── IceModel3D/       # 三维模型视图
│   │   ├── PointCloudList/   # 点云切片列表
│   │   ├── SliceDetail/      # 切片详情面板
│   │   └── HeatmapOverlay/   # 影响范围热力图
│   ├── audit/
│   │   ├── AuditPanel/       # 审计记录面板
│   │   ├── ComparisonPanel/  # 结论对比面板
│   │   └── ParameterLink/    # 参数联动面板
│   └── report/
│       └── ReportGenerator/   # 报告生成器
├── stores/
│   ├── timelineStore.ts      # 时间轴状态
│   ├── dataStore.ts          # 主数据状态
│   ├── auditStore.ts         # 审计记录状态
│   └── uiStore.ts            # UI状态（选中项、面板可见性）
├── hooks/
│   ├── useTimeline.ts        # 时间轴操作
│   ├── useAudit.ts           # 审计功能
│   ├── useParameterLink.ts   # 参数联动
│   └── useMaterialSync.ts    # 材料同步检测
├── data/
│   ├── mockMeasurements.ts   # 模拟测量数据
│   ├── mockAuditRecords.ts   # 模拟审计记录
│   └── scenarioConfig.ts     # 场景配置
├── utils/
│   ├── outlierDetection.ts    # 离群点检测算法
│   ├── timelineCalculations.ts # 时间轴计算
│   └── reportGenerator.ts    # 报告生成工具
├── styles/
│   ├── variables.css         # CSS变量定义
│   ├── global.css            # 全局样式
│   └── animations.css        # 动画定义
├── App.tsx
└── main.tsx
```

## 2. 核心模块设计

### 2.1 时间轴控制器 (TimelineController)

#### 2.1.1 功能职责
- 管理全局时间轴位置
- 控制播放/暂停状态
- 提供历史状态快照存取

#### 2.1.2 状态接口

```typescript
interface TimelineState {
  currentTime: Date;
  isPlaying: boolean;
  playbackSpeed: number;
  snapshots: Map<string, SystemSnapshot>;
  currentSnapshotId: string | null;
}
```

#### 2.1.3 关键算法
- **状态快照**：每次关键操作生成系统状态快照
- **时间插值**：拖拽时使用Lerp进行平滑过渡
- **状态恢复**：基于快照重建历史时刻的系统状态

### 2.2 参数联动系统 (ParameterLink)

#### 2.2.1 功能职责
- 监听参数变化
- 计算修改前后差异
- 驱动差异展示组件

#### 2.2.2 差异计算逻辑

```typescript
function calculateParamDiff(
  before: ParameterSet,
  after: ParameterSet
): ParameterDiff[] {
  const diffs: ParameterDiff[] = [];

  for (const key in after) {
    if (before[key] !== after[key]) {
      diffs.push({
        param: key,
        beforeValue: before[key],
        afterValue: after[key],
        changeType: detectChangeType(before[key], after[key]),
      });
    }
  }

  return diffs;
}
```

#### 2.2.3 变更类型识别
- **数值变化**：数值大小改变
- **状态切换**：true/false切换
- **引用替换**：对象/数组整体替换
- **新增/删除**：参数键的增减

### 2.3 审计追溯系统 (AuditTrail)

#### 2.3.1 功能职责
- 记录所有数据变更操作
- 维护操作人、操作时间、操作原因
- 支持按时间线回溯查询

#### 2.3.2 审计记录结构

```typescript
interface AuditEntry {
  id: string;
  timestamp: Date;
  operator: {
    id: string;
    name: string;
    department: string;
  };
  operation: {
    type: 'create' | 'update' | 'delete' | 'review';
    target: {
      type: 'measurement' | 'model' | 'slice' | 'conclusion';
      id: string;
      name: string;
    };
  };
  changes: {
    field: string;
    before: any;
    after: any;
  }[];
  reason: string;
  attachments?: string[];
  impactScope: string[];
}
```

#### 2.3.3 溯源查询算法
- **正向追踪**：从原因查结果（某操作影响哪些数据）
- **反向追溯**：从结果查原因（某数据被谁修改过）

### 2.4 材料同步检测 (MaterialSyncMonitor)

#### 2.4.1 功能职责
- 检测时间轴上各材料的同步状态
- 识别时间戳异常和依赖断链
- 生成同步问题报告

#### 2.4.2 同步规则

```typescript
const syncRules = {
  modelBeforeSlice: {
    check: (model, slice) => model.createdAt <= slice.timestamp,
    error: '三维模型生成时间晚于切片处理时间',
    severity: 'warning',
  },
  sliceBeforeMeasurements: {
    check: (slice, measurements) =>
      slice.timestamp <= min(measurements.map(m => m.timestamp)),
    error: '切片处理时间早于部分测量记录',
    severity: 'error',
  },
  timestampDrift: {
    check: (timestamps) => detectClockDrift(timestamps),
    error: '检测到设备时钟漂移',
    severity: 'info',
  },
};
```

### 2.5 结论对比引擎 (ConclusionComparator)

#### 2.5.1 功能职责
- 提取同一位置的历史结论和当前结论
- 计算结论差异
- 生成影响范围分析

#### 2.5.2 对比算法

```typescript
interface ConclusionDiff {
  locationId: string;
  oldConclusion: Conclusion | null;
  newConclusion: Conclusion | null;
  diffType: 'added' | 'removed' | 'modified' | 'unchanged';
  affectedPoints: string[];
  severity: 'critical' | 'major' | 'minor';
}
```

### 2.6 离群点检测 (OutlierDetector)

#### 2.6.1 检测算法
采用改进的3σ原则：

```typescript
function detectOutliers(
  measurements: Measurement[],
  sigmaThreshold: number = 3
): OutlierResult {
  const values = measurements.map(m => m.thickness);
  const mean = calculateMean(values);
  const std = calculateStd(values, mean);

  return measurements.map(m => ({
    id: m.id,
    isOutlier: Math.abs(m.thickness - mean) > sigmaThreshold * std,
    zScore: (m.thickness - mean) / std,
    severity: Math.abs(m.thickness - mean) / std,
  }));
}
```

#### 2.6.2 复核状态机

```
[Pending] --复核通过--> [Approved]
    |                         |
    +--复核拒绝--> [Rejected] |
    |                         |
    +--修改数据--> [Modified] -+
```

## 3. 数据流设计

### 3.1 主数据流

```
用户操作
    ↓
UI层捕获事件
    ↓
调用Store Action
    ↓
├─→ 更新State
│       ↓
│   触发UI重渲染
│
├─→ 生成Audit Record
│       ↓
│   存入AuditStore
│
└─→ 触发副作用
        ↓
    ├─ 更新3D视图
    ├─ 更新时间轴
    └─ 检查材料同步
```

### 3.2 时间旅行数据流

```
时间轴拖拽
    ↓
获取目标时间的Snapshot ID
    ↓
从SnapshotStore读取快照
    ↓
重建历史状态
    ↓
更新所有Connected组件
    ↓
显示历史视图（带视觉标识）
```

### 3.3 报告生成数据流

```
触发报告生成
    ↓
收集当前时间点数据
    ↓
├─→ 材料清单（同步状态）
├─→ 时间轴问题汇总
├─→ 复核通过记录
├─→ 审计记录摘要
└─→ 结论列表
    ↓
组装报告结构
    ↓
导出为可阅读格式
```

## 4. 3D渲染架构

### 4.1 场景结构

```
Scene
├── AmbientLight (环境光)
├── DirectionalLight (主光源)
├── IceModelGroup (海冰模型组)
│   ├── IceMesh (海冰几何体)
│   ├── OutlierMarkers (离群点标记)
│   └── MeasurementPoints (测量点标记)
├── SlicePlane (切片平面)
└── GridHelper (辅助网格)
```

### 4.2 渲染优化策略
- **LOD分级**：远处使用低精度模型
- **实例化渲染**：大量测量点使用InstancedMesh
- **按需更新**：仅在数据变化时更新几何体
- **帧率控制**：复杂场景降低更新频率

### 4.3 交互层
- **OrbitControls**：相机旋转、缩放、平移
- **Raycaster**：点击检测和拾取
- **TransformControls**：选中对象的变换操作

## 5. 状态管理架构

### 5.1 Zustand Store设计

#### 5.1.1 TimelineStore
```typescript
interface TimelineStore {
  // State
  currentTime: Date;
  isPlaying: boolean;
  speed: number;
  snapshots: Snapshot[];

  // Actions
  play: () => void;
  pause: () => void;
  seekTo: (time: Date) => void;
  createSnapshot: () => string;
  restoreSnapshot: (id: string) => void;
}
```

#### 5.1.2 DataStore
```typescript
interface DataStore {
  // State
  measurements: Map<string, Measurement>;
  models: Map<string, IceModel3D>;
  slices: Map<string, PointCloudSlice>;
  conclusions: Map<string, Conclusion>;

  // Actions
  updateMeasurement: (id: string, data: Partial<Measurement>) => void;
  approveOutlier: (id: string, review: ReviewRecord) => void;
  generateConclusion: () => Conclusion;
}
```

#### 5.1.3 AuditStore
```typescript
interface AuditStore {
  // State
  records: AuditRecord[];
  filters: AuditFilters;

  // Actions
  addRecord: (record: Omit<AuditRecord, 'id'>) => void;
  queryByTimeRange: (start: Date, end: Date) => AuditRecord[];
  queryByOperator: (operatorId: string) => AuditRecord[];
  queryByTarget: (targetId: string) => AuditRecord[];
}
```

### 5.2 中间件
- **持久化中间件**：自动保存关键状态到IndexedDB
- **审计中间件**：拦截状态变更，记录审计日志
- **时间戳中间件**：统一管理系统时间获取

## 6. 样式系统设计

### 6.1 CSS变量定义

```css
:root {
  /* 主色调 */
  --color-bg-primary: #0A1628;
  --color-bg-secondary: #0F2847;
  --color-bg-tertiary: #1A3A5C;

  /* 辅助色 */
  --color-ice-blue: #4A90A4;
  --color-ice-light: #7AB8C9;

  /* 状态色 */
  --color-danger: #FF6B6B;
  --color-warning: #FFE66D;
  --color-success: #4ECDC4;
  --color-info: #5C9CE6;

  /* 数据色 */
  --color-outlier: #FF4757;
  --color-normal: #2ED573;
  --color-modified: #FFA502;

  /* 文字色 */
  --color-text-primary: #FFFFFF;
  --color-text-secondary: #A0AEC0;
  --color-text-muted: #718096;

  /* 间距 */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;

  /* 圆角 */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;

  /* 阴影 */
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.5);

  /* 动画 */
  --transition-fast: 150ms ease;
  --transition-normal: 300ms ease;
  --transition-slow: 500ms ease;
}
```

### 6.2 动画定义

```css
/* 脉冲呼吸动画 - 离群点标记 */
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.1); }
}

/* 数值跳动动画 */
@keyframes valueChange {
  0% { transform: translateY(0); opacity: 1; }
  50% { transform: translateY(-5px); opacity: 0.8; }
  100% { transform: translateY(0); opacity: 1; }
}

/* 滑入动画 - 面板切换 */
@keyframes slideIn {
  from { transform: translateX(20px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

/* 渐变动画 - 时间轴 */
@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
```

## 7. 性能优化策略

### 7.1 渲染优化
- **虚拟化列表**：点云切片列表使用虚拟滚动
- **按需渲染**：复杂面板使用React.lazy + Suspense
- **防抖节流**：时间轴拖拽事件使用防抖处理

### 7.2 数据优化
- **懒加载**：非关键数据按需加载
- **缓存策略**：热点数据缓存，避免重复计算
- **增量更新**：仅传输和更新变化的数据

### 7.3 内存管理
- **及时清理**：组件卸载时清理事件监听和定时器
- **WeakMap使用**：临时对象使用WeakMap便于GC
- **快照压缩**：历史快照使用增量存储，减少内存占用

## 8. 安全性考虑

### 8.1 数据安全
- 所有操作记录不可删除，只能追加
- 敏感操作需要二次确认
- 操作日志防止篡改（哈希链）

### 8.2 XSS防护
- 所有用户输入进行转义处理
- 使用React的自动转义机制
- 避免使用dangerouslySetInnerHTML

## 9. 浏览器兼容性

### 9.1 WebGL支持检测
```typescript
function checkWebGLSupport(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch (e) {
    return false;
  }
}
```

### 9.2 回退策略
- 不支持WebGL时显示静态图片+数据表格
- 旧浏览器使用CSS 3D替代方案
- 提供下载完整数据包的选项

## 10. 部署架构

### 10.1 构建输出
```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── models/
│       └── ice-model.glb
└── data/
    └── scenarios/
        └── default.json
```

### 10.2 环境配置
- **开发环境**：Vite Dev Server (localhost:5173)
- **生产环境**：静态资源部署到CDN

## 11. 测试策略

### 11.1 单元测试
- 离群点检测算法
- 参数差异计算
- 时间轴快照生成与恢复

### 11.2 集成测试
- 数据修改→审计记录联动
- 时间回放→状态恢复准确性
- 报告生成→内容完整性

### 11.3 E2E测试
- 完整流程测试（开始→暂停→结算→复盘）
- 材料同步问题检测
- 多用户并发操作

## 12. 附录：样例数据结构

### 12.1 场景配置

```typescript
const scenarioConfig = {
  id: 'sea-ice-thickness-demo-001',
  name: '北极圈海冰厚度测量分析',
  timeRange: {
    start: new Date('2026-06-01T08:00:00'),
    end: new Date('2026-06-07T18:00:00'),
  },
  materials: {
    models: [
      {
        id: 'model-001',
        version: 'v1.2',
        createdAt: new Date('2026-06-01T14:23:15'),
        hasOldAnnotations: true,
      },
    ],
    measurements: 52, // 52条测量记录
    slices: 8, // 8个点云切片
  },
  syncIssues: [
    {
      type: 'timestamp_drift',
      description: '三维模型生成时间晚于部分测量记录',
      affectedMaterials: ['model-001', 'measurement-012'],
    },
  ],
  outliers: [
    {
      id: 'outlier-001',
      measurementId: 'measurement-023',
      value: 15.2,
      expectedRange: [0.8, 1.2],
      reason: '传感器故障，单次测量值异常',
      reviewer: '张工',
      reviewTime: new Date('2026-06-03T09:15:00'),
    },
  ],
  conclusions: [
    {
      id: 'conclusion-001',
      version: 1,
      timestamp: new Date('2026-06-02T16:30:00'),
      content: '初步分析：平均厚度1.05m，未发现显著异常',
      superseded: true,
    },
    {
      id: 'conclusion-002',
      version: 2,
      timestamp: new Date('2026-06-03T10:00:00'),
      content: '修正分析：剔除离群点后，平均厚度0.95m',
      superseded: false,
    },
  ],
};
```
