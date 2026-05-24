# 家电安装回访重试补偿队列 API

解决家电安装场景下的改约、二次上门、差评补偿自动化处理问题。

## 核心能力

- **多源数据整合**: 预约单、师傅定位、用户评价、退款流水合并分析
- **完整状态追踪**: 每一步状态变化都记录时间、操作者、原因
- **原始证据保留**: 导入时保存来源文件、原始行号，改判不覆盖
- **智能重试机制**: 区分等重试、等人工、永久失败三类
- **区域售后视角**: 可重试分类、死信处理、恢复积压一目了然

## 快速开始

### 1. 环境准备

```bash
# 安装依赖
pip install poetry
poetry install

# 复制环境配置
cp .env.example .env
```

### 2. 从空库启动

数据库会在首次运行时自动创建，无需手动初始化。

```bash
# 启动服务
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

打开浏览器访问: http://localhost:8000/docs 查看 Swagger API 文档

### 3. 加载样例数据

新开一个终端，运行样例数据脚本：

```bash
poetry run python sample_data.py
```

你会看到类似输出：
```
导入预约单数据...
  成功: 5, 失败: 0
导入师傅定位数据...
  成功: 5, 失败: 0
导入用户评价数据...
  成功: 5, 失败: 0
导入退款流水数据...
  成功: 3, 失败: 0

从原始数据构建补偿队列...
  APPT001: 改约=False, 二次上门=False, 差评=False
  APPT002: 改约=True, 二次上门=False, 差评=True
  APPT003: 改约=False, 二次上门=True, 差评=True
  APPT004: 改约=True, 二次上门=True, 差评=True
  APPT005: 改约=False, 二次上门=False, 差评=False
```

### 4. 走主流程

使用 curl 或 Swagger 文档测试主流程：

```bash
# 查看队列列表
curl http://localhost:8000/api/v1/queue

# 查看 APPT002 详情（含状态历史）
curl http://localhost:8000/api/v1/queue/1

# 提交回执
curl -X POST http://localhost:8000/api/v1/queue/1/receipt \
  -H "Content-Type: application/json" \
  -d '{"receipt_data": {"回执编号": "RCPT001", "回访结果": "用户同意补偿"}}'

# 开始补偿
curl -X POST http://localhost:8000/api/v1/queue/1/compensation/start \
  -H "Content-Type: application/json" \
  -d '{"amount": 50, "reason": "改约未提前通知", "operator": "zhangsan"}'

# 完成补偿
curl -X POST "http://localhost:8000/api/v1/queue/1/compensation/complete?operator=finance"

# 关闭队列
curl -X POST http://localhost:8000/api/v1/queue/5/close \
  -H "Content-Type: application/json" \
  -d '{"reason": "回访无异常，无需补偿", "operator": "zhangsan"}'
```

### 5. 制造异常场景

```bash
# 标记可重试失败（网络超时等临时问题）
curl -X POST "http://localhost:8000/api/v1/queue/3/fail?error=网络超时&fail_category=retryable&operator=system"

# 标记需要人工处理（用户对金额有异议）
curl -X POST "http://localhost:8000/api/v1/queue/2/fail?error=用户对补偿方案有异议&fail_category=need_manual&operator=system"

# 标记永久失败（订单已退款，无法补偿）
curl -X POST "http://localhost:8000/api/v1/queue/4/fail?error=订单已完成退款，无法重复补偿&fail_category=permanent&operator=system"

# 手动触发重试
curl -X POST "http://localhost:8000/api/v1/queue/3/retry?operator=zhangsan"

# 获取待重试列表
curl "http://localhost:8000/api/v1/queue/retry/available?batch_size=10"
```

### 6. 查看区域售后报表

```bash
# 各区域状态汇总
curl http://localhost:8000/api/v1/reports/status-summary

# 可重试队列
curl http://localhost:8000/api/v1/reports/retryable-items

# 死信队列（永久失败）
curl http://localhost:8000/api/v1/reports/dead-letter

# 待人工处理
curl http://localhost:8000/api/v1/reports/manual-pending

# 恢复积压情况
curl http://localhost:8000/api/v1/reports/recovery-backlog

# 补偿汇总
curl http://localhost:8000/api/v1/reports/compensation-summary

