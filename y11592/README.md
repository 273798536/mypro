# 仓内波次拣货重试补偿队列服务

## 系统概述

本服务为仓储系统提供可靠的数据重试补偿机制，确保波次单、拣货差异、复核扫描等数据能够被正确处理，支持幂等性提交、限次重试、人工接管等功能，所有数据持久化存储，重启后可恢复。

## 核心特性

### 1. 数据可靠性
- **持久化存储**：所有队列数据、历史记录均存储在PostgreSQL中，重启不丢失
- **操作日志**：完整记录每一次变更，支持追溯谁在什么时候改了什么
- **导出一致性**：导出前可验证重试队列与业务表的数据一致性

### 2. 幂等性处理
支持三种幂等策略：
- **`ignore` (默认)**：重复提交直接忽略，返回已有记录
- **`overwrite`**：重复提交覆盖原有数据
- **`append`**：重复提交追加数据（数组自动合并）

### 3. 重试机制
- **限次重试**：默认最多重试5次，可配置
- **指数退避**：重试间隔按指数增长（5分钟、10分钟、20分钟...）
- **死信队列**：超过最大重试次数的数据移入死信队列，支持人工处理后重试

### 4. 人工接管
- **冻结/解冻**：导出前可冻结数据防止变更
- **人工改判**：支持批准、驳回、重新重试三种改判方式
- **死信处理**：对死信数据标记处理或重新提交

### 5. 边界情况处理
- ✅ 重复提交
- ✅ 撤回后再提交
- ✅ 部分失败
- ✅ 导出前冻结
- ✅ 异常保留（错误堆栈完整记录）

### 6. 权限控制
- 基于Header的用户认证
- 角色权限拦截（manager角色才能访问死信队列）
- 细粒度权限控制

## 项目结构

```
src/
├── config/              # 配置文件
│   └── index.ts
├── database/            # 数据库连接
│   └── connection.ts
├── models/              # 数据模型
│   ├── WaveOrder.ts          # 波次单
│   ├── PickingDifference.ts  # 拣货差异
│   ├── ReviewScan.ts         # 复核扫描
│   ├── RetryQueue.ts         # 重试队列
│   ├── DeadLetterQueue.ts    # 死信队列
│   ├── OperationLog.ts       # 操作日志
│   └── index.ts
├── types/               # TypeScript类型定义
│   └── index.ts
├── services/            # 业务服务层
│   ├── OperationLogService.ts   # 操作日志服务
│   ├── IdempotencyService.ts    # 幂等性服务
│   ├── DataProcessingService.ts # 数据处理服务
│   ├── RetryQueueService.ts     # 重试队列服务
│   ├── DeadLetterQueueService.ts # 死信队列服务
│   ├── ExportService.ts         # 导出服务
│   ├── QueueWorker.ts           # 定时工作器
│   └── index.ts
├── middleware/          # 中间件
│   ├── auth.ts              # 认证授权
│   └── errorHandler.ts      # 错误处理
├── routes/              # API路由
│   ├── retryQueue.ts        # 重试队列路由
│   ├── deadLetterQueue.ts   # 死信队列路由
│   ├── export.ts            # 导出路由
│   ├── history.ts           # 历史记录路由
│   └── index.ts
├── tests/               # 自动化测试
│   ├── setup.ts             # 测试初始化
│   ├── idempotency.test.ts  # 幂等性测试
│   ├── retryQueue.test.ts   # 重试队列测试
│   ├── boundary.test.ts     # 边界情况测试
│   ├── export.test.ts       # 导出一致性测试
│   └── api.test.ts          # API集成测试
├── utils/               # 工具函数
│   └── logger.ts            # 日志工具
├── app.ts               # Express应用
└── index.ts             # 服务入口
```

## API接口

### 认证Header
所有API需要在请求头中携带以下信息：
```
x-user-id: 用户ID
x-user-name: 用户名 (可选)
x-user-roles: 角色列表,逗号分隔 (如: admin,manager)
x-user-permissions: 权限列表,逗号分隔
```

### 重试队列 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/retry-queue/submit` | 提交单条数据 |
| POST | `/api/v1/retry-queue/batch-submit` | 批量提交数据 |
| GET | `/api/v1/retry-queue/:id` | 获取重试项详情 |
| GET | `/api/v1/retry-queue?status=&batchId=&limit=` | 查询重试列表 |
| POST | `/api/v1/retry-queue/:id/cancel` | 取消重试项 |
| POST | `/api/v1/retry-queue/:id/freeze` | 冻结重试项 |
| POST | `/api/v1/retry-queue/:id/unfreeze` | 解冻重试项 |
| POST | `/api/v1/retry-queue/:id/manual-decision` | 人工改判 |
| GET | `/api/v1/retry-queue/statistics/summary` | 获取统计概览 |
| POST | `/api/v1/retry-queue/trigger-process` | 手动触发处理 |

### 死信队列 API (需要manager角色)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/dead-letter-queue` | 获取死信列表 |
| GET | `/api/v1/dead-letter-queue/:id` | 获取死信详情 |
| POST | `/api/v1/dead-letter-queue/:id/resolve` | 标记死信已处理 |
| POST | `/api/v1/dead-letter-queue/:id/retry` | 重新提交到重试队列 |
| GET | `/api/v1/dead-letter-queue/statistics/summary` | 死信统计 |

### 导出 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/export` | 导出数据 |
| GET | `/api/v1/export/verify-consistency/:batchId` | 验证批次一致性 |
| GET | `/api/v1/export/retry-classification?batchId=` | 重试分类统计 |

