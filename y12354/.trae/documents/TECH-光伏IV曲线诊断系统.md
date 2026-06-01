## 1. 架构设计

```mermaid
graph TD
    F["前端应用 (React)"] --> S["状态管理 (Zustand)
    F --> R["路由管理 (React Router)
    F --> C["UI组件库 (Ant Design)
    F --> V["数据可视化 (ECharts)
    F --> U["工具函数集 (IV曲线算法)
    S --> LS["本地存储 (localStorage)
    S --> MD["Mock数据服务"]
```

## 2. 技术选型

- **前端框架**: React@18 + TypeScript
- **构建工具**: Vite@5
- **状态管理**: Zustand
- **路由管理**: React Router@6
- **UI组件库**: Ant Design@5
- **数据可视化**: ECharts@5
- **样式方案**: Tailwind CSS@3
- **数据持久化**: localStorage + IndexedDB

## 3. 路由定义

| 路由路径 | 页面名称 | 说明 |
|---------|----------|------|
| / | 诊断工作台 | 首页，IV曲线诊断主界面 |
| /diagnosis | 诊断工作台 | 上传数据、配置参数、执行诊断 |
| /clues | 线索归集中心 | 事件管理、线索关联 |
| /trace | 链路追溯面板 | 诊断全链路追溯查看 |
| /problems | 问题追踪系统 | 异常定位、触发溯源 |
| /samples | 样本回看库 | 历史记录、复算验证 |

## 4. 核心数据模型

### 4.1 IV曲线数据

```typescript
interface IVCurveData {
  id: string;
  serialNumber: string;
  voltage: number[];
  current: number[];
  temperature: number;
  irradiance: number;
  timestamp: number;
  hash: string;
}
```

### 4.2 诊断结果

```typescript
interface DiagnosisResult {
  id: string;
  curveId: string;
  inputHash: string;
  parameters: {
    voc: number;
    isc: number;
    vm: number;
    im: number;
    ff: number;
    rs: number;
    rsh: number;
  };
  abnormalities: Abnormality[];
  traceNodes: TraceNode[];
  faultLevel: 'normal' | 'warning' | 'error';
  createdAt: number;
}
```

### 4.3 链路节点

```typescript
interface TraceNode {
  id: string;
  name: string;
  type: 'curveFitting' | 'temperatureCorrection' | 'faultClassification';
  input: any;
  output: any;
  parameters: Record<string, any>;
  status: 'success' | 'warning' | 'error';
  duration: number;
}
```

### 4.4 诊断事件

```typescript
interface DiagnosisEvent {
  id: string;
  title: string;
  description: string;
  curves: string[];
  clues: Clue[];
  status: 'open' | 'in_progress' | 'resolved';
  createdAt: number;
}
```

## 5. 核心算法模块

### 5.1 IV曲线拟合算法
- 单二极管模型拟合
- 最小二乘法参数优化
- 拟合优度评估

### 5.2 温度修正算法
- 基于IEC 60891标准
- 温度系数修正
- 辐照度修正

### 5.3 故障分层诊断
- 串联电阻故障
- 并联电阻故障
- 旁路二极管故障
- 遮挡故障识别

### 5.4 可复算校验
- 输入数据哈希计算
- 算法版本记录
- 结果一致性校验
