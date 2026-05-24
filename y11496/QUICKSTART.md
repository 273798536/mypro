# 财务报销稽核多源导入巡检 CLI - 快速开始指南

## 安装

```bash
pip install -e .
```

## 核心命令说明

| 命令 | 功能 | 说明 |
|------|------|------|
| `init` | 初始化系统 | 创建数据目录和配置 |
| `import` | 导入数据 | 支持发票、差旅申请、付款流水、主管批注 |
| `check` | 稽核检查 | 检测重复报销、金额/日期不一致等 |
| `fix` | 标记修复 | 标记问题为已解决 |
| `override` | 人工改判 | 财务经理人工改判状态 |
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

### 3. 导入发票PDF数据
```bash
finance-audit import sample_data/invoices.csv
```

### 4. 查看当前记录
```bash
finance-audit history
```

### 5. 执行稽核检查
```bash
finance-audit check
```

### 6. 查看稽核报告和失败清单
```bash
finance-audit report
finance-audit report --show-evidence
```

### 7. 修复问题
```bash
# 标记特定问题为已解决
finance-audit fix REC-XXXX-XXXX --issue-index 0 --resolution "已核实为两人合住，分摊合理"

# 或人工改判
finance-audit override REC-XXXX-XXXX --reason "财务经理特批，情况特殊" --status approved
```

### 8. 导入主管批注（先修改notes中的record_id为实际ID）
```bash
finance-audit import sample_data/supervisor_notes.csv
```

### 9. 冻结待导出记录
```bash
finance-audit freeze REC-XXXX-XXXX --reason "导出前冻结"
```

### 10. 查看快照对比
```bash
finance-audit history --list-snapshots
finance-audit history --snap1 SNAP-XXXX-XXXX --snap2 SNAP-XXXX-XXXX
```

### 11. 导出最终结果
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
