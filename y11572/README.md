# 客服工单升级重试补偿队列 API

## 项目概述

客服工单升级重试补偿队列服务，集成会话摘要、SLA规则、补偿审批、二次确认单，支持外部回执提交、排队、限次重试、人工接管、补偿入账、关闭全流程。

## 核心特性

### 1. 完整生命周期管理
- **多源数据整合**: 会话摘要、SLA规则、补偿审批、二次确认单
- **状态流转**: 12种状态，完整记录每次变更的**时间、操作者、原因**
- **幂等性支持**: 同一批数据支持 **忽略(IGNORE) / 覆盖(OVERWRITE) / 追加(APPEND)** 三种模式

### 2. 边界情况覆盖
| 场景 | 实现状态 |
|------|---------|
| 重复提交 | ✅ 幂等性处理 |
| 撤回后再提交 | ✅ `withdraw` + `resubmit` |
| 部分失败 | ✅ `PARTIAL_SUCCESS` 状态 |
| 人工改判 | ✅ `manualOverride` 支持修改数据和状态 |
| 导出前冻结 | ✅ `freeze` 工单无法操作 + 导出记录冻结24小时 |

### 3. 队列与重试机制
- **限次重试**: 指数退避算法，默认3次可配置
- **重试分类**: `SYSTEM_ERROR / NETWORK_ERROR / DATA_ERROR / BUSINESS_ERROR / MANUAL_RETRY`
- **死信处理**: 重试耗尽进入死信队列，可查看恢复建议和手动恢复
- **模拟失败**: 支持配置模拟失败次数，用于验证重试流程

### 4. 多视图数据一致性
- 列表、详情、历史、审计日志、导出数据保持一致
- 所有状态变更和数据修改都有完整审计记录

## 快速开始

### 方式一：一键启动（推荐）

```bash
# 1. 启动依赖服务 + 安装依赖 + 初始化数据 + 启动应用
npm run quickstart
```

### 方式二：分步启动

```bash
# 1. 启动 PostgreSQL 和 Redis
docker-compose up -d

# 2. 安装依赖
npm install

# 3. 编译 TypeScript
npm run build

# 4. 初始化数据库和测试数据
npm run seed:force

# 5. 启动应用
npm start
```

### 方式三：开发模式

```bash
docker-compose up -d
npm install
npm run dev
```

## 验证流程

### 运行验证脚本

```bash
# 服务启动后，新开终端运行
npm run verify
```

### 手动验证核心流程

```bash
# 0. 健康检查
curl http://localhost:3000/api/v1/health

# 1. 查看仪表盘统计
curl -H "x-operator-id: operator-001" \
     -H "x-operator-name: 测试管理员" \
     http://localhost:3000/api/v1/statistics/dashboard

# 2. 创建工单
curl -X POST -H "Content-Type: application/json" \
     -H "x-operator-id: operator-001" \
     -H "x-operator-name: 测试管理员" \
     -d '{
       "batchId": "test-batch-001",
       "idempotencyKey": "idem-test-001",
       "idempotencyMode": "ignore",
       "data": {
         "sourceType": "manual",
         "sourceId": "test-123",
         "sessionSummary": {
           "sessionId": "sess-test",
           "customerId": "cust-001",
           "customerName": "测试客户",
           "issueType": "退款申请",
           "summary": "测试工单 - 验证重试补偿流程",
           "transferCount": 2,
           "agentNotes": "客服备注",
           "createdAt": "2024-01-15T10:00:00Z"
         },
         "slaRule": {
           "ruleId": "sla-001",
           "ruleName": "普通工单SLA",
           "priority": 1,
           "responseHours": 24,
           "resolutionHours": 72,
           "escalateAfterHours": 48,
           "conditions": {"vipLevel": 1}
         },
         "compensationApproval": {
           "approvalId": "appr-001",
           "approverId": "mgr-001",
           "approverName": "测试主管",
           "approvedAt": "2024-01-15T11:00:00Z",
           "approvedAmount": 100,
           "approvalNotes": "同意补偿"
         },
         "compensationAmounts": [
           {"type": "refund", "amount": 100, "description": "现金退款"}
         ]
       }
     }' http://localhost:3000/api/v1/tickets

# 3. 提交工单到队列（观察日志中的重试过程）
curl -X POST -H "Content-Type: application/json" \
     -H "x-operator-id: operator-001" \
     -H "x-operator-name: 测试管理员" \
     -d '{"reason": "测试提交"}' \
     http://localhost:3000/api/v1/tickets/<TICKET_ID>/submit

# 4. 查看工单状态
curl -H "x-operator-id: operator-001" \
     -H "x-operator-name: 测试管理员" \
     http://localhost:3000/api/v1/tickets/<TICKET_ID>

# 5. 查看状态历史
curl -H "x-operator-id: operator-001" \
     -H "x-operator-name: 测试管理员" \
     http://localhost:3000/api/v1/tickets/<TICKET_ID>/history

# 6. 查看审计日志
curl -H "x-operator-id: operator-001" \
     -H "x-operator-name: 测试管理员" \
     http://localhost:3000/api/v1/tickets/<TICKET_ID>/audit
```

