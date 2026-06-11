# 企业年金缴费异常回放

面向产品财务岗处理碎片化年金缴费异常审批材料的回放系统。

## 启动方式

### 方式一：自动 PATH 脚本（推荐）
```bash
./run.sh install      # 自动探测 Node.js 并安装依赖（postinstall 自动 rebuild 原生模块）
./run.sh check        # TypeScript 类型检查
./run.sh lint         # ESLint 代码检查
./run.sh dev          # 启动前后端（Vite 5173 + Express 3001）
```

### 方式二：分开启动（适合调试）
```bash
# 终端 1：后端 API（端口 3001）—— 先 tsc 编译 api 再用 node --watch 跑 dist（无 IPC，适配受限环境）
./run.sh server:dev

# 终端 2：前端 Vite（端口 5173）
./run.sh client:dev
```

启动后访问 http://localhost:5173 ，后端 API 运行在 http://localhost:3001 。

## 三步操作

1. **看列表** — 首页按状态筛选待处理记录，批次号或企业名搜索定位。跑批次数 >1 的记录用琥珀金色标出。
2. **查详情** — 点击"查看详情"进入审批邮件时间线，左侧红色脉冲圆点即为异常材料节点。点开邮件卡片核对审批人改名等问题，右侧对照关联的正常缴费记录。
3. **定结论** — 确认后点"改判"选择新结论并填写理由，或点"人工确认"归档。所有变更自动写入历史，点"查看历史"可追溯每次操作的前后值。点"导出报告"生成 Markdown 文件真实落库。

## 坏材料来了看哪里

| 现象 | 排查位置 | 处理方式 |
|------|----------|----------|
| 审批人姓名前后不一致（如加了头衔） | 详情页 → 审批邮件时间线 → 红色脉冲圆点的邮件卡片 | 卡片内会标注"审批人由『X』改名为『Y』"及系统异常备注，核实后在改判理由中说明 |
| 同一批次跑了多次 | 列表页 → 跑批次数列（琥珀金色 Repeat 图标） | 详情页 → 手工备注区追加说明，对比多次跑批的审批邮件与缴费明细是否一致，一致则改判为正常 |
| 备注越攒越多不敢删 | 详情页 → 手工备注区 | 历史记录只追加不删除。每条备注自动带操作人与时间戳，复盘时在历史面板可核对是谁何时加的 |
| 导出报告与实际结论对不上 | 详情页 → "查看历史"抽屉中 generate_report 条目 | 报告每次生成都会写回后端并递增版本号，历史面板可查看哪次操作后生成了哪个版本的报告 |
| 换班前要跟主管复盘 | 详情页 → "查看历史"抽屉 | 按时间倒序列出每次创建/改判/加备注/确认/生成报告的操作，前后字段值用绿红 diff 对比 |

## 核心检查点（必须逐条通过）

| # | 命令 / 操作 | 作用 | 通过标准 |
|---|------------|------|----------|
| 1 | `./run.sh setup` | 验证 Node.js 环境 | 输出 `Node.js v20.x.x` |
| 2 | `./run.sh check` | TypeScript 类型检查 | 无任何输出即通过（tsc --noEmit 0 errors） |
| 3 | `./run.sh lint`  | ESLint 代码检查     | 无任何输出即通过（0 errors） |
| 4 | `./run.sh server:dev` | 后端 API 启动（tsc 编译 + node --watch） | 终端出现 `Server ready on port 3001`，端口 3001 LISTEN |
| 5 | `curl http://localhost:3001/api/health` | 健康检查 | 返回 `{"success":true,"message":"ok"}` |
| 6 | `curl http://localhost:3001/api/playbacks/playback-a-001` | 华东机械厂数据完整性 | `emails>=3`，**`normalRecords>=2`**（2026-03、2026-04 各 ¥400,000），`history>=2` |
| 7 | `curl http://localhost:3001/api/playbacks/playback-b-002` | 南海物流集团数据完整性 | `notes>=1`、`history>=5`、`conclusion=normal` |
| 8 | 浏览器打开 http://localhost:5173 | 前端列表页 | 显示 2 条预置数据（华东机械厂 / 南海物流集团），状态筛选 + 搜索框可用 |
| 9 | 列表页点"查看详情" → 华东机械厂 | 前端详情页 | URL 变 `/playback/playback-a-001`，"关联正常缴费记录"区块显示 2 条历史缴费 |
| 10 | 详情页"导出报告" | Markdown 报告落库 | 历史抽屉新增 `generate_report` 记录，浏览器触发 `.md` 下载 |

## 实际验证命令与结果（复现用）

```bash
# 0. 环境检查
./run.sh setup
# → Node.js v20.18.0

# 1. 静态检查（必须 0 errors）
./run.sh check && echo "✅ tsc OK"
./run.sh lint  && echo "✅ eslint OK"

# 2. 后端启动（推荐入口，无 tsx / 无 IPC pipe）
./run.sh server:dev &
sleep 5
lsof -i :3001          # → 看到 LISTEN
curl http://localhost:3001/api/health
# → {"success":true,"message":"ok"}

# 3. 数据完整性
curl -s "http://localhost:3001/api/playbacks/playback-a-001" | python3 -c "
import sys,json
d=json.load(sys.stdin)['data']
print('normalRecords:', len(d['normalRecords']))  # → 必须 >=2
for r in d['normalRecords']: print(r['paymentMonth'], r['amount'])
# → 2026-04 400000
# → 2026-03 400000
"

# 4. 前端启动 + 浏览器手动验证
./run.sh client:dev &
# 浏览器开 http://localhost:5173
```

## 常见阻断点排查

