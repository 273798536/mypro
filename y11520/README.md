# 家电安装回访异常回执状态机 API

采购到货分两车 - 家电安装回访异常回执状态追踪后端服务

## 功能特性

- **状态追踪**: 批次创建 → 提交复核 → 复核改判 → 冻结结算 → 撤回归档
- **多源数据接入**: 预约单、师傅定位、用户评价、外部回执
- **脏记录处理**: 自动识别缺字段、跨日、改名、金额/数量冲突
- **修正值回写**: 处理脏记录时可将修正值回写到原始记录
- **重新汇总**: 脏记录处理后自动重新计算统计数据
- **权限控制**: 录入、复核、主管、只读查看四级权限，可见字段不同
- **数据持久化**: SQLite 数据库，重启后数据不丢失
- **导出汇总**: 区域售后重点关注冻结前后状态、人工理由

## 快速开始

### 1. 环境准备

```bash
# 安装依赖
pip install -r requirements.txt
```

### 2. 初始化数据库（空库启动）

```bash
python init_db.py
```

这会创建数据库并初始化4个默认用户：

| 用户名 | 密码 | 角色 | 权限说明 |
|--------|------|------|---------|
| manager | manager123 | 主管 | 所有权限，包括冻结、结算、归档，查看所有字段 |
| reviewer | reviewer123 | 复核 | 复核、处理脏记录、回写修正值 |
| entry | entry123 | 录入 | 创建批次、上传数据、提交复核，部分字段可见 |
| readonly | readonly123 | 只读 | 只能查看基本信息，敏感字段隐藏 |

### 3. 启动服务

```bash
uvicorn app.main:app --reload
```

服务启动后访问:
- API 文档: http://localhost:8000/docs
- 健康检查: http://localhost:8000/health

### 4. 准备样例数据

```bash
# 查看样例数据结构
python sample_data.py
```

## 角色字段可见性说明

### 批次列表可见字段

| 字段 | 只读 | 录入 | 复核 | 主管 |
|------|------|------|------|------|
| id | ✓ | ✓ | ✓ | ✓ |
| batch_no | ✓ | ✓ | ✓ | ✓ |
| name | ✓ | ✓ | ✓ | ✓ |
| region | ✓ | ✓ | ✓ | ✓ |
| status | ✓ | ✓ | ✓ | ✓ |
| created_at | ✓ | ✓ | ✓ | ✓ |
| created_by | ✗ | ✓ | ✓ | ✓ |
| updated_at | ✗ | ✓ | ✓ | ✓ |
| remark | ✗ | ✓ | ✓ | ✓ |
| freeze_reason | ✗ | ✗ | ✗ | ✓ |
| freeze_time | ✗ | ✗ | ✗ | ✓ |
| unfreeze_reason | ✗ | ✗ | ✗ | ✓ |
| unfreeze_time | ✗ | ✗ | ✗ | ✓ |
| status_before_freeze | ✗ | ✗ | ✗ | ✓ |

### 批次详情可见字段

| 字段/子资源 | 只读 | 录入 | 复核 | 主管 |
|------------|------|------|------|------|
| appointment_orders | ✓(精简) | ✓ | ✓ | ✓ |
| technician_locations | ✗ | ✓ | ✓ | ✓ |
| user_reviews | ✓(精简) | ✓ | ✓ | ✓ |
| external_receipts | ✗ | ✓ | ✓ | ✓ |
| dirty_records | ✗ | ✓ | ✓ | ✓ |
| status_logs | ✗ | ✗ | ✗ | ✓ |
| 冻结相关字段 | ✗ | ✗ | ✗ | ✓ |

## 主流程操作指南

### 方式一：通过 Swagger UI (推荐)

1. 打开 http://localhost:8000/docs
2. 点击 `Authorize` 按钮，用 `entry` / `entry123` 登录
3. 按以下步骤操作：

**步骤 1: 创建批次**
- 调用 `POST /api/v1/batches`
```json
{
  "batch_no": "BATCH-20240524-001",
  "name": "华东区域5月24日安装回访批次（第一车）",
  "region": "华东区",
  "remark": "采购到货分两车 - 第一车"
}
```

**步骤 2: 上传数据**
- 调用 `POST /api/v1/batches/{batch_id}/upload`
- 从 `sample_data.py` 复制数据填入

**步骤 3: 提交复核**
- 调用 `POST /api/v1/batches/{batch_id}/submit`
```json
{"manual_reason": "数据核对完成"}
```

**步骤 4: 复核通过**
- 重新用 `reviewer` 登录
- 调用 `POST /api/v1/batches/{batch_id}/review`
```json
{
  "result": "approved",
  "comment": "复核通过",
  "manual_reason": "区域售后确认"
}
```

**步骤 5: 冻结（异常处理）**
- 重新用 `manager` 登录
- 调用 `POST /api/v1/batches/{batch_id}/freeze`
```json
{
  "freeze_reason": "差评原因未核实",
  "manual_reason": "主管介入"
}
```

