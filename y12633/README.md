# 城市雨水口巡检图

赛事运营专用的雨水口巡检标注工具：草稿整理、过程回溯、结果导出一站完成。

## 快速开始

### 1. 环境要求

- Node.js >= 18
- npm（或 pnpm / yarn）

### 2. 安装依赖

在项目根目录（当前 README 所在目录）执行：

```bash
npm install
```

### 3. 启动开发服务器

```bash
npm run dev
```

启动后终端会显示本地访问地址，通常是 `http://localhost:5173`，在浏览器打开即可。

### 4. 其他命令

```bash
npm run build      # 生产构建
npm run preview    # 预览构建产物
npm run lint       # 代码检查
npm run check      # TypeScript 类型检查
```

## 首次使用 · 示例数据位置

首次打开工具会自动加载一份示例巡检任务，无需先造表：

- 示例数据文件：[sampleData.ts](file:///Users/mac/pro/solo/workspaces/y12633/src/data/sampleData.ts)
- 包含 8 个预置雨水口点位（含已通过 / 需整改 / 待巡检 三种状态）
- 首页点击「加载示例数据」可随时恢复到初始样例

如果想从完全空白开始，点击首页的「新建巡检」。

## 赛事运营必走的三步流程

按使用习惯，每次巡检至少要覆盖以下三件事，结算页就会完整：

### ① 触发一次边界失败

在关卡页（地图）直接点击最边缘的位置（5% 区域外），或点击下方的「触发边界失败演示」按钮。
事件会被记录并在结算页显示讲解备注。

### ② 执行一次撤销或重开

- 撤销：地图顶部的「撤销」按钮（或 Ctrl+Z），至少撤销一步操作
- 重开：顶部「重开关卡」按钮，从零开始
- 撤销重做区域也是日常进入编辑的入口

### ③ 进入结算页查看

点击关卡页顶部的「结算」按钮，即可看到：
- 完整的巡检摘要（与导出文件 100% 一致）
- 边界失败事件和讲解备注
- 撤销/重开历史记录
- 命中检测说明
- 雨水口明细表
- PDF / Excel / JSON 三种格式导出

## 导出与导入

### 导出

在结算页底部点击对应格式：

- **PDF**：适合打印和正式归档
- **Excel**：摘要 + 明细两个 Sheet，方便二次编辑
- **JSON**：可重新导入工具继续补录

导出内容与界面摘要共用同一份 `buildExportReport` 数据源，不会出现页面和文件结论矛盾。

### 导入

首页点击「导入草稿」，选择之前导出的 JSON 文件。
导入时会自动按点位 ID + 坐标去重合并，已有的最新数据不会被旧数据覆盖，不会出现同一件事两份结论。

## 核心文件索引

| 作用 | 文件位置 |
| --- | --- |
| 首页（入口） | [Home.tsx](file:///Users/mac/pro/solo/workspaces/y12633/src/pages/Home.tsx) |
| 关卡页（地图标注） | [LevelPage.tsx](file:///Users/mac/pro/solo/workspaces/y12633/src/pages/LevelPage.tsx) |
| 结算页（摘要 + 导出） | [SettlementPage.tsx](file:///Users/mac/pro/solo/workspaces/y12633/src/pages/SettlementPage.tsx) |
| 全局状态（含撤销重做栈） | [inspectionStore.ts](file:///Users/mac/pro/solo/workspaces/y12633/src/store/inspectionStore.ts) |
| 示例数据 | [sampleData.ts](file:///Users/mac/pro/solo/workspaces/y12633/src/data/sampleData.ts) |
| 导出工具（PDF/Excel/JSON） | [exportUtils.ts](file:///Users/mac/pro/solo/workspaces/y12633/src/utils/exportUtils.ts) |
| 辅助函数（去重、报表构建） | [helpers.ts](file:///Users/mac/pro/solo/workspaces/y12633/src/utils/helpers.ts) |
| 类型定义 | [index.ts](file:///Users/mac/pro/solo/workspaces/y12633/src/types/index.ts) |
