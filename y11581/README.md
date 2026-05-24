# 门店会员储值多源导入巡检 CLI

门店会员储值多源导入巡检工具，用于处理充值流水、退款申请、门店交接表和班次记录中的脏记录，检测跨店消费和撤销交易导致的余额历史断点。

## 功能特性

- **多源数据导入**: 支持充值流水、退款申请、门店交接表、班次记录
- **脏记录检测**: 自动识别缺字段、跨日、改名、金额/数量冲突等问题
- **权限控制**: 录入员、复核员、财务主管、只读用户四种角色
- **数据持久化**: 所有操作记录到SQLite数据库，重启不丢失
- **余额追踪**: 自动构建会员余额历史，检测断点
- **报表导出**: 支持失败清单、修正记录、余额历史导出

## 快速开始

### 1. 环境准备

```bash
# 安装依赖
pip install -r requirements.txt

# 或使用 poetry
poetry install
```

### 2. 初始化数据库

```bash
# 初始化数据库并创建默认用户
python -m inspector.cli init
```

默认用户:
- `-u entry_clerk` 录入员张三
- `-u reviewer` 复核员李四
- `-u supervisor` 财务主管王五
- `-u viewer` 只读用户赵六

### 3. 准备样例数据

```bash
python generate_samples.py
```

生成的样例数据在 `samples/` 目录下，包含:
- `recharge_records.xlsx` - 充值流水 (含脏记录)
- `refund_records.xlsx` - 退款申请 (含脏记录)
- `shift_records.xlsx` - 班次记录 (含脏记录)
- `handover_records.xlsx` - 门店交接表 (含脏记录)

## 主流程操作

### 1. 导入数据

```bash
# 录入员导入充值流水
python -m inspector.cli -u entry_clerk import recharge samples/recharge_records.xlsx

# 导入退款申请
python -m inspector.cli -u entry_clerk import refund samples/refund_records.xlsx

# 导入班次记录
python -m inspector.cli -u entry_clerk import shift samples/shift_records.xlsx

# 导入门店交接表
python -m inspector.cli -u entry_clerk import handover samples/handover_records.xlsx
```

### 2. 检查脏记录

```bash
# 查看所有导入批次
python -m inspector.cli -u reviewer list

# 查看所有脏记录
python -m inspector.cli -u reviewer check --dirty-only

# 查看指定批次的脏记录
python -m inspector.cli -u reviewer check --batch-id 1 --dirty-only

# 查看单条记录详情
python -m inspector.cli -u reviewer check 1
```

### 3. 修正脏记录

```bash
# 按字段修正
python -m inspector.cli -u reviewer fix 11 -f member_id=M011 -f recharge_amount=100

# 使用JSON修正
python -m inspector.cli -u reviewer fix 12 -d '{"transaction_time": "2024-01-17 14:00:00"}'
```

### 4. 构建余额历史

```bash
# 从有效记录重建余额历史
python -m inspector.cli -u reviewer history --build

# 查看指定会员余额历史
python -m inspector.cli -u reviewer history --member-id M001
```

### 5. 检查余额断点

```bash
# 检查所有余额断点
python -m inspector.cli -u supervisor check-gaps --gaps

# 检查跨店消费问题
python -m inspector.cli -u supervisor check-gaps --cross-store

# 检查撤销交易问题
python -m inspector.cli -u supervisor check-gaps --revoke
```

### 6. 生成报告

```bash
# 汇总报告
python -m inspector.cli -u supervisor report summary

# 失败清单 (财务主管重点关注)
python -m inspector.cli -u supervisor report failures

# 批次详情报告
python -m inspector.cli -u supervisor report batch --batch-id 1

# 按脏类型统计
python -m inspector.cli -u supervisor report dirty
```

### 7. 导出数据

```bash
# 导出失败清单
python -m inspector.cli -u supervisor export failures -o export -f csv

# 导出修正记录
python -m inspector.cli -u supervisor export fixed -o export -f xlsx

# 导出余额历史
python -m inspector.cli -u supervisor export balance -o export -f csv

# 导出全部
python -m inspector.cli -u supervisor export all -o export -f csv
```

