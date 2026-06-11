# 版税追踪系统

一个面向版权方的音乐版税数据管理与分析系统，支持数据导入、异常检测、修正申诉、版税结算与追溯报告导出。

## 功能特性

- **版税总览**：多维度展示版税收入、平台分布、周期对比与异常概览
- **作品管理**：作品列表与详情，包含使用记录、分成比例版本、修正记录、申诉记录
- **数据导入**：上传 CSV/Excel 版税使用数据，自动比对并标记异常
- **修正与申诉**：异常数据修正 + 申诉流程流转（待处理 → 平台已回复 → 已确认）
- **报告导出**：一键生成版税结算 / 异常分析 / 版税追溯 三种 Excel 报告

## 技术栈

- **前端**：React 19 + TypeScript + Vite + Tailwind CSS + Zustand
- **后端**：Express + TypeScript + SQLite（better-sqlite3）
- **报告**：SheetJS (xlsx)

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 安装依赖

```bash
npm install
```

### 启动开发环境

```bash
npm run dev
```

启动后访问：
- 前端页面：http://localhost:5180
- 后端 API：http://localhost:3010

前端通过 Vite 代理 `/api` 前缀的请求到后端，无需额外配置。

### 可用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 同时启动前端开发服务器 + 后端开发服务器（推荐） |
| `npm run client:dev` | 仅启动前端（Vite） |
| `npm run server:dev` | 仅启动后端（nodemon + tsx，监听 api/ 目录变化自动重启） |
| `npm run build` | 构建前端生产产物 |
| `npm run preview` | 预览前端构建产物 |
| `npm run check` | TypeScript 类型检查 |
| `npm run lint` | ESLint 代码检查 |

## 项目结构

```
.
├── api/                      # 后端代码
│   ├── routes/               # API 路由
│   │   ├── works.ts          # 作品相关接口
│   │   ├── corrections.ts    # 修正记录接口
│   │   ├── appeals.ts        # 申诉记录接口
│   │   ├── import.ts         # 数据导入接口
│   │   ├── reports.ts        # 报告生成与下载接口
│   │   └── overview.ts       # 总览数据接口
│   ├── data/                 # 本地数据目录
│   │   ├── royalty.db        # SQLite 数据库（首次启动自动创建）
│   │   ├── reports/          # 生成的报告文件
│   │   └── uploads/          # 上传的临时文件
│   ├── database.ts           # 数据库连接 + 迁移 + seed
│   ├── app.ts                # Express app 配置
│   ├── server.ts             # 开发入口（直接监听端口）
│   └── index.ts              # Vercel serverless 入口
├── src/                      # 前端代码
│   ├── pages/                # 页面组件
│   ├── store.ts              # Zustand 全局状态
│   ├── lib/                  # 工具函数
│   └── App.tsx               # 应用入口
└── vite.config.ts            # Vite 配置（含 /api 代理）
```

## 核心数据链路

```
数据导入 → 异常检测 → 修正记录 → 申诉记录 → 报告导出
    ↓           ↓          ↓          ↓          ↓
 import.ts  works.ts  corrections  appeals   reports.ts
```

所有数据围绕同一份 SQLite 数据库闭环，修正与申诉都会关联到具体作品。

## 重置数据

如需重置为初始示例数据，删除数据库文件后重启后端即可：

```bash
rm -f api/data/royalty.db
# 然后重启 npm run dev
```
