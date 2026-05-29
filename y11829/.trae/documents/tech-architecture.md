## 1. 架构设计

```mermaid
flowchart TD
    "前端应用 (React + Vite)" --> "游戏引擎模块"
    "前端应用 (React + Vite)" --> "UI组件层"
    "前端应用 (React + Vite)" --> "复盘模块"
    "游戏引擎模块" --> "队列管理器"
    "游戏引擎模块" --> "柜台状态机"
    "游戏引擎模块" --> "事件调度器"
    "队列管理器" --> "VIP挤占规则"
    "队列管理器" --> "预约窗口计时"
    "柜台状态机" --> "状态: 空闲/占用/冷却/故障"
    "事件调度器" --> "客户到达事件"
    "事件调度器" --> "柜台故障事件"
    "复盘模块" --> "事件时间线"
    "复盘模块" --> "归因分析器"
```

## 2. 技术说明
- 前端：React@18 + TypeScript + TailwindCSS@3 + Vite
- 初始化工具：Vite
- 后端：无（纯前端，数据存储在内存/localStorage）
- 数据库：无（使用mock数据和游戏状态管理）

## 3. 路由定义
| 路由 | 用途 |
|------|------|
| / | 游戏主界面：客户队列 + 柜台操作 + 状态面板 |
| /review | 复盘界面：事件时间线 + 队列快照 + 归因详情 |

## 4. 核心数据模型

### 4.1 客户卡 (Customer)
```typescript
interface Customer {
  id: string;
  name: string;
  vipLevel: 0 | 1 | 2 | 3;
  isAppointment: boolean;
  appointmentDeadline: number | null;
  businessType: "deposit" | "withdraw" | "transfer" | "loan" | "card";
  serviceTime: number;
  originalQueueIndex: number;
}
```

### 4.2 柜台 (Counter)
```typescript
interface Counter {
  id: string;
  label: string;
  status: "idle" | "serving" | "cooldown" | "broken";
  currentCustomer: Customer | null;
  remainingTime: number;
  cooldownRemaining: number;
  brokenRemaining: number;
  serviceHistory: Array<{ customer: Customer; startTime: number; endTime: number; result: "completed" | "interrupted" | "broken" }>;
}
```

### 4.3 游戏事件 (GameEvent)
```typescript
interface GameEvent {
  id: string;
  timestamp: number;
  type: "customer_arrive" | "vip_preempt" | "service_start" | "service_complete" | "service_interrupted" | "appointment_expired" | "counter_broken" | "counter_cooldown" | "counter_recovered" | "queue_reorder";
  data: {
    customerId?: string;
    counterId?: string;
    details: string;
    affectedCustomers?: string[];
    affectedCounters?: string[];
  };
}
```

### 4.4 游戏状态 (GameState)
```typescript
interface GameState {
  phase: "idle" | "playing" | "paused" | "ended";
  tick: number;
  queue: Customer[];
  counters: Counter[];
  events: GameEvent[];
  score: {
    served: number;
    vipHandled: number;
    appointmentExpired: number;
    interruptedCount: number;
    brokenCount: number;
  };
  scenarioLog: Array<{ tick: number; description: string }>;
}
```

## 5. 核心游戏逻辑

### 5.1 队列重排规则
- VIP到达时根据vipLevel插入队列对应优先位置
- 挤占发生时，被挤出的客户卡片记录originalQueueIndex，归因指向该位置
- 柜台中断服务时，被中断客户回到队列原优先级位置

### 5.2 资源冷却机制
- VIP挤占中断柜台：冷却2秒（柜台不可用）
- 柜台故障：冷却5秒（柜台不可用）
- 冷却期间柜台状态为"cooldown"，不可分配客户
- 复盘中冷却时段用蓝色标记，关联受影响的客户卡ID

### 5.3 预约过号归因
- 预约客户到达后启动倒计时窗口
- 窗口内未被服务则标记"预约过号"
- 归因：指向客户卡ID + "预约窗口在柜台X冷却/占用期间耗尽"

## 6. 样例场景配置

### 场景A：VIP挤占触发队列重排
```json
{
  "counters": 3,
  "events": [
    { "tick": 0, "type": "customer_arrive", "customers": ["A(普通)", "B(普通)"] },
    { "tick": 1, "type": "assign", "customer": "A", "counter": 1 },
    { "tick": 1, "type": "assign", "customer": "B", "counter": 2 },
    { "tick": 3, "type": "customer_arrive", "customers": ["C(普通)", "D(VIP-3)"] },
    { "tick": 4, "type": "counter_broken", "counter": 2 }
  ]
}
```

### 场景B：预约过号 + 柜台故障
```json
{
  "counters": 2,
  "events": [
    { "tick": 0, "type": "customer_arrive", "customers": ["E(预约,窗口20秒)", "F(普通)"] },
    { "tick": 1, "type": "assign", "customer": "F", "counter": 1 },
    { "tick": 5, "type": "counter_broken", "counter": 1 },
    { "tick": 25, "type": "appointment_expired", "customer": "E" }
  ]
}
```
