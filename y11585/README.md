# 法务合同履约异常回执状态机服务

农忙缺货临时替代场景下的合同履约异常处理系统，支持合同PDF、付款节点、验收邮件和手工改价表的全流程管理。

## 核心功能

### 1. 状态机核心动作
- **批次创建**: 从合同PDF、付款节点、验收邮件开始建账
- **附件补传**: 支持历史压缩包追加导入
- **复核改判**: 人工审核与状态变更
- **冻结结算**: 异常数据冻结，防止错误扩散
- **撤回归档**: 流程完成后的归档管理

### 2. 关键特性
- **版本追踪**: 补充协议修改节点后，旧版本自动标记"(旧版)"保留
- **审计追踪**: 每步操作记录前后差异、操作人、时间戳
- **重复策略**: 同一批数据跑两次支持忽略、覆盖、追加三种策略
- **历史追溯**: 完整的"谁在什么时候改过什么"记录

### 3. 异步任务处理
- **重试状态**: 等待自动重试
- **人工状态**: 需要人工介入处理
- **永久失败**: 不可恢复的失败
- **断点续跑**: 服务恢复后从检查点继续处理

### 4. 业务报告
- 冻结前后状态对比
- 人工干预理由明细
- Excel汇总导出（合同汇总 + 冻结变更两个sheet）

## 快速开始

### 1. 安装依赖
```bash
pip install -r requirements.txt
```

### 2. 初始化数据库
```bash
# 首次初始化（自动检测并跳过已存在的数据）
python scripts/init_db.py

# 重置样例数据（清除旧样例，重新加载）
python scripts/init_db.py --reset

# 清空所有数据后重新初始化（包括非样例数据）
python scripts/init_db.py --reset-all
```

脚本特点：
- **幂等性**：重复运行不会报错，已存在的样例数据会自动跳过
- **参数控制**：通过 `--reset` 或 `--reset-all` 控制数据重置

### 3. 运行演示流程
```bash
python scripts/demo_flow.py
```

### 4. 启动API服务
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API文档: http://localhost:8000/docs

## 项目结构

```
.
├── app/
│   ├── __init__.py
│   ├── config.py              # 配置管理
│   ├── database.py            # 数据库连接
│   ├── main.py                # FastAPI主入口
│   ├── models/
│   │   ├── __init__.py
│   │   └── base.py            # 数据模型
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── contract.py        # Pydantic模型
│   ├── services/
│   │   ├── __init__.py
│   │   ├── state_machine.py   # 状态机核心逻辑
│   │   ├── file_service.py    # 文件处理服务
│   │   ├── task_service.py    # 异步任务服务
│   │   └── report_service.py  # 报告导出服务
│   └── api/
│       ├── __init__.py
│       └── v1.py              # API路由
├── scripts/
│   ├── __init__.py
│   ├── init_db.py             # 数据库初始化脚本
│   └── demo_flow.py           # 端到端演示脚本
├── uploads/                   # 文件上传目录（自动创建）
├── exports/                   # 报告导出目录（自动创建）
├── requirements.txt
├── .env.example
└── README.md
```

## API接口说明

### 批次管理
- `POST /api/v1/batches` - 创建批次
- `GET /api/v1/batches` - 批次列表
- `GET /api/v1/batches/{id}` - 批次详情
- `GET /api/v1/batches/{id}/summary` - 批次汇总报告

### 合同管理
- `POST /api/v1/batches/{id}/contracts` - 创建合同
- `GET /api/v1/batches/{id}/contracts` - 合同列表
- `GET /api/v1/contracts/{id}` - 合同详情
- `GET /api/v1/contracts/{id}/versions` - 版本历史
- `GET /api/v1/contracts/{id}/diff` - 变更差异对比

