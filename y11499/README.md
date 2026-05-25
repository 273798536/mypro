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

### 状态流转规则（非法跳转将被拒绝）

| 当前状态 | 允许转换到 | 说明 |
|---------|-----------|------|
| draft (草稿) | submitted, audit_only | 只能提交或转入只读审计 |
| submitted (已提交) | draft, rejected, second_confirm, approved | 可撤回、驳回、二次确认或直接审批 |
| rejected (已驳回) | draft, submitted | 修改后可重提或回到草稿 |
| second_confirm (二次确认) | submitted, rejected, approved | 复核后可退回到提交、驳回或通过 |
| audit_only (只读审计) | draft | 审计完成后回到草稿 |
| approved (审批通过) | rejected, paid | 付款前仍可驳回或标记已付款 |
| paid (已付款) | - | 终态，不可变更 |

### 角色权限矩阵（状态变更权限）

| 目标状态 | employee | manager | finance | auditor | admin |
|---------|----------|---------|---------|---------|-------|
| draft | ✅ | ✅ | ✅ | ❌ | ✅ |
| submitted | ✅ | ✅ | ✅ | ❌ | ✅ |
| rejected | ❌ | ✅ | ✅ | ❌ | ✅ |
| second_confirm | ❌ | ❌ | ✅ | ❌ | ✅ |
| audit_only | ❌ | ❌ | ❌ | ✅ | ✅ |
| approved | ❌ | ❌ | ✅ | ❌ | ✅ |
| paid | ❌ | ❌ | ✅ | ❌ | ✅ |

> **注意**: 即使角色有权限，也必须遵守状态流转规则。例如：普通员工(employee)虽然有权限改为submitted，但不能直接从draft改为approved（流转规则不允许）。

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
**现象**: 上传后字段为空或乱码，parsed_content 中包含 parse_error

**完整可跟跑修正步骤**:
```bash
# 1. 列出所有证据，找到解析失败的证据ID
GET /evidences?evidence_type=invoice_pdf

# 2. 查看具体证据的解析结果
GET /evidences/{evidence_id}
# 响应示例: { "id": 1, "file_name": "invoice.pdf", "parsed_content": { "parse_error": "..." } }

# 3. 人工校正证据内容
PUT /evidences/{evidence_id}
{
  "ocr_text": "人工校正后的发票文本...",
  "parsed_content": {
    "invoice_number": "12345678",
    "invoice_code": "3100123456",
    "total_amount": 1800.0,
    "manual_fixed": true
  }
}

# 4. 列出该报销单下的所有发票
GET /invoices?reimbursement_id={reimbursement_id}

# 5. 手动更新发票信息
PUT /invoices/{invoice_id}
{
  "invoice_number": "12345678",
  "invoice_code": "3100123456",
  "total_amount": 1698.11,
  "tax_amount": 101.89,
  "amount_with_tax": 1800.0,
  "category": "住宿",
  "expense_type": "hotel"
}

# 6. 如缺少发票，重新添加到报销单（仅限draft或rejected状态）
POST /reimbursements/{reimbursement_id}/invoices
{
  "invoice_number": "12345678",
  "invoice_code": "3100123456",
  "total_amount": 1698.11,
  "tax_amount": 101.89,
  "amount_with_tax": 1800.0,
  "category": "住宿",
  "expense_type": "hotel"
}
```

### 场景2: 批次导入部分失败
**现象**: 批次结果中 failed_count > 0，failed_items 列出具体错误

**完整可跟跑修正步骤**:
```bash
# 1. 列出所有批次，找到失败的批次
GET /batches

# 2. 查看批次详情和失败条目
GET /batches/{batch_id}
# 响应示例: { "failed_items": [ { "index": 2, "error": "...", "reimbursement_no": "..." } ] }

# 3. 查看状态流转规则，确认当前状态可执行的操作
GET /status-transitions

# 4. 方案A: 修正失败数据后单独导入
POST /reimbursements
{
  "purpose": "修正后的报销用途",
  "total_amount": 5680.50,
  ...
}

# 5. 方案B: 重新以append策略导入整个批次（忽略已成功的，只导入失败的）
POST /batches/import
{
  "batch_name": "重新导入-修正版",
  "strategy": "append",
  "reimbursements": [ ... ]
}

# 6. 方案C: 用overwrite策略覆盖整个批次（谨慎使用）
POST /batches/import
{
  "batch_name": "覆盖导入-修正版",
  "strategy": "overwrite",
  "reimbursements": [ ... ]
}
```

### 场景3: 异步任务永久失败
**现象**: 任务状态为 permanent_failed，error_message 包含具体错误

**完整可跟跑修正步骤**:
```bash
# 1. 列出所有永久失败的任务
GET /tasks?status=permanent_failed

# 2. 查看任务错误详情
GET /tasks/{task_id}
# 响应示例: { "error_message": "数据库连接超时", "retry_count": 3 }

# 3. 人工修正相关数据（根据错误信息）
# 例如：修正发票数据、补充缺失字段等
PUT /invoices/{invoice_id}
{ "total_amount": 1800.0 }

# 4. 重置任务状态为pending，重新执行
POST /tasks/{task_id}/retry
# 响应: { "status": "pending", "retry_count": 0 }

# 5. 等待处理完成后轮询状态
GET /tasks/{task_id}
```

### 场景4: 重复报销检测
**现象**: 发票标记为 is_duplicate=true，关联了 duplicate_of

**完整可跟跑修正步骤**:
```bash
# 1. 列出所有重复发票
GET /invoices?is_duplicate=true

# 2. 查看重复来源（哪张发票判定为原始发票）
GET /invoices?duplicate_of={original_invoice_id}

# 3. 查看原始发票详情
GET /invoices/{original_invoice_id}

# 4. 查看被标记为重复的发票详情
GET /invoices/{duplicate_invoice_id}

# 5. 对比两张发票，确认是否为真重复
#    - 真重复: 保留标记，状态变更为rejected驳回报销
POST /reimbursements/{reimbursement_id}/status
{
  "status": "rejected",
  "reason": "发票重复报销",
  "change_reason": "发票号码12345678已在另一笔报销中使用"
}

#    - 假重复（如发票号码相同但实际是不同单据）: 手动清除重复标记
PUT /invoices/{duplicate_invoice_id}
{
  "is_duplicate": false
}
# 审计日志会自动记录此修正操作，包含操作人和原因

# 6. 清除标记后，将报销单从rejected状态重新提交
POST /reimbursements/{reimbursement_id}/status
{
  "status": "submitted",
  "reason": "已核实非重复发票",
  "change_reason": "财务核实后确认发票唯一"
}
```

### 场景5: 状态流转异常（如草稿想直接审批）
**现象**: 状态变更接口返回403，提示不允许转换

**完整可跟跑修正步骤**:
```bash
# 1. 查看当前状态允许的流转路径
GET /status-transitions
# 响应示例: { "draft": [ { "status": "submitted", "allowed_roles": ["employee", "finance"] } ] }

# 2. 确认当前登录用户的角色权限
GET /users/me
# 响应: { "role": "employee", "username": "..." }

# 3. 按合法路径逐步流转
#    草稿 → 提交 → 二次确认 → 审批通过 → 已付款

# 4. 如需要财务审批，切换财务账号操作
curl -X POST /token -d "username=finance&password=finance123"

# 5. 使用财务账号执行审批操作
POST /reimbursements/{id}/status
{
  "status": "approved",
  "reason": "审批通过",
  "change_reason": "财务经理审批同意报销"
}
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
