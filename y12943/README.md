# 知识库切片质量检查工具

面向安全审核员与模型评审会的切片质检与溯源平台。从知识库切分产物中拎出"脏样本重复""安全规则漏配"等坏记录，提供分布统计、样本去重、模型日志溯源与一致导出，确保同一批材料只产生一份结论。

## 功能概览

- **分布统计（日常入口）**：质检总览、坏记录分类、去重可解释性
- **切片质检**：坏记录优先拎取，正常/边界/明显坏三类样例确认工具真跑
- **复核轮次**：评测题库 + 切分清单 + 脏样本重复同轮复核，结论归一
- **日志溯源**：从安全规则漏配记录沿模型日志线倒查全链路
- **导入导出**：重复导入归并、导出与界面摘要对账一致

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务

```bash
npm run dev
```

同时启动：
- 前端：http://localhost:5173
- 后端：http://localhost:3001

（Vite 若检测到 5173 被占用，会自动使用下一个端口，以终端输出为准。）

### 3. 首份样例

项目首次启动时会自动初始化 SQLite 数据库并预置种子数据。

- **样例文件位置**：`data/imports/课前材料_2026Q2.jsonl`
- **导入批次**：`IMP-2406A` · 课前知识库·第1批
- **预置切片**：7 条（含脏样本重复 SLC-1003/1004、安全规则漏配 SLC-1005）
- **数据库文件**：`data/app.db`（首次启动自动创建）

### 4. 从空目录验证

按以下顺序操作，可完整走通"空目录 → 安装 → 启动 → 查看样例"的主路径：

```bash
# 1. 安装
npm install

# 2. 启动
npm run dev

# 3. 浏览器打开首页（分布统计，日常入口）
#    http://localhost:5173/

# 4. 查看首份样例
#    文件路径：data/imports/课前材料_2026Q2.jsonl
#    对应批次：IMP-2406A
```

## 技术栈

- 前端：React 18 + Vite + TailwindCSS + react-router-dom
- 后端：Express 4 + TypeScript（ESM）
- 数据库：SQLite（better-sqlite3）
- 图标：lucide-react

## 脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 同时启动前端（Vite）和后端（nodemon + tsx） |
| `npm run client:dev` | 仅启动前端 |
| `npm run server:dev` | 仅启动后端 |
| `npm run build` | 构建生产版本 |
| `npm run check` | TypeScript 类型检查 |
| `npm run lint` | ESLint 代码检查 |

## 目录结构

```
.
├── api/                  # 后端代码
│   ├── routes/           # 路由（stats / quality / reviews / trace / io）
│   ├── app.ts            # Express 应用
│   ├── db.ts             # 数据库初始化 + 种子数据
│   └── store.ts          # 数据访问层
├── data/
│   ├── app.db            # SQLite 数据库（自动创建）
│   └── imports/
│       └── 课前材料_2026Q2.jsonl  # 首份样例文件
├── shared/
│   └── types.ts          # 前后端共享类型
├── src/                  # 前端代码
│   ├── pages/            # 页面组件
│   ├── components/       # 通用组件
│   └── lib/              # 工具函数 & API 封装
└── package.json
```
