# 山地索道站空间复核系统

工程评审与教学交接用的工作台。解决坐标系混用后"谁都不敢信"的复核链路、历史批注保留和交接报告导出问题。

## 快速开始

### 环境要求
- Node.js >= 18（推荐 20 LTS）
- npm >= 9

### 安装依赖
```bash
npm install
```

### 启动开发服务
```bash
npm run dev
```
默认端口 `5173`（占用时自动递增），启动后浏览器访问终端打印的地址，例如 `http://localhost:5175/`

### 生产构建
```bash
npm run build
```
产物输出到 `dist/` 目录

### 本地预览构建产物
```bash
npm run preview
```

### 仅类型检查
```bash
npm run check
```

---

## 业务入口与页面

入口文件：[src/main.tsx](src/main.tsx) → [src/App.tsx](src/App.tsx)，共 3 条业务路由：

| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | 复核工作台 [Workspace.tsx](src/pages/Workspace.tsx) | 主工作台：时间轴 + 筛选 + 3D 视图 + 统计 + 侧边明细 + 合错告警 |
| `/annotations` | 批注与历史 [Annotations.tsx](src/pages/Annotations.tsx) | 批注时间线、追加备注、截图对比、坐标系变更日志 |
| `/handover` | 交接报告 [Handover.tsx](src/pages/Handover.tsx) | 交接表格、验证状态切换、报告预览与下载 |

顶部导航栏在三个页面之间切换。

---

## 核心检查点（验收用）

以下路径每次交付前都需跑通：

### 1. 启动链路
- [ ] `npm install` 成功，无 fatal error（`eslint-visitor-keys` 的 engine warn 可忽略）
- [ ] `npm run build` 成功，`tsc -b` 类型检查无错误
- [ ] `npm run dev` 启动后，浏览器能打开三个页面，控制台无红字报错

### 2. 复核工作台（/）
- [ ] 顶部时间轴有三轮复核，当前轮次高亮，可切换
- [ ] 筛选栏：坐标系、站点、状态、偏差范围 4 组条件 + 重置按钮可交互
- [ ] 统计面板：4 个数字卡片 + 坐标系分布条形图
- [ ] 右侧明细：点击 3D 点位后可看到坐标信息、相邻关系、处理建议三区
- [ ] 合错告警：底部告警条有"处理/已解决"按钮，点击后状态变化

### 3. 批注与历史（/annotations）
- [ ] 左侧时间线：每条批注有版本号、作者、日期，v1 以上用橙色圆点
- [ ] 展开批注：点击"备注"可追加（作者默认林姐），历史备注保留不覆盖
- [ ] 截图对比：点击"截图对比"Tab，选中有截图的批注后，左右两侧显示历史/当前版本对比图
- [ ] 坐标系变更记录：底部列出点位的旧系统→新系统变更与备注

### 4. 交接报告（/handover）
- [ ] 交接表格：序号、批注来源、问题描述、**截图预览**、确认状态、操作列均有内容
- [ ] 验证按钮：待验证 / 已验证 / 待补充 / 驳回 四态可切换
- [ ] **预览报告**：弹出 iframe，显示完整 HTML 报告（含筛选条件 / 统计 / 明细 / 批注历史+截图）
- [ ] **导出交接文档**：点击后下载 `山地索道站交接报告_YYYY-MM-DD.html`，文件可独立用浏览器打开

### 5. 持久化
- [ ] 刷新页面后，新增的备注、切换的验证状态、生成的截图仍然存在（localStorage key：`cableway-review-store`）
- [ ] 清缓存后首次打开，截图会自动用 Canvas 生成并回填

---

## 架构速览

```
src/
├─ types/              全部 TS 类型，单一数据源定义
├─ data/mockData.ts    模拟数据：4 站点 15 点位、9 合错问题、7 批注、3 轮复核
├─ store/index.ts      Zustand + persist，派生方法（getFilteredPoints/getRoundStats 等）
├─ hooks/              useInitializeScreenshots（首屏自动生成缺失截图）
├─ utils/
│  ├─ screenshotGenerator.ts   Canvas 2D 程序化生成截图 dataUrl
│  └─ handoverExport.ts        HTML 报告生成 + Blob 下载
├─ components/          15 个 UI 组件
└─ pages/               3 个路由页面
```

设计原则：
- **单一数据源**：筛选、统计、明细、导出均从 Zustand store 同一份状态派生
- **Append-only**：批注备注只追加，历史截图保留版本号，不覆盖旧值
- **持久化**：变更状态 + 截图 dataUrl 全部写入 localStorage

---

## 已知限制

1. **3D 场景依赖 WebGL**：集成浏览器可能显示全黑，用 Chrome/Safari 真机查看
2. **截图是 Canvas 模拟图**：非真实三维渲染截图，仅用于教学演示链路
3. **全部为 Mock 数据**：未接后端，坐标系转换和合错计算是静态演示
4. **导出为 HTML**：如需 PDF，可在导出的浏览器页面中 Ctrl/⌘ + P 另存

---

## 教学演示建议（林姐用）

推荐按以下顺序走流程：

1. 打开 `/` 工作台 → 切到第三轮复核 → 观察统计数字变化
2. 拖偏差滑块到 2~8m → 看点位筛选和统计联动
3. 打开 `/annotations` → 给 B2 点位追加一条备注 → 验证保留历史
4. 展开 B2 的 v1/v2 截图对比 → 确认能讲清"坐标系错录 → 改西安80"的过程
5. 打开 `/handover` → 给 2 条项改状态 → 点预览报告 → 确认筛选/统计/明细/截图都在同一套导出里
6. 导出 HTML → 用浏览器独立打开 → 验证交接闭环
