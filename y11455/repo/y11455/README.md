# 社区团购售后异常回执状态机 API

## 项目概述

社区团购售后异常处理的全链路追踪系统，从团长退款、仓库复核到最终结算的完整状态机管理。

## 核心特性

- **幂等导入**: 同批次号重复提交不重复计算
- **证据保留**: 原始数据独立存储，改判不覆盖原始证据
- **状态机**: 完整的状态流转规则和历史追踪
- **改判追踪**: 人工改判记录完整历史（原状态→新状态）
- **冻结机制**: 导出前冻结，记录冻结前后状态
- **报表视图**: 城市负责人视角的汇总和明细报表

## 技术栈

- **框架**: FastAPI 0.104.1
- **数据库**: SQLAlchemy 2.0 + SQLite
- **数据处理**: Pandas + OpenPyXL
- **测试**: Pytest

## 快速开始

### 安装依赖

```bash
pip install -r requirements.txt
```

### 启动服务

```bash
python main.py
```

或

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 访问API文档

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 运行测试

```bash
pip install pytest
pytest tests/ -v
```

## 项目结构

```
.
├── app/
│   ├── __init__.py
│   ├── config.py              # 配置
│   ├── database.py            # 数据库连接
│   ├── enums.py               # 枚举定义
│   ├── models.py              # 数据模型
│   ├── schemas.py             # Pydantic Schema
│   ├── api/
│   │   ├── __init__.py
│   │   ├── batches.py         # 批次管理
│   │   ├── receipts.py        # 回执管理
│   │   ├── attachments.py     # 附件管理
│   │   ├── reports.py         # 报表管理
│   │   └── remarks.py         # 用户备注
│   └── services/
│       ├── __init__.py
│       ├── state_machine.py   # 状态机核心
│       ├── import_service.py  # 导入服务
│       └── review_service.py  # 复核服务
├── tests/
│   └── test_boundary_scenarios.py  # 边界场景测试
├── docs/
│   └── BUSINESS_GUIDE.md      # 业务操作指南
├── main.py                    # 主入口
└── requirements.txt
```

## API 概览

### 批次管理
- `POST /api/v1/batches/import/leader-refunds` - 导入团长退款表
- `POST /api/v1/batches/import/warehouse-reviews` - 导入仓库复核表
- `GET /api/v1/batches` - 查询批次列表
- `GET /api/v1/batches/{batch_no}` - 查询批次详情

### 回执管理
- `GET /api/v1/receipts` - 查询回执列表
- `GET /api/v1/receipts/{id}` - 查询回执详情
- `POST /api/v1/receipts/review` - 批量复核
- `POST /api/v1/receipts/overrule` - 人工改判
- `POST /api/v1/receipts/freeze` - 批量冻结
- `POST /api/v1/receipts/unfreeze` - 批量解冻
- `POST /api/v1/receipts/cancel` - 批量撤回
- `POST /api/v1/receipts/archive` - 批量归档

### 附件管理
- `POST /api/v1/attachments/upload` - 上传附件
- `GET /api/v1/attachments/receipt/{receipt_id}` - 查询回执附件

### 报表管理
- `GET /api/v1/reports/city-summary` - 城市汇总报表
- `GET /api/v1/reports/export-summary` - 导出明细报表

### 用户备注
- `POST /api/v1/remarks` - 添加用户备注
- `GET /api/v1/remarks/order/{order_no}` - 查询订单备注

## 状态流转图

```
待复核 → 复核中 → 已通过 → 已冻结 → 已归档
  ↓        ↓        ↓
已撤回   已驳回   已撤回
  ↓
待复核（重新提交）
```

## 数据库表说明

| 表名 | 说明 |
|------|------|
| batches | 批次表（幂等控制） |
| leader_refund_raw | 团长退款原始表 |
| warehouse_review_raw | 仓库复核原始表 |
| user_remarks | 用户备注表 |
| exception_receipts | 异常回执主表 |
| status_histories | 状态变更历史表 |
| overrule_histories | 改判历史表 |
| freeze_records | 冻结记录表 |
| attachments | 附件表 |
| audit_logs | 审计日志表 |

## 业务文档

详细业务操作指南请参考: [docs/BUSINESS_GUIDE.md](docs/BUSINESS_GUIDE.md)