### 历史记录 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/history/entity/:entityType/:entityId` | 获取实体变更历史 |
| GET | `/api/v1/history/batch/:batchId` | 获取批次操作历史 |
| GET | `/api/v1/history/operator/:operatorId` | 获取操作员历史 |
| GET | `/api/v1/history/operation/:operationType` | 获取操作类型历史 |

## 数据模型

### 重试队列 (retry_queue)
- `id`: UUID主键
- `sourceType`: 数据源类型 (wave_order/picking_difference/review_scan)
- `sourceId`: 源数据ID
- `sourceData`: 源数据JSON
- `status`: 状态 (pending/processing/success/failed/manual/cancelled/frozen/dead_letter)
- `attemptCount`: 已重试次数
- `maxAttempts`: 最大重试次数
- `nextAttemptAt`: 下次重试时间
- `lastError`: 最后错误信息
- `errorStack`: 错误堆栈
- `idempotencyKey`: 幂等性键
- `idempotencyStrategy`: 幂等策略
- `submittedBy`: 提交人
- `batchId`: 批次ID

### 操作日志 (operation_logs)
- `entityType`: 实体类型
- `entityId`: 实体ID
- `operationType`: 操作类型 (submit/update/cancel/retry/manual_decision/freeze/unfreeze/export)
- `oldValues`: 变更前值
- `newValues`: 变更后值
- `changedFields`: 变更字段列表
- `operatorId`: 操作人ID
- `batchId`: 批次ID

## 自动化测试覆盖

### 幂等性测试 (idempotency.test.ts)
- ✅ 忽略策略：重复提交返回已有记录
- ✅ 覆盖策略：重复提交覆盖数据
- ✅ 追加策略：重复提交追加数据
- ✅ 幂等Key生成正确性

### 重试队列测试 (retryQueue.test.ts)
- ✅ 提交数据成功写入队列
- ✅ 创建操作日志
- ✅ 成功处理并写入业务表
- ✅ 失败后设置重试时间
- ✅ 超过最大重试次数移入死信
- ✅ 取消待处理项
- ✅ 已成功项不能取消

### 边界情况测试 (boundary.test.ts)
- ✅ 冻结待处理项
- ✅ 冻结项不被处理
- ✅ 解冻并重新加入队列
- ✅ 只能解冻冻结状态项
- ✅ 人工批准标记为成功
- ✅ 人工拒绝标记为取消
- ✅ 人工重试重置次数
- ✅ 取消后重新提交创建新记录
- ✅ 批量提交部分失败保留成功记录

### 导出测试 (export.test.ts)
- ✅ 导出完整批次数据
- ✅ 创建导出日志
- ✅ 成功处理的数据一致性验证
- ✅ 冻结数据提示
- ✅ 待处理数据提示
- ✅ 按错误类型分类失败项
- ✅ 区分可重试/不可重试错误

### API集成测试 (api.test.ts)
- ✅ 健康检查接口
- ✅ 未授权访问拦截 (401)
- ✅ 角色权限拦截 (403)
- ✅ 提交数据API
- ✅ 批量提交API
- ✅ 获取详情API
- ✅ 取消API
- ✅ 冻结API
- ✅ 统计API
- ✅ 导出API
- ✅ 一致性验证API
- ✅ 重试分类API
- ✅ 历史记录API

## 启动方式

### 环境配置
```bash
cp .env.example .env
# 编辑 .env 文件配置数据库连接等参数
```

### 安装依赖
```bash
npm install
```

### 初始化数据库
```bash
npm run migrate
```

### 启动服务
```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

### 运行测试
```bash
# 运行所有测试
npm test

# 监听模式
npm run test:watch
```

## 仓储经理关注点

### 可重试分类
通过 `/api/v1/export/retry-classification` 接口获取：
- 按数据源类型分类统计
- 按错误类型分类（超时、连接问题、重复数据、验证错误、权限问题等）
- 可重试 vs 不可重试数量

### 死信处理
1. 查询未处理死信：`GET /api/v1/dead-letter-queue?unresolved=true`
2. 查看具体错误原因
3. 选择处理方式：
   - `resolve`: 标记已处理，记录处理说明
   - `retry`: 重新提交到重试队列

### 恢复后续跑
1. 使用 `/api/v1/export/verify-consistency/:batchId` 验证批次一致性
2. 查看一致性报告，处理冻结数据和待处理数据
3. 人工改判有问题的项
4. 重新触发处理：`POST /api/v1/retry-queue/trigger-process`
5. 导出最终数据

## 配置说明

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `RETRY_MAX_ATTEMPTS` | 5 | 最大重试次数 |
| `RETRY_DELAY_MINUTES` | 5 | 首次重试间隔(分钟) |
| `RETRY_BACKOFF_MULTIPLIER` | 2 | 退避乘数 |
| `QUEUE_WORKER_INTERVAL_SECONDS` | 30 | 工作器轮询间隔(秒) |

## 注意事项

1. **数据一致性**：导出前务必调用一致性验证接口，确认无冻结数据和待处理数据
2. **幂等策略**：默认使用`ignore`策略，如需覆盖或追加请明确指定
3. **批次ID**：建议每批数据使用唯一的batchId，便于追踪和导出
4. **错误处理**：所有异常都会保留错误堆栈，便于排查问题
5. **重启恢复**：服务重启后，队列状态和待处理项会自动恢复
