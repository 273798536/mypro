# 城市照明抢修权限追责台账 API

巡检照片、报修热线、备件批次和手工改价表互相印证的台账管理系统

## 核心功能

### 状态流转
```
草稿(DRAFT) → 提交(SUBMITTED) ⇄ 驳回(REJECTED) → 二次确认(RECONFIRMED)
                                                         ↓
                                             只读审计(AUDIT_ONLY) ↔ 冻结(FROZEN)
                                                         ↓
                                                    导出(EXPORTED)
                                                         ↓
                                                    撤回(WITHDRAWN) → 草稿
```

### 角色权限
- **操作员(OPERATOR)**: 创建草稿、提交、撤回、编辑草稿、添加证据、二次确认
- **主管(SUPERVISOR)**: 驳回、冻结、查看全部、人工改判
- **审计员(AUDITOR)**: 查看全部、导出、查看证据、只读审计、冻结
- **管理员(ADMIN)**: 全部权限

### 边界情况处理
- ✅ **重复提交检测**: 相同地点相同标题的工单未处理时提示
- ✅ **撤回后再提交**: 完整支持撤回-重编辑-重新提交流程
- ✅ **非法状态转换**: 严格状态机校验，不允许跳步
- ✅ **部分失败**: 导入时部分成功部分失败，不吞异常
- ✅ **人工改判**: 保留改判前后数据，原始证据不覆盖
- ✅ **冻结保护**: 冻结后无法修改，仅可导出

### 关键机制
- ✅ **重试队列**: 指数退避策略，支持导入/导出/状态变更等任务自动重试
- ✅ **死信队列**: 超过最大重试次数的任务自动转入，支持手动解决和重新入队
- ✅ **历史回放**: 完整记录状态变更序列，支持按时间点回溯工单任意历史状态

## 快速开始

### 安装依赖
```bash
pip install -r requirements.txt
```

### 初始化数据库
```bash
python cli.py init
```

### 启动 API 服务
```bash
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
API 文档: http://localhost:8000/docs

### CLI 使用

#### 用户管理
```bash
# 创建用户
python cli.py user create --username op1 --real-name 张三 --role operator --password pass123
```

#### 工单管理
```bash
# 创建工单
python cli.py workorder create --title "路灯维修" --location "人民路" --creator-id 1

# 列出工单
python cli.py workorder list

# 查看工单详情
python cli.py workorder show 1
```

#### 状态流转
```bash
# 提交工单
python cli.py status submit 1 --operator-id 1 --reason "提交审核"

# 驳回工单
python cli.py status reject 1 --operator-id 2 --reason "缺少备件信息"

# 二次确认
python cli.py status reconfirm 1 --operator-id 1 --reason "已补充信息"

# 冻结工单
python cli.py status freeze 1 --operator-id 3 --reason "导出前冻结"
```

#### 人工改判
```bash
python cli.py judgment add 1 --type 修正 --reason "核实后情况属实" --judge-id 2 --set description="修正后的描述"
```

#### 数据导入
```bash
# 导入文件（支持 CSV/Excel/JSON/图片/压缩包）
python cli.py importer file data.csv --uploaded-by 1 --auto-create
```

#### 数据导出
```bash
# 脱敏导出
python cli.py exporter json --wo-ids 1,2,3 --exported-by 3 --output export.json

# 明文导出
python cli.py exporter json --wo-ids 1 --exported-by 1 --no-mask
```

#### 重试队列管理
```bash
# 查看待处理任务
python cli.py queue list

# 查看队列统计
python cli.py queue stats
```

#### 死信队列管理
```bash
# 列出死信任务
python cli.py deadletter list

# 解决死信任务（可选重新入队）
python cli.py deadletter resolve 1 --resolved-by 1 --note "已修正数据" --requeue
```

#### 历史回放管理
```bash
# 创建历史回放会话
python cli.py replay create 1 --created-by 3 --name "问题回溯分析"

# 回放至指定时间点
python cli.py replay to-time 1 --timestamp "2024-05-20T14:30:00"

