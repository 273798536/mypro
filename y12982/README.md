# 图数据库关系巡检系统

慢查询日志驱动的图数据库关系巡检工具，专为仓储系统工程师设计。

## 核心特性

- **慢查询日志驱动**：围绕慢查询日志这条主线展开巡检
- **批次化管理**：备份校验和慢查询归因共用同一批处理记录，数据口径一致
- **审计可追溯**：谁改的、什么时候改的、为什么改，全程留痕
- **普通话解释**：报告里有一段可直接复制的普通话说明，不用重新翻译
- **异常追溯链**：顺着一条异常往回查，能查到慢查询日志和处理意见
- **示例数据开箱即用**：首次打开就有数据，不用先造半天表

## 快速开始

### 方式一：一键启动（推荐）

```bash
chmod +x start.sh
./start.sh
```

### 方式二：手动启动

```bash
# 1. 安装依赖
npm install

# 2. 初始化数据库
npm run init-db

# 3. 植入示例数据
npm run seed

# 4. 启动服务
npm start
```

启动后访问：**http://localhost:3000**

## 目录结构

```
.
├── server.js              # 后端服务主文件
├── package.json           # 项目配置
├── start.sh               # 一键启动脚本
├── db/                    # 数据库文件目录
│   └── inspection.db      # SQLite数据库（运行后生成）
├── public/
│   └── index.html         # 前端界面
└── scripts/
    ├── init-db.js         # 数据库初始化脚本
    ├── seed-data.js       # 示例数据植入脚本
    ├── run-inspection.js  # 执行巡检脚本
    ├── backup-check.js    # 备份校验脚本
    └── curl-examples.sh   # curl调用示例
```

## 功能模块

### 1. 概览看板
- 待处理严重项、待处理巡检项统计
- 最新巡检批次快速查看
- 严重程度分布图
- 待处理巡检项列表

### 2. 慢查询日志
- 慢查询列表（支持按状态、严重程度、批次筛选）
- 查询详情查看
- 执行时间、锁等待时间、扫描行数等关键指标

### 3. 巡检条目
- 慢查询、锁等待、备份校验三种类型
- 待处理、已解决、已核准、已忽略四种状态
- 严重、警告、提示三个等级
- 每条处理记录都有审计历史

### 4. 巡检批次
- 批次创建和管理
- 批次详情（含关联的慢查询、备份记录、巡检条目）
- 备份校验和慢查询归因共用同一批次

### 5. 巡检报告
- 报告列表和详情
- **普通话解释**：可直接复制给同事的大白话说明
- 关联的巡检条目一览
- 审核状态管理

### 6. 备份校验
- 备份记录列表
- 校验状态和结果
- 与巡检批次关联，确保数据口径一致

### 7. 审计追踪
- 全量操作记录
- 按目标类型、操作人筛选
- 可点击跳转到对应目标详情

## API 接口

### 基础
- `GET /api/health` - 健康检查
- `GET /api/statistics/dashboard` - 看板统计

### 慢查询
- `GET /api/slow-queries` - 慢查询列表
- `GET /api/slow-queries/:id` - 慢查询详情

### 巡检批次
- `GET /api/batches` - 批次列表
- `GET /api/batches/:batchId` - 批次详情
- `POST /api/batches` - 创建批次

### 巡检条目
- `GET /api/inspection-items` - 条目列表
- `GET /api/inspection-items/:itemId` - 条目详情（含审计历史）
- `PUT /api/inspection-items/:itemId/status` - 更新状态（自动记录审计）

### 巡检报告
- `GET /api/reports` - 报告列表
- `GET /api/reports/:reportId` - 报告详情
- `POST /api/reports/:reportId/review` - 审核报告

### 审计追踪
- `GET /api/audit-trail` - 审计记录列表

### 备份记录
- `GET /api/backup-records` - 备份记录列表

## curl 示例

使用 `scripts/curl-examples.sh` 脚本快速调用：

```bash
# 查看健康状态
bash scripts/curl-examples.sh health

# 查看看板数据
bash scripts/curl-examples.sh dashboard

# 查看待处理巡检条目
bash scripts/curl-examples.sh items pending

# 查看条目详情（含审计历史）
bash scripts/curl-examples.sh item-detail ITEM-001

# 处理巡检条目（核准通过）
bash scripts/curl-examples.sh handle-item ITEM-003 approved liming "月底盘点期间批量操作为正常业务"

# 顺着一条异常往回查（完整链路追溯）
bash scripts/curl-examples.sh trace-back ITEM-003

# 创建巡检批次
bash scripts/curl-examples.sh create-batch backup_verification zhangwei "夜间备份校验"

# 查看报告详情（含普通话解释）
bash scripts/curl-examples.sh report-detail REPORT-2026-06-19-001
```

## 命令行脚本

### 执行巡检
```bash
npm run inspect
# 或带参数
node scripts/run-inspection.js --operator=zhangwei --batch_type=daily_inspection
```

### 备份校验
```bash
npm run backup-check
# 或复用已有批次
node scripts/backup-check.js --batch_id=BATCH-xxx --operator=liming
```

## 设计原则

### 1. 批次共用原则
备份校验和慢查询归因共用同一批处理记录，避免界面和报告各算各的。
审计组追问时，数据口径一致。

### 2. 审计留痕原则
任何状态变更都自动记录审计轨迹：
- 谁（operator）
- 什么时候（created_at）
- 改了什么（old_value → new_value）
- 为什么（reason）

### 3. 可追溯原则
顺着一条异常往回查，链路完整：
巡检条目 → 所属批次 → 原始慢查询日志 → 操作审计历史

### 4. 实用主义原则
- 首次打开有示例数据，不用先造表
- 报告有普通话解释，直接复制用
- 锁等待过长被复核通过，历史里能查到依据

## 技术栈

- 后端：Node.js + Express
- 数据库：SQLite（本地文件，无服务依赖）
- 前端：原生 HTML/CSS/JS（无构建步骤）

## 常见问题

**Q: 数据库文件在哪里？**
A: `db/inspection.db`，直接备份这个文件即可。

**Q: 怎么重置数据？**
A: 删除 `db/inspection.db`，重新运行 `npm run init-db` 和 `npm run seed`。

**Q: 能对接真实的图数据库吗？**
A: 当前是本地模拟的慢查询日志。如需对接真实图数据库（如 Neo4j、Nebula 等），
可在 `scripts/` 下添加数据采集脚本，将查询日志导入 `slow_queries` 表即可。

**Q: 审计数据会过期吗？**
A: 默认永久保留。如需清理，可直接操作 SQLite 数据库。
