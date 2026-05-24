# 财务报销稽核权限追责台账 API

处理发票PDF、差旅申请、付款流水的报销稽核系统，支持批次处理、状态流转、审计追踪。

## 功能特性

### 核心流程
- **草稿 (draft)**: 员工编辑报销单，上传发票
- **提交 (submitted)**: 提交审核，进入审批流程
- **驳回 (rejected)**: 审核不通过，需修改后重提
- **二次确认 (second_confirm)**: 大额或特殊单据需财务经理复核
- **只读审计 (audit_only)**: 审计人员查看，不可修改
- **审批通过 (approved)**: 审核完成，待付款
- **已付款 (paid)**: 款项已支付

### 数据处理
- **批次导入策略**: 同一批数据跑两次可选择：
  - `ignore`: 忽略已存在的数据
  - `overwrite`: 覆盖已有数据
  - `append`: 追加新数据
- **幂等性保证**: 重复请求只更新同一条事实，基于 `idempotency_key`
- **重复检测**: 发票号码+代码、付款流水自动查重

### 审计追踪
- 记录所有状态变更和字段修改
- 保存变更前后值、操作人、时间、IP
- 记录变更原因，便于追溯

### 异步任务处理
- `pending`: 等待处理
- `processing`: 处理中
- `wait_retry`: 等待自动重试（指数退避）
- `wait_manual`: 需人工介入处理
- `permanent_failed`: 永久失败
- `completed`: 完成

### 财务看板重点
- **角色视图**: 按角色统计报销数量、金额、状态分布
- **变更原因**: Top变更原因及涉及金额
- **敏感字段**: 访问统计和脱敏处理
- **异常监控**: 待二次确认、重复发票/付款数量

## 快速开始

### 1. 安装依赖
```bash
pip install -r requirements.txt
```

### 2. 启动服务
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. 访问API文档
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### 4. 运行测试脚本
```bash
python test_api.py
```

## 默认账号

| 用户名 | 密码 | 角色 | 说明 |
|--------|------|------|------|
| admin | admin123 | admin | 系统管理员 |
| finance | finance123 | finance | 财务经理 |
| employee | employee123 | employee | 普通员工 |

## API 使用示例

### 获取Token
```bash
curl -X POST "http://localhost:8000/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=finance&password=finance123"
```

### 批次导入数据
```bash
curl -X POST "http://localhost:8000/batches/import" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d @examples/sample_data.json
```

### 上传发票PDF
```bash
curl -X POST "http://localhost:8000/upload/invoice?reimbursement_id=1" \
  -H "Authorization: Bearer <TOKEN>" \
  -F "file=@invoice.pdf"
```

### 变更状态
```bash
curl -X POST "http://localhost:8000/reimbursements/1/status" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "submitted",
    "reason": "资料齐全",
    "change_reason": "员工提交报销申请"
  }'
```

### 查看审计日志
```bash
curl "http://localhost:8000/reimbursements/1/audit-logs" \
  -H "Authorization: Bearer <TOKEN>"
```

### 财务看板
```bash
curl "http://localhost:8000/finance/dashboard" \
  -H "Authorization: Bearer <TOKEN>"
```

### 导出数据
```bash
curl -X POST "http://localhost:8000/export" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "xlsx",
    "include_sensitive": false,
    "status_filter": ["approved", "paid"],
    "date_from": "2024-01-01T00:00:00"
  }' --output export.xlsx
```

## 失败场景与修正方式

### 场景1: 发票PDF解析失败
**现象**: 上传后字段为空或乱码
**修正**:
```bash
# 1. 查看证据解析结果
GET /evidences/{id}

# 2. 手动更新发票信息
PUT /invoices/{id}

# 3. 重新关联到报销单
POST /reimbursements/{id}/invoices
```

### 场景2: 批次导入部分失败
**现象**: 批次结果中 failed_count > 0
**修正**:
```bash
# 1. 查看失败条目
GET /batches/{id}

# 2. 修正失败数据后单独导入
POST /reimbursements

# 3. 或重新以append策略导入整个批次
POST /batches/import  (strategy: append)
```

### 场景3: 异步任务永久失败
**现象**: 任务状态为 permanent_failed
**修正**:
```bash
# 1. 查看错误详情
GET /tasks/{task_id}

# 2. 人工修正数据后重试
POST /tasks/{task_id}/retry

# 3. 任务重置为pending状态重新处理
```

### 场景4: 重复报销检测
**现象**: 发票标记为 is_duplicate=true
**修正**:
```bash
# 1. 查看重复来源
GET /invoices?duplicate_of={invoice_id}

# 2. 确认是否为真重复
#    - 是: 保留标记，拒绝报销
#    - 否: 手动清除重复标记
PUT /invoices/{id}  {is_duplicate: false}
```

## 报表变化说明

### 导入批次后的变化
| 报表项 | 变化说明 |
|--------|----------|
| 报销单总数 | +created_count |
| 草稿状态数 | +created_count (新建默认为草稿) |
| 角色视图统计 | 对应用户角色的数量增加 |
| 待审核数 | 状态变为submitted后增加 |

### 审批通过后的变化
| 报表项 | 变化说明 |
|--------|----------|
| approved_count | +1 |
| pending_review_count | -1 |
| 总金额 | 该笔金额计入approved总金额 |
| 变更原因统计 | 增加审批相关记录 |

### 发现重复后的变化
| 报表项 | 变化说明 |
|--------|----------|
| duplicate_invoices | +N (发现的重复发票数) |
| duplicate_payments | +N (发现的重复付款数) |
| second_confirm待办 | 可能触发二次确认流程 |

## 项目结构

```
.
├── app/
│   ├── __init__.py
│   ├── main.py           # 主应用和API路由
│   ├── models.py         # 数据库模型
│   ├── schemas.py        # Pydantic数据结构
│   ├── database.py       # 数据库连接配置
│   ├── auth.py           # 认证和权限
│   ├── services.py       # 业务逻辑服务
│   └── pdf_parser.py     # PDF发票解析
├── examples/
│   └── sample_data.json  # 示例数据
├── uploads/              # 上传文件目录
├── test_api.py           # API测试脚本
├── requirements.txt      # 依赖列表
└── README.md             # 本文档
```

## 数据库表结构

- `users`: 用户表（角色、部门、密码哈希）
- `batches`: 批次表（导入批次、策略、统计）
- `reimbursements`: 报销单主表（状态、金额、幂等键）
- `invoices`: 发票明细表（查重标记、PDF哈希）
- `travel_applications`: 差旅申请表
- `payment_flows`: 付款流水表（查重标记）
- `evidences`: 证据文件表（PDF、截图、交接单）
- `audit_logs`: 审计日志表（完整变更记录）
- `async_tasks`: 异步任务表（状态、重试、错误信息）
- `sensitive_field_configs`: 敏感字段配置表

## 注意事项

1. **幂等键设计**: 建议使用业务唯一标识（如"城市+日期+部门+序号"）
2. **敏感字段**: 导出时默认脱敏，需显式指定 include_sensitive=true
3. **状态流转**: 只有draft状态可编辑，其他状态需通过status接口变更
4. **批次策略**: 首次导入用append，修正导入用overwrite，增量导入用ignore
5. **重试机制**: wait_retry自动重试最多3次，之后进入permanent_failed