**步骤 6: 解冻 + 结算**
- 调用 `POST /api/v1/batches/{batch_id}/unfreeze`
- 调用 `POST /api/v1/batches/{batch_id}/settle`

**步骤 7: 导出汇总**
- 调用 `GET /api/v1/export/download` 下载 Excel

### 方式二：运行自动化测试

```bash
python test_flow.py
```

## 脏记录处理流程

### 自动检测的脏记录类型

| 类型 | 说明 | 检测逻辑 |
|------|------|---------|
| MISSING_FIELD | 缺少必填字段 | 检查 order_no、customer_name、appointment_time 等必填字段 |
| CROSS_DAY | 跨日数据 | 记录日期与批次创建日期不同 |
| NAME_CHANGED | 师傅姓名不一致 | 同一 technician_id 出现不同姓名 |
| AMOUNT_CONFLICT | 金额冲突 | 同一订单出现多笔不同金额的回执 |
| QUANTITY_CONFLICT | 数量冲突 | 同一订单预约单数量与回执数量不一致 |
| OTHER | 其他问题 | 改约和二次上门同时标记、差评原因未找到 |

### 处理脏记录并回写修正值

```bash
# 1. 查看待处理的脏记录
GET /api/v1/batches/{batch_id}/dirty-records?resolved=false

# 2. 处理脏记录（回写修正值到原始记录）
PATCH /api/v1/batches/dirty-records/{record_id}/resolve
{
  "handling_opinion": "差评原因已核实",
  "corrected_value": "安装位置不合适导致异响",
  "apply_correction": true  # 关键：将修正值回写到原始记录
}

# 3. 重新计算汇总统计
POST /api/v1/batches/{batch_id}/recalculate
```

### 修正值回写说明

- 脏记录包含 `target_model` 和 `target_record_id` 字段，指向原始记录
- 处理时设置 `apply_correction: true` 会自动将 `corrected_value` 回写到原始记录
- 支持的回写目标：
  - `AppointmentOrder`: customer_name、customer_phone、address 等字段
  - `UserReview`: bad_review_reason、bad_review_found 等字段
  - `ExternalReceipt`: quantity、amount 等字段
  - `TechnicianLocation`: technician_name 等字段

## 制造异常场景测试

### 场景 1: 改约和二次上门未合并

上传包含 `is_rescheduled: true` 和 `is_second_visit: true` 的预约单，系统会自动标记脏记录。

### 场景 2: 差评原因找不到

上传 `rating <= 2` 且 `bad_review_found: false` 的评价，系统会自动标记需要人工核实。

### 场景 3: 字段缺失

上传 `customer_name: ""` 或 `customer_phone: ""` 的订单，系统会标记 `MISSING_FIELD`。

### 场景 4: 跨日数据

上传时间与批次创建日期不同的数据，系统会标记 `CROSS_DAY`。

### 场景 5: 师傅姓名不一致

同一 `technician_id` 上传不同的 `technician_name`，系统会标记 `NAME_CHANGED`。

### 场景 6: 金额冲突

同一订单上传多笔不同金额的回执，系统会标记 `AMOUNT_CONFLICT`。

### 场景 7: 数量冲突

同一订单预约单数量与回执数量不一致，系统会标记 `QUANTITY_CONFLICT`。

## 状态流转图

```
草稿(DRAFT)
    ↓
待复核(PENDING_REVIEW) ←─┐
    ↓                    │
已复核(REVIEWED)         │
    ↓                    │
已结算(SETTLED)          │
    ↓                    │
已归档(ARCHIVED)         │
                         │
冻结(FROZEN) ────────────┘
   (可解冻回到任意前置状态)
```

## API 端点说明

### 认证
- `POST /api/v1/auth/token` - 登录获取 Token
- `GET /api/v1/auth/me` - 获取当前用户信息
- `POST /api/v1/auth/users` - 创建用户（仅主管）

### 批次管理
- `GET /api/v1/batches` - 批次列表（按角色返回不同字段）
- `POST /api/v1/batches` - 创建批次（录入+）
- `GET /api/v1/batches/{id}` - 批次详情（按角色返回不同字段）
- `PUT /api/v1/batches/{id}` - 编辑批次（录入+）
- `POST /api/v1/batches/{id}/upload` - 上传数据（录入+）
- `POST /api/v1/batches/{id}/submit` - 提交复核（录入+）
- `POST /api/v1/batches/{id}/review` - 复核（复核+）
- `POST /api/v1/batches/{id}/freeze` - 冻结（主管）
- `POST /api/v1/batches/{id}/unfreeze` - 解冻（主管）
- `POST /api/v1/batches/{id}/settle` - 结算（主管）
- `POST /api/v1/batches/{id}/archive` - 归档（主管）
- `POST /api/v1/batches/{id}/recalculate` - 重新计算汇总（复核+）

