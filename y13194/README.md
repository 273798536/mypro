# 电池内阻报告导出系统 (BR·Analyzer)

面向锂电池实验室的**电池内阻检测报告导出 Web 应用**，解决报警与人工备注不一致、Web3D 数据联动、历史版本追溯、方向符号异常隔离、跳变原因定位、处理状态可视化、接班引导这 7 大痛点。

## 技术栈

| 层 | 选型 |
|---|---|
| 框架 | React 18 + TypeScript 5 |
| 构建 | Vite 6 + vite-tsconfig-paths |
| 样式 | Tailwind CSS 3 |
| 3D 渲染 | three.js 0.160 + @react-three/fiber 8 + @react-three/drei 9 |
| 状态管理 | Zustand 5（ui/battery/log/history/anomaly/report 6 层 slice） |
| 图表 | Recharts 2 |
| PDF 导出 | jsPDF 2（纯 API 矢量渲染，不截图） |
| 路由 | React Router 7 |
| 动效 | framer-motion 11 |

## 业务入口（5 个页面）

| 路由 | 页面 | 说明 |
|---|---|---|
| `/` | Dashboard 工作台 | 异常摘要、新手上路 3 步、待审核、待补证据、24h 活动审计 |
| `/3d-panel` | Web3D 数据联动面板 | 3D 点选单体、时间轴切片、多维筛选器（单位/备注关键词/异常/未审核）与日志实时联动 |
| `/history/:batteryId` | 历史追溯页 | 备注版本时间线、版本对比、截图画廊、单体完整审计时间线 |
| `/anomaly` | 异常隔离中心 | 方向符号反置专区、跳变检测 Tab（阈值/单位/晚到附件）、证据三栏看板 |
| `/export` | 报告导出中心 | 模板选择（标准/精简/含历史版）、实时预览、样例专区、导出队列+PDF 下载 |

## 核心链路

### 筛选联动
```
3D 点选 / 时间轴拖拽 / 筛选按钮（单位、备注关键词、仅异常、未审核）
       ↓
Zustand store (log.filters + battery.selectedId + log.timeRange)
       ↓
useFilteredLogs() 派生筛选
       ↓
LogTable 日志表 + RightInfoPanel 详情面板实时刷新
```

### 跳变检测算法（前端内置）
按优先级链自动判定：
1. **单位切换**（unit 前后不一致）
2. **阈值版本变更**（thresholdVersion 变化）
3. **晚到附件**（lateData = true）
4. **未知**（需人工确认）

### PDF 导出闭环
```
用户点击「下载 PDF」/「生成报告并加入导出队列」
       ↓
useReportExporter.exportReport(report)
       ↓
pdfGenerator.generateReportPDF({report, cells, logs, remarks, jumps})
  ① 封面基本信息表（8 项）
  ② 6 宫格统计摘要（正常/异常数、平均内阻电压温度、单体数）
  ③ 参与检测的电池明细表
  ④ 传感器日志数据表（前 60 条，斑马纹，异常红底高亮，异常值不参与平均值）
  ⑤ 异常隔离段（方向反置/跳变带彩色 type badge）
  ⑥ 含历史版模板时追加备注版本链
  ⑦ 免责说明
       ↓
jsPDF.output("blob") → URL.createObjectURL(blob)
       ↓
store.finalizeReport(reportId, downloadUrl)  // 把 Blob URL 存进 Store
       ↓
downloadBlob(blob, filename)  // 动态 <a download> 触发浏览器下载
```

## 命令速查

```bash
# 安装依赖
npm install

# 本地开发（Vite Dev Server，默认 http://localhost:5173）
npm run dev

# 类型检查（仅 TS，不产物）
npm run check

# 代码检查（ESLint）
npm run lint

# 生产构建（先 TS 检查再 Vite 构建，产物在 dist/）
npm run build

# 本地预览生产构建
npm run preview
```

## 接班极简引导（小宋视角）

1. **样例在哪？** → `/export` → 「样例专区」3 份预置标准样例（正常/异常/跳变），点「下载 PDF」直接参考
2. **异常在哪？** → `/anomaly` → 方向符号反置已红框隔离；跳变自动标注原因（阈值/单位/晚到附件）
3. **结果怎么导出？** → `/3d-panel` 选电池 + 筛选 → `/export` 选模板（标准/精简/含历史版） → 点「生成报告并加入导出队列」 → 进度跑完点「下载 PDF」

## 设计语言

- 主色：深空蓝 `#0A1628` + 工业青 `#00D4AA`
- 状态色：警示红 `#FF4757`（异常）、琥珀黄 `#FFA502`（未审/注意）、极光紫 `#7B2CBF`（历史）
- 字体：JetBrains Mono（标题/数据） + Inter（正文）
- 布局：Sidebar + 主区 + RightInfoPanel 三栏

## 目录结构

```
src/
├── components/layout/   # AppShell / Sidebar / TopBar / RightInfoPanel
├── mock/generator.ts    # Mock 数据生成（80 节电池、方向反置+跳变+晚到附件人工植入）
├── pages/               # 5 个页面（Dashboard/ThreeDPanel/HistoryPage/AnomalyCenter/ExportCenter）
├── store/appStore.ts    # Zustand 全局状态（6 层 slice + useFilteredLogs/useStats 派生）
├── types/index.ts       # TS 类型定义（BatteryCell/SensorLogEntry/Remark/JumpDetection/ReportConfig/LogFilters）
├── utils/
│   ├── pdfGenerator.ts       # jsPDF 报告渲染核心
│   └── useReportExporter.ts  # 导出 React Hook
├── App.tsx
├── index.css            # Tailwind + 面板/按钮/Chip 自定义类
└── main.tsx
```
