# 售后备件领用验收回放链路服务

解决现场借用没登记问题，将维修单、备件扫码、客户签收照和异常照片变成可复核的批次，处理工程师先领后补单、退回件和报废件混淆等反复问题。

## 项目结构

```
.
├── main.py                 # FastAPI 主入口
├── config.py               # 配置和常量定义
├── database.py             # 数据库连接
├── models.py               # SQLAlchemy 数据模型
├── schemas.py              # Pydantic 请求/响应模型
├── services/
│   ├── __init__.py
│   ├── batch_service.py    # 批次核心业务逻辑
│   └── export_service.py   # 导出和对账服务
├── api/
│   ├── __init__.py
│   └── routes.py           # API 路由定义
├── scripts/
│   ├── __init__.py
│   ├── generate_data.py    # 造数脚本
│   └── cli.py              # 命令行工具
├── uploads/                # 照片上传目录（自动创建）
├── exports/                # 导出文件目录（自动创建）
├── requirements.txt
├── .env.example
└── README.md
```

## 快速开始

### 1. 从空库启动

```bash
# 安装依赖
pip install -r requirements.txt

# 复制环境配置
cp .env.example .env

# 启动服务
python main.py
```

服务启动后访问：
- API 文档: http://localhost:8000/docs
- 健康检查: http://localhost:8000/health

### 2. 准备样例数据

```bash
# 生成正常批次数据
python scripts/generate_data.py --output sample_batch.json

# 生成包含异常数据的批次（用于测试部分失败）
python scripts/generate_data.py --invalid --output invalid_batch.json
```

### 3. 走主流程

使用命令行工具操作：

```bash
# 1. 创建批次
python scripts/cli.py create sample_batch.json

# 2. 提交批次
python scripts/cli.py submit BATCH20240101001 --operator "服务经理" --remark "正常提交"

# 3. 查看批次详情
python scripts/cli.py get BATCH20240101001

# 4. 冻结批次（导出前必须冻结）
python scripts/cli.py freeze BATCH20240101001 --operator "服务经理" --reason "对账完成"

# 5. 导出Excel
python scripts/cli.py export BATCH20240101001 --output exports/

# 6. 查看操作日志
python scripts/cli.py logs BATCH20240101001
```

### 4. 制造异常场景

#### 场景1: 重复提交（幂等性测试）

```bash
# 测试ignore策略 - 重复提交忽略
python scripts/cli.py test_idempotency --times 3 --strategy ignore

# 测试overwrite策略 - 重复提交覆盖
python scripts/cli.py test_idempotency --times 3 --strategy overwrite

# 测试append策略 - 重复提交追加
python scripts/cli.py test_idempotency --times 3 --strategy append
```

#### 场景2: 撤回后再提交

```bash
# 用异常数据创建批次
python scripts/generate_data.py --invalid --output test_withdraw.json
python scripts/cli.py create test_withdraw.json

# 提交（会部分失败）
python scripts/cli.py submit BATCHXXXX --operator "测试员"

# 撤回修改
python scripts/cli.py withdraw BATCHXXXX --operator "审核员" --reason "数据需要修正"

# 修正后重新提交
python scripts/cli.py submit BATCHXXXX --operator "测试员" --remark "已修正"
```

#### 场景3: 人工改判

```bash
# 人工改判通过
python scripts/cli.py judge BATCHXXXX --operator "服务经理" --approved --reason "情况属实"

# 人工改判驳回
python scripts/cli.py judge BATCHXXXX --operator "服务经理" --rejected --reason "证据不足"
```

### 5. 查看导出和对账

```bash
# 对账统计
python scripts/cli.py reconcile

# 列出所有批次
python scripts/cli.py list

# 按状态筛选
python scripts/cli.py list --status frozen
```

## 核心概念

### 批次状态机

```
draft (草稿)
    ↓ submit
submitted (已提交) / partial_failed (部分失败)
    ↓ withdraw              ↓ freeze
withdrawn (已撤回)         frozen (已冻结) → 可导出
    ↓ revise               ↓ judge
revised (已修改)           approved / rejected
    ↓ submit
submitted / partial_failed
```

### 幂等策略

