# 智能柜补货验收回放链路服务

## 项目概述

本服务用于智能柜补货验收数据的回放、去重、对账和异常追踪。支持库存、补货照片、退款记录、手工改价表的数据导入和处理。

## 核心功能

### 1. 重复数据识别
- 基于MD5指纹的精确匹配去重
- 支持网络恢复后重复扣库存场景识别
- 热销格口满仓异常检测

### 2. 异步任务处理
- **等重试 (waiting_retry)**: 自动重试，最多3次
- **等人工 (waiting_manual)**: 需要人工干预
- **永久失败 (permanent_failed)**: 达到最大重试次数

### 3. 数据导入
- 支持API批量导入
- 支持Excel/CSV/JSON文件导入
- 保留来源文件、原始行号和解析后的标准值
- 原始证据不可覆盖

### 4. 数据导出
- 导出格式: Excel, CSV, JSON
- 包含任务汇总、数据明细、重复记录、处理日志
- 所有数据可追溯到原始来源

### 5. 对账功能
- 按柜机ID对账
- 预期库存 vs 实际库存对比
- 差异原因追踪

## 项目结构

```
.
├── src/
│   ├── __init__.py
│   ├── config.py              # 配置文件
│   ├── database.py            # 数据库连接
│   ├── models.py              # 数据模型
│   ├── schemas.py             # Pydantic Schema
│   ├── repository.py          # 数据访问层
│   ├── duplicate_detector.py  # 重复检测核心逻辑
│   ├── task_processor.py      # 任务处理器
│   ├── data_importer.py       # 数据导入模块
│   ├── data_exporter.py       # 数据导出模块
│   ├── reconciliation.py      # 对账服务
│   ├── logger.py              # 日志系统
│   └── main.py                # FastAPI主程序
├── data/
│   ├── uploads/               # 上传文件
│   ├── exports/               # 导出文件
│   ├── logs/                  # 日志文件
│   └── replay_service.db      # SQLite数据库
├── cli.py                     # 命令行工具
├── run.py                     # 启动脚本
└── requirements.txt           # 依赖列表
```

## 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 启动服务

```bash
python run.py
```

服务将在 http://0.0.0.0:8000 启动

### 3. API文档

启动后访问:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 命令行工具 (CLI)

### 初始化数据库
```bash
python cli.py init
```

### 生成测试数据
```bash
python cli.py generate-test-data
```

### 列出任务
```bash
python cli.py list-tasks
```

### 查看任务详情
```bash
python cli.py task-detail <task_id>
```

### 查看任务日志
```bash
python cli.py task-logs <task_id>
```

### 导入文件
```bash
python cli.py import-file inventory data/inventory.xlsx
```

### 导出任务结果
```bash
python cli.py export-task <task_id> --format xlsx
```

### 对账
```bash
python cli.py reconcile CAB001
```

## API接口

### 数据导入
- `POST /api/import/inventory` - 导入库存数据
- `POST /api/import/replenishment` - 导入补货数据
- `POST /api/import/refund` - 导入退款数据
- `POST /api/import/price-adjustment` - 导入改价数据
- `POST /api/import/upload/{record_type}` - 上传文件导入

### 任务管理
- `GET /api/tasks` - 任务列表
- `GET /api/tasks/{task_id}` - 任务详情
- `GET /api/tasks/{task_id}/logs` - 任务日志
- `GET /api/tasks/{task_id}/duplicates` - 重复记录
- `POST /api/tasks/{task_id}/retry` - 重试任务
- `POST /api/tasks/{task_id}/manual-resolve` - 人工处理

### 数据导出
- `GET /api/export/tasks/{task_id}` - 导出任务结果
- `GET /api/export/records/{record_type}` - 导出全部记录

### 对账
- `POST /api/reconciliation/{cabinet_id}` - 执行对账
- `GET /api/reconciliation/{cabinet_id}/history` - 对账历史
- `GET /api/reconciliation/{cabinet_id}/summary` - 对账汇总

### 数据查询
- `GET /api/records/inventory/{cabinet_id}` - 查询库存记录
- `GET /api/records/detail/{record_type}/{record_id}` - 记录详情

## 数据模型

### ImportTask (导入任务)
- task_id: 任务唯一标识
- record_type: 记录类型
- status: 任务状态 (pending/processing/waiting_retry/waiting_manual/permanent_failed/completed)
- total_count/success_count/duplicate_count/error_count: 统计数据

### 业务记录
- InventoryRecord: 库存记录
- ReplenishmentPhoto: 补货照片
- RefundRecord: 退款记录
- PriceAdjustment: 手工改价

### 辅助表
- ProcessingLog: 处理日志
- DuplicateRecord: 重复记录
- ReconciliationResult: 对账结果

## 去重机制

每条记录生成唯一指纹(MD5)，用于去重检测:

**库存记录**:
- 柜机ID + 格口ID + 商品ID + 数量 + 记录时间

**补货记录**:
- 柜机ID + 格口ID + 照片哈希 + 数量 + 操作员ID

**退款记录**:
- 订单ID + 退款金额 + 记录时间

**改价记录**:
- 柜机ID + 格口ID + 商品ID + 原价 + 新价

## 持久化保证

- 所有数据存储在SQLite数据库中
- 重启后数据不丢失
- 未完成的任务重启后继续处理
- 原始数据和处理日志永久保存

## 数据一致性保证

1. 每个记录都有source_file和source_row_number可追溯
2. raw_data字段保存原始JSON，永不修改
3. 任务日志记录每一步操作
4. 重复记录关联到原始记录ID
5. 导出文件包含所有关联数据

## 注意事项

- 热销格口(is_hot_cell)会触发特殊异常检测
- 网络异常导致的重复提交会被自动识别
- 人工处理需要明确记录处理原因
