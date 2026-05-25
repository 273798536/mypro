# 财务报销稽核多源导入巡检 CLI - 快速开始指南

## 安装

```bash
pip install -e .
```

## 一键完整演示

```bash
./run_demo.sh
```

## 核心命令说明

| 命令 | 功能 | 说明 |
|------|------|------|
| `init` | 初始化系统 | 创建数据目录和配置 |
| `import` | 导入数据 | 支持发票、差旅申请、付款流水、主管批注 |
| `check` | 稽核检查 | 检测重复报销、金额/日期不一致等 |
| `fix` | 标记修复 | 标记问题为已解决 |
| `override` | 人工改判 | 财务经理人工改判状态 |
| `withdraw` | 撤回记录 | 员工撤回报销申请 |
| `resubmit` | 重新提交 | 撤回后重新提交修正后的发票 |
| `freeze` | 冻结记录 | 导出前冻结防止修改 |
| `unfreeze` | 解冻记录 | 解除冻结 |
| `report` | 生成报告 | 查看稽核报告和失败清单 |
| `history` | 历史追溯 | 查看记录变更和快照对比 |
| `export` | 导出数据 | 导出最终结果 |

## 端到端测试流程

### 1. 初始化系统
```bash
finance-audit init
```

### 2. 导入差旅申请（关联共享行程）
```bash
finance-audit import sample_data/travel_requests.csv --trip-id TRIP-BJ-202403
```

### 3. 导入发票PDF数据（会自动关联到对应trip_id）
```bash
finance-audit import sample_data/invoices.csv
```

### 4. 导入付款流水数据（会自动关联到对应trip_id）
```bash
finance-audit import sample_data/payment_flows.csv
```

### 5. 执行稽核检查（检测重复提交、共享行程重复等）
```bash
finance-audit check
```

### 6. 查看稽核报告和失败清单（含原始行号）
```bash
finance-audit report
finance-audit report --show-evidence
```

### 7. 导入主管批注（按员工+费用类型自动匹配）
```bash
finance-audit import sample_data/supervisor_notes.csv
```
**说明**：主管批注文件支持两种匹配方式：
- `record_id`：直接指定记录ID
- `employee_name` + `expense_type`：按员工和费用类型自动匹配

### 8. 撤回记录
```bash
finance-audit withdraw REC-XXXX-XXXX --reason "发票有误，需重新开具" --operator "员工姓名"
```

### 9. 重新提交修正后的发票
```bash
finance-audit resubmit sample_data/resubmit_invoice.csv --parent-record-id REC-XXXX-XXXX --operator "员工姓名"
```

### 10. 再次执行稽核检查（检测撤回重提关联）
```bash
finance-audit check
```

### 11. 人工改判
```bash
finance-audit override REC-XXXX-XXXX --reason "财务经理特批，情况特殊" --status approved
```

### 12. 冻结待导出记录
```bash
finance-audit freeze REC-XXXX-XXXX --reason "导出前冻结"
```

### 13. 查看快照对比
```bash
finance-audit history --list-snapshots
finance-audit history --snap1 SNAP-XXXX-XXXX --snap2 SNAP-XXXX-XXXX
```

### 14. 导出最终结果
```bash
finance-audit export --status approved --format json
finance-audit export --status checked --format csv
```

## 边界情况测试场景

### 场景1：重复提交检测
- 预期：同一员工、相同费用类型、金额和日期的重复记录会被标记

### 场景2：共享行程重复住宿/交通
- 预期：同一行程ID下，多人在相同日期报销住宿/交通会被标记

### 场景3：撤回后再提交
- 使用 `withdraw` 命令撤回记录
- 使用 `resubmit` 命令重新提交
- 通过 `parent_record_id` 关联，标记为撤回重提交

### 场景4：部分失败
- 部分问题解决后状态变为 `partial_failure`

### 场景5：导出前冻结
- 冻结后记录无法修改，确保导出数据一致性

## 财务经理重点关注

使用 `--show-evidence` 查看原始证据行号：
```bash
finance-audit report --show-evidence
```

查看单条记录完整历史：
```bash
finance-audit history REC-XXXX-XXXX
```

## 数据目录结构

```
.audit-data/
├── records/          # 所有报销记录JSON
├── snapshots/        # 各阶段快照
├── exports/          # 导出文件
└── config.json       # 系统配置
```
