# 食品添加剂残留核验

面向食品配方工程师与食品专业学生的食品添加剂残留核验工作台。

## 快速开始（从空目录试一遍）

### 1. 环境要求

- Node.js ≥ 18
- 包管理器：npm（或 pnpm）

### 2. 安装依赖

在项目根目录执行：

```bash
npm install
```

### 3. 启动开发服务器

```bash
npm run dev
```

启动后终端会提示本地访问地址（默认 `http://localhost:5173`），浏览器打开即可。

### 4. 构建生产版本

```bash
npm run build
npm run preview
```

### 5. 第一份样例数据在哪里？

应用打开后会自动加载第一份样例数据（批次 `B20260608-样例`），也可以随时点击顶栏的 **"加载样例"** 按钮重新载入。

样例数据的源码位置：
- 添加剂残留 + 原始行号/图谱/备注：[mockData.ts](src/data/mockData.ts) 中的 `MOCK_SOURCE_ROWS`
- 温度曲线版本：[mockData.ts](src/data/mockData.ts) 中的 `MOCK_TEMPERATURE_PROFILES`
- 历史核验记录：[mockData.ts](src/data/mockData.ts) 中的 `MOCK_HISTORY`

## 功能一览

| 模块 | 说明 |
|------|------|
| 核验工作台（首页 `/`） | 左侧数据源、中间计算工具、右侧结果摘要三栏布局 |
| 计算工具 | 公式 / 单位 / 适用范围 / 失败原因 四要素卡片，mg/kg ↔ ppm ↔ μg/mL ↔ g/kg 实时换算 |
| 安全提示 | 超阈值高亮 + 国标条款引用，核心稳定模块 |
| 复测建议 | 自动生成样品数、复测方法、优先级，核心稳定模块 |
| 工程师复盘（`/review`） | 温度曲线版本时间线、历史记录表格、溯源信息链（原始行号/图片名/来源备注） |
| 学生结果（`/result`） | 绿色"直接可用"、橙色"需工程师复核"、红色"不合格"三级标识 |
| 报告导出 | 导出前校验界面摘要与导出内容完全一致，支持 PDF 与 JSON（含完整溯源链） |

## 项目结构

```
src/
├── pages/                 # 三个路由页面
├── components/
│   ├── common/            # 角色切换、安全提示、复测建议、导出按钮
│   ├── formula/           # 公式卡片（公式/单位/适用范围/失败原因）
│   ├── workbench/         # 工作台三栏组件
│   ├── review/            # 工程师复盘：曲线时间线、历史表、溯源链
│   └── result/            # 学生结果：分级卡片
├── store/                 # zustand 全局状态
├── utils/                 # 浓度换算、安全判定、复测建议、导出、一致性校验
├── types/                 # TypeScript 类型定义
└── data/mockData.ts       # 第一份样例数据
```

## 常用命令

```bash
npm run dev       # 启动开发服务器
npm run build     # 生产构建
npm run check     # TypeScript 类型检查
npm run lint      # ESLint 代码检查
npm run preview   # 本地预览生产构建产物
```