### 状态流转
- `POST /api/v1/batches/{id}/freeze` - 冻结合同
- `POST /api/v1/batches/{id}/unfreeze` - 解冻合同
- `POST /api/v1/batches/{id}/review` - 复核改判
- `POST /api/v1/batches/{id}/archive` - 撤回归档
- `POST /api/v1/batches/{id}/supplement` - 补充协议

### 文件上传
- `POST /api/v1/batches/{id}/upload/contract-pdf` - 上传合同PDF（自动解析合同编号、金额）
- `POST /api/v1/batches/{id}/contracts/{cid}/upload/payment-excel` - 上传付款节点Excel
- `POST /api/v1/batches/{id}/contracts/{cid}/upload/acceptance-email` - 上传验收邮件（自动识别验收结果）
- `POST /api/v1/batches/{id}/contracts/{cid}/upload/price-change` - 上传手工改价表（已修复openpyxl读取问题）
- `POST /api/v1/batches/{id}/upload/archive` - 上传历史压缩包
  - **参数**: `duplicate_strategy` (ignore/overwrite/append) - 重复数据处理策略
  - **参数**: `async_mode` (true/false) - 是否异步处理
  - **支持**: PDF合同、付款节点Excel、改价表Excel、验收邮件EML

### 审计与报告
- `GET /api/v1/batches/{id}/audit-logs` - 批次审计日志
- `GET /api/v1/contracts/{id}/audit-logs` - 合同审计日志
- `POST /api/v1/export` - 导出Excel报告（合同汇总+冻结变更双sheet）

### 任务管理
- `GET /api/v1/tasks/{id}` - 查询任务状态与进度
- `POST /api/v1/tasks/{id}/retry` - 重试失败任务
  - **失败类型**:
    - `retry` - 等待自动重试（如：网络超时）
    - `manual` - 需人工介入（如：重试耗尽）
    - `failed` - 永久失败（如：文件损坏）
- `POST /api/v1/tasks/resume-stalled` - 恢复超时挂起任务（断点续跑）

## 数据模型

### 核心表
- **batches**: 批次表（批次号、状态、创建人等）
- **contracts**: 合同表（合同信息、冻结/归档状态）
- **contract_versions**: 合同版本表（完整快照、变更原因）
- **payment_nodes**: 付款节点表（节点名称、金额、到期日）
- **acceptance_emails**: 验收邮件表（邮件内容、验收结果）
- **price_changes**: 改价表（原价、新价、审批信息）
- **attachments**: 附件表（文件路径、类型、版本）
- **audit_logs**: 审计日志（操作类型、前后状态、操作人）
- **async_tasks**: 异步任务（状态、重试次数、检查点）

## 复现测试步骤

### 步骤1: 初始化数据库
```bash
python scripts/init_db.py
```
- 创建所有数据表
- 导入3份样例合同（含冻结、归档状态）
- 导入历史数据批次

### 步骤2: 运行端到端演示
```bash
python scripts/demo_flow.py
```
演示完整流程：
1. 创建批次和合同（含付款节点）
2. 发现数据异常，冻结合同
3. 查看版本历史和审计日志
4. 人工修正：补充协议调整付款节点
5. 解冻合同
6. 查看变更前后差异
7. 生成业务汇总报告
8. 导出Excel报告

### 步骤3: 模拟坏数据
调用冻结接口，模拟异常发现：
```bash
curl -X POST "http://localhost:8000/api/v1/batches/1/freeze" \
  -H "Content-Type: application/json" \
  -H "X-User-Name: tester" \
  -d '{"contract_ids": [1], "reason": "测试异常", "freeze_all": false}'
```

### 步骤4: 人工修正
调用补充协议接口，修正数据：
```bash
curl -X POST "http://localhost:8000/api/v1/batches/1/supplement" \
  -H "Content-Type: application/json" \
  -H "X-User-Name: manager" \
  -d '{"contract_no": "HT2024001", "change_reason": "修正测试", "new_payment_nodes": [...]}'
```

### 步骤5: 查看审计记录
访问审计日志接口，确认所有操作有迹可循。
