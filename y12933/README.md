# 奖励模型偏差复核

> 平台工程师日常整理标注记录的工作台，出问题时能回看人工反馈。
> 日常入口在「评测回放」，月底 / 课前到「版本追踪」看偏差能否被解释。

## 环境要求

- Node.js **≥ 18**（推荐 20 LTS）
- npm 或 pnpm
- macOS / Linux（better-sqlite3 需要本地编译，Windows 请用 WSL）

## 从零开始

把项目放到一个空目录里（示例用 `/tmp/bias-review-demo`），按下面顺序执行即可：

```bash
# 1. 进入项目目录
cd /path/to/this/project

# 2. 安装依赖（better-sqlite3 会自动编译原生模块）
npm install

# 3. 类型检查
npm run check

# 4. 启动开发服务（前端 Vite + 后端 Express 同时拉起）
npm run dev
```

启动后：

| 服务 | 地址 |
|---|---|
| 前端界面 | http://localhost:5173 |
| 后端 API | http://localhost:3001 |

> 首次启动后端会自动把 `samples/annotations.csv`（12 条）以 `sample` 版本导入，页面打开即可看到示例数据，无需手工建表。

## 常用命令

| 命令 | 作用 |
|---|---|
| `npm run dev` | 一键开发：Vite (5173) + Express (3001) |
| `npm run check` | 全量 TS 类型检查（无 emit） |
| `npm run build` | 生产构建 → `dist/` |
| `npm run server:dev` | 仅启动后端（带 nodemon 热重载） |
| `npm run client:dev` | 仅启动前端 |
| `npx tsx scripts/smoke.ts` | 后端冒烟测试（需后端在 3001 端口运行） |

## 第一份样例位置

```
samples/annotations.csv   ← 首次启动自动导入的 12 条示例
```

文件示例：

```csv
record_id,model_version,prompt,response_a,response_b,human_label,rm_prediction,annotator
rec-001,v1.2,"用一句话解释递归","函数调用自身。","递归是一种函数通过调用自身处理更小子问题的技术。",a,b,alice
rec-002,v1.2,"什么是闭包","能访问外层变量的函数。","闭包指函数与其词法环境的组合，可捕获外层作用域变量。",a,b,alice
```

> 示例故意构造「长度偏好」场景：RM 预测 B（更长）、人工标注 A（更简洁），方便在「评测回放」观察**分歧高亮**。

## 日常工作流（评测回放）

1. 打开 http://localhost:5173/replay
2. 右上角「导入 / 补录」：选择 CSV 文件或粘贴内容，填写版本标签（留空则用时间戳）
3. 用顶部筛选栏按「版本 / 模型版本 / 结论 / 偏差类型 / 关键字」缩范围
4. 点击任一行 → 弹窗给出**唯一结论**（通过 / 待确认 / 驳回），可记偏差类型、严重度、人工反馈
5. 结论分布面板右上角「导出 CSV」：与页面摘要**共用同一条后端查询**，不会出现「页面通过 / 文件待确认」
6. 侧边栏底部填复核人姓名，会随结论写入 `conclusions.reviewer`，便于回看问责

## 月底 / 课前（版本追踪）

1. 打开 http://localhost:5173/versions
2. 上方卡片查看每个版本的通过 / 待确认 / 驳回 / 待复核分布
3. 「跨版本对比」选两个版本（默认最新与次新）：
   - `in_both` 条目的结论变化 = 偏差是否被修复
   - `仅 A / 仅 B` = 哪些记录是该版本独有
4. 解释不清的条目 → 切回评测回放搜 record_id 看详细人工反馈

## CSV 导入格式（必填列加粗）

| 列 | 必填 | 说明 |
|---|---|---|
| **record_id** | 是 | 自然主键，重导入即更新，**不会产生重复记录** |
| **model_version** | 是 | e.g. `v1.2`, `rm-v2` |
| **prompt** | 是 | 用户问题 |
| **response_a** | 是 | 候选回答 A |
| **response_b** | 是 | 候选回答 B |
| **human_label** | 是 | `a` / `b` / `tie` |
| rm_prediction | 否 | 奖励模型预测：`a` / `b` / `tie` |
| annotator | 否 | 标注者姓名 |

- 编码：UTF-8（导出会带 BOM，Excel 直接可读）
- 支持双引号包裹含逗号的字段

## 核心约束保证

| 诉求 | 实现 |
|---|---|
| 重导入不产生重复记录 | `INSERT ... ON CONFLICT(record_id) DO UPDATE` + `record_versions` 多对多 `ON CONFLICT DO NOTHING` |
| 同一件事只有一份结论 | `conclusions.record_id` 为 PRIMARY KEY，`INSERT ... ON CONFLICT DO UPDATE`（即 upsert，永远不重复） |
| 导出与界面摘要一致 | `/api/summary` 与 `/api/export` **共享** `repository.ts` 中同一条 `reviewBaseQuery`，保证同源 |
| 首次启动即有示例数据 | `server.ts` 启动时调用 `seedIfEmpty()`：`records` 表空则自动导入 `samples/annotations.csv` |

## 数据存储

| 路径 | 内容 |
|---|---|
| `data/app.db` | SQLite 主库（WAL 模式开启，见 `data/app.db-wal` / `-shm`） |
| `samples/annotations.csv` | 首次播种的 12 条示例 |
| `migrations/0001_init.sql` | 初始化 DDL |

**想从零开始重新体验？** 只需删除 `data/` 目录后重启后端：

```bash
rm -rf data/
npm run server:dev    # 或 npm run dev
# 看到 [seed] 首次启动已自动导入示例数据：12 条（版本 sample）即恢复
```

## 冒烟测试覆盖（18 项）

`npx tsx scripts/smoke.ts` 会验证：

1. 初始摘要 total=12，pending=12
2. 重导入同一份 CSV：imported=0 / updated=12 / total=12（幂等）
3. 重导入后摘要仍为 12 待复核（无重复行）
4. 记录数量仍为 12
5. rec-001 存「通过」：pass=1 / reviewed=1
6. rec-001 再存「待确认」：upsert 更新而非新增，reviewed 仍=1（单结论）
7. 导出 CSV 中 rec-001 = 待确认（与摘要同源）
8. 版本列表含 sample 与重导入版本
9. 两版本对比 in_both = 12

## 目录结构速览

```
├── api/                  # Express 后端 (ESM + TypeScript)
│   ├── app.ts            # Express 装配
│   ├── server.ts         # 入口 + 启动播种
│   ├── db.ts             # SQLite 初始化 + 迁移执行
│   ├── repository.ts     # SQL 层（reviewBaseQuery 保证同源）
│   ├── routes/review.ts  # REST API
│   └── services/reviewService.ts   # CSV 解析 / 导入 / 播种 / 导出
├── migrations/0001_init.sql        # Schema DDL
├── samples/annotations.csv         # 12 条示例数据
├── scripts/smoke.ts                # 18 项后端冒烟测试
├── shared/types.ts                 # 前后端共享类型
├── src/                  # React 前端 (Vite + TS)
│   ├── pages/            # 概览 / 评测回放 / 版本追踪
│   ├── components/       # 复核表 / 摘要栏 / 结论编辑器 / 导入对话框 ...
│   ├── api/client.ts     # 前端 API 调用封装
│   ├── hooks/useFetch.ts # 通用数据拉取
│   ├── store/useUi.ts    # zustand：复核人 + Toast（带持久化）
│   └── index.css         # 观测台暗色主题 + panel/chip/btn 组件类
├── tailwind.config.js    # ink / signal / pass / warn / reject 色板
└── package.json
```
