# 口腔门诊材料验收回放链路服务

## 概述

将种植体批号、预约记录、供应商发票和门店交接纸整合为可复核批次，解决临时换型号后病历与库存扣减脱节问题。支持完整的状态流转、幂等处理、异常对账和操作审计。

## 快速开始

### 1. 从空库启动

```bash
./start.sh
```

自动创建虚拟环境、安装依赖并启动服务。首次运行会自动创建数据库文件 `dental_material.db`。

服务启动后：
- API 地址: http://localhost:8000
- Swagger 文档: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### 2. 准备样例数据

生成正常批次数据：
```bash
python3 scripts/generate_data.py normal > sample_batch.json
```

查看生成的数据结构：
```json
{
  "batch_no": "BATCH-001",
  "clinic_code": "CLINIC-A",
  "implants": [...],
  "appointments": [...],
  "invoices": [...],
  "handover_papers": [...]
}
```

### 3. 走主流程（命令行）

使用 CLI 工具完成完整流程：

```bash
# 创建批次
./cli.sh create BATCH-001

# 查看批次列表，获取 batch_id
./cli.sh list

# 提交审核
./cli.sh submit <batch_id>

# 审核通过
./cli.sh verify <batch_id> pass

# 对账
./cli.sh reconcile <batch_id>

# 冻结（导出前必须冻结）
./cli.sh freeze <batch_id> 导出前锁定数据

# 导出 Excel
./cli.sh export <batch_id>

# 查看操作历史
./cli.sh history <batch_id>
```

### 4. 制造异常场景

#### 场景1：重复提交（幂等性测试）
```bash
./cli.sh test-idempotent
```
- 第1次：创建新批次
- 第2次：`replay_strategy=ignore` → 忽略，返回原有数据
- 第3次：`replay_strategy=overwrite` → 覆写原有数据

#### 场景2：撤回后再提交
```bash
# 创建 → 提交 → 撤回 → 修改 → 再提交
./cli.sh create BATCH-TEST
./cli.sh submit <batch_id>
./cli.sh withdraw <batch_id> 资料不全需补充
./cli.sh submit <batch_id>
```

#### 场景3：型号变更导致病历/库存脱节
```bash
./cli.sh test-abnormal
```
对账后会显示 `partial_failed` 状态，列出：
- 型号变更后病历未更新
- 型号变更后库存未扣减

修复异常后重新对账：
```bash
# 对账结果会给出修复用的API端点，直接调用即可
# 标记库存已扣减（用对账返回的 implant_id 和 batch_id）
curl -X POST "http://localhost:8000/batches/<batch_id>/implants/<implant_id>/deduct" -H "X-Operator: admin"

# 标记病历已更新（用对账返回的 appointment_no 和 batch_id）
curl -X POST "http://localhost:8000/batches/<batch_id>/appointments/<appointment_no>/update-record" -H "X-Operator: admin"

# 重新对账
./cli.sh reconcile <batch_id>
```

#### 场景4：人工改判
```bash
# 从 rejected 人工改判为 verified
./cli.sh judge <batch_id> verified 主任特批
```

### 5. 查看导出

导出的 Excel 文件包含以下 Sheet：
- **批次概览**: 基本信息、状态流转
- **种植体**: 批号、型号、换型记录、库存状态
- **预约记录**: 患者、医生、使用种植体、病历状态
- **供应商发票**: 发票号、金额、验真状态
- **操作历史**: 完整审计轨迹

## API 端点一览

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/batches` | 创建批次（支持幂等策略） |
| GET | `/batches` | 批次列表 |
| GET | `/batches/{id}` | 批次详情 |
| POST | `/batches/{id}/submit` | 提交审核 |
| POST | `/batches/{id}/withdraw` | 撤回 |
| POST | `/batches/{id}/verify` | 审核 |
| POST | `/batches/{id}/judge` | 人工改判 |
| POST | `/batches/{id}/freeze` | 冻结 |
| POST | `/batches/{id}/unfreeze` | 解冻 |
| POST | `/batches/{id}/reconcile` | 对账 |
| GET | `/batches/{id}/history` | 操作历史 |
| GET | `/batches/{id}/export` | 导出 Excel |
| POST | `/batches/{id}/implants/{implant_id}/deduct` | 按业务ID扣减库存 |
| POST | `/batches/{id}/appointments/{apt_no}/update-record` | 按预约号更新病历 |

## 状态机

```
draft (草稿)
  ↓ submit
submitted (已提交)
  ↓ verify → pass → verified (已审核)
  ↓ verify → reject → rejected (已驳回)
  ↓ withdraw
withdrawn (已撤回)
  ↓ submit
submitted

verified
  ↓ reconcile
  ├─ 全部匹配 → reconciled (已对账)
  └─ 发现异常 → partial_failed (部分失败)
  ↓ freeze → export → exported (已导出)

任何状态 ← judge → 人工改判
```

## 幂等策略

通过 `replay_strategy` 控制重复提交行为：

| 策略 | 说明 |
|------|------|
| `ignore` | 批次已存在时，忽略新数据，返回原有记录 |
| `overwrite` | 清空原有子项，用新数据覆写 |
| `append` | 追加不存在的子项（按 implant_id/appointment_no 去重） |

## 测试重点

### 状态变化测试
```bash
# 运行完整工作流测试
./cli.sh test-workflow
```

检查点：
- 每次状态变更都生成操作历史
- 状态流转符合状态机规则
- 冻结后无法修改

### 幂等性测试
```bash
./cli.sh test-idempotent
```

检查点：
- 同一 batch_no 重复提交不会创建多条记录
- 操作历史记录 replay 行为
- 返回结果明确说明是 ignore/overwrite/append

## 项目结构

```
.
├── app/
│   ├── __init__.py
│   ├── database.py      # 数据库连接
│   ├── models.py        # SQLAlchemy 模型
│   ├── schemas.py       # Pydantic 模式
│   ├── crud.py          # 业务逻辑
│   └── main.py          # FastAPI 入口
├── scripts/
│   └── generate_data.py # 造数脚本
├── exports/             # 导出文件目录
├── start.sh             # 启动脚本
├── cli.sh               # 命令行工具
├── requirements.txt
├── .env
└── README.md
```

## 数据库表

- `batches`: 批次主表
- `implants`: 种植体（含换型记录）
- `appointments`: 预约记录
- `invoices`: 供应商发票
- `handover_papers`: 门店交接纸
- `operation_histories`: 操作审计日志
- `audit_logs`: 字段级变更日志

## 注意事项

1. **导出前必须冻结**：防止导出后数据被修改
2. **异常不吞掉**：对账发现的异常明确列在 `unmatched_items` 中
3. **操作留痕**：所有状态变更都记录操作人、时间、原因
4. **换型追踪**：`original_model` 记录原始型号，`model_change_reason` 说明原因
