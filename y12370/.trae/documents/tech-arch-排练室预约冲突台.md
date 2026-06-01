## 1. 架构设计

本系统为纯前端单页应用，数据存储在浏览器本地（localStorage + IndexedDB），确保从原始数据导入到最终日程导出的完整链路可追溯，不依赖后端服务即可独立运行。

```mermaid
graph TD
    subgraph "表现层 (Presentation)"
        A1["数据导入页面"]
        A2["预约看板页面"]
        A3["冲突检测面板"]
        A4["预约详情页面"]
        A5["复盘中心页面"]
    end
    
    subgraph "状态管理层 (State Management)"
        B1["Zustand Store"]
        B2["数据版本快照"]
        B3["操作历史记录"]
    end
    
    subgraph "业务逻辑层 (Business Logic)"
        C1["导入解析器"]
        C2["冲突检测引擎"]
        C3["预约调度器"]
        C4["链路追踪器"]
        C5["导出生成器"]
    end
    
    subgraph "数据层 (Data)"
        D1["localStorage (配置/状态)"]
        D2["IndexedDB (大数据存储)"]
        D3["Mock样例数据"]
    end
    
    A1 --> C1
    C1 --> B2
    B2 --> C2
    C2 --> B1
    B1 --> A2
    A2 --> C3
    C3 --> B3
    B3 --> C4
    C4 --> A4
    A5 --> C5
    C5 --> B2
    B1 --> D1
    B2 --> D2
    B3 --> D2
```

## 2. 技术描述

- **前端框架**: React@18.2.0 + TypeScript@5
- **构建工具**: Vite@5
- **样式方案**: TailwindCSS@3.4 + CSS变量主题系统
- **状态管理**: Zustand@4 (轻量、可追溯、支持时间旅行)
- **数据存储**: localStorage + IndexedDB (idb库封装)
- **图表可视化**: Recharts@2 (热力图、统计图表)
- **文件处理**: xlsx@0.18 (Excel导入导出), papaparse@5 (CSV解析)
- **路由**: React Router@6
- **图标**: Lucide React
- **日期处理**: dayjs@1.11

## 3. 路由定义

| Route | 页面 | 核心功能 |
|-------|------|----------|
| `/` | 数据导入中心 | 排练室表、乐队名单、课程安排导入，样例数据载入 |
| `/board` | 预约状态看板 | 时间轴视图、房间热力图、冲突标记、快速操作 |
| `/booking/:id` | 预约详情 | 基础信息、操作记录、数据链路追溯、换房调整 |
| `/review` | 复盘中心 | 换房历史时间线、版本对比、日程导出 |

## 4. 核心数据模型

### 4.1 ER Diagram

```mermaid
erDiagram
    DATA_SOURCE ||--o{ ROOM : "导入"
    DATA_SOURCE ||--o{ BAND : "导入"
    DATA_SOURCE ||--o{ COURSE : "导入"
    DATA_SOURCE {
        string id PK
        string type "room/band/course"
        string name
        string source
        string version
        datetime imported_at
        json snapshot
    }
    
    ROOM ||--o{ BOOKING : "被预约"
    ROOM {
        string id PK
        string name
        int capacity
        json equipment
        string source_id FK
        string version
    }
    
    BAND ||--o{ BOOKING : "发起"
    BAND {
        string id PK
        string name
        json members
        json required_equipment
        string source_id FK
        string version
    }
    
    COURSE ||--o{ BOOKING : "关联"
    COURSE {
        string id PK
        string name
        string teacher
        datetime start_time
        datetime end_time
        string source_id FK
        string version
    }
    
    BOOKING ||--o{ CONFLICT : "产生"
    BOOKING ||--o{ CHANGE_HISTORY : "修改"
    BOOKING {
        string id PK
        string room_id FK
        string band_id FK
        string course_id FK
        datetime start_time
        datetime end_time
        string status "normal/conflict/resolved"
        string data_chain "完整链路JSON"
        string version
    }
    
    CONFLICT {
        string id PK
        string booking_id FK
        string type "equipment/teacher_leave/overday/overlap"
        string description
        json affected_bookings
        boolean resolved
    }
    
    CHANGE_HISTORY {
        string id PK
        string booking_id FK
        string action_type "create/change_room/adjust_time/resolve_conflict"
        json before_value
        json after_value
        string operator
        datetime operated_at
        string remark
    }
```

