# 农资门店配送权限追责台账 API

基于 FastAPI + SQLAlchemy 的农资门店配送权限追责台账系统，支持门店订单、司机轨迹、签收欠条、客服备注的完整接入与审计追踪。

## 功能特性

### 核心数据接入
- **门店订单**: 支持农忙赊销、缺货替代、回款跟踪
- **司机轨迹**: 配送位置、状态实时记录
- **签收欠条**: 收货人信息、欠条金额、到期日管理
- **门店交接纸**: 交接双方、货物清单、赊销交接
- **客服备注**: 敏感信息标记、问题跟踪

### 工作流管理
- `draft` - 草稿状态
- `submit` - 提交审核
- `reject` - 驳回修改
- `second_confirm` - 二次确认
- `audit_only` - 只读审计

### 重复数据处理策略
- `ignore` - 忽略重复（默认）
- `overwrite` - 覆盖更新，保留变更历史
- `append` - 追加新记录

### 审计追踪
- 完整的操作审计日志
- 字段级变更历史记录
- 敏感字段变更高亮
- 变更原因必填

### 异步任务管理
- 三种失败状态区分:
  - `wait_retry` - 等待重试（自动重试）
  - `wait_manual` - 等待人工处理
  - `permanent_failed` - 永久失败
- 服务恢复后可继续处理
- 重试次数和间隔可配置

### 角色视图与脱敏
- **片区经理视图**: 汇总统计 + 变更原因 + 敏感字段处理
- **敏感字段自动脱敏**: 手机号、身份证号（非管理员角色）
- **脱敏导出**: 按角色权限导出数据

## 快速开始

### 1. 安装依赖
```bash
pip install -r requirements.txt
```

### 2. 启动服务
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. 运行完整测试
```bash
chmod +x test_api.sh
./test_api.sh
```

### 4. 查看API文档
打开浏览器访问: http://localhost:8000/docs

## 预设用户

| 用户名 | 角色 | ID | 说明 |
|--------|------|----|------|
| admin | ADMIN | 1 | 系统管理员 |
| area_manager_01 | AREA_MANAGER | 2 | 华东片区张经理 |
| store_clerk_01 | STORE_CLERK | 3 | 南京李店员 |
| driver_01 | DRIVER | 4 | 王司机 |
| cs_01 | CUSTOMER_SERVICE | 5 | 赵客服 |

## CURL 命令速查

### 数据接入

#### 创建门店订单
```bash
curl -X POST http://localhost:8000/api/orders/ \
  -H "Content-Type: application/json" \
  -d '{
    "batch_no": "BATCH-20240524-001",
    "order_no": "ORDER-2024-001",
    "store_name": "南京栖霞农资店",
    "product_name": "尿素",
    "quantity": 500,
    "unit": "公斤",
    "is_credit": true,
    "credit_amount": 1250,
    "created_by": 3,
    "duplicate_strategy": "overwrite"
  }'
```

#### 创建司机轨迹
```bash
curl -X POST http://localhost:8000/api/trajectories/ \
  -H "Content-Type: application/json" \
  -d '{
    "batch_no": "BATCH-20240524-001",
    "trajectory_no": "TRAJ-001",
    "driver_name": "王司机",
    "order_id": 1,
    "created_by": 4
  }'
```

#### 创建签收欠条
```bash
curl -X POST http://localhost:8000/api/receipts/ \
  -H "Content-Type: application/json" \
  -d '{
    "batch_no": "BATCH-20240524-001",
    "receipt_no": "RECP-001",
    "receiver_name": "陈老板",
    "is_iou": true,
    "iou_amount": 1350,
    "created_by": 4
  }'
```

### 工作流操作

#### 提交审核
```bash
curl -X POST http://localhost:8000/api/orders/1/workflow \
  -H "Content-Type: application/json" \
  -d '{
    "action": "submit",
    "operator_id": 3,
    "change_reason": "门店确认无误"
  }'
```

#### 驳回
```bash
curl -X POST http://localhost:8000/api/orders/1/workflow \
  -H "Content-Type: application/json" \
  -d '{
    "action": "reject",
    "operator_id": 2,
    "change_reason": "回款金额对不上，请核对"
  }'
```

#### 二次确认
```bash
curl -X POST http://localhost:8000/api/orders/1/workflow \
  -H "Content-Type: application/json" \
  -d '{
    "action": "second_confirm",
    "operator_id": 2,
    "change_reason": "金额核对无误"
  }'
```

### 审计查询

#### 查看审计日志
```bash
# 按批次查看
curl "http://localhost:8000/api/audit-logs/?batch_no=BATCH-20240524-001"

# 按操作人查看
curl "http://localhost:8000/api/audit-logs/?operator_id=3"
```

#### 查看变更历史
```bash
curl "http://localhost:8000/api/change-histories/?batch_no=BATCH-20240524-001"
```

### 失败任务管理

#### 查看失败任务清单
```bash
curl http://localhost:8000/api/async-tasks/failed/
```

#### 重试任务
```bash
curl -X PUT http://localhost:8000/api/async-tasks/TASK-EXPORT-001/retry
```

#### 人工标记完成
```bash
curl -X PUT http://localhost:8000/api/async-tasks/TASK-EXPORT-001/manual-resolve
```

### 角色视图与导出

#### 片区经理视图
```bash
curl "http://localhost:8000/api/views/area-manager/?batch_no=BATCH-20240524-001"
```

#### 脱敏导出
```bash
curl -X POST http://localhost:8000/api/export/ \
  -H "Content-Type: application/json" \
  -d '{
    "batch_no": "BATCH-20240524-001",
    "desensitize": true,
    "role": "store_clerk"
  }'
```

## 验证清单

运行测试后，请验证以下内容是否一致：

1. **失败清单**: `GET /api/async-tasks/failed/`
2. **修正结果**: 检查变更历史 `GET /api/change-histories/`
3. **最终报告**: 片区经理视图 `GET /api/views/area-manager/`

## 项目结构

```
.
├── app/
│   ├── __init__.py
│   ├── main.py          # FastAPI 主应用
│   ├── models.py        # SQLAlchemy 数据模型
│   ├── schemas.py       # Pydantic 数据校验
│   ├── crud.py          # 业务逻辑与CRUD操作
│   └── database.py      # 数据库连接配置
├── requirements.txt     # 依赖列表
├── test_api.sh         # 完整测试脚本
└── README.md
```
