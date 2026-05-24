# 酒店前台夜审重试补偿队列服务

解决半夜换房和延住导致房费、押金、发票不同步的问题，提供完整的导入、队列处理、重试补偿、人工介入和导出功能。

## 系统架构

```
┌─────────────┐     ┌─────────────────────┐     ┌──────────────┐
│  导入数据    │────▶│  补偿队列 (Celery)  │────▶│  外部系统    │
│ (入住/押金/ │     └─────────┬───────────┘     └──────────────┘
│  换房/盘点) │               │
└─────────────┘               ▼
                    ┌─────────────────────┐
                    │  状态机 & 重试逻辑  │
                    │  - 等重试           │
                    │  - 等人工           │
                    │  - 永久失败         │
                    └─────────┬───────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │  操作轨迹 & 导出    │
                    │  - 夜审报表         │
                    │  - 可重试分类       │
                    │  - 死信处理         │
                    │  - 恢复后续跑       │
                    └─────────────────────┘
```

## 核心状态流转

```
PENDING (待处理)
    ↓
PROCESSING (处理中)
    ├─→ 成功 → COMPENSATED (已补偿)
    ├─→ 可重试失败 → WAITING_RETRY (等重试) ──┐
    │                                         │ 定时重试/手动触发
    │                                         └──→ PENDING
    ├─→ 需人工 → WAITING_MANUAL (等人工)
    │       ↓ 人工接管
    │   MANUAL_TAKEOVER (人工接管中)
    │       ↓ 人工补偿
    │   COMPENSATED (已补偿)
    └─→ 永久失败 → PERMANENT_FAILED (永久失败)

任何状态(除已补偿/已关闭) → CLOSED (已关闭)
```

## 快速开始

### 1. 环境准备

**依赖服务:**
- PostgreSQL 12+
- Redis 6+

**安装依赖:**
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**配置环境变量:**
```bash
cp .env.example .env
# 编辑 .env 文件，配置数据库和Redis连接
```

### 2. 数据库初始化

```bash
# 创建数据库
psql -U postgres -c "CREATE DATABASE hotel_night_audit;"

# 表结构会在首次启动时自动创建
```

### 3. 启动服务

**启动 API 服务:**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**启动 Celery Worker:**
```bash
celery -A app.celery_app worker --loglevel=info -B
```

**访问 API 文档:**
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 主流程演示

### 步骤1: 准备样例数据

系统已内置样例数据，可通过 `sample_data.py` 查看:
```bash
python sample_data.py
```

### 步骤2: 导入数据

**导入入住单:**
```bash
curl -X POST http://localhost:8000/api/v1/import/batch \
  -H "Content-Type: application/json" \
  -d '{
    "source_type": "check_in",
    "source_file": "入住单_20240520.xlsx",
    "imported_by": "财务小张",
    "records": [
      {
        "check_in_no": "CI20240520001",
        "room_no": "1001",
        "guest_name": "张三",
        "check_in_date": "2024-05-20",
        "check_out_date": "2024-05-22",
        "amount": 580.0,
        "deposit_amount": 600.0,
        "invoice_amount": 580.0
      }
    ]
  }'
```

**导入换房记录:**
```bash
curl -X POST http://localhost:8000/api/v1/import/batch \
  -H "Content-Type: application/json" \
  -d '{
    "source_type": "room_change",
    "source_file": "换房记录_20240521.xlsx",
    "records": [
      {
        "check_in_no": "CI20240520001",
        "old_room_no": "1001",
        "new_room_no": "1502",
        "guest_name": "张三",
        "room_price_diff": 120.0,
        "change_time": "2024-05-21 01:45:00",
        "change_reason": "空调故障"
      }
    ]
  }'
```

**导入盘点差异 (坏果扣款等):**
```bash
curl -X POST http://localhost:8000/api/v1/import/batch \
  -H "Content-Type: application/json" \
  -d '{
    "source_type": "inventory_diff",
    "source_file": "盘点差异_20240521.xlsx",
    "records": [
      {
        "check_in_no": "CI20240520001",
        "room_no": "1502",
        "guest_name": "张三",
        "diff_amount": -30.0,
        "diff_type": "坏果扣款",
        "diff_reason": "水果盘有坏果，客人投诉减免",
        "audit_time": "2024-05-21 03:30:00"
      }
    ]
  }'
```