# 列出回放会话
python cli.py replay list
```

#### 退出码
- `0`: 成功
- `1`: 通用错误
- `2`: 部分成功（如部分导入）
- `3`: 资源不存在
- `4`: 权限错误
- `5`: 状态错误

## API 接口

### 工单管理
- `POST /api/work-orders/` - 创建工单
- `GET /api/work-orders/` - 列出工单
- `GET /api/work-orders/{id}` - 获取工单详情
- `PATCH /api/work-orders/{id}` - 更新工单

### 状态流转
- `POST /api/work-orders/{id}/status` - 变更状态
- `POST /api/work-orders/{id}/freeze` - 冻结工单

### 证据与改判
- `POST /api/work-orders/{id}/evidence` - 添加证据
- `POST /api/work-orders/{id}/judgment` - 人工改判

### 导入导出
- `POST /api/import/` - 导入文件
- `POST /api/export/` - 导出台账

### 角色视图
- `GET /api/role-view-config/{role}` - 获取角色视图配置
- `GET /api/work-orders/?viewer_role={role}` - 按角色视图列出工单
- `GET /api/work-orders/{id}?viewer_role={role}` - 按角色视图查看工单详情

### 重试队列
- `POST /api/retry-tasks/` - 创建重试任务
- `GET /api/retry-tasks/` - 列出待处理任务
- `GET /api/queue-stats/` - 获取队列统计

### 死信队列
- `GET /api/dead-letter/` - 列出死信任务
- `POST /api/dead-letter/resolve/` - 解决死信任务

### 历史回放
- `POST /api/replay/sessions/` - 创建回放会话
- `GET /api/replay/sessions/` - 列出回放会话
- `GET /api/replay/sessions/{id}` - 获取回放会话详情
- `POST /api/replay/to-timestamp/` - 回放至指定时间点

## 数据模型

### 核心表
- **work_orders**: 工单主表
- **status_transitions**: 状态流转记录（时间、操作者、原因）
- **raw_records**: 原始导入记录（来源文件、行号、原始值）
- **import_records**: 导入批次记录
- **judgments**: 人工改判记录（前后数据对比）
- **evidences**: 证据链
- **export_logs**: 导出日志
- **users**: 用户与角色

### 新增表（v1.1）
- **retry_queue**: 重试队列（指数退避、最大重试次数）
- **dead_letter_queue**: 死信队列（支持重新入队）
- **replay_sessions**: 历史回放会话

## Bug 修复（v1.2）

### 状态链完整性修复
- **问题 1**: `freeze_work_order` 绕过状态机，草稿工单可直接冻结
  - **原因**: 缺少 `can_transition` 状态机校验
  - **修复**: 添加状态机校验，仅 `audit_only` 状态可冻结

- **问题 2**: 冻结记录写成 `frozen → frozen`，审计历史不可信
  - **原因**: 先修改 `db_wo.status` 再读取 `from_status`
  - **修复**: 先保存 `old_status` 再修改状态，正确记录前置状态

### 角色视图接口修复（v1.1）
- **问题**: `GET /api/work-orders/?viewer_role=operator` 返回 500，报 `ResponseValidationError`
- **原因**: 接口使用 `response_model=List[WorkOrder]`，但角色视图返回裁剪后的 dict
- **修复**: 移除 `response_model` 约束，动态构建完整数据结构后再裁剪

### 状态流转修复（v1.1）
- **问题**: `examples/role_view_demo.py` 第 120 行从 `submitted` 直接转 `audit_only` 抛状态错误
- **原因**: 违反状态机规则，缺少 `reconfirmed` 中间状态
- **修复**: 添加正确的状态转换路径 `submitted → reconfirmed → audit_only`

## 项目结构
```
.
├── app/
│   ├── __init__.py
│   ├── models.py          # 数据模型（新增重试/死信/回放表）
│   ├── schemas.py         # Pydantic 模式（新增队列相关模式）
│   ├── database.py        # 数据库连接
│   ├── services.py        # 业务逻辑（已修复状态链）
│   ├── importer.py        # 导入功能
│   ├── queue_service.py   # 队列与回放服务（新增）
│   └── main.py            # FastAPI 应用（新增队列/回放接口）
├── examples/
│   ├── demo_workflow.py              # 完整流程演示
│   ├── test_edge_cases.py            # 边界情况测试
│   ├── role_view_demo.py             # 角色视图演示（已修复）
│   ├── test_queue_and_replay.py      # 队列与回放测试（新增）
│   └── test_state_chain_integrity.py # 状态链完整性测试（新增）
├── cli.py                 # CLI 工具（新增队列/回放命令）
├── requirements.txt       # 依赖
└── README.md              # 说明文档
```

## 运行演示
```bash
# 完整流程演示（创建到导出）
python examples/demo_workflow.py

# 边界情况测试
python examples/test_edge_cases.py

# 角色视图演示（已修复状态流转）
python examples/role_view_demo.py

# 队列与回放功能测试
python examples/test_queue_and_replay.py

# 状态链完整性验证（核心修复验证）
python examples/test_state_chain_integrity.py
```
