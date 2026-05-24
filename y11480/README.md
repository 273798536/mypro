# 中央厨房留样异常回执状态机 API

## 项目概述

本项目是一个用于追踪中央厨房留样异常回执的状态机后端服务，支持：
- 接收留样标签、温度记录、门店投诉、主管批注
- 批次状态追踪（创建 → 附件上传 → 复核 → 冻结/结算 → 撤回 → 归档）
- 同锅次门店回查功能
- 幂等性处理（重复请求只更新同一条记录）
- 脏记录识别与处理（缺字段、跨日、改名、金额/数量冲突）
- 四级权限控制（录入、复核、主管、只读）
- Excel 导出汇总功能

## 技术栈

- **后端框架**: FastAPI 0.104.1
- **数据库**: SQLAlchemy 2.0 + SQLite
- **认证**: JWT + OAuth2
- **导出**: Pandas + OpenPyXL
- **测试**: Pytest + HTTPX

## 快速开始

### 1. 环境准备

```bash
# 创建虚拟环境
python3 -m venv venv
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt
```

### 2. 初始化数据库和默认用户

```bash
python init_db.py
```

系统会创建以下默认用户：

| 用户名 | 密码 | 角色 | 权限说明 |
|--------|------|------|----------|
| supervisor | supervisor123 | 品控主管 | 所有权限，包括冻结、结算、撤回、归档 |
| reviewer | reviewer123 | 复核员 | 录入、复核操作 |
| data_entry | data_entry123 | 数据录入员 | 仅录入数据 |
| readonly | readonly123 | 只读用户 | 仅查看权限 |

### 3. 启动服务

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

服务启动后访问：
- API 文档: http://localhost:8000/docs
- 健康检查: http://localhost:8000/health

## 主流程操作指南

### 步骤1: 登录获取 Token

```bash
# 使用录入员登录
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=data_entry&password=data_entry123"
```

### 步骤2: 创建批次（附带受影响门店）

```bash
TOKEN="your_token_here"

curl -X POST "http://localhost:8000/api/v1/batches/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "batch_no": "BATCH-20240115-001",
    "pot_no": "POT-A-01",
    "product_name": "红烧肉",
    "production_date": "2024-01-15T08:00:00",
    "affected_stores": [
      {"store_name": "朝阳门店", "store_code": "STORE-001", "quantity_received": 50},
      {"store_name": "海淀门店", "store_code": "STORE-002", "quantity_received": 30},
      {"store_name": "西城门店", "store_code": "STORE-003", "quantity_received": 40}
    ]
  }'
```

### 步骤3: 上传留样标签

```bash
curl -X POST "http://localhost:8000/api/v1/batches/1/sample-labels" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "label_code": "LABEL-20240115-001",
    "sample_time": "2024-01-15T10:30:00",
    "sampler": "张三",
    "sample_location": "中央厨房冷藏柜A区",
    "quantity": 0.5,
    "unit": "kg",
    "storage_condition": "0-4℃冷藏",
    "idempotency_key": "label-BATCH-20240115-001-01"
  }'
```

### 步骤4: 上传温度记录

```bash
curl -X POST "http://localhost:8000/api/v1/batches/1/temperature-records" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "record_time": "2024-01-15T11:00:00",
    "temperature": 4.2,
    "measure_point": "留样柜上层",
    "recorder": "李四",
    "is_abnormal": false,
    "idempotency_key": "temp-BATCH-20240115-001-01"
  }'
```

### 步骤5: 上传门店投诉

```bash
curl -X POST "http://localhost:8000/api/v1/batches/1/store-complaints" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "store_name": "朝阳门店",
    "store_code": "STORE-001",
    "complaint_time": "2024-01-16T09:15:00",
    "complaint_type": "异味",
    "complaint_content": "顾客反映食用后出现肠胃不适，怀疑产品有异味",
    "quantity": 3,
    "amount": 90.0,
    "contact_person": "王店长",
    "contact_phone": "13800138000",
    "idempotency_key": "complaint-BATCH-20240115-001-01"
  }'
```