### 步骤3: 查看补偿队列

```bash
# 查看所有补偿记录
curl http://localhost:8000/api/v1/compensation/

# 按状态筛选
curl "http://localhost:8000/api/v1/compensation/?status=pending"
```

### 步骤4: 查看状态流转轨迹

```bash
# 替换 COMPxxxxxx 为实际的补偿单号
curl http://localhost:8000/api/v1/compensation/COMPxxxxxx/transitions
curl http://localhost:8000/api/v1/compensation/COMPxxxxxx/logs
```

### 步骤5: 查看导入原始证据

```bash
# 查看导入批次记录
curl http://localhost:8000/api/v1/import/batch/BATCHxxxxxx

# 查看单条导入记录（含原始数据）
curl http://localhost:8000/api/v1/import/records/1
```

## 制造异常场景

### 场景1: 可重试失败（网络超时）

系统内置的 `simulate_external_system_call` 函数会随机产生失败:
- 40% 概率产生可重试失败（网络超时）
- 自动进入 WAITING_RETRY 状态
- 定时任务每60秒自动重试

### 场景2: 需要人工介入（数据校验问题）

- 20% 概率产生需人工失败（数据校验不通过）
- 自动进入 WAITING_MANUAL 状态
- 需要人工接管后处理

**人工接管操作:**
```bash
curl -X POST http://localhost:8000/api/v1/compensation/COMPxxxxxx/manual-takeover \
  -H "Content-Type: application/json" \
  -d '{
    "operator": "财务小张",
    "judgment_remark": "经核实，数据无误，应予补偿"
  }'
```

**人工补偿:**
```bash
curl -X POST http://localhost:8000/api/v1/compensation/COMPxxxxxx/compensate \
  -H "Content-Type: application/json" \
  -d '{
    "operator": "财务小张",
    "compensation_remark": "已手动入账至财务系统"
  }'
```

### 场景3: 永久失败（数据不存在）

- 10% 概率产生永久失败（入住单不存在）
- 自动进入 PERMANENT_FAILED 状态
- 可手动触发重试或关闭

**手动重试:**
```bash
curl -X POST http://localhost:8000/api/v1/compensation/COMPxxxxxx/retry \
  -H "Content-Type: application/json" \
  -d '{
    "operator": "财务小张",
    "remark": "数据已修复，重新尝试"
  }'
```

**关闭记录:**
```bash
curl -X POST http://localhost:8000/api/v1/compensation/COMPxxxxxx/close \
  -H "Content-Type: application/json" \
  -d '{
    "operator": "财务主管",
    "close_remark": "重复记录，不予补偿"
  }'
```

### 场景4: 服务恢复续跑

模拟服务崩溃（Celery worker 中断）:
1. 启动处理任务
2. 中途终止 Celery worker
3. 记录停留在 PROCESSING 状态
4. 重启 Celery worker
5. 恢复任务每5分钟自动检测超时任务（>30分钟）并重置重试

## 导出夜审报表

### 统计概览

```bash
curl http://localhost:8000/api/v1/export/statistics
```

返回示例:
```json
{
  "total_count": 100,
  "pending_count": 10,
  "processing_count": 5,
  "waiting_retry_count": 15,
  "waiting_manual_count": 8,
  "manual_takeover_count": 3,
  "compensated_count": 50,
  "permanent_failed_count": 7,
  "closed_count": 2,
  "total_amount": 58600.0,
  "compensated_amount": 45200.0
}
```

### 导出完整夜审报表

```bash
# 导出所有记录
curl -O http://localhost:8000/api/v1/export/night-audit

# 按状态导出
curl -O "http://localhost:8000/api/v1/export/night-audit?status=waiting_manual"
```

### 导出重点关注报表

**可重试分类报表:**
```bash
curl -O http://localhost:8000/api/v1/export/retryable-classification
```

**死信处理报表:**
```bash
curl -O http://localhost:8000/api/v1/export/dead-letter
```

**恢复后续跑报表（处理中任务检查）:**
```bash
curl -O http://localhost:8000/api/v1/export/recovery
```

## 运行测试

### 状态变化测试

测试核心状态流转逻辑:
```bash
pytest tests/test_compensation_service.py::TestStatusTransitions -v
```

