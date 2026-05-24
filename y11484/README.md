# 中央厨房留样权限追责台账服务

## 项目概述

本系统用于中央厨房留样管理的全流程台账记录，支持：
- 留样标签、温度记录、门店投诉、扫码明细的建账管理
- 草稿 → 提交 → 驳回/二次确认的状态流转
- 完整的操作审计轨迹
- 数据一致性保障和坏数据隔离
- 角色视图和敏感字段脱敏导出
- 批次追溯和问题门店回查

---

## 快速开始

### 1. 环境准备

```bash
# 安装依赖
pip install -r requirements.txt
```

### 2. 启动服务

```bash
# 从空库启动（首次运行自动创建数据库和表）
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

访问 http://localhost:8000/docs 查看API文档

---

## 主流程操作指南

### 步骤1: 准备样例数据

确保服务已启动后，运行初始化脚本：

```bash
python init_sample_data.py
```

脚本会自动完成以下操作：
- 创建1条留样标签记录
- 创建3条温度记录
- 创建2条门店扫码记录
- 创建1条门店投诉记录
- 走完 草稿→提交→确认 的完整流程
- 制造1条坏数据（测试失败记录）
- 重复提交1次（测试幂等性）

### 步骤2: 走主流程 - 手动操作示例

#### 2.1 创建留样标签（草稿状态）

```bash
curl -X POST "http://localhost:8000/sample-labels/" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: operator_001" \
  -d '{
    "batch_no": "BATCH20260524001",
    "product_name": "红烧肉",
    "production_time": "2026-05-24T08:00:00",
    "sample_time": "2026-05-24T09:00:00",
    "sampler": "张三",
    "storage_location": "冷藏柜A区"
  }'
```

#### 2.2 提交审核

```bash
curl -X POST "http://localhost:8000/sample-labels/1/status" \
  -H "Content-Type: application/json" \
  -d '{
    "new_status": "submitted",
    "change_reason": "信息完整，提交审核",
    "operator": "operator_001",
    "operator_role": "operator",
    "ip_address": "192.168.1.100"
  }'
```

#### 2.3 驳回修改

```bash
curl -X POST "http://localhost:8000/sample-labels/1/status" \
  -H "Content-Type: application/json" \
  -d '{
    "new_status": "rejected",
    "change_reason": "留样时间有误，请核对",
    "operator": "auditor_001",
    "operator_role": "auditor",
    "ip_address": "192.168.1.101"
  }'
```

#### 2.4 二次确认

```bash
curl -X POST "http://localhost:8000/sample-labels/1/status" \
  -H "Content-Type: application/json" \
  -d '{
    "new_status": "submitted",
    "change_reason": "已修正时间，重新提交",
    "operator": "operator_001",
    "operator_role": "operator",
    "ip_address": "192.168.1.100"
  }'

curl -X POST "http://localhost:8000/sample-labels/1/status" \
  -H "Content-Type: application/json" \
  -d '{
    "new_status": "confirmed",
    "change_reason": "审核通过",
    "operator": "auditor_001",
    "operator_role": "auditor",
    "ip_address": "192.168.1.101"
  }'
```

---

## 制造异常场景

### 场景1: 提交无效数据（坏数据隔离）

```bash
# 温度值超出正常范围 (-30°C ~ 50°C)
curl -X POST "http://localhost:8000/temperature-records/" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: operator_001" \
  -d '{
    "sample_label_id": 1,
    "record_time": "2026-05-24T10:00:00",
    "temperature": 999,
    "recorder": "李四"
  }'
```

查看失败记录：
```bash
curl "http://localhost:8000/failed-records/"
```

### 场景2: 非法状态流转

```bash
# 直接从 draft 跳到 confirmed (应该失败)
curl -X POST "http://localhost:8000/sample-labels/1/status" \
  -H "Content-Type: application/json" \
  -d '{
    "new_status": "confirmed",
    "change_reason": "跳过流程直接确认",
    "operator": "operator_001",
    "operator_role": "operator",
    "ip_address": "192.168.1.100"
  }'
```

### 场景3: 修改已确认的记录

```bash
# 已确认状态的记录不能修改 (应该失败)
curl -X PUT "http://localhost:8000/sample-labels/1" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: operator_001" \
  -d '{
    "product_name": "尝试修改已确认记录"
  }'
```

---

## 查看导出和审计

### 1. 查看审计日志

```bash
# 查看所有审计日志
curl "http://localhost:8000/audit-logs/"

# 查看特定批次的审计日志
curl "http://localhost:8000/audit-logs/?sample_label_id=1"
```

### 2. 批次追溯（品控主管重点关注）

```bash
# 根据批次号追溯完整链条
curl "http://localhost:8000/trace/batch/BATCH20260524001"
```

返回内容包含：
- 批次基本信息
- 关联门店列表（哪几家门店拿过同锅次）
- 温度记录
- 门店投诉
- 扫码明细
- 完整操作审计轨迹

### 3. 导出Excel文件

#### 3.1 导出留样标签台账（带脱敏）

```bash
# 以普通角色导出 (敏感字段脱敏)
curl -H "X-User-Role: viewer" \
  "http://localhost:8000/export/sample-labels" \
  -o sample_labels_viewer.xlsx