| 现象 | 根因 | 修复（已落地） |
|------|------|---------------|
| `npm run *` 报 command not found | PATH 中无 node/npm | 用 `./run.sh` 自动探测 Node.js（系统 PATH → 项目内 `node-v20.12.2-darwin-x64/bin` → `/Users/mac/.local/bin` → `/opt/homebrew/bin`） |
| ESLint 15 个 `@typescript-eslint/no-unused-vars` | 未使用参数未标记 | [eslint.config.js](file:///Users/mac/pro/solo/workspaces/y13041/eslint.config.js#L26-L33) 加 `_` 前缀豁免规则；代码中未使用参数均加 `_` 前缀；删除 PlaybackDetail 未使用解构 |
| **`tsx listen EPERM .../T/tsx-...pipe`** / nodemon 静默退出 | **受限环境沙箱禁止创建 IPC pipe 或写 `~/.config`** | **已彻底弃用 nodemon + tsx，改用 [tsconfig.api.json](file:///Users/mac/pro/solo/workspaces/y13041/tsconfig.api.json) 编译 + 原生 `node --watch` 跑 `api/dist/server.js`**，零 IPC、零额外进程。[package.json](file:///Users/mac/pro/solo/workspaces/y13041/package.json#L14-L15) `server:build` + `server:dev`。 |
| `dlopen better-sqlite3 ... incompatible architecture` / esbuild 架构错 | 原生模块（better-sqlite3 / esbuild）平台不匹配（x86_64 vs arm64） | [package.json](file:///Users/mac/pro/solo/workspaces/y13041/package.json#L8) postinstall 自动 `npm rebuild esbuild better-sqlite3` 兜底；也可手动 `npm rebuild better-sqlite3` |
| `Internal watch failed: EMFILE` | macOS 文件描述符耗尽 | `node --watch` 只监听 `api/dist/`（编译产物），源文件由 tsc 负责变更→重新编译触发重启，天然避免监听 SQLite DB |
| Vite 启动 EACCES 写 `node_modules/.vite-temp` | 只读质检环境无写权限 | [vite.config.ts](file:///Users/mac/pro/solo/workspaces/y13041/vite.config.ts#L1-L11) `cacheDir` 改 `/tmp/y13041-vite-cache`，支持 `VITE_CACHE_DIR=...` 覆盖 |
| **playback-a-001 详情页"关联正常缴费记录"为空** | **seed 初始数据漏写华东机械厂 normal record** | [api/db/seed.ts](file:///Users/mac/pro/solo/workspaces/y13041/api/db/seed.ts#L114-L130) 补 `normal-a-1`（2026-04 ¥400k）+ `normal-a-2`（2026-03 ¥400k）；现有 DB 已直插补数（见 [/tmp/fix-db.py](file:///tmp/fix-db.py)） |

## 预置测试数据

| ID | 企业 | 批次 | 状态 | 特点 |
|----|------|------|------|------|
| `playback-a-001` | **华东机械厂** | BJ20260601 | 待处理 | 审批人"王建国"改名为"王建国（高级经理）"异常；**2 条正常缴费记录（2026-03 / 2026-04）** |
| `playback-b-002` | **南海物流集团** | GZ20260602 | 已改判 | 重复跑批 2 次；1 条手工备注；5 条历史操作；结论已改为正常 |

## 剩余风险（无法彻底消除，已做缓解）

| 风险 | 影响 | 缓解 |
|------|------|------|
| **原生模块平台不匹配**（esbuild / better-sqlite3） | x86_64 的 node_modules 移到 arm64 Mac，tsx/esbuild 静默失败或 better-sqlite3 dlopen 报架构错误 | postinstall 自动 `npm rebuild esbuild better-sqlite3` 兜底；跨机器部署建议重新 `npm install` |
| **受限环境沙箱限制**（禁止 IPC pipe / 写用户目录） | nodemon 写 `~/.config/simple-update-notifier/...` 被拒绝、tsx 创建 `/T/tsx-...pipe` 报 EPERM | 已弃用 nodemon + tsx，改用 `tsc -p tsconfig.api.json` 编译 + 原生 `node --watch --watch-path=api/dist`，完全零 IPC 需求 |
| macOS 文件描述符限制 | 大规模文件监听导致 EMFILE | `node --watch` 只监听编译产物 `api/dist/`，天然排除 `api/data/*.db`、`node_modules` |
| 只读质检环境 Vite 缓存失败 | Vite 写 `node_modules/.vite-temp` 报 EACCES | [vite.config.ts](file:///Users/mac/pro/solo/workspaces/y13041/vite.config.ts#L1-L11) 改 `cacheDir` 到 `/tmp/y13041-vite-cache`，支持 `VITE_CACHE_DIR` 覆盖 |
| Node.js 版本过低（< 20.19） | eslint-visitor-keys 等报 EBADENGINE warn | 不阻断运行；推荐 Node.js 20.19+ 或 22.13+ |
| 端口占用（5173 / 3001） | 启动失败 | `lsof -i :5173 -i :3001 -t | xargs kill -9` |
| SQLite 文件锁 | 多进程并发写 `api/data/playback.db` 可能失败 | 单进程写入 + 事务保护；高并发生产建议换 PostgreSQL |
| **重新 seed 会漏数** | 删除 `playback.db` 后系统自动重跑 seed.ts，若 seed 未合入主分支则 playback-a-001 又缺 normalRecords | 已确保 [api/db/seed.ts](file:///Users/mac/pro/solo/workspaces/y13041/api/db/seed.ts#L114-L130) 主数据合入，删除 DB 重 seed 不会再丢 |
