# 仓内波次拣货验收回放链路服务

## 概述

本系统用于处理仓内波次拣货验收数据的回放链路，支持重复识别、缺货拆单追踪、对账、异常处理等核心功能。

## 核心特性

### 1. 重复识别
- 波次单、拣货差异、复核扫描、临时补录单、班次记录均支持重复检测
- 基于MD5哈希值识别重复数据，保留重复记录但标记为重复
- 导入时自动统计成功、重复、失败数量

### 2. 数据导入
- 支持Excel和CSV格式导入
- 保留来源文件名、原始行号、原始数据
- 解析后标准值与原始证据分离存储
- 改判操作不覆盖原始数据

### 3. 缺货拆单处理
- 记录拆单前后的波次绩效快照
- 保留拆单原因和操作人
- 支持回放查看拆单前后差异

### 4. 异步任务处理
- 任务状态：pending / running / completed / retry / manual / failed
- 失败分类：等重试(retry)、等人工(manual)、永久失败(permanent)
- 支持指数退避重试策略
- 服务恢复后可继续处理待执行任务

### 5. 回放与差异追踪
- 波次回放记录前后状态
- 自动计算新增、删除、修改数量
- 历史回放记录可追溯

### 6. 对账功能
- 波次单与拣货差异对账
- 波次单与复核扫描对账
- 自动生成异常记录

### 7. 异常处理
- 异常记录支持改判
- 记录修正前后差异
- 保留修正原因和操作人
- 修正历史可追溯

### 8. 导出功能
- 支持导出波次单、拣货差异、复核扫描、异常记录、回放历史
- 导出文件包含来源文件和行号信息

## 项目结构

```
├── config.py              # 配置文件
├── database.py            # 数据库模型
├── utils.py               # 工具函数
├── services.py            # 核心业务服务
├── main.py                # FastAPI主程序
├── worker.py              # 异步任务处理Worker
├── cli.py                 # 命令行工具
├── requirements.txt       # 依赖列表
├── sample_data/           # 测试数据目录
├── imports/               # 导入文件目录
├── exports/               # 导出文件目录
└── logs/                  # 日志目录
```

## 数据库表结构

| 表名 | 说明 |
|------|------|
| import_sources | 导入来源记录 |
| wave_orders | 波次单 |
| pick_differences | 拣货差异 |
| review_scans | 复核扫描 |
| temp_supplements | 临时补录单 |
| shift_records | 班次记录 |
| async_tasks | 异步任务 |
| replay_records | 回放记录 |
| exception_records | 异常记录 |
| performance_snapshots | 绩效快照 |
| operation_logs | 操作日志 |

## 快速开始

### 方式一：一键启动
```bash
chmod +x start.sh
./start.sh
```

### 方式二：分步启动

1. 安装依赖
```bash
pip install -r requirements.txt
```

2. 生成测试数据
```bash
python cli.py generate-test-data
```

3. 启动服务
```bash
python main.py
```

4. 运行完整工作流演示（另开终端）
```bash
python cli.py run-full-workflow
```

## API文档

启动服务后访问：http://localhost:8000/docs

### 核心API

#### 导入接口
- `POST /api/import/wave-orders` - 导入波次单
- `POST /api/import/pick-differences` - 导入拣货差异
- `POST /api/import/review-scans` - 导入复核扫描
- `POST /api/import/temp-supplements` - 导入临时补录
- `POST /api/import/shift-records` - 导入班次记录

#### 查询接口
- `GET /api/wave-orders` - 波次单列表
- `GET /api/wave-orders/{id}` - 波次单详情
- `GET /api/pick-differences` - 拣货差异列表
- `GET /api/review-scans` - 复核扫描列表
- `GET /api/temp-supplements` - 临时补录列表
- `GET /api/shift-records` - 班次记录列表

#### 回放接口
- `POST /api/replay/wave/{wave_no}` - 回放波次
- `GET /api/replay/history/{wave_no}` - 回放历史

#### 对账接口
- `POST /api/reconciliation/{wave_no}` - 波次对账

#### 导出接口
- `POST /api/export/{report_type}` - 导出报表
- `GET /api/export/download/{filename}` - 下载导出文件

#### 任务接口
- `GET /api/tasks` - 任务列表
- `GET /api/tasks/{task_id}` - 任务详情
- `POST /api/tasks/resume` - 恢复失败任务

#### 异常接口
- `GET /api/exceptions` - 异常列表
- `GET /api/exceptions/{exception_id}` - 异常详情
- `POST /api/exceptions/{exception_id}/correct` - 修正异常

## 命令行工具

```bash
# 查看帮助
python cli.py --help

# 启动服务
python cli.py start-server

# 生成测试数据
python cli.py generate-test-data --output ./sample_data --wave-count 3 --items-per-wave 5

# 导入文件
python cli.py import-file wave ./sample_data/wave_orders.xlsx
python cli.py import-file pick ./sample_data/pick_differences.xlsx
python cli.py import-file review ./sample_data/review_scans.xlsx

# 回放波次
python cli.py replay-wave WAVE20240101001 --operator admin --reason "数据核对"

# 对账
python cli.py reconcile-wave WAVE20240101001

# 导出报表
python cli.py export-report wave_orders --wave_no WAVE20240101001

# 恢复失败任务
python cli.py resume-tasks

# 修正异常
python cli.py correct-exception EX123456 --reason "确认数据正确" --operator admin --data '{"actual": 100}'

# 运行完整工作流
python cli.py run-full-workflow
```

## 仓储经理查看要点

### 1. 命令脚本
- `cli.py` - 所有命令行操作入口
- `start.sh` - 一键启动脚本

### 2. HTTP读写
- API请求日志：`logs/api.log`
- 操作日志表：`operation_logs`
- 接口文档：`/docs`

### 3. 本地持久化
- SQLite数据库：`warehouse.db`
- 导入文件：`imports/` 目录
- 导出文件：`exports/` 目录
- 日志文件：`logs/` 目录

### 4. 数据一致性检查
- 列表页数字与详情页一致
- 详情页与导出文件一致
- 异常修正前后差异可追溯
- 回放记录前后状态一致

## 故障排查

### 任务状态说明
- **pending**: 待执行
- **running**: 执行中
- **completed**: 已完成
- **retry**: 等待重试（系统自动重试）
- **manual**: 等待人工处理（调用`/api/tasks/resume`恢复）
- **failed**: 永久失败（数据错误，需人工修正后重导）

### 查看日志
```bash
# API日志
tail -f logs/api.log

# Worker日志
tail -f logs/worker.log

# 服务日志
tail -f logs/services.log
```

## 数据字段说明

所有业务表均包含以下审计字段：
- `source_file`: 来源文件名
- `source_line`: 原始行号
- `raw_data`: 原始数据（JSON）
- `unique_hash`: 唯一哈希（用于去重）
- `is_duplicate`: 是否重复
- `duplicate_of`: 重复记录ID
- `created_at`: 创建时间
- `updated_at`: 更新时间
