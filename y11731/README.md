# 银行理财赎回排队服务

## 解决什么问题

理财客服每天解释赎回为什么没到账——开放日、巨额赎回、撤单混在一起。本服务把这三类场景从"正常结果"里拎出来，**绝不悄悄算进去**。

## 三类高危场景（都会产生显式告警）

| 场景 | 处理 | 告警级别 |
|------|------|----------|
| 非开放日申请 | 拒绝，提示下个开放日 | ERROR |
| 巨额赎回（≥余额10%） | 顺延至下个开放日 | WARNING |
| 撤单后已扣/锁份额 | 回滚份额，记录撤单原因 | INFO |

## 快速上手

```bash
# 安装
pip install -e .

# 初始化数据库
rq init

# 导入基础数据
rq import-product P001 "稳健理财1号"
rq import-open-day P001 2026-05-29 --source "产品日历"
rq import-balance P001 C001 50000.0 2026-05-27 --source "份额系统"

# 导入赎回单
rq import-order ORD-001 P001 C001 10000.0 2026-05-28 --source "客户赎回单"

# 处理排队（自动校验+锁定+顺延判定）
rq process

# 查看告警
rq check-alerts

# 导出报告
rq export --dir exports
```

## 命令一览

| 命令 | 说明 |
|------|------|
| `rq init` | 初始化数据库 |
| `rq import-product CODE NAME` | 导入产品 |
| `rq import-open-day PRODUCT DATE [--source] [--note]` | 导入开放日 |
| `rq import-balance PRODUCT CUST AMOUNT DATE [--source]` | 导入份额余额 |
| `rq import-order ORDER PRODUCT CUST AMOUNT DATE [--source]` | 导入赎回单 |
| `rq process [--order ORDER] [--current-date DATE]` | 处理排队 |
| `rq cancel ORDER --cancel-date DATE [--reason] [--source]` | 撤单回滚 |
| `rq arrive ORDER --arrive-date DATE --amount AMT [--source]` | 到账确认 |
| `rq query [ORDER] [--status STATUS]` | 查询赎回单（含审计痕迹） |
| `rq check-alerts` | 查看所有告警 |
| `rq export [--type TYPE] [--dir DIR]` | 导出报告 |
| `rq status` | 状态概览 |

## 状态流转

```
PENDING ──非开放日──→ REJECTED
   │
   ├──巨额赎回──→ DEFERRED ──到期重处理──→ PENDING → 正常流程
   │
   └──正常──→ LOCKED ──到账确认──→ COMPLETED
                       │
                       └──撤单──→ CANCELLED（份额回滚）
```

## 数据一致性保障

- **来源追溯**：每条记录都有 `source` 字段，标记数据来自哪个系统（产品日历/客户赎回单/份额系统/到账报告等）
- **审计痕迹**：每次状态变更都写入 `audit_log` 表，包含旧值→新值
- **导出对齐**：导出的 CSV 包含原始状态、告警标记、撤单/到账关联，与数据库状态一致
- **重启不乱**：SQLite 持久化，重启后历史数据完整不变

## 运行测试

```bash
python tests/test_e2e.py
```

覆盖7个场景：
1. 非开放日申请 → 拒绝 + ERROR告警
2. 巨额赎回 → 顺延 + WARNING告警
3. 撤单回滚已锁定份额
4. 顺延到期后正常处理
5. 到账确认 + 导出数据一致性
6. 重启后历史不乱
7. 到账金额与申请金额不一致告警

## 项目结构

```
src/redemption_queue/
├── __init__.py       # 包入口
├── __main__.py       # python -m 入口
├── cli.py            # CLI 命令
├── db.py             # SQLite 连接与表结构
├── models.py         # 数据模型与 CRUD
├── engine.py         # 核心引擎（校验/锁定/顺延/回滚）
└── exporter.py       # CSV 导出
tests/
└── test_e2e.py       # 端到端测试
sample_data/          # 示例数据
```