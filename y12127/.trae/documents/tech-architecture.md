## 1. 架构设计

```mermaid
graph TD
    "前端 React 应用" --> "插值计算引擎"
    "前端 React 应用" --> "Canvas 渲染层"
    "前端 React 应用" --> "状态管理 (Zustand)"
    "状态管理 (Zustand)" --> "采样点数据"
    "状态管理 (Zustand)" --> "函数配置"
    "状态管理 (Zustand)" --> "噪声参数"
    "状态管理 (Zustand)" --> "历史快照"
    "插值计算引擎" --> "Lagrange 插值器"
    "插值计算引擎" --> "重复 x 值检测"
    "插值计算引擎" --> "误差分析器"
    "插值计算引擎" --> "异常检测器"
    "Canvas 渲染层" --> "函数曲线"
    "Canvas 渲染层" --> "插值曲线"
    "Canvas 渲染层" --> "误差曲线"
    "Canvas 渲染层" --> "采样点标记"
```

## 2. 技术说明

- **前端**：React@18 + Tailwind CSS@3 + Vite + TypeScript
- **初始化工具**：vite-init（react-ts 模板）
- **后端**：无（纯前端计算，所有插值运算在浏览器完成）
- **状态管理**：Zustand
- **图表渲染**：Canvas 2D API（自绘，避免第三方图表库依赖）
- **数学计算**：自行实现 Lagrange 插值，不引入数值计算库

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 实验台主页（单页应用，所有功能集成在一个页面内） |

## 4. API 定义

无后端 API，所有计算在前端完成。

### 4.1 核心数据类型

```typescript
interface SamplingPoint {
  x: number;
  y: number;
  duplicate?: boolean;
}

type FunctionType = 'runge' | 'sin' | 'exp' | 'custom';

interface NoiseConfig {
  type: 'gaussian' | 'uniform';
  amplitude: number;
  seed: number;
}

interface InterpolationResult {
  points: SamplingPoint[];
  polynomialCoefficients: number[];
  errorCurve: { x: number; error: number }[];
  maxError: number;
  rmse: number;
  warnings: Warning[];
}

interface Warning {
  type: 'duplicate_x' | 'boundary_oscillation' | 'noise_amplification';
  message: string;
  severity: 'error' | 'warning';
}

interface ExperimentSnapshot {
  id: string;
  timestamp: number;
  functionType: FunctionType;
  noiseConfig: NoiseConfig | null;
  result: InterpolationResult;
  label: string;
}
```

## 5. 服务器架构图

不适用（纯前端应用）

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    "ExperimentState" {
        "SamplingPoint[] points"
        "FunctionType functionType"
        "string customExpr"
        "NoiseConfig noiseConfig"
        "InterpolationResult currentResult"
        "ExperimentSnapshot[] history"
        "InterpolationResult previousResult"
    }
    "SamplingPoint" {
        "number x"
        "number y"
        "boolean duplicate"
    }
    "NoiseConfig" {
        "string type"
        "number amplitude"
        "number seed"
    }
    "InterpolationResult" {
        "SamplingPoint[] points"
        "number[] coefficients"
        "object[] errorCurve"
        "number maxError"
        "number rmse"
        "Warning[] warnings"
    }
    "Warning" {
        "string type"
        "string message"
        "string severity"
    }
    "ExperimentState" ||--o{ "SamplingPoint" : contains
    "ExperimentState" ||--o| "NoiseConfig" : has
    "ExperimentState" ||--o| "InterpolationResult" : produces
    "InterpolationResult" ||--o{ "Warning" : raises
```

### 6.2 数据定义语言

不适用（无数据库，状态由 Zustand 管理）