### 脏记录
- `GET /api/v1/batches/{id}/dirty-records` - 脏记录列表
- `PATCH /api/v1/batches/dirty-records/{id}/resolve` - 处理脏记录（可回写修正值）

### 导出汇总
- `GET /api/v1/export/stats` - 统计数据
- `GET /api/v1/export/summary` - 汇总数据
- `GET /api/v1/export/download` - 下载 Excel

## 测试重点

### 1. 状态变化测试
- 草稿 → 待复核：成功
- 待复核 → 已复核：成功
- 已复核 → 已结算：成功
- 草稿 → 已结算：失败（状态不允许跳跃）
- 已归档 → 任意状态：失败（归档后不可操作）

### 2. 幂等性测试
- 同一批次号重复创建：失败（400）
- 同一批次重复提交复核：第二次失败（状态已变更）
- 重复上传相同订单号：幂等（去重）

### 3. 权限测试
- 只读用户创建批次：失败（403）
- 录入用户冻结批次：失败（403）
- 复核用户结算批次：失败（403）
- 所有人查看列表：成功

### 4. 冻结测试
- 冻结后记录冻结前状态
- 解冻可选择目标状态
- 冻结期间不能进行其他操作

### 5. 脏记录处理测试
- 自动检测各类脏记录
- 修正值回写到原始记录
- 处理后重新汇总统计

### 6. 字段可见性测试
- 只读用户：仅能看到基本信息
- 录入用户：能看到业务数据但看不到冻结信息
- 主管：能看到所有信息包括状态日志

## 权限矩阵

| 操作 | 只读 | 录入 | 复核 | 主管 |
|------|------|------|------|------|
| 查看批次（基本信息） | ✓ | ✓ | ✓ | ✓ |
| 查看批次（敏感字段） | ✗ | ✗ | ✗ | ✓ |
| 查看统计 | ✓ | ✓ | ✓ | ✓ |
| 下载导出 | ✓ | ✓ | ✓ | ✓ |
| 创建批次 | ✗ | ✓ | ✓ | ✓ |
| 上传数据 | ✗ | ✓ | ✓ | ✓ |
| 提交复核 | ✗ | ✓ | ✓ | ✓ |
| 复核操作 | ✗ | ✗ | ✓ | ✓ |
| 处理脏记录 | ✗ | ✗ | ✓ | ✓ |
| 回写修正值 | ✗ | ✗ | ✓ | ✓ |
| 重新汇总 | ✗ | ✗ | ✓ | ✓ |
| 冻结/解冻 | ✗ | ✗ | ✗ | ✓ |
| 结算 | ✗ | ✗ | ✗ | ✓ |
| 归档 | ✗ | ✗ | ✗ | ✓ |
| 用户管理 | ✗ | ✗ | ✗ | ✓ |

## 目录结构

```
.
├── app/
│   ├── __init__.py
│   ├── main.py                 # 主入口
│   ├── core/
│   │   ├── config.py           # 配置
│   │   ├── database.py         # 数据库连接
│   │   └── security.py         # 认证和权限
│   ├── models/
│   │   ├── enums.py            # 枚举定义
│   │   └── models.py           # 数据模型（含数量字段、汇总缓存）
│   ├── schemas/
│   │   └── schemas.py          # Pydantic 模型（含角色专属响应模型）
│   ├── services/
│   │   ├── state_machine.py    # 状态机
│   │   ├── data_processor.py   # 数据处理、脏记录检测、修正值回写、重新汇总
│   │   └── export_service.py   # 导出服务
│   └── api/
│       ├── auth.py             # 认证接口
│       ├── batches.py          # 批次接口（含角色字段控制）
│       └── export.py           # 导出接口
├── init_db.py                  # 初始化脚本
├── sample_data.py              # 样例数据
├── test_flow.py                # 流程测试
├── requirements.txt            # 依赖
└── README.md                   # 本文档
```

## 数据库持久化说明

所有数据存储在 `app.db` SQLite 文件中，包含：
- 用户表（users）
- 批次表（batches）- 含 summary_cache 汇总缓存
- 预约单表（appointment_orders）- 含 quantity 数量字段
- 师傅定位表（technician_locations）
- 用户评价表（user_reviews）
- 外部回执表（external_receipts）- 含 quantity 数量字段
- 脏记录表（dirty_records）- 含 target_model、target_record_id、is_applied
- 状态变更日志（status_logs）
- 复核记录表（review_records）

**重启服务或服务器后，所有历史数据均可查询。**

## 更新日志

### v2.0 (当前版本)

新增功能：
- 脏记录修正值回写到原始记录
- 数量冲突检测（QUANTITY_CONFLICT）
- 批次汇总缓存与重新计算
- 按角色控制可见字段（只读/录入/复核/主管）
- 新增 `/recalculate` 端点

### v1.0

初始版本：
- 基础状态机
- 四级权限控制
- 脏记录自动检测
- Excel 导出