### 4.2 数据链路追踪设计

**核心原则**: 每个预约实体(`booking`)必须携带完整的 `data_chain` 字段，记录从原始导入到当前状态的每一步变化，不依赖内存变量传递。

```typescript
interface DataChainNode {
  step: 'import' | 'conflict_detect' | 'adjust' | 'export';
  timestamp: string;
  source: string;
  version: string;
  dataSnapshot: any;
  operator?: string;
  remark?: string;
}

interface Booking {
  id: string;
  roomId: string;
  bandId: string;
  courseId: string;
  startTime: string;
  endTime: string;
  status: 'normal' | 'conflict' | 'resolved';
  // 完整链路，不依赖后台变量
  dataChain: DataChainNode[];
  version: string;
}
```

### 4.3 冲突检测算法

```typescript
// 设备不匹配检测
function detectEquipmentConflict(booking: Booking, room: Room): Conflict | null {
  const missing = booking.band.requiredEquipment.filter(
    eq => !room.equipment.includes(eq)
  );
  if (missing.length > 0) {
    return {
      type: 'equipment',
      description: `缺少设备: ${missing.join(', ')}`,
      affectedBookings: [booking.id]
    };
  }
  return null;
}

// 老师请假检测
function detectTeacherLeaveConflict(booking: Booking, leaves: TeacherLeave[]): Conflict | null {
  const teacher = booking.course.teacher;
  const overlappingLeave = leaves.find(leave => 
    leave.teacher === teacher &&
    dateRangesOverlap(booking.startTime, booking.endTime, leave.startDate, leave.endDate)
  );
  if (overlappingLeave) {
    return {
      type: 'teacher_leave',
      description: `${teacher} 在该时段请假 (${overlappingLeave.reason})`,
      affectedBookings: findBookingsByTeacherAndTimeRange(teacher, booking.startTime, booking.endTime)
    };
  }
  return null;
}

// 跨天预约检测
function detectOverdayConflict(booking: Booking): Conflict | null {
  const startDay = dayjs(booking.startTime).startOf('day');
  const endDay = dayjs(booking.endTime).startOf('day');
  if (!startDay.isSame(endDay)) {
    return {
      type: 'overday',
      description: `预约跨 ${endDay.diff(startDay, 'day') + 1} 天`,
      affectedBookings: [booking.id]
    };
  }
  return null;
}

// 时间重叠检测
function detectOverlapConflict(booking: Booking, allBookings: Booking[]): Conflict | null {
  const overlapping = allBookings.filter(b => 
    b.id !== booking.id &&
    b.roomId === booking.roomId &&
    dateRangesOverlap(b.startTime, b.endTime, booking.startTime, booking.endTime)
  );
  if (overlapping.length > 0) {
    return {
      type: 'overlap',
      description: `与 ${overlapping.map(b => b.band.name).join(', ')} 的预约时间重叠`,
      affectedBookings: [booking.id, ...overlapping.map(b => b.id)]
    };
  }
  return null;
}
```

## 5. 模块组件设计

