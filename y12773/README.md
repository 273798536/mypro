# 农药残留批次追踪系统

配方工程师复核农药残留批次追踪的完整工具，支持**导入 → 复核 → 状态推进 → 报告导出**全流程，所有操作历史留痕，重启服务数据不丢失。

---

## 一、目录结构

```
y12773/
├── backend/                     # 后端服务（Node.js + Express + SQLite 文件数据库）
│   ├── package.json
│   ├── src/
│   │   ├── server.js            # 服务入口 + 所有 API
│   │   ├── db.js                # SQLite 数据库初始化和 schema
│   │   └── scripts/
│   │       └── initSampleData.js # 第一份样例数据脚本
│   └── data/                    # 运行后自动创建，存放 pesticide_trace.db（持久化）
└── frontend/                    # 前端界面（React 18 + Ant Design 5 + Vite）
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx              # 主框架 + 菜单
        ├── api.js               # 所有 API 封装
        ├── index.css
        └── pages/
            ├── Dashboard.jsx    # 【日常入口】安全提示首页 + 异常留痕
            ├── BatchList.jsx    # 试剂批次台账
            ├── TestList.jsx     # 【核心】农药残留追踪：复核 + 状态流转 + 历史 + 导出
            └── ImportPage.jsx   # 台账导入（Excel/CSV/手动，自动去重）
```

---

## 二、环境要求

- **Node.js** ≥ 16（推荐 18+）
- **npm** 或 **yarn** 或 **pnpm** 任一
- 无需额外数据库（SQLite 为文件数据库，better-sqlite3 自动安装本地二进制）

---

## 三、从空目录跑起来的完整步骤

> 假设当前你在 y12773 根目录下。

### 第 1 步：安装后端依赖并初始化样例数据

```bash
cd backend
npm install
# 初始化第一份样例数据（3 个批次、6 条检测记录，其中含 1 条超标异常）
npm run init-db
```

### 第 2 步：安装前端依赖并构建

```bash
cd ../frontend
npm install
npm run build
```

### 第 3 步：启动后端（同时托管前端静态页面）

```bash
cd ../backend
npm start
```

看到以下输出即启动成功：

```
农药残留批次追踪系统已启动: http://localhost:3001
```

### 第 4 步：打开浏览器访问

打开 **http://localhost:3001**

> 如需前端开发模式（热更新）：在 frontend 目录执行 `npm run dev`，访问 http://localhost:5173，Vite 会自动把 /api 请求代理到 3001 端口。

---

## 四、第一份样例数据位置与说明

- **生成脚本**：[backend/src/scripts/initSampleData.js](file:///Users/mac/pro/solo/workspaces/y12773/backend/src/scripts/initSampleData.js)
- **数据库文件**（运行后生成）：`backend/data/pesticide_trace.db`
- **样例内容**：
  1. 批次 `20250512A01` / 甲醇 / 国药集团 → 3 项检测（有机磷、有机氯、氨基甲酸酯）全部**通过**
  2. 批次 `20250508B03` / 乙腈 / 默克 → 2 项检测，其中**「农残-拟除虫菊酯」检测值 0.015 > 限值 0.01 = 不通过**（用于验证异常留痕提醒）
  3. 批次 `20250428C02` / 正己烷 / Fisher → 1 项检测**通过**

---

## 五、功能验证清单（对应需求点）

| 需求 | 验证入口 | 说明 |
|------|----------|------|
| 历史 + 修正原因 | 「农药残留追踪」→ 某条记录「历史」按钮 | 每次复核都会写入 review_history，包括前后状态、数值变化、结论变化、修正原因、复核意见 |
| 导入 → 复核 → 状态推进 → 导出 | 左侧菜单四个页面 | 状态机：已导入 → 复核中 → 已确认 → 已报告；驳回可回退到复核中 |
| 重启服务保留痕迹 | 重启 backend 服务 | 数据存于 SQLite 文件 `backend/data/pesticide_trace.db`，WAL 模式，断电不丢 |
| 日常入口放安全提示 | 首页即「安全提示」 | 顶部 Alert + 异常留痕列表，月底/课前复查重点 |
| 同批次二次导入不打架 | 「台账导入」重复上传同一批次 | 数据库 UNIQUE(batch_no, reagent_name)，重复则 UPDATE 而非 INSERT；同检测项同样 UPDATE，不同检测项才补录追加 |
| 导出 vs 界面一致 | 「农药残留追踪」→ 导出CSV | 后端 /api/export 使用**同一张表同样的 CASE WHEN 状态映射**，页面显示和 CSV 字段一一对应：批次号、试剂名、状态、结论、修正原因等完全一致 |
| 重复导入/补录不乱 | 任意导入同一批次两次 | 数据库层唯一约束 + 应用层先查后更，保证「批次号+试剂名」只有 1 条，「批次+检测项」也只有 1 条 |

---

## 六、后端 API 列表（供排查或二次开发）

全部前缀 `/api`，端口 3001。

| 方法 | 路径 | 用途 |
|------|------|------|
| GET  | `/health` | 健康检查 |
| GET  | `/dashboard` | 首页统计 + 异常列表 |
| GET  | `/batches?keyword=` | 批次列表（带各状态检测项统计） |
| GET  | `/batches/:id` | 批次详情 + 全部检测项 |
| GET  | `/tests?status=&keyword=` | 检测记录列表（农药残留追踪主列表） |
| GET  | `/tests/:id/history` | 单条检测的完整复核历史 |
| POST | `/tests/:id/review` | 复核/状态推进/修正数据（body: to_status, reviewer, review_reason 必填；test_value, limit_value, conclusion, review_comment 可选） |
| POST | `/import` | 批量导入（body: { records, file_name, operator }），自动去重 UPDATE 或 INSERT |
| GET  | `/export?format=csv` | 导出报告（csv 或 json），内容与页面一致 |
| GET  | `/status-flow` | 状态机定义 |

---

## 七、常见操作

### 7.1 重置数据库（清掉所有数据，重新初始化样例）

```bash
cd backend
rm -rf data/
npm run init-db
npm start
```

### 7.2 只看后端 API 数据（不走前端）

```bash
curl http://localhost:3001/api/dashboard
curl http://localhost:3001/api/tests?status=ALL
```

### 7.3 模拟重复导入验证去重

在「台账导入」→「手动录入一条」，填：
- 批次号：`20250512A01`
- 试剂名称：`甲醇`
- 检测项目：`农残-有机磷`
- 检测值：`0.003`，限值：`0.01`

点击「加入预览」→「确认导入」，结果应为：
- 新增批次：**0**
- 更新记录：**1**（甲醇批次已存在，有机磷检测项也已存在 → 直接更新数值为 0.003，不产生新记录，结论仍为通过）

到「农药残留追踪」查看，同一条「甲醇-农残-有机磷」检测值变为 0.003，没有出现第二条。
