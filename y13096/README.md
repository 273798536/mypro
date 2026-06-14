# 低空航线走廊时序回放系统 · AIR CORRIDOR REPLAY

面向评审彩排场景的低空航线走廊材料时序回放 Web 系统。解决评审助理「视角保存次日失效、导出和屏幕数字分家、口径修改无法追溯、时间轴缺段混在正常材料里」和排班同事「先找异常对象再换视角截图、区分已处理/待补证据」等实际问题。

---

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器（默认端口 5173，冲突时自动递增）
npm run dev

# 类型检查
npm run check

# 生产构建
npm run build
```

启动后浏览器访问终端输出的 Local 地址（例如 `http://localhost:5173/`）即可进入回放主界面。系统路由只有一条：`/` → 回放主页面。

---

## 功能速览（按用户角色）

### 评审助理阿乔

| 场景 | 入口 | 说明 |
|---|---|---|
| 保存次日可复原的视角 | 顶栏「保存视角」按钮 / 左侧「已保存视图」面板 | ViewState（相机+筛选+时间点+选中+Tab）序列化写入 LocalStorage `aero-replay:saved-views`，次日刷新一键还原 |
| 导出和屏幕数字不分家 | 顶栏「导出材料」 | html2canvas 2x 高清全屏截图 + jsPDF A4 横向多页，筛选口径 / 口径修改 / 时间轴缺段 / 异常清单 / 视图 JSON 同文件输出；PDF 元信息通过 setProperties 写入 |
| 筛选口径随接口返回留档 | 筛选工具栏底部实时预览 + 导出选项「筛选口径（写入接口返回结构）」 | MaterialQueryResponse 内嵌 FilterSnapshot，含 `rawSqlLike` 伪 SQL 便于核对 |
| 区分哪份材料改过口径 | 侧边栏卡片 diff 横条 / 详情抽屉「口径变更历史」时间线 | `caliberHistory[]` 记录字段、修改人、before/after 值、原因；支持"仅改过口径"一键筛选 |
| 时间轴缺段在筛选/详情/导出都有标记 | 时间轴 SVG 斜纹 pattern + 地图红色虚线矩形 + 筛选 Toolbar「缺段」Chip + 异常面板 + 导出「时间轴缺段标记」 | 严重程度分 CRITICAL / WARNING 两档，关联晚到材料可直接跳转 |

### 排班同事

| 场景 | 入口 | 说明 |
|---|---|---|
| 先找异常对象 | 右侧「异常对象定位」面板 | 按严重度排序（rejected > need_evidence > late > fillsGap > modified），点击即同步跳转地图+时间轴+抽屉 |
| 换视角截图时视图条件跟着保存 | 左侧「已保存视图」面板 + 导出「附视图条件 JSON」 | JSON 可粘贴回系统或人工核对 |
| 哪些已处理 / 哪些待补证据 | 左上处理状态总览 4 卡片 | 点击卡片按状态筛选；异常徽章 + 处理状态徽章叠加显示 |

---

## 目录结构

```
.
├── shared/
│   └── types.ts                  # 前后端共享类型（MaterialItem / FilterSnapshot / ViewState 等）
├── src/
│   ├── data/
│   │   └── demoData.ts           # 演示数据引擎（1晚到附件 + 2缺段 + 3改口径 + 状态不均匀分布）
│   ├── store/
│   │   └── replayStore.ts        # Zustand 单 Store（回放/筛选/相机/选中/视图/处理状态）
│   ├── components/
│   │   ├── common/
│   │   │   ├── TopStatusBar.tsx  # 顶栏（链路状态/时钟/保存视角/分享口径/导出材料）
│   │   │   └── Badges.tsx        # 状态徽章/材料类型徽章/异常徽章/严重程度徽章
│   │   ├── map/
│   │   │   └── CorridorMap.tsx   # Leaflet 走廊地图（420m 宽走廊多边形 + 缺段矩形 + 脉冲点）
│   │   ├── timeline/
│   │   │   └── Timeline.tsx      # D3 自绘示波器风格时间轴（播放/拖动/倍速/缺段斜纹）
│   │   └── panels/
│   │       ├── StatusBoard.tsx   # 处理状态 4 卡片（点击即筛选）
│   │       ├── ViewSaver.tsx     # 已保存视图卡片列表
│   │       ├── FilterToolbar.tsx # 筛选工具栏（时间/异常/类型/口径/处理状态 + FilterSnapshot 预览）
│   │       ├── AnomalyPanel.tsx  # 异常对象定位（缺段 + 异常材料按严重度排序）
│   │       ├── MaterialSidebar.tsx # 材料列表（4 Tab：点位/附件/口头/异常）
│   │       ├── CaliberDrawer.tsx # 口径变更抽屉（元信息+缺段关联+变更历史+处理状态）
│   │       └── ExportDialog.tsx  # 导出对话框（PDF/PNG + 5 项导出选项）
│   ├── pages/
│   │   └── ReplayPage.tsx        # 12 栏主页面布局
│   ├── App.tsx                   # 路由入口（/ → ReplayPage）
│   ├── main.tsx
│   └── index.css                 # Aero-Industrial 深色主题 + Tailwind utility
├── .trae/documents/
│   ├── PRD-低空航线走廊时序回放.md   # 产品需求文档
│   └── TECH-低空航线走廊时序回放.md  # 技术架构文档
├── tailwind.config.js            # Aero 配色令牌 + 字体族 + 动画关键帧
├── vite.config.ts
└── package.json
```

---

## 演示数据说明（刻意"不干净"）

为了避免彩排现场"只展示正常样例"，`src/data/demoData.ts` 内建 16 条材料包含：

- **晚到附件 1 条**：`雷达扫描图V2.png`，应到 10:20 / 实到 11:05，延迟 45 分钟，填补严重缺段 gap-A
- **时间轴缺段 2 处**：gap-A（10:18~10:35，CRITICAL，17 分钟）/ gap-B（12:02~12:08，WARNING，6 分钟）
- **口径修改 3 处**：P04 纬度 31.2311 → 31.2345 / P07 高度 120 → 150 / 飞行计划说明「正常」→「绕飞雷雨区，偏航 2.3NM」
- **处理状态不均匀分布**：8 已处理 / 3 待补证据 / 1 已驳回 / 4 未处理

---

## 技术栈

- React 18 + TypeScript 5 + Vite 6
- TailwindCSS 3 + zustand 5 + react-router-dom 7
- Leaflet 1.9 + react-leaflet 4（CARTO Voyager 无标签瓦片，国内可访问）
- D3 7（时间轴）+ html2canvas 1（截图）+ jspdf 2（PDF 导出）
- lucide-react（图标）+ dayjs

---

## 关键交互修复记录

- **状态卡片筛选被二次 toggle 清空**（2026-06-14）：`StatusBoard.tsx` 改为直接调用 Store 新增的 `setProcessStatuses([key])` 覆盖式 setter，去掉原先 `setState + toggleProcessStatus` 的双重写操作；同时为 `AnomalyPanel` / `MaterialSidebar` Tab 计数补齐 `useMemo` 派生，保证异常列表、Tab 数字和筛选口径一致。
