# 中央厨房留样重试补偿队列服务

## 项目概述

本服务用于解决中央厨房留样管理中的问题批次回查场景，实现从留样标签、温度记录、门店投诉到退款流水的全链路追踪。通过队列机制实现回执提交、限次重试、人工接管、补偿入账、关闭等核心动作，每一步操作都记录审计日志，确保数据可追溯。

## 核心特性

- **多源数据整合：支持留样标签、温度记录、门店投诉、退款流水、盘点差异
- **队列管理**：回执提交、排队、限次重试、人工接管、补偿入账、关闭
- **状态追踪**：待处理、处理中、等待重试、等待人工、已补偿、永久失败、已关闭
- **幂等保障**：基于幂等键防止重复提交
- **审计日志**：每一步操作都记录变更前后差异
- **原始证据保留**：导入时保存来源文件、原始行号和解析后的标准值
- **批次回查**：按批次号/锅次查询涉及的所有门店和记录
- **数据导出**：支持队列、死信、批次数据导出CSV

## 快速开始

### 1. 环境准备

```bash
# 安装依赖
npm install
```

### 2. 从空库启动

```bash
# 创建数据目录
mkdir -p data exports

# 初始化数据库（空库启动
npm run init:db
```

### 3. 准备样例数据

```bash
# 导入样例数据（包含留样标签、温度记录、门店投诉、退款流水、盘点差异）
npm run seed
```

样例数据说明：
- **测试批次号**：`BATCH20240115001`
- **锅次**：POT001、POT002、POT003
- **异常锅次**：POT002（包含温度异常、投诉、退款、盘点差异）
- **涉及门店**：北京朝阳店、上海浦东店、广州天河店、深圳南山店、杭州西湖店

### 4. 启动服务

```bash
# 启动API服务
npm start

# 启动Worker（异步处理队列任务）
npm run worker
```

服务地址：http://localhost:3000

## 核心流程演示

### 主流程：回执提交 → 自动处理 → 完成

#### 步骤1：提交回执到队列

```bash
curl -X POST http://localhost:3000/api/queue/submit \
  -H "Content-Type: application/json" \
  -H "x-operator-name: 品控主管" \
  -d '{
    "sourceType": "store_complaint",
    "sourceId": "CP20240115001",
    "batchNo": "BATCH20240115001",
    "potNo": "POT002",
    "storeCode": "ST002",
    "storeName": "上海浦东门店",
    "productName": "红烧肉",
    "actionType": "receipt_submit",
    "priority": "high",
    "maxRetryCount": 3,
    "retryInterval": 300,
    "payload": {
      "complaintId": "CP20240115001",
      "amount": 68.00,
      "refundRequired": true
    }
  }'
```

#### 步骤2：查看队列状态

```bash
# 查看队列列表
curl http://localhost:3000/api/queue

# 查看统计信息
curl http://localhost:3000/api/queue/statistics
```

#### 步骤3：手动标记处理（如果Worker未启动）

```bash
# 获取队列项ID
QUEUE_ID=$(curl -s http://localhost:3000/api/queue | jq -r '.data.items[0].id')

# 开始处理
curl -X POST http://localhost:3000/api/queue/$QUEUE_ID/start \
  -H "Content-Type: application/json" \
  -H "x-operator-name: 品控主管"

# 标记成功
curl -X POST http://localhost:3000/api/queue/$QUEUE_ID/success \
  -H "Content-Type: application/json" \
  -H "x-operator-name: 品控主管" \
  -d '{"result": "已与门店确认，补偿68元已到账"}'
```

#### 步骤4：查看审计日志

```bash
curl http://localhost:3000/api/audit/entity/compensation_queue/$QUEUE_ID
```

### 异常场景：制造失败 → 重试 → 永久失败

#### 场景1：模拟处理失败后自动重试

```bash
# 提交新的回执
curl -X POST http://localhost:3000/api/queue/submit \
  -H "Content-Type: application/json" \
  -H "x-operator-name: 品控主管" \
  -d '{
    "sourceType": "store_complaint",
    "sourceId": "CP20240115002",
    "batchNo": "BATCH20240115001",
    "potNo": "POT002",
    "storeCode": "ST004",
    "storeName": "深圳南山门店",
    "productName": "糖醋排骨",
    "actionType": "receipt_submit",
    "priority": "normal",
    "maxRetryCount": 3,
    "retryInterval": 10,
    "payload": {"complaintId": "CP20240115002"}
  }'

# 获取队列项ID
QUEUE_ID=$(curl -s http://localhost:3000/api/queue | jq -r '.data.items[0].id')

# 开始处理
curl -X POST http://localhost:3000/api/queue/$QUEUE_ID/start \
  -H "x-operator-name: 品控主管"

# 标记失败（触发重试）
curl -X POST http://localhost:3000/api/queue/$QUEUE_ID/retry \
  -H "Content-Type: application/json" \
  -H "x-operator-name: 品控主管" \
  -d '{"error": "外部系统调用超时", "errorCode": "NETWORK_ERROR"}'

# 查看状态（应为 waiting_retry）
curl http://localhost:3000/api/queue/$QUEUE_ID | jq '.data.status'
```