## API 端点

### 工单管理
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/tickets` | 创建工单（支持三种幂等模式） |
| POST | `/api/v1/tickets/:id/submit` | 提交入队 |
| POST | `/api/v1/tickets/batch/:bid/submit` | 批量提交 |
| GET | `/api/v1/tickets` | 工单列表 |
| GET | `/api/v1/tickets/:id` | 工单详情 |
| GET | `/api/v1/tickets/:id/history` | 状态历史 |
| GET | `/api/v1/tickets/:id/audit` | 审计日志 |
| POST | `/api/v1/tickets/:id/withdraw` | 撤回 |
| POST | `/api/v1/tickets/:id/resubmit` | 撤回后重提 |
| POST | `/api/v1/tickets/:id/freeze` | 冻结 |
| POST | `/api/v1/tickets/:id/unfreeze` | 解冻 |
| POST | `/api/v1/tickets/:id/override` | 人工改判 |
| POST | `/api/v1/tickets/:id/manual-retry` | 人工重试 |
| POST | `/api/v1/tickets/:id/takeover` | 人工接管 |
| POST | `/api/v1/tickets/:id/close` | 关闭 |

### 导出管理
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/exports` | 创建导出（触发冻结） |
| GET | `/api/v1/exports` | 导出记录列表 |
| GET | `/api/v1/exports/:id` | 导出记录详情 |
| GET | `/api/v1/exports/:id/download` | 下载导出文件 |

### 统计与死信
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/statistics/dashboard` | 仪表盘统计 |
| GET | `/api/v1/statistics/batch/:id` | 批次统计 |
| GET | `/api/v1/dead-letters` | 死信列表 |
| GET | `/api/v1/dead-letters/:id` | 死信详情 |
| POST | `/api/v1/dead-letters/:id/recover` | 死信恢复 |
| POST | `/api/v1/dead-letters/batch-recover` | 批量恢复 |

## 请求头要求

所有业务API都需要以下请求头：

```
x-operator-id:    操作者ID
x-operator-name:  操作者姓名
x-operator-role:  角色（可选）
```

## 配置说明

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `QUEUE_SIMULATE_FAILURE` | `true` | 是否模拟补偿失败（用于验证重试） |
| `QUEUE_SIMULATE_FAILURE_COUNT` | `2` | 模拟失败次数，之后成功 |
| `QUEUE_RETRY_ATTEMPTS` | `3` | 最大重试次数 |
| `QUEUE_RETRY_DELAY` | `5000` | 重试延迟（毫秒） |
| `EXPORT_FROZEN_HOURS` | `24` | 导出数据冻结时长（小时） |

### 验证重试闭环

默认配置下：
- `QUEUE_SIMULATE_FAILURE=true`
- `QUEUE_SIMULATE_FAILURE_COUNT=2`
- `QUEUE_RETRY_ATTEMPTS=3`

**预期行为**：
1. 第1次处理 → 模拟失败 → 进入重试队列
2. 第2次处理 → 模拟失败 → 进入重试队列
3. 第3次处理 → 处理成功 → 状态变为 `compensated`

可以通过观察服务日志看到完整的重试过程。

## 项目结构

```
src/
├── config/          # 配置文件
├── database/        # 数据库连接和迁移
├── middleware/      # Express 中间件
├── models/          # Sequelize 数据模型
├── queues/          # Bull 队列处理器
├── routes/          # API 路由
├── services/        # 业务逻辑服务
├── types/           # TypeScript 类型定义
└── index.ts         # 应用入口
```

## 可用命令

```bash
npm run build        # 编译 TypeScript
npm start            # 启动生产服务
npm run dev          # 启动开发服务（热重载）
npm run seed         # 初始化测试数据
npm run seed:force   # 清空并重建数据库
npm run docker:up    # 启动 Docker 依赖
npm run docker:down  # 停止 Docker 依赖
npm run quickstart   # 一键启动完整环境
npm run verify       # 运行核心流程验证脚本
npm run lint         # ESLint 检查
```