### 幂等性测试

测试重复操作的幂等性:
```bash
pytest tests/test_compensation_service.py::TestIdempotency -v
```

### 异常场景测试

测试非法状态转换:
```bash
pytest tests/test_compensation_service.py::TestInvalidTransitions -v
```

### API 测试

测试所有 API 接口:
```bash
pytest tests/test_api.py -v
```

### 运行全部测试

```bash
pytest tests/ -v --cov=app --cov-report=term-missing
```

## 数据保留说明

### 原始证据不可覆盖

- `import_records.original_data`: 导入时的原始行数据，永久保留
- `import_records.source_file`: 来源文件名
- `import_records.original_row_number`: 原始行号
- `operation_logs.original_data_snapshot`: 操作前的数据快照
- `state_transitions`: 完整的状态流转历史

### 改判记录

当人工改判时，系统会:
1. 在 `judgment_remark` 记录改判说明
2. 在 `judged_by` 和 `judged_at` 记录操作人时间
3. 在 `state_transitions` 记录完整的状态变更
4. 在 `operation_logs` 记录操作快照

## 项目结构

```
.
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI 主入口
│   ├── config.py            # 配置管理
│   ├── database.py          # 数据库连接
│   ├── celery_app.py        # Celery 配置
│   ├── models/
│   │   ├── __init__.py
│   │   └── models.py        # SQLAlchemy 模型
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── schemas.py       # Pydantic Schema
│   ├── services/
│   │   ├── __init__.py
│   │   ├── compensation_service.py  # 补偿核心逻辑
│   │   ├── import_service.py        # 导入服务
│   │   └── export_service.py        # 导出服务
│   ├── tasks/
│   │   ├── __init__.py
│   │   └── compensation_tasks.py    # Celery 异步任务
│   └── api/
│       ├── __init__.py
│       ├── import_data.py   # 导入 API
│       ├── compensation.py  # 补偿队列 API
│       └── export_data.py   # 导出 API
├── tests/
│   ├── __init__.py
│   ├── conftest.py          # pytest 配置
│   ├── test_compensation_service.py
│   └── test_api.py
├── sample_data.py           # 样例数据
├── requirements.txt
├── .env.example
└── README.md
```

## 核心 API 列表

### 导入接口
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/v1/import/batch | 批量导入数据 |
| GET | /api/v1/import/batch/{batch_no} | 获取批次导入记录 |
| GET | /api/v1/import/records/{id} | 获取单条导入记录 |
| GET | /api/v1/import/records | 分页查询导入记录 |

### 补偿队列接口
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/v1/compensation/ | 创建补偿记录 |
| GET | /api/v1/compensation/{no} | 获取补偿详情 |
| GET | /api/v1/compensation/ | 分页查询补偿列表 |
| GET | /api/v1/compensation/{no}/transitions | 获取状态流转 |
| GET | /api/v1/compensation/{no}/logs | 获取操作日志 |
| POST | /api/v1/compensation/{no}/retry | 触发重试 |
| POST | /api/v1/compensation/{no}/manual-takeover | 人工接管 |
| POST | /api/v1/compensation/{no}/compensate | 确认补偿 |
| POST | /api/v1/compensation/{no}/close | 关闭记录 |
| POST | /api/v1/compensation/{no}/process | 触发处理 |

### 导出接口
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/v1/export/statistics | 统计概览 |
| GET | /api/v1/export/night-audit | 夜审报表 |
| GET | /api/v1/export/retryable-classification | 可重试分类报表 |
| GET | /api/v1/export/dead-letter | 死信处理报表 |
| GET | /api/v1/export/recovery | 恢复后续跑报表 |

## 故障排查

### 常见问题

1. **Celery 任务不执行:**
   - 检查 Redis 是否正常运行
   - 确认 worker 是否已启动: `celery -A app.celery_app status`

2. **数据库连接失败:**
   - 检查 PostgreSQL 是否运行
   - 确认 `.env` 中的 DATABASE_URL 配置正确

3. **导出文件为空:**
   - 确认有数据存在
   - 检查 `exports/` 目录权限

### 日志查看

```bash
# 查看 Celery worker 日志
celery -A app.celery_app worker --loglevel=debug

# 查看定时任务状态
celery -A app.celery_app inspect scheduled
```