```
src/
├── components/
│   ├── import/
│   │   ├── ImportCard.tsx          # 导入卡片组件
│   │   ├── FileUploader.tsx        # 文件上传组件
│   │   └── FieldMapper.tsx         # 字段映射表
│   ├── board/
│   │   ├── TimelineView.tsx        # 时间轴视图
│   │   ├── RoomHeatmap.tsx         # 房间热力图
│   │   ├── BookingBlock.tsx        # 预约块组件
│   │   └── RoomCard.tsx            # 房间信息卡
│   ├── conflict/
│   │   ├── ConflictPanel.tsx       # 冲突面板
│   │   ├── ConflictCard.tsx        # 冲突卡片
│   │   └── ImpactAnalysis.tsx      # 影响分析
│   ├── booking/
│   │   ├── BookingDetail.tsx       # 预约详情
│   │   ├── DataChainView.tsx       # 数据链路可视化
│   │   └── RoomChangeForm.tsx      # 换房表单
│   └── review/
│       ├── ChangeHistory.tsx       # 换房历史时间线
│       ├── VersionCompare.tsx      # 版本对比
│       └── ExportDialog.tsx        # 导出对话框
├── store/
│   ├── useDataStore.ts             # 数据源管理
│   ├── useBookingStore.ts          # 预约状态管理
│   ├── useConflictStore.ts         # 冲突状态管理
│   └── useHistoryStore.ts          # 历史记录管理
├── engine/
│   ├── importParser.ts             # 导入解析引擎
│   ├── conflictDetector.ts         # 冲突检测引擎
│   ├── bookingScheduler.ts         # 预约调度器
│   ├── chainTracker.ts             # 链路追踪器
│   └── exportGenerator.ts          # 导出生成器
├── types/
│   └── index.ts                    # TypeScript类型定义
├── data/
│   └── sampleData.ts               # 样例数据
└── utils/
    ├── storage.ts                  # 存储工具
    └── dateUtils.ts                # 日期工具
```

## 6. 核心数据流 - 从排练室表到导出日程

```mermaid
sequenceDiagram
    participant U as 用户
    participant I as 导入页面
    participant P as 导入解析器
    participant S as 数据版本快照
    participant C as 冲突检测引擎
    participant B as 预约看板
    participant T as 链路追踪器
    participant E as 导出生成器

    U->>I: 上传排练室表Excel
    I->>P: 解析文件
    P->>P: 字段映射 + 数据验证
    P->>S: 保存原始数据快照<br/>{source, version, timestamp, data}
    S-->>P: 返回快照ID
    
    U->>I: 上传乐队名单
    I->>P: 解析文件
    P->>S: 保存乐队数据快照
    
    U->>I: 上传课程安排
    I->>P: 解析文件
    P->>S: 保存课程数据快照
    
    P->>C: 基于快照生成初始预约
    loop 每个预约
        C->>C: 设备检测
        C->>C: 请假检测
        C->>C: 跨天检测
        C->>C: 重叠检测
    end
    C->>T: 每个预约标记导入链路节点
    C->>B: 渲染预约看板
    
    U->>B: 发现冲突，点击换房
    B->>T: 记录调整前快照
    B->>C: 重新检测冲突
    C->>T: 新增调整链路节点
    T-->>B: 更新预约状态
    
    U->>B: 确认无误，导出日程
    B->>E: 请求导出
    E->>T: 读取每个预约的完整dataChain
    T-->>E: 返回完整链路数据
    E->>E: 生成Excel (含链路元数据)
    E-->>U: 下载日程文件
```

## 7. 状态管理设计 - Zustand Store

```typescript
// useDataStore.ts - 数据源管理
interface DataState {
  sources: DataSource[];
  rooms: Room[];
  bands: Band[];
  courses: Course[];
  importData: (type: DataSourceType, file: File, source: string, version: string) => Promise<void>;
  loadSampleData: () => void;
  getVersionHistory: (type: DataSourceType) => DataSource[];
  compareVersions: (v1Id: string, v2Id: string) => DiffResult;
}

// useBookingStore.ts - 预约管理
interface BookingState {
  bookings: Booking[];
  generateBookings: () => void;
  changeRoom: (bookingId: string, newRoomId: string, remark: string) => void;
  adjustTime: (bookingId: string, newStart: string, newEnd: string, remark: string) => void;
  getBookingChain: (bookingId: string) => DataChainNode[];
}

// useConflictStore.ts - 冲突管理
interface ConflictState {
  conflicts: Conflict[];
  detectConflicts: () => void;
  resolveConflict: (conflictId: string, solution: string) => void;
  getConflictsByBooking: (bookingId: string) => Conflict[];
  getAffectedBookings: (conflictId: string) => Booking[];
}
```
