# 外协加工对账重试补偿队列系统

解决夜间抢修无单、同一批半成品分批返工后结算单容易多扣引出的重复和冲突问题。

## 核心特性

### ✅ 已实现功能

1. **数据来源稳定**
   - 外协送货单管理（带幂等性控制）
   - 返修记录管理（分批返工支持）
   - 扣款明细管理（避免重复扣款）
   - 班次记录补录功能
   - 临时补录单支持

2. **重试补偿队列服务**
   - 外部回执提交
   - 自动排队机制
   - 限次重试（默认3次）
   - 死信队列处理
   - 人工接管（重试/跳过/调整）
   - 补偿入账
   - 自动关闭

3. **幂等性保证**
   - 组合幂等键（供应商+单号+日期等）
   - 数据库唯一约束
   - 重复请求只更新同一条事实
   - 不会悄悄多算

4. **报表与追溯**
   - 结算汇总报表
   - 报表数字可追到单条记录
   - 坏数据隔离（不进汇总）
   - 失败列表带原因展示
   - 导出Excel/CSV
   - 老板看板（可重试分类、死信处理）

5. **严格权限控制**
   - 录入员：只能录入、查看自己的数据
   - 复核员：可复核、查看全部数据
   - 主管：人工处理、死信管理、全部权限
   - 只读用户：只能查看非敏感数据

6. **差异对比**
   - 异常修正前后差异对比
   - 变更历史追踪
   - 详情、报告、导出对到同一个原因

## 项目结构

```
y11577/
├── app/
│   ├── __init__.py
│   ├── main.py              # 主应用入口
│   ├── config.py            # 配置文件
│   ├── database.py          # 数据库连接
│   ├── core/
│   │   ├── __init__.py
│   │   └── security.py      # 认证与权限
│   ├── models/
│   │   ├── __init__.py
│   │   ├── base.py          # 基础模型
│   │   ├── auth.py          # 用户权限模型
│   │   └── business.py      # 业务模型
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── auth.py          # 认证相关schema
│   │   ├── business.py      # 业务相关schema
│   │   └── common.py        # 通用schema
│   ├── services/
│   │   ├── idempotent_service.py  # 幂等性服务
│   │   └── queue_service.py       # 队列服务
│   └── api/v1/
│       ├── __init__.py
│       ├── auth.py          # 认证API
│       ├── delivery.py      # 送货单API
│       ├── repair.py        # 返修记录API
│       ├── deduction.py     # 扣款明细API
│       ├── shift.py         # 班次记录API
│       ├── queue.py         # 队列管理API
│       └── report.py        # 报表API
├── scripts/
│   ├── __init__.py
│   └── init_data.py         # 初始化测试数据
├── requirements.txt         # 依赖包
├── ARCHITECTURE.md          # 架构设计文档
├── USER_GUIDE.md            # 详细使用指南
└── README.md                # 本文件
```

## 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 配置数据库

编辑 [app/config.py](file:///Users/mac/pro/solo/workspaces/y11577/app/config.py#L9) 中的数据库连接：

```python
DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/outsource_settlement"
```

### 3. 初始化权限和测试用户

```bash
python scripts/init_data.py
```

创建的测试用户：

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123 | 主管 |
| reviewer | reviewer123 | 复核员 |
| entry | entry123 | 录入员 |
| viewer | viewer123 | 只读 |

### 4. 启动服务

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

访问: http://localhost:8000/docs 查看Swagger文档

## 关键代码参考

### 核心服务

| 模块 | 文件 | 说明 |
|------|------|------|
| 幂等性服务 | [idempotent_service.py](file:///Users/mac/pro/solo/workspaces/y11577/app/services/idempotent_service.py) | 幂等键生成、upsert操作、失败记录 |
| 队列服务 | [queue_service.py](file:///Users/mac/pro/solo/workspaces/y11577/app/services/queue_service.py) | 排队、重试、死信、人工处理 |
| 权限控制 | [security.py](file:///Users/mac/pro/solo/workspaces/y11577/app/core/security.py) | 角色校验、字段过滤 |

### 业务模型

| 模型 | 文件 | 说明 |
|------|------|------|
| 外协送货单 | [business.py#L9-L30](file:///Users/mac/pro/solo/workspaces/y11577/app/models/business.py#L9-L30) | 送货单表结构 |
| 返修记录 | [business.py#L33-L48](file:///Users/mac/pro/solo/workspaces/y11577/app/models/business.py#L33-L48) | 返修记录表结构 |
| 扣款明细 | [business.py#L51-L65](file:///Users/mac/pro/solo/workspaces/y11577/app/models/business.py#L51-L65) | 扣款明细表结构 |
| 补偿队列 | [business.py#L94-L115](file:///Users/mac/pro/solo/workspaces/y11577/app/models/business.py#L94-L115) | 队列表结构 |
| 失败记录 | [business.py#L137-L153](file:///Users/mac/pro/solo/workspaces/y11577/app/models/business.py#L137-L153) | 坏数据隔离表 |
| 结算汇总 | [business.py#L156-L173](file:///Users/mac/pro/solo/workspaces/y11577/app/models/business.py#L156-L173) | 带source_ids追溯 |
| 变更历史 | [business.py#L176-L190](file:///Users/mac/pro/solo/workspaces/y11577/app/models/business.py#L176-L190) | 差异对比记录 |

### API端点

| 模块 | 文件 | 说明 |
|------|------|------|
| 外协送货单 | [delivery.py](file:///Users/mac/pro/solo/workspaces/y11577/app/api/v1/delivery.py) | CRUD + 审核 |
| 返修记录 | [repair.py](file:///Users/mac/pro/solo/workspaces/y11577/app/api/v1/repair.py) | CRUD |
| 扣款明细 | [deduction.py](file:///Users/mac/pro/solo/workspaces/y11577/app/api/v1/deduction.py) | CRUD |
| 班次记录 | [shift.py](file:///Users/mac/pro/solo/workspaces/y11577/app/api/v1/shift.py) | CRUD |
| 队列管理 | [queue.py](file:///Users/mac/pro/solo/workspaces/y11577/app/api/v1/queue.py) | 统计、死信、人工处理 |
| 报表追溯 | [report.py](file:///Users/mac/pro/solo/workspaces/y11577/app/api/v1/report.py) | 汇总、来源追溯、对比、导出、看板 |

## 核心流程

### 夜间抢修补录流程

```
1. 录外协送货单 (带抢修标识)
   ↓
2. 录返修记录 (分批返工，通过batch_no关联)
   ↓
3. 录扣款明细 (确认责任方后)
   ↓
4. 补录班次记录 (夜班抢修)
   ↓
5. 全部自动入队 → 自动补偿 → 结算汇总
```

### 重试补偿流程

```
入队 → 处理 → 成功 → 补偿入账 → 关闭
          ↓
        失败 → 重试(3次) → 成功 → 补偿入账 → 关闭
                    ↓
                    失败 → 死信 → 人工接管
                                          ↓
                                    修正后重新入队
```

## 详细文档

- [架构设计](ARCHITECTURE.md) - 系统架构、数据表设计、技术选型
- [使用指南](USER_GUIDE.md) - 样例材料、失败路径、修正方式、报表变化

## 老板看板重点

1. **可重试分类**: 按错误码统计，看是什么类型的问题
2. **死信处理**: 必须人工干预的记录数
3. **恢复后续跑**: 处理成功的自动进入汇总，不影响后续流程
4. **来源可追溯**: 每个数字都能追到具体哪条送货单、哪条返修、哪条扣款
