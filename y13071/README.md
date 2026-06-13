# 🏔️ 山地索道站时序回放 · 评审工作台

> 面向工程评审场景的 Web3D 可视化评审系统。服务评审助理**阿乔**与评审负责人，覆盖 3D 场景时序回放、异常队列联动、评审批注、视图保存、历史复盘、材料审核全流程。

---

## 📁 业务入口（三个页面）

| 路由 | 页面 | 作用 |
|------|------|------|
| `/` | **工作台** | Web3D 场景 + 时间轴 + 筛选 + 异常队列 + 批注，核心判断所在 |
| `/history` | **视图与历史中心** | 视图快照网格 + 变更历史时间线，评审会前复盘 |
| `/review` | **材料审核收尾** | 需补材料 / 可放行材料双栏清单，阿乔按清单催补放行 |

---

## 🚀 启动与验证命令

### 1. 安装依赖
```bash
npm install
```

### 2. 本地启动开发服务器
```bash
npm run dev
```
启动后浏览器访问终端输出的地址（默认 `http://localhost:5173/`，若被占用会依次向后寻找空闲端口）。

### 3. 类型检查（开发过程中必跑）
```bash
npm run check
```
通过标准：`tsc -b --noEmit` 无任何错误输出。

### 4. 生产构建
```bash
npm run build
```
产物输出在 `dist/` 目录。

---

## ✅ 核心业务验证路径（按顺序试跑）

### 路径 A：时序回放 + 异常联动（负责人）
1. 打开 `/` → 观察 3D 场景：站房、支架、吊厢沿钢缆移动、主钢缆、地形等高线
2. **播放时间轴**（底部圆形按钮）→ 吊厢移动、底部进度条推进
3. **切换速度**（0.5× ~ 8× 按钮）
4. 左侧筛选：点击 **3F** Chip → 场景中仅 3F 对象保留（3号支架、吊厢03），Chip 高亮索道橙色
5. 右侧异常队列：点击最顶部的 **3号支架 CRITICAL** → 三个动作同时发生：
   - 时间轴跳转到异常时刻（`00:12:00` 附近）
   - 相机自动飞至 3 号支架
   - 左上角浮出对象详情卡
6. 点击异常卡 hover 状态下出现的 **「确认」** → 该异常状态从「待处理」→「已确认」，按钮置灰

### 路径 B：评审批注 + 楼层混写检测（阿乔）
1. 顶栏点击 **「评审批注」** → 右侧抽屉打开
2. **关联对象**下拉选择「3号支架 · 3F/第3层」
3. **批注内容**输入：`第3层3F支架振动超限，请复核`
   - ✅ 文本框上方实时出现**橙色告警条**：「检测到楼层/单位混写：同时出现 "3F" 与 "第3层"，请确认表述统一」
4. 点击 **「提交批注」** → 「批注历史（含撤回）」中新增一条绿色「有效」标签记录，带「混写」徽标
5. 再点击 **「撤回上一条」** → 该记录转为灰色斜体删除线「已撤回」状态
6. 关闭抽屉，刷新页面 → 撤回记录依然保留（LocalStorage 持久化）

### 路径 C：保存视图 + 相机恢复（负责人→阿乔交接）
1. 在工作台场景中，用鼠标拖拽旋转视角、缩放至特定角度（例如对准 3 号支架）
2. 顶栏点击 **「保存视图」** → 自动写入一条「SAVE_VIEW」历史日志
3. 顶栏点击 **「历史」** → 进入 `/history`
4. **视图快照**区出现刚才保存的卡片，标签包括：筛选楼层、设备类型、时间点、选中徽章
5. 现在鼠标拖拽场景故意旋转到其他角度（模拟"场景被翻乱"）
6. 在快照列表里点击刚才保存的卡片 → 自动跳回 `/` 工作台：
   - 时间轴跳回保存的时刻
   - 筛选条件还原
   - 选中对象还原
   - ✅ **相机视角平滑恢复到保存的角度**，顶部出现绿色 Toast：「已恢复视图快照：xxx @ 00:xx:xx」

### 路径 D：历史复盘 + 材料审核收尾（评审会前）
1. `/history` 页面底部 **变更历史时间线**：
   - 绿色图标「新增批注」展开有 `status:ACTIVE` + `mixedWarning` 字段
   - 灰色图标「撤回批注」展开有 before/after JSON diff（ACTIVE→REVOKED）
   - 黄色图标「确认异常」展开有 before/after JSON diff（PENDING→CONFIRMED）
   - 橙色图标「保存视图」独立标记
2. 顶栏点击 **「材料审核」** → 进入 `/review`
3. 顶部 **评审助理备忘**：
   > 评审会前，先按「需补材料」清单催齐责任人；「可放行材料」可直接在会上引用通过依据。
4. **需补材料**（黄色边框，FileWarning 图标）3 条：每条有编号、标题、缺件原因、责任人
5. **可放行材料**（绿色边框，FileCheck 图标）3 条：每条有编号、标题、通过依据、确认人

---

## 🧱 技术栈速览

- **前端**：React 18 + TypeScript + Vite
- **3D**：three.js + @react-three/fiber + @react-three/drei + @react-three/postprocessing（Bloom/Vignette）
- **状态**：Zustand（playback / filter / annotation / view 4 个 Store）+ LocalStorage 持久化
- **样式**：Tailwind CSS 3（深矿蓝 `mine` / 索道橙 `cable` / 冷银灰 `silver` / 通行绿 `pass` / 补件黄 `fix` / 撤回灰 `revoke`）+ 玻璃拟态 + 扫描线背景
- **图标**：lucide-react
- **字体**：Space Grotesk（标题）+ JetBrains Mono（正文/数据）

---

## 📂 核心目录

```
src/
├── components/
│   ├── three/         # 3D 场景组件（Terrain/Station/Tower/Car/Cable/Scene...）
│   ├── layout/        # TopBar / FilterPanel / AnomalyQueue
│   ├── playback/      # Timeline 时间轴
│   ├── annotation/    # 批注抽屉 + 表单 + 列表（含混写检测）
│   ├── history/       # SnapshotGrid 视图快照 / HistoryTimeline 变更历史
│   └── review/        # MaterialNeedFix 需补材料 / MaterialPassed 可放行
├── pages/             # Workbench / HistoryCenter / MaterialReview
├── stores/            # 4 个 Zustand Store
├── hooks/             # useCameraSync / useMixedUnitDetection
├── utils/             # mockData / storage
└── shared/types.ts    # 核心业务类型
```
