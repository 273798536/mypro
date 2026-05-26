# 财报勾稽检查CLI工具

一个用于自动验证财务报表勾稽关系的命令行工具，帮助财务负责人在将财报发给投资人前确保数据准确性。

## 功能特性

- **表格解析**: 自动读取并解析资产负债表、利润表、现金流量表
- **科目映射管理**: 支持灵活的科目映射配置，检测缺失映射
- **调整分录处理**: 验证并应用调整分录，检测重复调整
- **勾稽规则检查**:
  - 期初余额借贷平衡检查
  - 资产=负债+权益检查
  - 净利润与未分配利润勾稽检查
  - 现金流量表与货币资金勾稽检查
- **异常定位**: 精确识别和定位财务数据异常
- **报告导出**: 生成JSON格式的详细报告和CSV格式的异常清单
- **历史追踪**: 保留每次运行的历史记录，便于追溯和对比

## 安装

```bash
pip install -r requirements.txt
pip install -e .
```

## 快速开始

### 1. 生成测试数据

```bash
python generate_sample_data.py
```

### 2. 运行检查

```bash
fin-check check --input-dir ./sample_data --output-dir ./output
```

### 3. 查看历史记录

```bash
fin-check history --output-dir ./output
```

## 命令说明

### check 命令

执行财报勾稽检查

```bash
fin-check check [OPTIONS]
```

选项:
- `--input-dir, -i`: 输入目录路径（包含财务报表文件）
- `--output-dir, -o`: 输出目录路径（报告将保存到此处）
- `--config, -c`: 配置文件路径（可选）
- `--apply-adjustments/--no-apply-adjustments`: 是否应用调整分录（默认: True）
- `--verbose, -v`: 显示详细错误信息

### history 命令

查看历史运行记录

```bash
fin-check history [OPTIONS]
```

选项:
- `--output-dir, -o`: 输出目录路径
- `--limit, -n`: 显示最近N条记录（默认: 10）

## 输入文件格式

### 资产负债表 (资产负债表.xlsx / balance_sheet.xlsx)

必需列: 科目代码, 科目名称, 期初余额, 期末余额

### 利润表 (利润表.xlsx / income_statement.xlsx)

必需列: 科目代码, 科目名称, 本期金额, 上期金额

### 现金流量表 (现金流量表.xlsx / cash_flow.xlsx)

必需列: 项目代码, 项目名称, 本期金额, 上期金额

### 科目映射 (科目映射.xlsx / account_mapping.xlsx)

必需列: 源科目, 目标科目, 映射类型

### 调整分录 (调整分录.xlsx / adjustments.xlsx)

必需列: 分录ID, 日期, 摘要, 借方科目, 贷方科目, 金额

## 输出文件

每次运行会在输出目录生成以下文件:

1. `financial_check_report_{run_id}_{timestamp}.json` - 完整的检查报告
2. `anomalies_{run_id}_{timestamp}.csv` - 异常清单（如果有异常）
3. `all_adjustments_{run_id}_{timestamp}.csv` - 所有调整分录
4. `applied_adjustments_{run_id}_{timestamp}.csv` - 已应用的调整分录
5. `run_history.json` - 历史运行记录

## 检测的异常类型

- **科目缺失映射**: 报表中存在未配置映射的科目
- **无效映射目标**: 映射目标科目不存在
- **重复调整分录ID**: 多个调整分录使用相同ID
- **重复调整内容**: 存在内容完全相同的调整分录
- **无效调整科目**: 调整分录中的科目不存在
- **负调整金额**: 调整金额为负数或零
- **缺失期初余额**: 科目缺少期初余额数据
- **期初余额不平**: 期初余额借贷方不平衡
- **资产负债表不平**: 资产 ≠ 负债 + 权益
- **净利润勾稽异常**: 净利润与未分配利润变动不一致
- **现金流量勾稽异常**: 现金流量净额与货币资金变动不一致

## 配置文件

可以使用YAML配置文件自定义检查规则:

```yaml
check_rules:
  check_opening_balance: true
  check_missing_mappings: true
  check_duplicate_adjustments: true
  check_assets_equity: true
  check_net_income_reconciliation: true
  check_cash_flow: true
```

## 使用示例

```bash
# 基本使用
fin-check check -i ./data -o ./reports

# 不应用调整分录
fin-check check -i ./data -o ./reports --no-apply-adjustments

# 使用自定义配置
fin-check check -i ./data -o ./reports -c ./config.yaml

# 查看最近5条历史记录
fin-check history -o ./reports -n 5
```

## 项目结构

```
financial_checker/
├── __init__.py
├── cli.py              # 命令行接口
├── config.py           # 配置管理
├── models.py           # 数据模型
├── parser.py           # 报表解析器
├── mapping_manager.py  # 科目映射管理
├── adjustment_manager.py # 调整分录管理
├── rule_engine.py      # 勾稽规则引擎
└── report_generator.py # 报告生成器
```
