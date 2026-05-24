# 服装打版样衣异常回执状态机系统

服装打版行业的样衣异常回执全流程管理系统，支持单据录入、复核改判、异步任务处理、面料去向追踪、审计日志、报告导出等完整功能。

## 核心特性

- 📋 **真实材料接入** - 支持样衣流转单、尺码修改意见、面料出入库、临时补录单、班次记录
- 🧵 **面料去向追踪** - 同一款多轮修改后旧版面料领用记录有明确去向（退回/报废/留用）
- 📝 **完整动作轨迹** - 批次创建、附件补传、复核改判、冻结结算、撤回归档全流程留痕
- 🔄 **重复数据策略** - 同一批数据跑两次可选择 IGNORE（忽略）/ OVERWRITE（覆盖）/ APPEND（追加）
- 📊 **审计追踪** - 历史记录谁在什么时候改过什么，支持版本对比
- ⚡ **异步任务处理** - 失败分类：等重试 / 等人工 / 永久失败，服务重启自动恢复
- 📈 **品牌企划报告** - 冻结前后状态、人工理由、导出汇总，数据可溯源
- 🔍 **差异对比** - 异常修正前后的差异，详情、报告和导出对到同一个原因

## 技术栈

- **前端**：React 18 + TypeScript + Vite + Tailwind CSS + Zustand + React Router
- **后端**：Express + TypeScript + SQLite + XState + xlsx
- **状态管理**：XState 状态机确保严格的状态流转

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 安装依赖

```bash
npm install
```

### 初始化数据库

```bash
npm run db:init
```

### 导入示例数据

```bash
npm run db:seed
```

### 启动开发服务

```bash
# 同时启动前端和后端
npm run dev

# 或分别启动
npm run server:dev  # 后端 API: http://localhost:3001
npm run client:dev  # 前端 UI: http://localhost:5173
```

### 类型检查

```bash
npm run check
```

---

## 完整演示链路

### 步骤 1：初始化与数据准备

```bash
# 重置数据库
npm run db:reset

# 导入示例数据
npm run db:seed
```

**数据内容**：
- 2个批次（BATCH-2024-001, BATCH-2024-002）
- 5份单据（样衣流转单、尺码修改意见、面料出入库、临时补录单、班次记录）
- 3个异步任务（含失败场景）
- 2条审计日志
- 1条面料去向追踪记录

### 步骤 2：触发坏数据场景（模拟司机只拍了半张单）

```bash
npm run demo:bad-data
```

**创建的坏数据**：
- 批次号：BATCH-BAD-001
- 单据号：FLOW-BAD-001（缺少接收日期、接收人等必填字段）
- 任务状态：WAITING_MANUAL（等待人工处理）

### 步骤 3：人工修正数据

方式一：使用脚本
```bash
npm run demo:fix-data
```

方式二：通过界面操作
1. 进入「任务监控」页面
2. 找到状态为「等人工」的任务
3. 点击「人工处理」，填写处理说明
4. 或进入「复核改判」页面，找到单据并选择「修改」决策，补全缺失的信息

### 步骤 4：生成品牌企划报告

方式一：使用脚本
```bash
npm run demo:generate-report
```

方式二：通过界面操作
1. 进入「批次详情」页面
2. 点击「冻结」，填写冻结原因
3. 进入「报告中心」页面
4. 点击「生成报告」选择冻结报告类型
5. 查看报告详情，确认：
   - 冻结前后状态对比
   - 人工操作理由
   - 数据统计汇总
   - 可导出Excel

### 步骤 5：验证完整链路

**在界面中验证以下功能**：

| 页面 | 验证内容 |
|------|---------|
| 仪表盘 | 批次统计、任务状态统计是否正确 |
| 批次管理 | 新建批次、冻结、解冻、结算、归档 |
| 单据管理 | 上传单据、查看详情、版本对比差异 |
| 复核改判 | 通过/驳回/修改决策、修改数据 |
| 任务监控 | 查看任务状态、重试、人工处理 |
| 报告中心 | 生成报告、查看详情、导出Excel |
| 审计追踪 | 查看所有操作历史、筛选 |
| 演示流程 | 按照页面引导走完全流程 |

---

## API 接口文档

### 批次管理

- `GET /api/batches` - 获取批次列表
- `GET /api/batches/stats` - 获取批次统计
- `GET /api/batches/:id` - 获取批次详情
- `POST /api/batches` - 创建批次
- `POST /api/batches/:id/freeze` - 冻结批次
- `POST /api/batches/:id/unfreeze` - 解冻批次
- `POST /api/batches/:id/settle` - 结算批次
- `POST /api/batches/:id/archive` - 归档批次
- `GET /api/batches/:id/attachments` - 获取批次附件列表
- `POST /api/batches/:id/attachments` - 上传批次附件
- `DELETE /api/batches/:id/attachments/:attachmentId` - 删除附件

### 单据管理

- `GET /api/documents` - 获取单据列表
- `GET /api/documents/pending-review` - 获取待复核单据
- `GET /api/documents/:id` - 获取单据详情
- `GET /api/documents/:id/diff` - 获取版本差异
- `POST /api/documents` - 创建单据
- `GET /api/documents/:id/attachments` - 获取单据附件
- `POST /api/documents/:id/attachments` - 上传单据附件

