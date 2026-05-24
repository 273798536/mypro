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

## 项目结构
```
.
├── app/
│   ├── __init__.py
│   ├── models.py          # 数据模型
│   ├── schemas.py         # Pydantic 模式
│   ├── database.py        # 数据库连接
│   ├── services.py        # 业务逻辑
│   ├── importer.py        # 导入功能
│   └── main.py            # FastAPI 应用
├── examples/
│   ├── demo_workflow.py   # 完整流程演示
│   ├── test_edge_cases.py # 边界情况测试
│   └── role_view_demo.py  # 角色视图演示
├── cli.py                 # CLI 工具
├── requirements.txt       # 依赖
└── README.md              # 说明文档
```

## 运行演示
```bash
# 完整流程演示
python examples/demo_workflow.py

# 边界情况测试
python examples/test_edge_cases.py

# 角色视图演示
python examples/role_view_demo.py
```
