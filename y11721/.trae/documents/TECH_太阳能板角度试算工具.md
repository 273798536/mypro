## 1. 架构设计

```mermaid
graph TD
    A["React 前端应用" --> B["3D渲染层 (Three.js + R3F)
    A --> C["状态管理层 (Zustand)
    A --> D["UI组件层 (Tailwind CSS)
    A --> E["数据处理层 (计算逻辑)
    E --> F["太阳位置计算
    E --> G["辐照量计算
    E --> H["发电量计算
    C --> I["本地存储 (方案保存)
    D --> J["图表可视化 (Recharts)
```

## 2. 技术描述
- 前端框架: React@18 + TypeScript
- 构建工具: Vite
- 3D库: three@^0.160 + @react-three/fiber@^8 + @react-three/drei@^9
- 样式: tailwindcss@^3
- 状态管理: zustand@^4
- 图表: recharts@^2
- 截图导出: html2canvas
- 数据存储: localStorage

## 3. 路由定义
| 路由 | 用途 |
|-------|------|
| / | 主页面 - 3D场景 + 参数控制 |

## 4. 数据模型

### 4.1 方案数据结构
```typescript
interface SolarPanelScenario {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  source: string;
  version: number;
  history: Array<{ timestamp: string; changes: string }>;
  params: {
    location: { lat: number; lng: number; name: string; timezone: string };
    date: string;
    tiltAngle: number;
    weatherFactor: number;
    panelArea: number;
  };
  results: {
    solarElevation: number;
    solarAzimuth: number;
    irradiation: number;
    powerOutput: number;
  };
}
```

### 4.2 导入模式
- ignore: 忽略重复方案
- overwrite: 覆盖同名方案
- append: 重命名并追加

## 5. 核心算法

### 5.1 太阳高度角计算
基于纬度、日期、时间计算太阳高度角和方位角

### 5.2 辐照量计算
考虑太阳高度角、天气系数、面板倾角的综合计算

### 5.3 发电量估算
基于辐照量、面板面积、转换效率的估算
