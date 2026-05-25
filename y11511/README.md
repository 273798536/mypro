# 图书馆馆际借阅多源导入巡检 CLI

一个用于图书馆馆际借阅数据多源导入、校验、修正和汇总的命令行工具。

## 功能特点

- **多源数据导入**: 支持借阅申请、快递单、读者赔偿记录、客服备注四种数据源，支持分批次补传
- **多源合并**: 同一借阅事项的多源数据（借阅申请、快递单、客服备注等）可合并为同一事实源
- **数据一致性**: SQLite 数据库确保所有视图（列表、详情、历史、导出）基于同一事实源
- **完整状态追踪**: 每次变更都记录时间、操作人和原因
- **操作日志**: 所有操作自动记录到日志文件，便于审计追溯
- **智能校验**: 自动区分"真正重复"（同一来源的重复）和"多源补传"（不同来源的同一借阅事项）
- **灵活修正**: 支持补传、改判、费用重新汇总
- **智能费用重算**: 处理逾期、污损、续借叠加时的复杂费用计算，不改变无效记录的状态
- **坏数据隔离**: 校验失败的数据不进入汇总，单独在失败清单中展示
- **可追溯报表**: 所有汇总数字可追溯到原始行号，坏数据单独列出不影响汇总

## 安装

### 环境要求
- Python 3.9 或更高版本（推荐 Python 3.9+）

### 安装依赖

```bash
pip install click pandas openpyxl rich
```

或使用 poetry:

```bash
poetry install
```

### 安装 CLI 命令（推荐）

```bash
# 以可编辑模式安装，安装后可直接使用 lib-inspect 命令
python3 -m pip install -e .
```

**注意**：如果安装后提示 `lib-inspect` 不在 PATH 中，请添加以下到 PATH：
```bash
# macOS / Linux
export PATH="$HOME/.local/bin:$PATH"
# 或者如果使用系统 Python
export PATH="$HOME/Library/Python/3.9/bin:$PATH"
```

## 运行方式

```bash
# 方式一：安装后直接使用 lib-inspect 命令（推荐）
lib-inspect <command> [options]

# 方式二：使用模块方式运行（无需安装）
python3 -m lib_inspect.cli <command> [options]
```

## 快速开始

### 1. 初始化

```bash
# 方式一
lib-inspect init

# 方式二
python3 -m lib_inspect.cli init
```

### 2. 导入数据

支持四种数据源，支持分批次补传：

```bash
# 方式一：lib-inspect 命令
lib-inspect import examples/借阅申请.csv --source 借阅申请 --operator 李老师
lib-inspect import examples/快递单.csv --source 快递单 --operator 李老师
lib-inspect import examples/读者赔偿记录.csv --source 读者赔偿记录 --operator 李老师
lib-inspect import examples/客服备注.csv --source 客服备注 --operator 张老师

# 方式二：python3 -m lib_inspect.cli 模块方式
python3 -m lib_inspect.cli import examples/借阅申请.csv --source 借阅申请 --operator 李老师
python3 -m lib_inspect.cli import examples/快递单.csv --source 快递单 --operator 李老师
python3 -m lib_inspect.cli import examples/读者赔偿记录.csv --source 读者赔偿记录 --operator 李老师
python3 -m lib_inspect.cli import examples/客服备注.csv --source 客服备注 --operator 张老师
```

### 3. 查看记录（获取记录ID）

```bash
# 列出所有记录，显示完整ID
lib-inspect list
# 或
python3 -m lib_inspect.cli list
```

**短 ID 使用**：所有需要记录 ID 的命令（`merge`、`fix`、`detail`、`history`、`check --record-id`）都支持使用记录 ID 的前 8 位。例如记录 ID 为 `b43753c9-e3ea-43f4-abad-326f1d7c01e8`，可以使用 `b43753c9` 进行操作。

### 4. 合并多源记录

当同一借阅事项有多个来源的数据（借阅申请、快递单、客服备注）时，需要合并为同一事实源：

```bash
# 自动查找并合并所有相关多源记录
lib-inspect merge <主记录ID> --auto --operator 王老师
# 或
python3 -m lib_inspect.cli merge <主记录ID> --auto --operator 王老师

# 手动指定要合并的记录
lib-inspect merge <主记录ID> --merge-ids <记录ID1> --merge-ids <记录ID2> --operator 王老师
# 或
python3 -m lib_inspect.cli merge <主记录ID> --merge-ids <记录ID1> --merge-ids <记录ID2> --operator 王老师
```

**合并逻辑**：
- 以主记录为基础，合并其他记录的补充信息
- 费用字段取最大值（避免覆盖）
- 客服备注会合并显示来源
- 合并后状态为"已合并"
- 其他记录会被删除

### 5. 数据校验

```bash
# 校验所有记录
lib-inspect check
# 或
python3 -m lib_inspect.cli check

# 自动修复可修复问题（如费用计算错误）
lib-inspect check --fix-auto
# 或
python3 -m lib_inspect.cli check --fix-auto

# 检查指定记录
lib-inspect check --record-id <记录ID>
# 或
python3 -m lib_inspect.cli check --record-id <记录ID>
```

**自动修复**：`--fix-auto` 会自动修正费用计算错误，修复后重新校验，问题已解决的记录不再标记为校验失败。

### 6. 查看记录详情

