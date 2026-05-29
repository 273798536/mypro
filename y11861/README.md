# 水库库容地形沙盘

基于 Three.js 的交互式3D水库地形可视化工具，帮助水利工程师直观展示不同水位下的淹没范围、库容曲线、村庄分布等关键信息。

## 快速启动

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm run dev

# 3. 浏览器打开显示的地址（默认 http://localhost:5173）
```

## 首份地形网格样例位置

```
src/data/sampleTerrain.ts
```

该文件包含：
- `sampleTerrain` — 40×40 网格的"青山水库库区地形"，单元尺寸50m，高程单位meter
- `sampleVillages` — 5个村庄点（青山村、河源镇、龙门村、下坝村、桥头村）
- `sampleSpillways` — 2个泄洪口（主溢洪道、副溢洪道）
- `sampleCapacityCurve` — 库容曲线（11个水位-库容数据点）

## 核心功能

| 功能 | 说明 |
|------|------|
| 3D地形视图 | 可旋转缩放的3D地形场景，地形渐变色渲染 |
| 水位调节 | 左侧滑块实时调整水位，淹没范围同步更新 |
| 等高线显示 | 自动生成等高线，水位以下的等高线高亮 |
| 村庄标记 | 村庄点3D标记，悬停显示详情，淹没状态实时标识 |
| 库容曲线 | 右侧面板折线图，带当前水位参考线 |
| 数据校验 | 水位单位校验、村庄点重复检测、库容插值偏差分析 |
| 变更追踪 | 补录村庄点后，自动检测地形结论是否被改动 |
| 参数越界提醒 | 3D视图顶部红色横幅提示数据问题 |

## 项目结构

```
src/
├── components/
│   ├── ControlPanel/    # 左侧控制面板（水位滑块、图层、补录村庄）
│   ├── DetailPanel/     # 右侧明细面板（村庄、库容、校验、变更）
│   └── Scene3D/         # 3D场景（地形网格、水面、村庄标记）
├── store/useStore.ts    # Zustand 全局状态管理
├── utils/
│   ├── validation.ts    # 数据校验（单位、去重、插值、越界、缺口）
│   └── waterLevel.ts    # 水位计算（淹没面积、库容、插值、等高线）
├── data/sampleTerrain.ts # 样例地形数据
├── types/index.ts       # TypeScript 类型定义
└── pages/Home.tsx       # 主页面
```

## 技术栈

- React 18 + TypeScript
- Three.js + @react-three/fiber + @react-three/drei
- Zustand（状态管理）
- Recharts（库容曲线图表）
- TailwindCSS 3
- Vite 6

## 其他命令

```bash
# TypeScript 类型检查
npm run check

# 生产构建
npm run build

# 代码检查
npm run lint
```
