# 酒店前台夜审异常回执状态机 API

从入住单、押金流水、换房记录开始建账，主管批注可追加，核心动作：批次创建、附件补传、复核改判、冻结结算、撤回归档。

## 功能特性

- **多材料建账**: 入住单、押金流水、换房记录
- **状态机流转**: 草稿 → 提交 → 复核中 → 审批 → 冻结 → 归档
- **脏记录检测**: 缺字段、跨日、改名、金额/数量冲突
- **差异追踪**: 每一步状态变更都可回看前后变化
- **权限控制**: 录入、复核、主管、只读四种角色
- **财务夜审**: 冻结前后对比、人工理由、Excel导出

## 快速开始

### 1. 空库启动

```bash
# 安装依赖
pip install -r requirements.txt

# 启动服务（首次启动自动创建数据库和用户）
python main.py
```

服务启动后访问: http://localhost:8000/docs

### 2. 默认用户

系统自动创建4个测试用户，通过 `X-User-Id` 请求头传递用户ID:

| 用户ID | 用户名 | 角色 | 说明 |
|--------|--------|------|------|
| 1 | admin | 主管 | 所有权限 |
| 2 | reviewer1 | 复核 | 复核、审批、导出 |
| 3 | data_entry1 | 录入 | 创建、编辑、提交 |
| 4 | viewer1 | 只读 | 仅查看 |

### 3. 准备样例数据

```bash
# 安装requests（如果未安装）
pip install requests

# 运行样例数据脚本（确保服务已启动）
python sample_data.py
```

脚本会自动完成:
1. 创建审计批次
2. 导入入住单、押金流水、换房记录（含异常数据）
3. 提交复核 → 开始复核 → 审批通过 → 冻结结算
4. 展示检测到的异常记录和财务汇总

## 主流程操作

### 步骤1: 创建批次（录入员）

```bash
curl -X POST http://localhost:8000/batches \
  -H "X-User-Id: 3" \
  -H "Content-Type: application/json" \
  -d '{
    "batch_no": "AUDIT-20240115-001",
    "audit_date": "2024-01-15T00:00:00"
  }'
```

### 步骤2: 批量导入记录

```bash
curl -X POST http://localhost:8000/records/batch/{batch_id}/bulk \
  -H "X-User-Id: 3" \
  -H "Content-Type: application/json" \
  -d '{
    "checkins": [...],
    "deposits": [...],
    "room_changes": [...]
  }'
```

### 步骤3: 提交复核（录入员）

```bash
curl -X POST http://localhost:8000/batches/{batch_id}/submit \
  -H "X-User-Id: 3" \
  -H "Content-Type: application/json" \
  -d '{"reason": "数据录入完成"}'
```

**提交时自动检测脏记录**

### 步骤4: 开始复核（复核员）

```bash
curl -X POST http://localhost:8000/batches/{batch_id}/start-review \
  -H "X-User-Id: 2" \
  -H "Content-Type: application/json" \
  -d '{"reason": "开始复核"}'
```

### 步骤5: 处理异常记录

查看脏记录:
```bash
curl http://localhost:8000/records/batch/{batch_id}/dirty-records \
  -H "X-User-Id: 2"
```

解决脏记录:
```bash
curl -X POST http://localhost:8000/records/dirty-records/{dirty_id}/resolve \
  -H "X-User-Id: 2" \
  -H "Content-Type: application/json" \
  -d '{
    "corrected_value": "700.0",
    "resolution_note": "前台确认多收12元杂费"
  }'
```

### 步骤6: 添加主管批注

```bash
curl -X POST http://localhost:8000/records/batch/{batch_id}/comments \
  -H "X-User-Id: 2" \
  -H "Content-Type: application/json" \
  -d '{
    "comment": "半夜换房记录已核实，差价计算正确",
    "comment_type": "复核意见"
  }'
```

### 步骤7: 审批通过（复核员）

```bash
curl -X POST http://localhost:8000/batches/{batch_id}/approve \
  -H "X-User-Id: 2" \
  -H "Content-Type: application/json" \
  -d '{"reason": "复核通过"}'
```

### 步骤8: 冻结结算（主管/财务）

```bash
curl -X POST http://localhost:8000/batches/{batch_id}/freeze \
  -H "X-User-Id: 1" \
  -H "Content-Type: application/json" \
  -d '{"reason": "财务夜审确认，冻结结算"}'
```

## 制造异常场景

### 场景1: 缺字段脏记录

创建入住单时不填 `id_card` 或 `room_no`:
```json
{
  "record_no": "CI001",
  "guest_name": "测试客人",
  "room_no": "",
  "checkin_time": "2024-01-15T14:00:00",
  "room_rate": 388
}
```

### 场景2: 跨日（半夜换房）

换房时间设为 00:00-06:00 之间:
```json
{
  "record_no": "RC001",
  "checkin_record_no": "CI001",
  "old_room_no": "1001",
  "new_room_no": "1002",
  "change_time": "2024-01-15T02:30:00"
}
```

### 场景3: 改名（客人姓名不一致）

入住单客人叫"王五"，押金单客人叫"王五五":
```json
{
  "record_no": "DP001",
  "checkin_record_no": "CI003",
  "guest_name": "王五五"
}
```

### 场景4: 金额冲突（房费≠发票）

房费 688，发票开 700:
```json
{
  "actual_room_fee": 688.0,
  "invoice_amount": 700.0
}
```

### 场景5: 延住导致不同步