## 制造异常场景测试

### 1. 制造余额断点

```sql
-- 直接修改数据库制造断点
sqlite3 inspector.db
UPDATE member_balance_history SET balance_after = balance_after + 100 WHERE id = 1;
```

然后重新检测:
```bash
python -m inspector.cli -u supervisor check-gaps --gaps
```

### 2. 测试幂等性

重复导入同一文件:
```bash
# 第一次导入
python -m inspector.cli -u entry_clerk import recharge samples/recharge_records.xlsx

# 第二次导入相同文件 (应该幂等)
python -m inspector.cli -u entry_clerk import recharge samples/recharge_records.xlsx
```

观察: 第二次导入不会重复创建记录，直接返回已存在的批次。

### 3. 测试权限控制

```bash
# 只读用户尝试导入 (应失败)
python -m inspector.cli -u viewer import recharge samples/recharge_records.xlsx

# 录入员尝试导出 (应失败)
python -m inspector.cli -u entry_clerk export failures

# 财务主管可以执行所有操作
python -m inspector.cli -u supervisor export all
```

## 权限矩阵

| 功能 | 录入员 | 复核员 | 财务主管 | 只读用户 |
|------|--------|--------|----------|----------|
| 导入数据 | ✅ | ✅ | ✅ | ❌ |
| 查看原始数据 | ✅ | ✅ | ✅ | 部分 |
| 修正脏记录 | ❌ | ✅ | ✅ | ❌ |
| 检查余额断点 | ❌ | ✅ | ✅ | ❌ |
| 生成报告 | ❌ | ✅ | ✅ | ❌ |
| 导出数据 | ❌ | ❌ | ✅ | ❌ |
| 查看失败清单 | ❌ | ✅ | ✅ | ❌ |
| 重建余额历史 | ❌ | ✅ | ✅ | ❌ |

## 脏记录类型

| 类型 | 说明 |
|------|------|
| missing_field | 缺少必填字段 |
| cross_date | 交易日期与业务日期不一致 |
| name_change | 会员名称变更 |
| amount_conflict | 金额冲突/不匹配 |
| quantity_conflict | 数量冲突 |
| invalid_format | 格式无效 |

## 数据库结构

- `users` - 用户表
- `import_batches` - 导入批次表
- `raw_records` - 原始记录表 (保留完整原始内容)
- `recharge_records` - 充值流水表
- `refund_records` - 退款申请表
- `shift_records` - 班次记录表
- `store_handovers` - 门店交接表
- `member_balance_history` - 会员余额历史表
- `balance_gaps` - 余额断点表

## 测试重点

### 1. 状态变化测试

```bash
# 导入前状态: 无批次
python -m inspector.cli -u reviewer list

# 导入后状态: 批次增加
python -m inspector.cli -u entry_clerk import recharge samples/recharge_records.xlsx
python -m inspector.cli -u reviewer list

# 修正前状态: 记录标记为脏记录
python -m inspector.cli -u reviewer check 11

# 修正后状态: 记录标记为已修正
python -m inspector.cli -u reviewer fix 11 -f recharge_amount=100
python -m inspector.cli -u reviewer check 11
```

### 2. 幂等性测试

```bash
# 连续导入相同文件3次
for i in 1 2 3; do
    python -m inspector.cli -u entry_clerk import recharge samples/recharge_records.xlsx
done

# 验证: 只有1个批次
python -m inspector.cli -u reviewer list
```

### 3. 重启验证

```bash
# 导入数据后删除进程，重新查看
# 所有数据仍然存在
python -m inspector.cli -u supervisor report summary
```

## 项目结构

```
inspector/
├── __init__.py
├── cli.py              # CLI入口
├── database.py         # 数据库模型
├── permissions.py      # 权限系统
├── dirty_checker.py    # 脏记录检测
├── importer.py         # 数据导入
└── balance_tracker.py  # 余额追踪
```

## 后续扩展

- 支持手工改价表导入
- 支持批量修正
- 增加Web界面
- 支持更多数据源格式
- 自动修正建议优化
