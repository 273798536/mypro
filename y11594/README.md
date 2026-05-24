# 仓内波次拣货权限追责台账 API

## 项目概述

完整的仓内波次拣货追责台账系统，实现从草稿到导出的完整闭环，支持波次单、拣货差异、复核扫描、退款流水、缺货拆单、盘点差异等多源数据整合，具备严格的权限控制和完整的状态流转。

## 核心功能

### 1. 状态闭环流程
```
草稿 → 提交 → 复核中 → 确认/驳回 → 二次确认 → 审计 → 导出
                          ↓
                      已驳回 → 退回草稿/二次确认
```

### 2. 角色权限体系

| 角色 | 可见字段 | 可操作动作 |
|------|---------|-----------|
| 录入员 | 基础字段 | 创建、编辑、提交、查看草稿 |
| 复核员 | 基础+复核字段 | 查看待复核、复核、驳回、确认 |
| 主管 | 全部字段 | 查看全部、二次确认、审计、导出、分配 |
| 只读 | 关键字段 | 查看已审计记录 |

### 3. 脏数据识别与处理

**识别类型：**
- 缺字段：必填字段缺失
- 跨日数据：波次日期跨天
- 人员改名：拣货员姓名不一致
- 金额冲突：来源数据金额不一致
- 数量冲突：数量逻辑不符
- 重复记录：同一波次同一SKU重复

**处理方式：**
- 保留原始内容
- 记录处理意见
- 修正后重新汇总

### 4. 追溯能力

**绩效变形追溯：
- 缺货拆单前后绩效对比
- 原始绩效与变形后绩效差值
- 变形原因记录

**库存占用追溯：**
- 拆单前后库存占用对比
- 相关退款影响分析

**数据来源追溯：**
- 波次单、拣货差异、复核扫描
- 退款流水、缺货拆单、盘点差异

### 5. 经理视图

- **角色视图**：各角色操作统计
- **变更原因分析**：状态变更原因分布
- **敏感字段处理**：脏数据类型分布、解决率
- **拣货员绩效排名**：按脏数据率排序

### 6. 自动化检查

- **重复导入检查**：导入前检查波次+SKU唯一性
- **权限拦截检查**：操作前验证角色权限
- **异常保留检查**：验证脏数据和历史记录完整性
- **重启历史验证**：台账状态与历史一致性校验
- **导出一致性校验**：文件哈希验证防止篡改

## 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 初始化数据

```bash
python -m scripts.init_data
```

**默认账号：**
- 主管(超级权限): `admin` / `admin123`
- 录入员: `entry1` / `123456`
- 复核员: `reviewer1` / `123456`
- 只读: `readonly1` / `123456`

### 3. 启动服务

```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 4. 访问API文档

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## API 接口清单

### 认证接口 (`/api/v1/auth`)
- `POST /login` - 用户登录
- `POST /register` - 用户注册
- `GET /me` - 获取当前用户信息
- `GET /roles` - 获取角色权限列表

### 台账管理 (`/api/v1/ledger`)
- `POST /create` - 创建台账
- `GET /list` - 台账列表（按角色权限过滤）
- `GET /{ledger_id}` - 台账详情（含追溯信息）
- `PUT /{ledger_id}` - 编辑台账
- `POST /submit` - 提交台账
- `POST /start-review` - 开始复核
- `POST /confirm` - 确认通过
- `POST /reject` - 驳回
- `POST /second-confirm` - 二次确认
- `POST /back-to-draft` - 退回草稿
- `GET /{ledger_id}/history` - 状态历史
- `GET /dirty/list` - 脏数据列表
- `POST /dirty/{dirty_id}/resolve` - 解决脏数据
- `POST /import` - 批量导入

### 导出管理 (`/api/v1/export`)
- `POST /excel` - 导出Excel（支持脱敏）
- `GET /verify/{export_no}` - 验证导出文件一致性
- `GET /history` - 导出历史

### 经理视图 (`/api/v1/manager`)
- `GET /overview` - 总览数据
- `GET /change-reason-analysis` - 变更原因分析
- `GET /sensitive-field-handling` - 敏感字段处理统计
- `GET /picker-ranking` - 拣货员绩效排名
- `GET /dashboard` - 完整仪表盘

### 系统检查
- `GET /system-check` - 系统健康检查

## 项目结构

```
.
├── app/
│   ├── __init__.py
│   ├── main.py              # 应用入口
│   ├── config.py            # 配置文件
│   ├── database.py          # 数据库配置
│   ├── models/              # 数据模型
│   │   ├── __init__.py
│   │   ├── base.py          # 基础模型
│   │   ├── user.py          # 用户模型
│   │   ├── source_data.py   # 源数据模型
│   │   ├── ledger.py        # 台账模型
│   │   └── all_models.py    # 统一导入
│   ├── core/                # 核心业务
│   │   ├── __init__.py
│   │   ├── security.py      # 安全与权限
│   │   ├── state_machine.py # 状态机
│   │   ├── ledger_service.py # 台账服务
│   │   ├── dirty_record_detector.py # 脏数据检测
│   │   ├── export_service.py # 导出服务
│   │   ├── manager_view.py  # 经理视图
│   │   └── auto_check.py    # 自动化检查
│   ├── schemas/             # Pydantic 模型
│   │   ├── __init__.py
│   │   ├── common.py
│   │   ├── auth.py
│   │   └── ledger.py
│   └── routers/             # API 路由
│       ├── __init__.py
│       ├── auth.py
│       ├── ledger.py
│       ├── export.py
│       └── manager.py
├── scripts/
│   ├── __init__.py
│   └── init_data.py         # 初始化脚本
├── exports/                  # 导出文件目录
├── requirements.txt
└── README.md
```

## 核心技术栈

- **Web框架**: FastAPI 0.104.1
- **ORM**: SQLAlchemy 2.0.23
- **数据库**: SQLite (可扩展为MySQL/PostgreSQL)
- **认证**: JWT (python-jose)
- **密码加密**: passlib (bcrypt)
- **数据处理**: pandas + openpyxl
