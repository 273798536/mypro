# 博物馆客流热区模型

面向博物馆展陈运营团队的 Web3D 客流可视化平台，解决二维客流图无法呈现楼层、楼梯和临时展影响的痛点。

## 项目入口

- **开发入口**：`src/main.tsx` → `src/App.tsx` → `src/pages/Home.tsx`
- **构建入口**：`index.html`
- **访问地址**：开发环境 `http://localhost:5173/`

## 核心功能

| 功能模块 | 说明 |
|---------|------|
| **3D 展厅场景** | 可旋转/缩放/平移的三维博物馆模型，含 B1/F1/F2 三层，8 个展厅（含 2 个临时展），4 个楼梯通道 |
| **热力映射** | 基于客流密度的蓝→黄→红热力图，叠加在 3D 展厅和 2D 侧栏同步显示，支持透明度调节 |
| **楼层筛选** | 顶栏楼层按钮切换，当前层清晰展示，其余层半透明；3D 视图与侧边栏联动同步 |
| **时间筛选** | 2 小时时间窗口，支持按 ±1 小时快进/快退，或通过侧栏滑块按 30 分钟粒度调整 |
| **对象明细** | 点击 3D 展厅/楼梯或 2D 热力图区域，弹出浮动卡片，显示客流、容量比、数据来源、校验问题 |
| **路线播放** | 3 条客流路线（主参观路线/快速通道/应急疏散），动画播放，支持暂停/停止/速度调节（0.5x/1x/2x） |
| **数据校验** | 三层自动校验：楼层错配、客流重复、路线断点，标注影响范围，不静默放行 |
| **截图导出** | 一键截取当前 3D 视图（含热力图层与筛选状态），下载为 PNG |
| **热区报告** | 结构化报告含热区摘要、热力映射口径、校验结果、数据来源清单，支持复制文本与下载 PDF |

## 数据流

```
数据层 (src/data/)
  ├── museum-data.ts    Mock 数据集：展厅模型、客流计数、楼梯点、路线、数据来源
  └── validation.ts     校验模块：楼层错配/客流重复/路线断点检测
         │
         ▼
状态层 (src/store/museum-store.ts)
  ├── Zustand Store     全局状态：选中楼层/展厅/时间范围/热力透明度/路线播放/校验结果
         │
         ▼
渲染层 (src/components/)
  ├── Scene3D.tsx       @react-three/fiber Canvas + 灯光 + Bloom 后处理
  ├── MuseumBuilding.tsx    楼层/展厅/楼梯 3D 几何体
  ├── HeatmapLayer.tsx      3D 热力贴图
  ├── RouteAnimation.tsx    路线动画 + 断点标记
  ├── FilterBar.tsx         顶栏筛选 + 截图/报告按钮
  ├── Sidebar.tsx           侧边栏容器 + Tab 切换
  ├── HeatmapPanel.tsx      2D 热力图 + 滑块 + 校验警告列表
  ├── RoutePanel.tsx        路线播放控制 + 段列表
  ├── DetailPanel.tsx       展厅/楼梯明细卡片
  └── ReportModal.tsx       热区报告弹窗
         │
         ▼
页面层 (src/pages/Home.tsx)
  └── 页面组装：FilterBar → Scene3D + DetailPanel → Sidebar → ReportModal
```

## 异常校验链路

数据加载时自动执行以下校验，结果存入 `validationIssues`：

| 校验类型 | 检测逻辑 | 影响范围标记 |
|---------|---------|-------------|
| **楼层错配** | 客流记录标注楼层 ≠ 展厅实际楼层 | 影响该展厅的统计结果 |
| **客流重复** | 同一展厅同一时段有多条来源不同的计数 | 可能造成该展厅客流重复统计 |
| **路线断点** | 路线段间终点与起点不连续 | 影响该路线的完整性判断 |

## 运行口径

### 热力映射计算
- 密度比 = 展厅累计客流量 ÷ 展厅容量上限
- 色阶映射：0（蓝 #2196F3）→ 0.5（黄 #FFEB3B）→ 1.0+（红 #FF5722）
- 时间窗口内所有客流记录叠加计数

### 数据来源
| 系统 | 版本 | 采集方式 | 采样间隔 |
|------|------|---------|---------|
| counter-a | v2.1 | 红外双目计数器 | 5min |
| counter-b | v1.3 | Wi-Fi 探针估算 | 10min |
| counter-c | v1.0 | 摄像头 AI 计数 | 3min |

### 安装与启动

```bash
# 安装依赖
npm install

# 开发模式（热更新）
npm run dev

# 类型检查
npm run check

# 代码检查
npm run lint

# 构建生产包
npm run build

# 预览生产包
npm run preview
```

## 项目结构

```
src/
├── components/          UI 与 3D 组件
│   ├── MuseumBuilding.tsx    3D 建筑主体
│   ├── HeatmapLayer.tsx      3D 热力层
│   ├── RouteAnimation.tsx    路线动画
│   ├── Scene3D.tsx           3D 场景容器
│   ├── FilterBar.tsx         顶栏筛选
│   ├── Sidebar.tsx           侧边栏
│   ├── HeatmapPanel.tsx      热力面板
│   ├── RoutePanel.tsx        路线面板
│   ├── DetailPanel.tsx       明细卡片
│   └── ReportModal.tsx       报告弹窗
├── data/                数据层
│   ├── museum-data.ts        Mock 数据集
│   └── validation.ts         校验逻辑
├── store/               状态管理
│   └── museum-store.ts       Zustand Store
├── pages/               页面
│   └── Home.tsx              主页面
├── App.tsx              根组件
├── main.tsx             入口
└── index.css            全局样式
```

## 技术栈

- **框架**：React 18 + TypeScript
- **3D 渲染**：three.js + @react-three/fiber + @react-three/drei + @react-three/postprocessing
- **状态管理**：Zustand
- **样式**：Tailwind CSS 3
- **构建**：Vite
- **图标**：lucide-react
- **字体**：Noto Sans SC（中文显示）+ JetBrains Mono（数据标签）