### 复核改判

- `GET /api/review/pending` - 待复核列表
- `POST /api/review/:id/decision` - 提交审核决策
  - 支持 APPROVE（通过）/ REJECT（驳回）/ MODIFY（修改）
  - MODIFY 时支持 modifiedData 参数提交修改后的数据

### 任务监控

- `GET /api/tasks` - 获取任务列表
- `GET /api/tasks/stats` - 获取任务统计
- `POST /api/tasks/:id/retry` - 重试任务
- `POST /api/tasks/:id/manual` - 标记人工处理完成
- `POST /api/tasks` - 创建新任务

### 报告中心

- `GET /api/reports` - 获取报告列表
- `GET /api/reports/:id` - 获取报告详情
- `POST /api/reports/generate` - 生成报告
- `GET /api/reports/:id/export` - 导出Excel

### 审计追踪

- `GET /api/audit` - 获取审计日志列表
- `GET /api/audit/:entityType/:entityId` - 获取指定实体的操作历史

---

## 任务队列说明

### 已注册的任务处理器

| 任务类型 | 说明 |
|---------|------|
| DOCUMENT_VALIDATION | 单据数据验证 |
| DATA_SYNC | 数据同步到外部系统 |
| BATCH_PROCESS | 批次批量处理 |
| REPORT_GENERATE | 报告生成 |

### 失败状态分类

| 状态 | 说明 | 处理方式 |
|------|------|---------|
| WAITING_RETRY | 等重试 | 自动重试3次，间隔1/2/3分钟 |
| WAITING_MANUAL | 等人工 | 需人工介入处理后标记完成 |
| PERMANENT_FAILED | 永久失败 | 不再重试，记录归档 |

### 服务恢复

服务启动时自动：
1. 注册所有任务处理器
2. 处理所有 PENDING 状态的任务
3. 启动轮询（5秒间隔）处理到期重试任务
4. 无需人工干预，恢复后自动接着处理

---

## 数据模型

### 核心实体关系

```
批次 (Batch)
  └── 单据 (Document) 1:N
        ├── 附件 (Attachment) 1:N
        └── 版本历史
  └── 任务 (Task) 1:N
  └── 附件 (Attachment) 1:N
  └── 审计日志 (AuditLog) 1:N

面料去向 (FabricTrack)
  └── 关联单据版本
  └── 记录旧版面料处置
```

### 重复数据策略

创建批次时通过 `duplicateStrategy` 指定：

- **IGNORE**：批次号已存在则忽略，返回已存在的批次
- **OVERWRITE**：批次号已存在则覆盖原有数据
- **APPEND**：批次号已存在则追加新单据

---

## 项目结构

```
y11465/
├── api/                          # 后端服务
│   ├── db/                       # 数据库层
│   │   └── connection.ts         # SQLite连接与初始化
│   ├── repositories/             # 数据访问层
│   │   ├── BatchRepository.ts
│   │   ├── DocumentRepository.ts
│   │   ├── TaskRepository.ts
│   │   ├── AuditLogRepository.ts
│   │   ├── AttachmentRepository.ts
│   │   ├── FabricTrackRepository.ts
│   │   └── ReportRepository.ts
│   ├── services/                 # 业务服务层
│   │   ├── StateMachineService.ts # XState状态机
│   │   ├── TaskQueueService.ts   # 异步任务队列
│   │   └── ReportService.ts      # 报告服务
│   ├── routes/                   # API路由
│   │   ├── batches.ts
│   │   ├── documents.ts
│   │   ├── review.ts
│   │   ├── tasks.ts
│   │   ├── reports.ts
│   │   └── audit.ts
│   ├── app.ts                    # Express应用
│   └── server.ts                 # 服务入口
├── src/                          # 前端应用
│   ├── components/               # 组件
│   ├── pages/                    # 页面
│   ├── services/                 # API服务
│   ├── store/                    # Zustand状态管理
│   └── App.tsx                   # 应用入口
├── scripts/                      # 演示脚本
│   ├── seed-data.ts              # 示例数据
│   ├── demo-bad-data.ts          # 坏数据场景
│   ├── demo-fix-data.ts          # 人工修正
│   └── demo-generate-report.ts   # 生成报告
└── shared/                       # 共享类型
    └── types.ts
```

---

## 常见问题

### Q: npm run server:dev 报 EMFILE 错误？

A: 已通过配置 `CHOKIDAR_USEPOLLING=1` 和忽略目录优化解决。如仍有问题，可增加系统文件描述符限制：

```bash
ulimit -n 10240
```

### Q: 如何重置数据库？

```bash
npm run db:reset
```

### Q: 异步任务不执行？

A: 检查：
1. 服务是否正常启动（控制台应显示 `[TaskQueue] 任务队列已启动`）
2. 任务状态是否为 PENDING 或 WAITING_RETRY
3. 查看控制台日志是否有报错

### Q: 如何添加新的任务类型？

A: 在 `api/app.ts` 的 `registerTaskHandlers` 函数中注册新处理器：

```typescript
taskQueueService.registerHandler('YOUR_TASK_TYPE', async (payload) => {
  // 任务处理逻辑
});
```

---

## License

MIT