```bash
lib-inspect detail <记录ID>
# 或
python3 -m lib_inspect.cli detail <记录ID>
```

### 7. 修正记录

```bash
# 修改字段（必须提供操作人和原因）
lib-inspect fix <记录ID> --field overdue_fee --value 15.0 --operator 王老师 --reason "逾期天数重新计算"
# 或
python3 -m lib_inspect.cli fix <记录ID> --field overdue_fee --value 15.0 --operator 王老师 --reason "逾期天数重新计算"

# 修改日期
lib-inspect fix <记录ID> --field due_date --value 2024-03-15 --operator 王老师 --reason "续借一个月"
# 或
python3 -m lib_inspect.cli fix <记录ID> --field due_date --value 2024-03-15 --operator 王老师 --reason "续借一个月"
```

### 8. 重新计算费用

当逾期、污损和续借叠在一起导致费用算不明白时：

```bash
# 基础重算
lib-inspect recalc --operator 王老师 --reason "费用重新汇总"
# 或
python3 -m lib_inspect.cli recalc --operator 王老师 --reason "费用重新汇总"

# 自定义逾期费率（默认 0.5 元/天）
lib-inspect recalc --operator 王老师 --reason "费用重新汇总" --overdue-rate 0.3
# 或
python3 -m lib_inspect.cli recalc --operator 王老师 --reason "费用重新汇总" --overdue-rate 0.3

# 自定义基础借阅周期（默认 30 天）
lib-inspect recalc --operator 王老师 --reason "费用重新汇总" --base-loan-period 60
# 或
python3 -m lib_inspect.cli recalc --operator 王老师 --reason "费用重新汇总" --base-loan-period 60
```

**重算逻辑说明**：
- 自动考虑续借次数延长应还日期
- 根据实际归还日期（或当前日期）计算逾期天数
- 自动识别客服备注中的污损标记
- 重新汇总快递费、赔偿费、逾期费、污损费
- **重要**：只会更新状态为"校验通过"、"已修正"、"已重算"、"已合并"、"已导出"的记录，校验失败或待合并的记录状态保持不变

### 9. 查看报表

```bash
# 汇总报表
lib-inspect report
# 或
python3 -m lib_inspect.cli report

# 显示失败记录
lib-inspect report --show-failed
# 或
python3 -m lib_inspect.cli report --show-failed

# 显示重复记录
lib-inspect report --show-duplicates
# 或
python3 -m lib_inspect.cli report --show-duplicates
```

### 10. 查看变更历史

```bash
# 所有变更历史
lib-inspect history
# 或
python3 -m lib_inspect.cli history

# 指定记录的变更历史
lib-inspect history --record-id <记录ID>
# 或
python3 -m lib_inspect.cli history --record-id <记录ID>
```

### 11. 导出数据

```bash
# 导出为 Excel（默认）
lib-inspect export
# 或
python3 -m lib_inspect.cli export

# 导出为 CSV
lib-inspect export --format csv
# 或
python3 -m lib_inspect.cli export --format csv

# 包含失败记录一起导出
lib-inspect export --include-failed
# 或
python3 -m lib_inspect.cli export --include-failed

# 指定输出文件名
lib-inspect export --output 2024年2月馆际借阅汇总.xlsx
# 或
python3 -m lib_inspect.cli export --output 2024年2月馆际借阅汇总.xlsx
```

### 12. 查看操作日志

```bash
# 查看当前月操作日志
cat .lib-inspect/logs/operation_$(date +%Y%m).log

# 查看所有日志文件
ls -la .lib-inspect/logs/
```

**日志格式**：
```
时间 | 级别 | 操作人 | 操作类型 | 详细信息
```

## 数据字段说明

每条记录包含以下核心信息：

- **来源追踪**: 原始行号、原始文件名、数据来源
- **基本信息**: 书名、借阅人、借阅人ID、借出馆、借入馆
- **日期信息**: 申请日期、收到日期、应还日期、归还日期
- **费用信息**: 快递费、赔偿费、逾期费、污损费、总费用
- **状态信息**: 当前状态、是否逾期、是否污损、续借次数
- **问题记录**: 存在的问题列表、客服备注

## 状态流转

```
待处理 → 已导入 → 校验中 → 校验通过 → 已导出
                    ↓
                 校验失败 → 修正中 → 已修正
                                  ↓
                               重算中 → 已重算
```

## 目录结构

```
.lib-inspect/           # 工作区目录
├── data.db            # SQLite 数据库（所有数据存储）
├── imports/           # 导入文件存档
├── exports/           # 导出文件目录
└── logs/              # 操作日志
```

## 核心设计原则

1. **单一事实源**: 所有数据存储在 SQLite 数据库中，列表、详情、历史、导出都从同一数据源读取，确保数据一致性
2. **完整审计追踪**: 每次数据变更都记录操作人、时间、原因，同时记录操作日志和变更历史
3. **坏数据隔离**: 校验失败的数据不参与费用汇总（包括快递费、赔偿费、逾期费、污损费、总费用），但在失败清单中完整保留
4. **可追溯性**: 每条记录保留原始行号和文件名，报表数字可向下追溯到原始数据
5. **幂等操作**: 支持重复导入、多次修正，系统自动处理并记录历史
6. **日志完整性**: 所有操作自动记录到日志文件，便于审计和问题排查