#### 场景2：重试超限进入死信队列

```bash
# 再次失败2次，达到最大重试次数
curl -X POST http://localhost:3000/api/queue/$QUEUE_ID/start \
  -H "x-operator-name: 品控主管"
curl -X POST http://localhost:3000/api/queue/$QUEUE_ID/retry \
  -H "Content-Type: application/json" \
  -H "x-operator-name: 品控主管" \
  -d '{"error": "外部系统调用超时", "errorCode": "NETWORK_ERROR"}'

curl -X POST http://localhost:3000/api/queue/$QUEUE_ID/start \
  -H "x-operator-name: 品控主管"
curl -X POST http://localhost:3000/api/queue/$QUEUE_ID/retry \
  -H "Content-Type: application/json" \
  -H "x-operator-name: 品控主管" \
  -d '{"error": "外部系统调用超时", "errorCode": "NETWORK_ERROR"}'

# 查看死信队列
curl http://localhost:3000/api/queue/dead-letter
```

#### 场景3：人工接管处理

```bash
# 转人工处理
curl -X POST http://localhost:3000/api/queue/$QUEUE_ID/manual \
  -H "Content-Type: application/json" \
  -H "x-operator-id: operator-001" \
  -H "x-operator-name: 品控主管" \
  -d '{"remark": "系统异常，需要人工核实"}'

# 人工补偿入账
curl -X POST http://localhost:3000/api/queue/$QUEUE_ID/compensate \
  -H "Content-Type: application/json" \
  -H "x-operator-id: operator-001" \
  -H "x-operator-name: 品控主管" \
  -d '{
    "result": {
      "method": "manual_transfer",
      "amount": 25.00,
      "transferTime": "2024-01-16 10:30:00",
      "operator": "李主管"
    },
    "remark": "已通过银行转账完成补偿"
  }'
```

### 批次回查：问题批次关联查询

```bash
# 按批次号查询所有关联记录
curl "http://localhost:3000/api/batch/query?batchNo=BATCH20240115001"

# 按批次+锅次查询
curl "http://localhost:3000/api/batch/query?batchNo=BATCH20240115001&potNo=POT002"
```

返回数据包含：
- 留样标签分布（各门店领取情况）
- 温度记录（正常/异常）
- 门店投诉
- 退款流水
- 盘点差异
- 受影响门店汇总

### 改判场景：修改判定不覆盖原始证据

```bash
# 获取队列项ID
QUEUE_ID=$(curl -s http://localhost:3000/api/queue | jq -r '.data.items[0].id')

# 改判（升级优先级）
curl -X POST http://localhost:3000/api/queue/$QUEUE_ID/rejudge \
  -H "Content-Type: application/json" \
  -H "x-operator-id: director-001" \
  -H "x-operator-name: 品控总监" \
  -d '{
    "updates": {"priority": "high"},
    "remark": "客诉升级，需要优先处理"
  }'

# 查看改判前后差异
curl http://localhost:3000/api/audit/entity/compensation_queue/$QUEUE_ID
```

### 数据导出

```bash
# 导出全部队列数据
curl -X POST http://localhost:3000/api/queue/export \
  -H "Content-Type: application/json"

# 导出死信队列
curl -X POST http://localhost:3000/api/queue/export/dead-letter \
  -H "Content-Type: application/json"

# 导出批次关联数据
curl -X POST http://localhost:3000/api/batch/export \
  -H "Content-Type: application/json" \
  -d '{"batchNo": "BATCH20240115001", "potNo": "POT002"}'
```

导出文件保存在 `exports/` 目录下。

## 运行测试

测试重点：**状态变化** 和 **幂等性**

```bash
# 运行全部测试
npm test

# 监听模式运行测试
npm run test:watch
```

测试用例覆盖：
- 幂等性：重复提交相同回执不创建重复记录
- 状态流转：pending → processing → success/waiting_retry/permanent_failed
- 重试机制：失败后自动进入等待重试，超限进入死信
- 人工处理：转人工、人工补偿、关闭
- 改判操作：记录审计日志，不覆盖原始数据
- 统计查询：各状态数量统计正确
- 死信队列：只返回永久失败记录
- 分页筛选：按批次、状态等筛选

## API 文档