# 导出数据（含状态历史）
curl "http://localhost:8000/api/v1/reports/export?include_history=true"

# 原始数据审计（查看某预约单的所有来源数据）
curl http://localhost:8000/api/v1/reports/raw-data-audit/APPT002
```

## API 端点速查

### 数据导入
- `POST /api/v1/imports/upload` - 上传 Excel/CSV 文件导入
- `POST /api/v1/imports/{source_type}` - API 数据导入

### 补偿队列
- `POST /api/v1/queue/build/{appointment_no}` - 从原始数据构建队列项
- `GET /api/v1/queue` - 队列列表
- `GET /api/v1/queue/{id}` - 队列详情（含状态历史）
- `POST /api/v1/queue/{id}/receipt` - 提交回执
- `POST /api/v1/queue/{id}/process` - 标记处理中
- `POST /api/v1/queue/{id}/fail` - 标记失败（需指定失败分类）
- `POST /api/v1/queue/{id}/retry` - 手动重试
- `GET /api/v1/queue/retry/available` - 获取待自动重试列表
- `POST /api/v1/queue/{id}/manual` - 人工接管
- `POST /api/v1/queue/{id}/compensation/start` - 开始补偿
- `POST /api/v1/queue/{id}/compensation/complete` - 完成补偿
- `POST /api/v1/queue/{id}/close` - 关闭队列
- `GET /api/v1/queue/{id}/history` - 状态历史

### 区域售后报表
- `GET /api/v1/reports/status-summary` - 区域状态汇总
- `GET /api/v1/reports/retryable-items` - 可重试队列
- `GET /api/v1/reports/dead-letter` - 死信队列
- `GET /api/v1/reports/manual-pending` - 待人工处理
- `GET /api/v1/reports/recovery-backlog` - 恢复积压
- `GET /api/v1/reports/compensation-summary` - 补偿汇总
- `GET /api/v1/reports/export` - 数据导出
- `GET /api/v1/reports/raw-data-audit/{appointment_no}` - 原始数据审计

## 队列状态流转

```
PENDING (待处理)
    │
    ▼ 提交回执
PROCESSING (处理中)
    │
    ├─────┬─────────────────────┐
    │     │                     │
    │     ▼ 可重试              ▼ 需人工              ▼ 永久失败
    │ WAITING_RETRY        WAITING_MANUAL        PERMANENT_FAILED
    │     │                     │                     │
    │     ▼ 自动/手动重试       ▼ 人工处理            │
    └─────┴─────────────────────┴─────────────────────┘
    │
    ▼ 开始补偿
COMPENSATING (补偿中)
    │
    ▼ 完成补偿
COMPLETED (已完成)
    │
    ▼ 关闭
CLOSED (已关闭)
```

## 失败分类说明

| 分类 | 说明 | 后续处理 |
|------|------|----------|
| `retryable` | 可重试（网络超时、限流等） | 自动重试，达到上限后转永久失败 |
| `need_manual` | 需人工介入（金额异议、用户申诉等） | 人工接管处理 |
| `permanent` | 永久失败（业务规则不满足） | 进入死信队列，需人工确认后关闭 |

## 运行测试

```bash
# 运行所有测试
poetry run pytest tests/ -v

# 运行特定测试
poetry run pytest tests/test_queue_status.py -v
poetry run pytest tests/test_idempotency.py -v
```

## 测试重点

### 1. 状态变化测试
- 验证所有合法的状态转移都能正确执行
- 验证非法状态转移会被拒绝
- 验证每次状态变化都会生成历史记录

### 2. 幂等性测试
- 重复提交同一回执不会重复处理
- 重复创建同一队列项不会产生重复数据
- 重复触发重试不会导致状态异常

### 3. 数据完整性测试
- 导入的原始数据不会被修改
- 状态历史记录完整（时间、操作者、原因）
- 补偿金额准确计算

## 配置说明

在 `.env` 文件中可配置：

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `DATABASE_URL` | 数据库连接 | sqlite:///./compensation_queue.db |
| `REDIS_URL` | Redis 连接（用于异步任务） | redis://localhost:6379/0 |
| `MAX_RETRY_TIMES` | 最大重试次数 | 3 |
| `RETRY_INTERVAL_MINUTES` | 重试间隔（分钟） | 30 |
