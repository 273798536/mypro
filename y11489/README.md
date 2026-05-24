# 小厂质检返工权限追责台账服务

## 系统概述

针对同一缺陷反复返工后良率和责任班次被冲掉的问题，建立抽检表、返工单、机台班次和手工改价表的互相印证与追责台账系统。

## 核心特性

### 1. 数据完整性与证据保留
- 导入时保留来源文件、原始行号和解析后的标准值
- 原始证据不被改判覆盖
- 所有变更记录完整审计轨迹

### 2. 状态机流转
```
草稿(DRAFT) → 提交(SUBMITTED) → 驳回(REJECTED) → 二次确认(RECONFIRMED) → 冻结(FROZEN) → 导出(EXPORTED)
                                  ↓
                               取消(CANCELLED)
```

### 3. 角色权限控制
| 角色 | 权限 |
|------|------|
| 操作员(OPERATOR) | 创建、编辑草稿、提交、驳回后修改重提 |
| 质检员(QC_INSPECTOR) | 审核驳回 |
| 组长(TEAM_LEADER) | 二次确认、冻结 |
| 生产经理(PRODUCTION_MANAGER) | 人工改判、冻结、导出 |
| 审计员(AUDITOR) | 查看审计日志、导出 |
| 管理员(ADMIN) | 全部权限 |

### 4. 边界情况处理
- ✅ 重复提交检测
- ✅ 撤回后再提交（驳回→草稿→重新提交）
- ✅ 部分失败（导入时行级错误不影响整体）
- ✅ 人工改判（记录变更原因和操作人）
- ✅ 导出前冻结（锁定数据不可修改）
- ✅ 异常不吞掉（明确抛出错误信息）

## 项目结构

```
.
├── main.py                 # FastAPI 主入口
├── cli.py                  # CLI 命令行工具
├── run_demo.py             # 完整流程演示脚本
├── requirements.txt        # 依赖列表
├── app/
│   ├── __init__.py
│   ├── config.py           # 配置管理
│   ├── database.py         # 数据库连接
│   ├── models/             # 数据模型
│   │   ├── __init__.py
│   │   ├── user.py         # 用户与角色
│   │   ├── states.py       # 状态机定义
│   │   ├── inspection.py   # 抽检表
│   │   ├── rework.py       # 返工单
│   │   ├── machine_shift.py # 机台班次
│   │   ├── price_adjustment.py # 手工改价表
│   │   ├── import_source.py # 导入来源
│   │   ├── audit.py        # 审计日志与变更历史
│   │   └── export.py       # 导出记录
│   ├── schemas/            # Pydantic 数据验证
│   ├── services/           # 业务逻辑层
│   │   ├── auth.py         # 认证与权限
│   │   ├── status.py       # 状态流转
│   │   ├── audit.py        # 审计服务
│   │   ├── import_service.py # 导入服务
│   │   └── export_service.py # 导出服务
│   └── api/                # API 路由
│       ├── __init__.py
│       ├── auth.py
│       ├── inspection.py
│       ├── rework.py
│       ├── shift.py
│       ├── price.py
│       ├── imports.py
│       ├── export.py
│       ├── audit.py
│       └── status.py
├── uploads/                # 上传文件存储
└── exports/                # 导出文件存储
```

## 快速开始

### 1. 安装依赖
```bash
pip install -r requirements.txt
```

### 2. 初始化演示数据
```bash
python cli.py init-demo
```

预设用户：
- 管理员：admin / admin123
- 生产经理：manager / managerpass
- 质检员：qcuser / qcpass123
- 操作员：operator / oppass123

### 3. 启动服务
```bash
python main.py
# 或
uvicorn main:app --reload
```

### 4. 访问 API 文档
```
http://localhost:8000/docs
```

### 5. 运行完整演示
```bash
python run_demo.py
```

## CLI 命令行使用

```bash
# 用户管理
python cli.py user create --username test --password test123 --name 测试用户 --role operator
python cli.py user list

# 抽检记录
python cli.py inspection list
python cli.py inspection status 1 submitted --user-id 1 --reason "提交审核"

# 返工单
python cli.py rework list

# 审计日志
python cli.py audit logs
python cli.py audit changes --entity-type inspection --entity-id 1

# 导出记录
python cli.py export list
```

## API 调用示例

### 登录获取 Token
```bash
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=operator&password=oppass123"
```

### 创建抽检记录
```bash
curl -X POST "http://localhost:8000/api/inspection/" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"batch_no":"B001","product_code":"P001","yield_rate":95.5}'
```

### 状态流转
```bash
curl -X POST "http://localhost:8000/api/status/inspection/1" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"new_status":"submitted","reason":"提交审核"}'
```

### 导入 Excel
```bash
curl -X POST "http://localhost:8000/api/import/inspection" \
  -H "Authorization: Bearer <token>" \
  -F "file=@test.xlsx"
```

### 导出数据
```bash
curl -X POST "http://localhost:8000/api/export/" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"export_type":"inspection","format":"xlsx","mask_sensitive_fields":true}'
```

## 生产经理视图重点

系统为生产经理特别提供：

1. **角色视图**：按角色过滤的操作记录和权限范围
2. **变更原因**：每次人工改判必须填写原因，完整可追溯
3. **敏感字段处理**：价格等敏感字段自动脱敏，仅经理以上可见
4. **变更历史**：字段级别的变更记录，包括旧值、新值、操作人、时间
5. **来源追溯**：每条记录可追溯到导入来源文件和原始行号

## 数据持久化

所有数据均存储在 SQLite 数据库中，重启后不丢失：
- 状态流转记录
- 变更历史记录
- 审计日志
- 导入来源文件信息
- 导出记录

## 退出码说明 (CLI)

| 退出码 | 含义 |
|--------|------|
| 0 | 成功 |
| 1 | 一般错误 |
| 2 | 参数错误 |
| 3 | 权限不足 |
| 4 | 数据不存在 |
| 5 | 状态流转非法 |
