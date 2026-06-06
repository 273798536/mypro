# 平面机构运动演示 - 数据质量审查工具

## 项目概述

平面机构运动演示是为地图编辑和画布管理场景设计的数据质量审查工具，主要服务于教学评审场景。系统专注于数据导入后的异常检测、来源追踪和处理记录管理。

## 核心功能

| 功能模块 | 说明 |
|---------|------|
| 图层管理（日常入口） | 管理所有数据图层，查看画布状态概览，支持快速跳转到对应异常 |
| 异常记录筛选 | 导入后自动筛出异常，支持按状态、类型、来源、关键词多维度筛选 |
| 异常详情 | 查看完整来源信息（文件、导入人、时间）、处理历史时间线、添加处理意见 |
| 复核管理 | 轨迹记录、设备清单、比例尺错用同一轮复核，支持批量操作 |
| 颜色规则 | 统一状态颜色，界面与导出完全一致 |
| 数据一致性校验 | 检测状态不匹配、历史缺失、重复结论等问题 |
| 导入/导出 | 支持 JSON/CSV 导入导出，导出内容与界面摘要一致 |

## 颜色规则

| 状态 | 颜色 | 说明 |
|------|------|------|
| 正常/通过 | 🟢 绿色 #22c55e | 数据符合规范 |
| 待确认 | 🟡 黄色 #eab308 | 需要人工确认 |
| 异常/驳回 | 🔴 红色 #ef4444 | 存在明显错误 |
| 离线缺失 | 🟠 橙色 #f97316 | 依赖素材不可用 |
| 处理中 | 🔵 蓝色 #3b82f6 | 正在处理中 |

## 技术栈

**前端**：React 18 + TypeScript + Vite + Tailwind CSS + Zustand + React Router + Lucide Icons + Axios

**后端**：Express 4 + TypeScript + better-sqlite3（嵌入式 SQLite） + CORS

## 快速开始

### 1. 安装依赖

```bash
# 方式一：一键安装所有依赖（推荐）
cd /Users/mac/pro/solo/workspaces/y12643
npm run install:all

# 方式二：分步安装
cd /Users/mac/pro/solo/workspaces/y12643
npm install

cd server
npm install

cd ../client
npm install
```

### 2. 启动开发服务

```bash
# 方式一：前后端同时启动（推荐）
cd /Users/mac/pro/solo/workspaces/y12643
npm run dev

# 方式二：分别启动
# 终端1 - 启动后端（端口 3001）
cd server
npm run dev

# 终端2 - 启动前端（端口 5173）
cd client
npm run dev
```

### 3. 访问应用

启动成功后，浏览器访问：

- **前端页面**：http://localhost:5173
- **后端 API**：http://localhost:3001
- **健康检查**：http://localhost:3001/api/health

## 第一份样例数据

应用启动时会自动初始化数据库并载入 Mock 样例数据，位于 `server/data/app.db`。

### 预置样例

| 图层 | 类型 | 异常记录 |
|------|------|---------|
| 机构运动轨迹 | 轨迹记录 | 重复导入、轨迹时间异常、轨迹速度异常 |
| 设备清单 | 设备清单 | 离线素材缺失、设备清单重复ID、设备ID缺失 |
| 比例尺标注 | 比例尺错用 | 比例尺错用、比例尺单位错误、坐标系不匹配 |
| 离线素材库 | 设备清单 | 纹理素材缺失、设备图标缺失 |

共计 **10 条异常记录 + 4 条处理记录**，覆盖所有异常类型和状态。

## 项目结构

```
y12643/
├── package.json                 # 根目录配置（一键启动脚本）
├── server/                      # 后端服务
│   ├── src/
│   │   ├── index.ts             # Express 入口
│   │   ├── database.ts          # SQLite 数据库初始化
│   │   ├── seedData.ts          # Mock 样例数据
│   │   ├── routes.ts            # API 路由
│   │   ├── types/               # 类型定义
│   │   └── utils/               # 工具函数
│   │       ├── anomalyDetection.ts    # 异常检测算法
│   │       ├── colorRules.ts          # 颜色规则
│   │       ├── dataConsistency.ts     # 数据一致性校验
│   │       ├── duplicateCheck.ts      # 重复导入检测
│   │       └── exportGenerator.ts     # 导出生成器
│   └── data/                   # SQLite 数据库文件（自动创建）
└── client/                      # 前端应用
    ├── src/
    │   ├── App.tsx              # 路由配置
    │   ├── main.tsx             # React 入口
    │   ├── index.css            # 全局样式（Tailwind）
    │   ├── components/          # 组件
    │   │   ├── Layout.tsx       # 布局（头部+侧边栏）
    │   │   └── common/          # 公共组件
    │   ├── pages/               # 页面
    │   │   ├── LayerManagement.tsx    # 图层管理（首页/日常入口）
    │   │   ├── ExceptionList.tsx      # 异常记录列表
    │   │   ├── ExceptionDetail.tsx    # 异常详情
    │   │   └── ReviewManagement.tsx   # 复核管理
    │   ├── services/api.ts      # API 服务封装
    │   ├── store/useAppStore.ts # Zustand 状态管理
    │   ├── types/               # 类型定义
    │   └── utils/               # 工具函数
```

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/layers` | 获取图层列表（含统计） |
| GET | `/api/exceptions` | 获取异常列表（支持筛选） |
| GET | `/api/exceptions/:id` | 获取异常详情 |
| POST | `/api/exceptions` | 导入异常记录（自动异常检测+去重） |
| PUT | `/api/exceptions/:id` | 更新异常状态/数据 |
| GET | `/api/exceptions/:id/records` | 获取处理历史 |
| POST | `/api/exceptions/:id/records` | 添加处理记录 |
| GET | `/api/review` | 获取复核列表（轨迹+设备+比例尺同轮） |
| POST | `/api/review/batch` | 批量复核 |
| GET | `/api/review/export` | 导出复核报告（CSV/JSON） |
| GET | `/api/canvas/overview` | 画布状态概览 |
| GET | `/api/consistency-check` | 数据一致性检查 |

## 验收场景说明

### 场景一：比例尺错用筛选
> 打开「异常记录」→ 筛选栏选择「异常/驳回」或「比例尺错用」→ 列表中可看到比例尺相关异常

### 场景二：离线素材缺失倒查
> 打开「异常记录」→ 筛选「离线素材缺失」→ 点击详情 → 右侧「来源追溯」区可查看原始文件、导入人、时间 → 「处理意见」区可查看完整处理历史

### 场景三：导出内容与界面一致
> 打开「复核管理」→ 点击「导出报告」→ 弹窗中可预览导出摘要（与界面显示的状态分布完全一致）→ 确认导出后文件内容与页面状态对应

### 场景四：同轮复核
> 打开「复核管理」→ 页面上方三个卡片分别显示「轨迹记录」「设备清单」「比例尺标注」统计 → 表格中三类数据混排，可多选后批量复核

### 场景五：重复导入检测
> 侧边栏「导入数据」→ 选择包含相同 originalId 的 JSON 文件 → 导入结果会显示检测到的重复数量，重复数据不会被二次入库

## 生产构建

```bash
# 构建前端
cd client
npm run build

# 启动生产后端
cd server
npm run build && npm start
```

## 常用命令

```bash
npm run dev          # 同时启动前后端开发服务
npm run dev:server   # 仅启动后端
npm run dev:client   # 仅启动前端
npm run install:all  # 一键安装所有依赖
npm run build        # 构建前端
npm start            # 启动生产后端
```
