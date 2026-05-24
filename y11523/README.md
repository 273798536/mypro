# 家电安装回访验收回放链路服务

## 项目概述

本服务用于处理家电安装预约单的投诉单合并，解决改约、二次上门数据分散导致差评原因追溯困难的问题。

## 核心功能

### 1. 数据批量提交
- 支持一次性提交预约单、师傅定位、用户评价、异常照片
- 重复策略：忽略(ignore)、覆盖(overwrite)、追加(append)
- 部分失败时不中断整体流程，详细记录失败项

### 2. 投诉单合并
- 自动识别改约关系（original_appointment_no）
- 自动识别二次上门（parent_appointment_no）
- 合并证据链：预约单、评价、照片、定位、备注
- 差评原因溯源验证

### 3. 边界情况处理
- ✅ 重复提交（支持三种策略）
- ✅ 撤回后再提交
- ✅ 部分失败（失败项详细记录）
- ✅ 人工改判（差评标记调整）
- ✅ 导出前冻结

### 4. 审计日志
- 所有操作留痕：谁在什么时候改过什么
- 支持按实体类型、操作人、时间范围查询

### 5. 对账与导出
- 数据一致性检查
- 问题自动识别（未合并投诉、差评缺证据等）
- Excel格式导出（多sheet完整链路）

## 项目结构

```
.
├── main.py                 # FastAPI主应用
├── cli.py                  # 命令行工具
├── requirements.txt        # 依赖列表
├── test_api.py            # 测试脚本
├── app/
│   ├── models/
│   │   ├── database.py     # 数据库连接
│   │   ├── schemas.py      # SQLAlchemy模型
│   │   └── pydantic_schemas.py  # Pydantic模型
│   ├── routers/
│   │   ├── batch.py        # 批量数据接口
│   │   ├── complaint.py    # 投诉单接口
│   │   └── export_audit.py # 导出与审计接口
│   └── utils/
│       ├── audit.py        # 审计日志工具
│       ├── batch_service.py # 批量处理服务
│       ├── complaint_service.py # 投诉合并服务
│       └── export_service.py # 导出与对账服务
├── data/
│   ├── appliance_service.db # SQLite数据库
│   └── photos/             # 照片存储
└── exports/                # 导出文件目录
```

## 快速开始

### 1. 安装依赖

```bash
pip3 install -r requirements.txt
```

### 2. 启动服务

```bash
# 方式1: 直接启动
python3 main.py

# 方式2: uvicorn启动
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000

# 方式3: CLI启动
python3 cli.py start
```

服务启动后访问: http://localhost:8000/docs

### 3. 使用CLI工具

```bash
# 查看所有命令
python3 cli.py --help

# 生成模拟数据
python3 cli.py mock-data --count 5 --with-rescheduled --with-second-visit --with-negative

# 数据对账
python3 cli.py reconcile

# 导出数据
python3 cli.py export --task-type full_chain --freeze

# 查看审计日志
python3 cli.py audit-logs --limit 10

# 创建投诉单
python3 cli.py create-complaint --appointment-no APT000001

# 验证差评证据
python3 cli.py verify-evidence --review-no REV000001

# 运行完整验收测试
python3 cli.py acceptance-test
```

## API接口

### 批量数据提交
```http
POST /api/v1/batch/submit
Content-Type: application/json

{
  "batch_no": "BATCH001",
  "source": "crm_system",
  "operator": "admin",
  "duplicate_strategy": "append",
  "appointments": [...],
  "locations": [...],
  "reviews": [...],
  "photos": [...]
}
```

### 创建投诉单（自动合并）
```http
POST /api/v1/complaint/create?operator=admin

{
  "complaint_no": "CMP001",
  "appointment_no": "APT000001",
  "complaint_type": "service_quality",
  "complaint_reason": "用户投诉"
}
```

### 合并投诉单
```http
POST /api/v1/complaint/merge

{
  "target_complaint_no": "CMP001",
  "source_complaint_nos": ["CMP002", "CMP003"],
  "operator": "admin",
  "merge_reason": "同一用户同一工单"
}
```

### 数据对账
```http
POST /api/v1/reconcile

{
  "start_time": "2024-01-01T00:00:00",
  "end_time": "2024-12-31T23:59:59",
  "operator": "admin"
}
```

### 导出数据
```http
POST /api/v1/export

{
  "task_type": "full_chain",
  "operator": "admin",
  "freeze_before_export": true
}
```

### 查询审计日志
```http
GET /api/v1/audit-logs?entity_type=Appointment&operator=admin
```

## 验收流程

### 阶段一：正常链路
1. 提交预约单、定位、评价、照片数据
2. 创建投诉单，验证自动合并改约、二次上门
3. 验证差评证据链
4. 执行对账

### 阶段二：边界情况
1. 重复提交（忽略策略）
2. 撤回后再提交
3. 提交坏数据验证部分失败处理
4. 人工改判差评标记

### 阶段三：持久化验证
1. 重启服务
2. 查询历史数据确认持久化
3. 检查审计日志完整性
4. 执行导出验证冻结功能

## 数据库表说明

| 表名 | 说明 | 关键字段 |
|------|------|----------|
| data_batches | 数据批次 | batch_no, operator, status |
| appointments | 预约单 | appointment_no, is_rescheduled, is_second_visit |
| technician_locations | 师傅定位 | appointment_no, location_time |
| user_reviews | 用户评价 | review_no, is_negative, manually_adjusted |
| abnormal_photos | 异常照片 | photo_no, is_abnormal |
| service_remarks | 客服备注 | appointment_no, content |
| complaints | 投诉单 | complaint_no, merged_from, merge_evidence |
| audit_logs | 审计日志 | operation_type, entity_id, operator |
| export_tasks | 导出任务 | task_no, is_frozen, file_path |

## 区域售后关注重点

1. **命令脚本**：所有操作可通过CLI完成，可追溯
2. **HTTP读写**：完整的RESTful API，支持对接其他系统
3. **本地持久化**：SQLite本地存储，数据不丢失
4. **操作轨迹**：完整的审计日志，谁做了什么一清二楚
5. **证据汇总**：投诉单合并后证据链完整，差评原因可追溯