### 队列管理 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/queue/submit` | 提交回执 |
| GET | `/api/queue` | 队列列表 |
| GET | `/api/queue/statistics` | 统计信息 |
| GET | `/api/queue/dead-letter` | 死信队列 |
| GET | `/api/queue/:id` | 队列详情 |
| POST | `/api/queue/:id/start` | 开始处理 |
| POST | `/api/queue/:id/success` | 标记成功 |
| POST | `/api/queue/:id/retry` | 标记重试 |
| POST | `/api/queue/:id/manual` | 转人工处理 |
| POST | `/api/queue/:id/compensate` | 人工补偿 |
| POST | `/api/queue/:id/close` | 关闭 |
| POST | `/api/queue/:id/rejudge` | 改判 |
| GET | `/api/queue/:id/audit-logs` | 审计日志 |
| POST | `/api/queue/export` | 导出队列 |
| POST | `/api/queue/export/dead-letter` | 导出死信 |

### 批次查询 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/batch/query` | 批次关联查询 |
| POST | `/api/batch/inquiry` | 创建查询任务 |
| GET | `/api/batch/inquiry` | 查询任务列表 |
| GET | `/api/batch/inquiry/:id` | 查询任务详情 |
| POST | `/api/batch/inquiry/:id/complete` | 完成查询 |
| POST | `/api/batch/export` | 导出批次数据 |

### 审计日志 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/audit/entity/:type/:id` | 实体审计日志 |
| GET | `/api/audit/operation/:type` | 操作类型日志 |
| POST | `/api/audit/compare` | 版本对比 |

## 队列状态说明

| 状态 | 说明 | 品控主管关注 |
|------|------|-------------|
| `pending` | 待处理 | 新提交，等待处理 |
| `processing` | 处理中 | 正在执行 |
| `waiting_retry` | 等待重试 | **可重试分类** - 失败后等待自动重试 |
| `waiting_manual` | 等待人工 | 需要人工介入处理 |
| `compensated` | 已补偿 | 人工补偿完成 |
| `permanent_failed` | 永久失败 | **死信处理** - 重试超限，需人工关注 |
| `success` | 成功 | 处理完成 |
| `closed` | 已关闭 | 无需处理 |

## 数据模型

### 核心表结构

- **compensation_queue**：补偿队列表
  - `idempotent_key`：幂等键，防止重复提交
  - `status`：状态
  - `retry_count`：已重试次数
  - `max_retry_count`：最大重试次数
  - `next_retry_time`：下次重试时间
  - `last_error`：最后错误信息
  - `payload`：业务数据（JSON）
  - `source_type/source_id`：来源标识

- **audit_logs**：审计日志表
  - `operation_type`：操作类型
  - `entity_type/entity_id`：实体标识
  - `old_value/new_value`：新旧值
  - `diff_detail`：详细差异（JSON）
  - `operator_id/operator_name`：操作人

- **sample_labels**：留样标签
  - `import_source_id`：导入来源
  - `source_line_number`：原始行号
  - `source_raw_data`：原始数据（不覆盖）

## 项目结构

```
.
├── src/
│   ├── index.js              # 服务入口
│   ├── config/
│   │   └── database.js       # 数据库配置
│   ├── constants/
│   │   └── index.js          # 常量定义
│   ├── services/
│   │   ├── compensationQueueService.js  # 队列服务
│   │   ├── auditService.js             # 审计服务
│   │   ├── batchInquiryService.js      # 批次查询
│   │   ├── importService.js           # 导入服务
│   │   └── exportService.js          # 导出服务
│   ├── routes/
│   │   ├── queue.js        # 队列路由
│   │   ├── batch.js        # 批次路由
│   │   └── audit.js        # 审计路由
│   └── worker/
│       └── index.js         # 异步任务Worker
├── scripts/
│   ├── init-db.js        # 数据库初始化
│   └── seed-data.js      # 样例数据
├── tests/
│   ├── setup.js          # 测试配置
│   └── queue.test.js     # 队列测试
├── data/                  # 数据库文件
├── exports/               # 导出文件
├── knexfile.js           # Knex配置
├── jest.config.js        # Jest配置
├── package.json          # 项目配置
└── README.md             # 本文档
```

## 注意事项

1. **原始证据保留**：所有导入数据都会保留 `source_raw_data` 字段，改判操作只更新标准字段，不覆盖原始数据
2. **幂等性**：提交回执时使用 `source_type + source_id + action_type` 生成幂等键
3. **恢复后续跑**：Worker 重启后会继续处理 `waiting_retry` 状态的任务
4. **品控主管视角**：重点关注 `waiting_retry`（可重试）、`permanent_failed`（死信）、`waiting_manual`（待人工）
