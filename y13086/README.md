# 博物馆展柜灯光时序回放系统

面向博物馆巡检与教学场景的前后端分离系统。核心能力：时序列表浏览、照片详情查看、教学老师改判、历史追溯、Markdown 报告生成与下载。所有操作真实写入 SQLite 数据库，服务重启数据不丢失。

## 功能特性

- **时序列表**：支持三种视角切换（异常优先 / 时间顺序 / 按展柜分组），多维筛选（楼层、异常类型、状态、日期范围）
- **照片详情**：保留原始文件名、拍摄设备、EXIF 参数，标注区与侧边明细数据一致
- **教学老师改判**：仅 `teacher` 角色可见"重审判断"按钮，改判自动写入历史记录
- **历史追溯**：完整时间线展示操作人、角色、时间戳、原值→新值、改判理由
- **Markdown 报告**：按筛选条件生成报告，支持下载 `.md` 文件，报告结果持久化到数据库
- **脏数据标记**：楼层单位混写等异常数据使用紫色边框标记，判定为"已处理（含异常）"不伪装为正常通过

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Vite + React Router 7 |
| 状态管理 | Zustand |
| 样式 | TailwindCSS 3 |
| 图标 | Lucide React |
| 后端 | Express 4 + TypeScript |
| 数据库 | better-sqlite3（SQLite 单文件） |
| 构建工具 | tsx（后端运行） + tsc（类型检查） |

## 目录结构

```
y13086/
├── api/                      # 后端 Express 服务
│   ├── app.ts               # 应用入口，注册中间件与路由
│   ├── server.ts            # 服务器启动（端口 3001）
│   ├── db.ts                # SQLite 初始化 + 种子数据
│   └── routes/
│       ├── records.ts       # 记录 API：列表/详情/改判/标注/历史
│       ├── annotations.ts   # 标注 CRUD
│       ├── history.ts       # 历史记录查询
│       └── reports.ts       # 报告生成与查询（持久化到 reports 表）
├── src/                     # 前端 React 应用
│   ├── App.tsx              # 路由配置
│   ├── types/index.ts       # TypeScript 类型定义
│   ├── store/useStore.ts    # Zustand 全局状态
│   ├── utils/api.ts         # API 请求封装
│   ├── components/          # 复用组件（Layout / Badge / Modal 等）
│   └── pages/
│       ├── RecordList.tsx   # 时序列表页
│       ├── RecordDetail.tsx # 时序详情页
│       ├── RecordHistory.tsx# 历史追踪页
│       └── Reports.tsx      # Markdown 报告页
├── data/                    # SQLite 数据目录（自动创建）
│   └── museum.db            # 单文件数据库
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vite.config.ts           # Vite 配置，代理 /api → http://localhost:3001
```

## 快速开始

### 环境要求

- Node.js ≥ 18
- npm ≥ 9

### 1. 安装依赖

```bash
npm install
```

better-sqlite3 为原生模块，安装时会自动编译，需要系统具备 C++ 编译工具链（macOS 自带 Xcode CLT 即可）。

### 2. 启动开发模式（推荐）

同时启动前端（Vite，端口 5173）与后端（Express，端口 3001）：

```bash
npm run dev
```

Vite 会自动将 `/api/*` 请求代理到 `http://localhost:3001`。

打开浏览器访问：http://localhost:5173/

### 3. 分别启动

仅启动后端：
```bash
npm run server:dev
```
后端地址：http://localhost:3001/

仅启动前端：
```bash
npm run client:dev
```
前端地址：http://localhost:5173/

### 4. 类型检查与构建

```bash
# TypeScript 类型检查（零错误通过才可以上线）
npm run check

# 构建前端静态文件
npm run build

# ESLint 检查
npm run lint
```

## 数据库说明

首次启动时 [api/db.ts](file:///Users/mac/pro/solo/workspaces/y13086/api/db.ts) 会自动：

1. 创建 `data/museum.db` 单文件数据库
2. 创建 5 张表：`records` / `photos` / `annotations` / `history_entries` / `reports`
3. 插入 15 条种子数据（涵盖 2 条脏数据、5 条历史记录、若干标注）

如需要重置数据，删除 `data/museum.db` 后重启后端即可重新生成。

### 核心表结构

| 表名 | 用途 |
|------|------|
| records | 展柜巡检记录（灯光参数、异常类型、判定结果、脏数据标记） |
| photos | 巡检照片元数据（原始文件名、设备、EXIF、拍摄时间） |
| annotations | 照片标注（箭头、矩形、圆形，含坐标与内容） |
| history_entries | 改判历史（原值→新值、操作人、理由、时间戳） |
| reports | **报告持久化**：每次生成的 Markdown 内容与配置快照写入此表 |

## API 端点

所有端点前缀：`/api`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/records` | 记录列表，支持 query：floor / anomalyType / status / startDate / endDate |
| GET | `/records/:id` | 记录详情（嵌套 record + photos + annotations + history） |
| PUT | `/records/:id/judgment` | 改判请求体：{ judgment, reason, operatorName, operatorRole } |
| POST | `/records/:id/annotations` | 添加标注 |
| DELETE | `/annotations/:id` | 删除标注 |
| GET | `/records/:id/history` | 单条记录改判历史 |
| **POST** | **`/reports/generate`** | **生成报告，请求体：{ dateFrom, dateTo, floor, anomalyType, includePhotos, includeHistory }** |
| GET | `/reports/:id` | 查询单份历史报告 |
| GET | `/reports` | 历史报告列表（最近 50 条） |

> **关键点**：报告生成后写入 `reports` 表，服务重启不丢失；日期筛选参数使用 `dateFrom` / `dateTo`（与前端页面选择器一致）。

## 用户角色

顶部导航栏可切换，影响按钮可见性：

| 角色 | 权限 |
|------|------|
| 巡检人员 (inspector) | 浏览列表 / 详情 / 历史 / 报告 |
| 教学老师 (teacher) | 全部权限 + 改判按钮可见 |
| 交接班 (handover) | 浏览列表 / 历史 / 报告，重点追溯 |

## 脏数据约定

种子数据中的 E-501、E-502 为脏数据样例：

- 字段 `hasDirtyData = 1`
- 判定 `judgment = "已处理（含异常）"`
- `dirtyDataNote` 记录具体规范问题
- 页面视觉：紫色边框 + 紫色"含异常数据"徽章
- 报告：脏数据进入「⚠️ 脏数据标记」专区