- **ignore** (默认): 重复请求直接返回已有数据，不做任何修改
- **overwrite**: 删除已有批次，重新创建
- **append**: 在已有批次基础上追加新的备件（按条码去重）

### 备件状态

- `pending`: 待校验
- `normal`: 正常领用
- `returned`: 已退回
- `scrapped`: 已报废

### 照片类型

- `receipt`: 客户签收照
- `abnormal`: 异常照片
- `sms`: 短信截图（后续补充）

## API 接口

### 批次管理

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/v1/batches | 创建批次 |
| GET | /api/v1/batches/{batch_no} | 获取批次详情 |
| GET | /api/v1/batches | 列出批次 |
| POST | /api/v1/batches/{batch_no}/submit | 提交批次 |
| POST | /api/v1/batches/{batch_no}/withdraw | 撤回批次 |
| POST | /api/v1/batches/{batch_no}/freeze | 冻结批次 |
| POST | /api/v1/batches/{batch_no}/revise | 修改批次 |
| POST | /api/v1/batches/{batch_no}/judge | 人工改判 |
| GET | /api/v1/batches/{batch_no}/logs | 操作日志 |

### 其他接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/v1/batches/{batch_no}/photos | 上传照片 |
| POST | /api/v1/batches/{batch_no}/export | 导出Excel |
| GET | /api/v1/reconcile | 对账统计 |
| GET | /api/v1/idempotency/{key} | 检查幂等键 |

## 边界情况覆盖

### 已实现的边界场景

1. **重复提交**: 通过 idempotency_key 保证幂等，支持 ignore/overwrite/append 三种策略

2. **撤回后再提交**: 状态从 submitted/partial_failed → withdrawn → revised → resubmitted

3. **部分失败**: 批次内部分备件校验失败时，批次状态为 partial_failed，不阻塞整体流程

4. **人工改判**: 支持对部分失败或已提交的批次进行人工通过/驳回，记录改判人、时间、原因

5. **导出前冻结**: 只有 frozen 或 approved 状态才能导出，防止导出后数据被修改

6. **退回件和报废件混淆**: 同时标记 is_returned 和 is_scrapped 的备件会被标记为 is_mixed，校验失败

7. **先领后补单**: repair_order.is_late_submit 字段标识，导出和对账时单独统计

8. **校验口径**: 
   - `normal` (正常领用) → validation_result = pass
   - `returned` (已退回) → validation_result = pass
   - `scrapped` (已报废) → validation_result = pass
   - `pending` (待校验) → validation_result = fail

### 异常不吞掉

- 所有校验错误会记录在 batch.error_message 和 part.validation_message
- 所有状态变更都会记录 operation_logs
- API 错误返回 4xx 状态码和详细错误信息

## 测试重点

### 状态变化测试

```bash
# 一键回放完整流程（包含所有状态转换）
python scripts/cli.py replay --wait 2
```

验证的状态流转：
1. 创建: None → draft
2. 提交: draft → partial_failed
3. 撤回: partial_failed → withdrawn
4. 修正: withdrawn → revised (支持更新旧脏件 + 追加新件)
5. 再提交: revised → partial_failed
6. 改判: partial_failed → approved
7. 冻结: approved → frozen

### 幂等性测试

验证三种策略的行为：
- ignore: 重复提交后备件数不变
- overwrite: 重复提交后批次被重新创建
- append: 重复提交后备件数增加（去重后）

## 数据持久化

- 数据库: SQLite (spare_part_replay.db)
- 照片: uploads/ 目录
- 导出: exports/ 目录
- 重启服务后所有数据可查

## 服务经理关注点

1. **命令脚本**: 所有操作都有对应的 CLI 命令，见 `scripts/cli.py`
2. **HTTP 读写**: API 完整可追溯，见 `api/routes.py`
3. **本地持久化**: 数据库表结构清晰，操作日志完整，见 `models.py`

导出的 Excel 包含 5 个 Sheet：
1. 批次汇总 - 批次基本信息和统计
2. 维修单 - 关联的维修单明细
3. 备件明细 - 所有备件的状态、标记、校验结果
4. 照片记录 - 上传的照片清单
5. 操作日志 - 完整的状态变更历史