# 以品控主管角色导出 (敏感字段可见)
curl -H "X-User-Role: quality_manager" \
  "http://localhost:8000/export/sample-labels" \
  -o sample_labels_manager.xlsx
```

#### 3.2 导出批次追溯完整报告

```bash
curl -H "X-User-Role: quality_manager" \
  "http://localhost:8000/export/batch/BATCH20260524001" \
  -o batch_trace_report.xlsx
```

导出的Excel包含6个Sheet：
1. 批次基本信息
2. 关联门店
3. 温度记录
4. 门店投诉
5. 扫码明细
6. 操作审计

---

## 数据一致性保证

### 报表数字可追溯到单条记录

```bash
# 查看汇总报表
curl "http://localhost:8000/reports/summary"
```

报表统计时会实时校验数据一致性，确保：
- 汇总数 = 实际记录数
- 坏数据不进入汇总统计
- 导出文件、详情接口、历史查询使用同一数据源

### 坏数据处理机制

1. **数据校验层**: 入库前验证必填字段、值域范围、业务规则
2. **失败记录表**: 验证不通过的数据存入 `failed_records` 表，保留原始数据和错误原因
3. **软删除机制**: 记录用 `is_active` 标记，删除操作不物理删除，保留审计轨迹
4. **版本控制**: 每次修改 `version` 字段自增，便于追溯变更历史

---

## 品控主管视图说明

### 角色权限矩阵

| 角色 | 敏感字段 | 导出权限 | 修改权限 | 审批权限 |
|------|---------|---------|---------|---------|
| viewer | 脱敏 | 脱敏导出 | ❌ | ❌ |
| operator | 脱敏 | 脱敏导出 | ✅ 草稿态 | ❌ |
| auditor | 脱敏 | 脱敏导出 | ❌ | ✅ |
| quality_manager | 可见 | 完整导出 | ✅ | ✅ |
| admin | 可见 | 完整导出 | ✅ | ✅ |

### 敏感字段处理

以下字段在非管理角色下会自动脱敏：
- sampler (留样人员)
- recorder (记录人员)
- handler (处理人)
- scanner (扫码人员)
- created_by / updated_by (操作人)

脱敏规则：保留首尾字符，中间用*代替，例如：张三 → 张*三

---

## 测试说明

### 运行测试

```bash
# 安装测试依赖 (已包含在 requirements.txt)
pip install pytest httpx

# 运行所有测试
pytest tests/ -v

# 运行特定测试
pytest tests/test_status_flow.py -v
pytest tests/test_idempotency.py -v
```

### 测试重点

#### 1. 状态变化测试 (`test_status_flow.py`)
- ✅ 正常状态流转：draft → submitted → confirmed
- ✅ 驳回流程：draft → submitted → rejected → submitted → confirmed
- ✅ 非法状态流转拦截
- ✅ 已确认记录不可修改

#### 2. 幂等性测试 (`test_idempotency.py`)
- ✅ 重复提交相同状态请求只记录一次有效变更
- ✅ 重复创建相同批次号失败
- ✅ 并发请求下的数据一致性

#### 3. 数据一致性测试
- ✅ 报表汇总数与实际记录数一致
- ✅ 坏数据不进入汇总统计
- ✅ 导出数据与接口返回数据一致

---

## 核心业务模块说明

| 文件 | 说明 |
|------|------|
| [app/models.py](file:///Users/mac/pro/solo/workspaces/y11484/app/models.py) | 数据库模型定义 |
| [app/schemas.py](file:///Users/mac/pro/solo/workspaces/y11484/app/schemas.py) | Pydantic 数据结构 |
| [app/services.py](file:///Users/mac/pro/solo/workspaces/y11484/app/services.py) | 核心业务逻辑 |
| [app/export_service.py](file:///Users/mac/pro/solo/workspaces/y11484/app/export_service.py) | Excel导出服务 |
| [app/main.py](file:///Users/mac/pro/solo/workspaces/y11484/app/main.py) | API路由入口 |

---

## 状态流转图

```
    draft (草稿)
       │
       ▼
  submitted (已提交)
     │    │
     │    ▼
     │  rejected (已驳回)
     │    │
     │    ▼
     └─► submitted (重新提交)
          │
          ▼
     confirmed (已确认) ═════► 不可变更
```

---

## 常见问题

### Q: 如何重置数据库？
```bash
rm sample_tracking.db
# 重启服务会自动创建新库
```

### Q: 如何查看SQLite数据库内容？
```bash
# 使用 sqlite3 命令行
sqlite3 sample_tracking.db
.tables
SELECT * FROM sample_labels;
```

### Q: 导出的Excel打不开？
确保已安装 `openpyxl` 库，导出使用的是 xlsx 格式。
