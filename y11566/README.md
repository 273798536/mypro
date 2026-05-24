# 城市照明抢修多源导入巡检 CLI

## 概述

这是一个用于城市照明抢修工作的多源数据导入和巡检工具，解决了多系统数据零散、同一事实重复记录、流程无法回看等问题。

## 核心特性

### 数据模型
- **工单表 (WorkOrder)**: 统一存储所有来源的抢修工单，使用 `fact_id` 去重，确保同一事实不重复计算
- **导入记录表 (ImportRecord)**: 追踪每一批次的导入操作
- **审计历史表 (AuditLog)**: 记录所有字段变更，支持"谁在什么时候改过什么"
- **异步任务表 (AsyncTask)**: 管理失败任务的重试机制

### 异步任务失败分类
- **可重试 (retryable)**: 网络超时、外部API错误等，系统自动重试
- **待人工 (manual)**: 数据完整性问题、业务规则错误，需人工干预
- **永久失败 (permanent)**: 无效数据、损坏数据，不再重试

### 导入策略
- **ignore (忽略)**: 重复数据跳过
- **append (追加)**: 合并新字段到现有记录
- **overwrite (覆盖)**: 完全覆盖现有记录

## 安装

```bash
pip install -e .
# 或
pip install -r requirements.txt
```

## 使用命令

### 1. init - 初始化
```bash
lighting init
lighting init --reset  # 重置数据库
```

### 2. import - 导入数据
支持四种数据源：
```bash
lighting import photo <照片目录> --strategy append
lighting import hotline <热线CSV文件> --strategy ignore
lighting import spare_part <备件CSV/Excel文件> --strategy overwrite
lighting import approval_email <审批邮件CSV/Excel>
```

### 3. check - 数据校验
```bash
lighting check
lighting check --batch-id <批次ID>
lighting check --retry  # 重试可自动恢复的失败任务
```

### 4. fix - 人工修正
```bash
lighting fix --id <工单ID> --field <字段名> --value <新值> --reason "修改原因"
lighting fix --id <工单ID> --approve  # 标记为人工审核通过
```

### 5. report - 生成报告
```bash
lighting report
lighting report --batch-id <批次ID>
lighting report --format xlsx  # 支持 txt, csv, xlsx
```

**报告重点内容**（市政负责人关注）：
- 原始行号：便于定位源文件问题
- 失败清单：按错误类型分类
- 修正指引：如何修正后再导入

### 6. history - 审计历史
```bash
lighting history --batches  # 查看所有导入批次
lighting history --work-order-id <工单ID>
lighting history --fact-id <事实ID>
lighting history --batch-id <批次ID>
```

### 7. export - 数据导出
```bash
lighting export --format csv
lighting export --format xlsx
lighting export --format json
lighting export --status failed  # 只导出失败记录
```

## 完整演示

```bash
chmod +x demo.sh
./demo.sh
```

演示步骤：
1. 初始化数据库
2. 导入巡检照片
3. 导入报修热线
4. 导入备件批次
5. 导入审批邮件
6. 导入坏数据（触发校验失败）
7. 校验数据，显示失败分类
8. 人工修正坏数据
9. 重新校验
10. 查看变更历史
11. 生成巡检报告
12. 导出数据

## 项目结构

```
lighting_cli/
├── __init__.py
├── main.py           # CLI 入口
├── database.py       # 数据模型
├── config.py         # 配置管理
├── importer.py       # 数据导入
├── checker.py        # 数据校验
├── fixer.py          # 数据修正
├── reporter.py       # 报告生成
├── history.py        # 历史查询
├── exporter.py       # 数据导出
└── utils.py          # 工具函数
```

## 设计亮点

1. **事实去重**: 使用 `location + road_section + pole_number + issue_type` 生成 `fact_id`，确保同一路段同一故障不拆分成多个零散工单
2. **多源融合**: 照片、热线、备件、审批邮件都能关联到同一事实记录
3. **完整追溯**: 每条记录的每次变更都有审计日志，支持完整流程回看
4. **失败分级**: 明确区分可自动恢复和需人工处理的错误
5. **市政友好**: 报告保留原始行号，让负责人能看到数据来源，而不是抽象的汇总数