`is_extended=true`，实际退房时间晚于计划退房时间:
```json
{
  "is_extended": true,
  "planned_checkout": "2024-01-15T12:00:00",
  "checkout_time": "2024-01-16T14:00:00",
  "original_checkout": "2024-01-15T12:00:00"
}
```

## 财务夜审重点查看

### 1. 冻结前后状态对比

```bash
curl http://localhost:8000/audit/batch/{batch_id}/freeze-comparison \
  -H "X-User-Id: 1"
```

返回内容:
- `is_frozen`: 是否已冻结
- `status_before_freeze`: 冻结前状态
- `status_after_freeze`: 冻结后状态
- `changes`: 冻结前后具体差异

### 2. 财务汇总

```bash
curl http://localhost:8000/audit/batch/{batch_id}/financial-summary \
  -H "X-User-Id: 1"
```

核心字段:
- `total_room_fee`: 总房费
- `total_deposit`: 总押金
- `total_invoice`: 总发票
- `discrepancy_amount`: 发票与房费差异
- `manual_reason`: 人工处理理由
- `dirty_record_summary`: 异常记录分类统计

### 3. 异常解释

```bash
curl http://localhost:8000/audit/batch/{batch_id}/anomalies \
  -H "X-User-Id: 1"
```

自动解释:
- 延住导致房费不同步
- 半夜换房导致费用不同步

### 4. 导出Excel

```bash
# 单个批次导出
curl -o audit_report.xlsx \
  http://localhost:8000/audit/batch/{batch_id}/export \
  -H "X-User-Id: 1"

# 多批次批量导出
curl -X POST http://localhost:8000/audit/export \
  -H "X-User-Id: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "batch_ids": [1, 2, 3],
    "include_dirty_records": true,
    "include_state_transitions": true
  }' \
  -o audit_batches.xlsx
```

Excel包含工作表:
- 财务汇总
- 入住记录
- 押金流水
- 换房记录
- 异常记录
- 状态流转

## 状态流转图

```
草稿(DRAFT)
    ↓ submit
已提交(SUBMITTED)
    ↓ start-review       ↖ reject
复核中(UNDER_REVIEW)  →  已退回(REJECTED)
    ↓ approve           ↗ resubmit
已批准(APPROVED)
    ↓ freeze         ↖ unfreeze
已冻结(FROZEN)          ↓ archive
    ↓ unfreeze      已归档(ARCHIVED)
已批准(APPROVED)
```

## 查看状态流转历史

```bash
curl http://localhost:8000/batches/{batch_id}/transitions \
  -H "X-User-Id: 1"
```

每次流转记录:
- 从什么状态变到什么状态
- 操作人、操作时间
- 操作理由
- 变更前后快照对比
- 具体差异字段列表

## 权限矩阵

| 权限 | 录入 | 复核 | 主管 | 只读 |
|------|------|------|------|------|
| 查看批次 | ✓ | ✓ | ✓ | ✓ |
| 创建批次 | ✓ | ✗ | ✓ | ✗ |
| 编辑记录 | ✓ | ✗ | ✓ | ✗ |
| 提交复核 | ✓ | ✗ | ✓ | ✗ |
| 开始复核 | ✗ | ✓ | ✓ | ✗ |
| 审批通过 | ✗ | ✓ | ✓ | ✗ |
| 拒绝退回 | ✗ | ✓ | ✓ | ✗ |
| 冻结结算 | ✗ | ✗ | ✓ | ✗ |
| 解冻 | ✗ | ✗ | ✓ | ✗ |
| 归档 | ✗ | ✗ | ✓ | ✗ |
| 上传附件 | ✓ | ✓ | ✓ | ✗ |
| 添加批注 | ✓ | ✓ | ✓ | ✗ |
| 解决脏记录 | ✗ | ✓ | ✓ | ✗ |
| 导出数据 | ✗ | ✓ | ✓ | ✗ |
| 用户管理 | ✗ | ✗ | ✓ | ✗ |

## 测试重点

### 状态变化测试

1. 正常流程: 草稿 → 提交 → 复核 → 审批 → 冻结 → 归档
2. 拒绝流程: 提交 → 拒绝 → 重新提交
3. 解冻流程: 冻结 → 解冻 → 重新审批

### 幂等性测试

1. 重复提交同一个批次号
2. 重复添加相同记录号（应跳过不报错）
3. 重复执行相同状态变更（应返回成功但不重复记录）
4. 多次调用脏记录检测（不重复创建相同脏记录）

### 权限测试

1. 录入员尝试审批 → 403
2. 只读用户尝试编辑 → 403
3. 复核员尝试冻结 → 403

### 异常场景测试

参考"制造异常场景"部分，验证各种脏记录是否被正确检测和分类。

## 项目结构

```
.
├── main.py                 # 应用入口
├── requirements.txt        # 依赖
├── sample_data.py          # 样例数据脚本
├── README.md              # 本文档
└── app/
    ├── __init__.py
    ├── database.py        # 数据库连接
    ├── models.py          # 数据模型
    ├── schemas.py         # Pydantic Schema
    ├── permissions.py     # 权限系统
    ├── state_machine.py   # 状态机逻辑
    ├── dirty_records.py   # 脏记录检测
    ├── diff_tracker.py    # 差异追踪
    ├── financial_audit.py # 财务审计
    └── routers/
        ├── batches.py     # 批次管理API
        ├── records.py     # 记录管理API
        ├── audit.py       # 审计导出API
        └── users.py       # 用户管理API
```