### 步骤6: 复核员开始复核

```bash
# 使用复核员登录获取新Token
REVIEWER_TOKEN="reviewer_token_here"

curl -X POST "http://localhost:8000/api/v1/batches/1/start-review" \
  -H "Authorization: Bearer $REVIEWER_TOKEN"
```

### 步骤7: 复核完成

```bash
curl -X POST "http://localhost:8000/api/v1/batches/1/review" \
  -H "Authorization: Bearer $REVIEWER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "review_result": "需进一步调查",
    "review_comment": "材料基本齐全，但投诉情况需进一步核实"
  }'
```

### 步骤8: 主管冻结批次

```bash
SUPERVISOR_TOKEN="supervisor_token_here"

curl -X POST "http://localhost:8000/api/v1/batches/1/freeze" \
  -H "Authorization: Bearer $SUPERVISOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "接到多起投诉，需暂停结算进行调查"}'
```

### 步骤9: 主管添加批注

```bash
curl -X POST "http://localhost:8000/api/v1/batches/1/supervisor-comments" \
  -H "Authorization: Bearer $SUPERVISOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "comment_type": "调查指示",
    "content": "请品控部门立即前往朝阳门店取样，并联系疾控中心进行检测",
    "attachment_urls": ["http://example.com/complaint-report.pdf"]
  }'
```

### 步骤10: 解冻并结算

```bash
# 解冻
curl -X POST "http://localhost:8000/api/v1/batches/1/unfreeze?reason=调查完成" \
  -H "Authorization: Bearer $SUPERVISOR_TOKEN"

# 结算
curl -X POST "http://localhost:8000/api/v1/batches/1/settle" \
  -H "Authorization: Bearer $SUPERVISOR_TOKEN"

# 归档
curl -X POST "http://localhost:8000/api/v1/batches/1/archive" \
  -H "Authorization: Bearer $SUPERVISOR_TOKEN"
```

## 同锅次门店回查

查询同一锅次分发到了哪些门店：

```bash
curl "http://localhost:8000/api/v1/batches/pot/POT-A-01/stores" \
  -H "Authorization: Bearer $TOKEN"
```

返回结果会包含该锅次下所有批次的受影响门店（去重后）。

## 幂等性验证

**重复请求测试：**

```bash
# 第一次请求
curl -X POST "http://localhost:8000/api/v1/batches/1/sample-labels" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "label_code": "LABEL-TEST",
    "sample_time": "2024-01-15T10:30:00",
    "idempotency_key": "idem-test-001"
  }'

# 第二次相同请求（带相同idempotency_key）
curl -X POST "http://localhost:8000/api/v1/batches/1/sample-labels" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "label_code": "LABEL-TEST",
    "sample_time": "2024-01-15T10:30:00",
    "idempotency_key": "idem-test-001"
  }'
```

**预期结果：** 两次请求返回相同的记录 ID，数据库中只有一条记录。

## 制造异常场景

### 场景1: 缺字段的脏记录

```bash
curl -X POST "http://localhost:8000/api/v1/batches/1/sample-labels" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sample_time": "2024-01-15T10:30:00",
    "idempotency_key": "dirty-missing-field"
  }'
```

查看脏记录：
```bash
curl "http://localhost:8000/api/v1/batches/1/dirty-records" \
  -H "Authorization: Bearer $TOKEN"
```

### 场景2: 跨日记录

```bash
curl -X POST "http://localhost:8000/api/v1/batches/1/temperature-records" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "record_time": "2024-01-20T11:00:00",
    "temperature": 5.0,
    "idempotency_key": "dirty-cross-date"
  }'
```

### 场景3: 金额冲突

```bash
# 第一次上传
curl -X POST "http://localhost:8000/api/v1/batches/1/store-complaints" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "store_name": "测试门店",
    "complaint_time": "2024-01-16T09:00:00",
    "complaint_content": "测试投诉",
    "amount": 100.0,
    "idempotency_key": "dirty-amount-conflict"
  }'

# 第二次更新（金额变更）
curl -X POST "http://localhost:8000/api/v1/batches/1/store-complaints" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "store_name": "测试门店",
    "complaint_time": "2024-01-16T09:00:00",
    "complaint_content": "测试投诉更新",
    "amount": 200.0,
    "idempotency_key": "dirty-amount-conflict"
  }'
```

## 导出 Excel 汇总

```bash
curl -X POST "http://localhost:8000/api/v1/export/excel" \
  -H "Authorization: Bearer $SUPERVISOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "start_date": "2024-01-01T00:00:00",
    "end_date": "2024-12-31T23:59:59"
  }' --output export_result.xlsx
```

导出的 Excel 包含以下工作表：
- **批次汇总**: 批次基本信息、状态、冻结前后状态、人工理由等
- **留样标签**: 所有留样记录明细
- **温度记录**: 所有温度记录
- **门店投诉**: 投诉明细
- **受影响门店**: 各门店收货情况
- **主管批注**: 主管意见
- **状态变更历史**: 完整的状态流转记录

## 运行测试

```bash
# 运行所有测试
pytest -v

# 运行状态机测试
pytest test_state_machine.py -v

# 运行幂等性测试
pytest test_idempotency.py -v

# 运行权限测试
pytest test_permissions.py -v

# 运行脏记录测试
pytest test_dirty_records.py -v

# 生成测试报告
pytest -v --tb=short
```

## 核心模块说明

| 模块 | 文件 | 说明 |
|------|------|------|
| 状态机 | [state_machine.py](app/state_machine.py) | 状态流转规则和校验 |
| 幂等性 | [idempotency.py](app/idempotency.py) | 重复请求处理 |
| 脏记录 | [dirty_records.py](app/dirty_records.py) | 异常数据检测 |
| 权限控制 | [security.py](app/security.py) | 用户认证和角色权限 |
| 导出服务 | [export_service.py](app/export_service.py) | Excel 汇总导出 |
| 数据模型 | [models.py](app/models.py) | 数据库表结构 |
| API 路由 | [routers/](app/routers/) | 接口定义 |

## 状态流转图

```
创建(CREATED) → 附件上传(ATTACHMENTS_UPLOADED) → 复核中(REVIEWING) → 已复核(REVIEWED) → 已结算(SETTLED) → 已归档(ARCHIVED)
                          ↓                    ↓                    ↓
                      冻结(FROZEN)          冻结(FROZEN)          冻结(FROZEN)
                          ↓                    ↓                    ↓
                      已归档(ARCHIVED)      已归档(ARCHIVED)      已归档(ARCHIVED)

任意状态(除已归档) → 撤回(WITHDRAWN) → 已归档(ARCHIVED)
                                    → 创建(CREATED)  [撤回后可重新开始]
```

## 权限矩阵

| 操作 | 录入员 | 复核员 | 主管 | 只读 |
|------|--------|--------|------|------|
| 创建批次 | ✓ | ✓ | ✓ | ✗ |
| 上传附件 | ✓ | ✓ | ✓ | ✗ |
| 开始复核 | ✗ | ✓ | ✓ | ✗ |
| 完成复核 | ✗ | ✓ | ✓ | ✗ |
| 冻结批次 | ✗ | ✗ | ✓ | ✗ |
| 解冻批次 | ✗ | ✗ | ✓ | ✗ |
| 结算批次 | ✗ | ✗ | ✓ | ✗ |
| 撤回批次 | ✗ | ✗ | ✓ | ✗ |
| 归档批次 | ✗ | ✗ | ✓ | ✗ |
| 主管批注 | ✗ | ✗ | ✓ | ✗ |
| 查看数据 | ✓ | ✓ | ✓ | ✓ |
| 导出数据 | ✗ | ✓ | ✓ | ✗ |
