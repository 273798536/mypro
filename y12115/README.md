# 多目标减碳配额优化系统 - 使用说明

## 一、系统概述

本系统用于企业ESG专员处理部门排放、预算上限和减碳项目的多目标优化分析。系统自动处理脏数据、检测异常、识别冲突，并给出可操作的修正建议。

**核心特性：**
- ✅ 自动处理不完整数据（备注、缺字段、晚到指标）
- ✅ 预算超限给出明确结论，不模糊
- ✅ 目标冲突和项目互斥提供可操作修正建议
- ✅ 约束条件变化后，方案排序和敏感性分析自动更新
- ✅ 异常说明、图表、导出结果数据完全一致

---

## 二、目录结构

```
.
├── run_analysis.py              # 便捷运行脚本
├── multi_objective_carbon/      # 核心代码包
│   ├── __init__.py
│   ├── models.py               # 数据模型定义
│   ├── data_cleaner.py         # 数据清洗和异常检测
│   ├── optimizer.py            # 多目标优化核心算法
│   ├── conflict_detector.py    # 冲突检测和修正建议
│   ├── report_exporter.py      # 图表生成和结果导出
│   ├── sensitivity_analyzer.py # 敏感性分析
│   └── cli.py                  # CLI入口
├── examples/                    # 样例数据（直接可用）
│   ├── department_emissions.csv
│   ├── budget_limits.csv
│   ├── reduction_projects.csv
│   └── business_indicators.csv
└── output/                      # 结果输出目录（自动创建）
```

---

## 三、快速启动

### 3.1 环境准备

已预装依赖：
- Python 3.9+
- pandas, numpy, scipy, matplotlib, openpyxl, pulp

如需安装pulp：
```bash
pip3 install pulp
```

### 3.2 首次运行（使用样例数据）

```bash
# 方式1：使用便捷脚本
python3 run_analysis.py \
    --emissions examples/department_emissions.csv \
    --budgets examples/budget_limits.csv \
    --projects examples/reduction_projects.csv

# 方式2：使用模块方式
python3 -m multi_objective_carbon.cli \
    --emissions examples/department_emissions.csv \
    --budgets examples/budget_limits.csv \
    --projects examples/reduction_projects.csv
```

### 3.3 运行完整分析（含敏感性分析）

```bash
python3 run_analysis.py \
    --emissions examples/department_emissions.csv \
    --budgets examples/budget_limits.csv \
    --projects examples/reduction_projects.csv \
    --indicators examples/business_indicators.csv \
    --run-sensitivity \
    --objective balance
```

---

## 四、样例数据说明

样例数据已预设各种"脏数据"场景，可直接用于测试：

### 4.1 部门排放数据 (`examples/department_emissions.csv`)
| 部门ID | 数据问题 | 说明 |
|--------|----------|------|
| DEPT001 | 有备注 | "估算值，待最终核算" |
| DEPT005 | 有备注 | "调整: +20.5吨（上月遗漏）" |
| DEPT007 | 有备注 | "暂估" |
| DEPT008 | 缺失排放量 | "数据待提交"（会触发error级异常） |
| DEPT009 | 排放量为0 | "确认无直接排放" |
| DEPT010 | 有备注 | "新生产线投产，部分数据估算" |

### 4.2 预算上限数据 (`examples/budget_limits.csv`)
| 行号 | 数据问题 | 说明 |
|------|----------|------|
| 第2行 | 缺department_id | 公司整体预算（正常） |
| 第4行 | 有备注 | "待审批" |
| 第6行 | 缺department_id | 应急储备（正常） |

### 4.3 减碳项目数据 (`examples/reduction_projects.csv`)
| 项目ID | 数据问题 | 说明 |
|--------|----------|------|
| PROJ002 | 状态 | 进行中（in_progress） |
| PROJ003 | 互斥 | 与PROJ002互斥 |
| PROJ004 | 依赖 | 依赖PROJ001 |
| PROJ005 | 互斥 | 与PROJ006互斥 |
| PROJ009 | 状态 | 已完成（completed，不参与优化） |
| PROJ010 | 有备注 | "风险: 供应商配合度" |

### 4.4 业务指标数据 (`examples/business_indicators.csv`)
- 可选数据，用于关联分析
- 包含expected_arrival字段，用于模拟晚到场景

---

## 五、触发预算超限

### 5.1 什么是预算超限？
当优化方案的总成本超过预算上限时，系统会：
1. ❌ **明确标记**：在报告中用红色高亮显示
2. 📊 **量化说明**：精确显示超限金额和比例
3. 💡 **修正建议**：提供至少3条可操作的调整方案

### 5.2 如何触发预算超限

**方式1：提高减排要求**
```bash
python3 run_analysis.py \
    --emissions examples/department_emissions.csv \
    --budgets examples/budget_limits.csv \
    --projects examples/reduction_projects.csv \
    --min-reduction 0.35      # 要求减排35%，会触发超限
```

**方式2：收紧预算**
```bash
python3 run_analysis.py \
    --emissions examples/department_emissions.csv \
    --budgets examples/budget_limits.csv \
    --projects examples/reduction_projects.csv \
    --max-budget 0.7 \        # 最多用70%预算
    --min-reduction 0.25      # 要求减排25%
```

**方式3：强制高成本项目**
```bash
python3 run_analysis.py \
    --emissions examples/department_emissions.csv \
    --budgets examples/budget_limits.csv \
    --projects examples/reduction_projects.csv \
    --required-depts DEPT010  # 必须包含生产三部的高成本项目
```

### 5.3 预算超限后的输出

超限后，你会在结果中看到：

**Excel报告：**
- "优化摘要"页："是否在预算内"单元格标红，显示"否"
- "预算使用明细"页：超限行整行标红
- "冲突与修正建议"页：列出具体的调整方案

**文本报告：**
```
【重要】预算超限: 285000.00 元
【结论】当前方案超出预算，必须调整或申请追加预算
...
修正建议:
  1. 方案1: 移除性价比最低的项目 '光伏发电项目' ...
  2. 方案2: 延迟低优先级项目 '供应链碳管理' ...
  3. 方案3: 申请追加预算 285000.00 元 ...
```

---

## 六、约束变化后自动更新

### 6.1 交互式调整（使用Python API）

```python
from multi_objective_carbon.sensitivity_analyzer import SensitivityAnalyzer
from multi_objective_carbon.models import OptimizationConstraint

# 初始约束
constraint = OptimizationConstraint(
    max_budget_utilization=1.0,
    min_reduction_ratio=0.1
)

# 首次分析
analyzer = SensitivityAnalyzer(emissions, budgets, projects)
result1 = analyzer.run_full_analysis(constraint)

# 约束变化：提高减排要求
new_constraint = OptimizationConstraint(
    max_budget_utilization=1.0,
    min_reduction_ratio=0.25  # 从10%提高到25%
)

# 自动重新计算，方案排序自动更新
result2 = analyzer.update_constraint(new_constraint)
```

### 6.2 敏感性分析内容

运行 `--run-sensitivity` 后，系统会分析：
1. **预算上限敏感性**：预算±50%变化对结果的影响
2. **减排比例敏感性**：减排要求5%-40%变化的影响
3. **项目成本敏感性**：各项目成本±20%变化时是否还会被选中
4. **目标权重敏感性**：不同权重下的最优方案变化

---

## 七、命令行参数详解

| 参数 | 说明 | 默认值 | 示例 |
|------|------|--------|------|
| `--emissions` | 部门排放CSV路径 | 必填 | `examples/department_emissions.csv` |
| `--budgets` | 预算上限CSV路径 | 必填 | `examples/budget_limits.csv` |
| `--projects` | 减碳项目CSV路径 | 必填 | `examples/reduction_projects.csv` |
| `--indicators` | 业务指标CSV路径 | 可选 | `examples/business_indicators.csv` |
| `--output-dir` | 输出目录 | `output` | `output/2024Q1` |
| `--objective` | 优化目标 | `balance` | `maximize_reduction` |
| `--max-budget` | 最大预算使用率 | `1.0` | `0.8` (80%) |
| `--min-reduction` | 最低减排比例 | `0.1` | `0.25` (25%) |
| `--max-projects` | 最大项目数 | 不限制 | `5` |
| `--allow-over-budget` | 允许超限 | False | 加此参数即可 |
| `--required-depts` | 必选部门 | 无 | `DEPT001,DEPT010` |
| `--excluded-depts` | 排除部门 | 无 | `DEPT006,DEPT007` |
| `--run-sensitivity` | 运行敏感性分析 | False | 加此参数即可 |
| `--ignore-errors` | 忽略数据错误 | False | 加此参数即可 |

**优化目标选项：**
- `minimize_emission`: 最小化净排放
- `minimize_cost`: 最小化成本
- `maximize_reduction`: 最大化减排量
- `balance`: 平衡三个目标（默认）

---

## 八、输出文件说明

运行成功后，`output/` 目录会生成以下文件：

### 8.1 图表文件（PNG）
- `pareto_front_*.png` - 帕累托前沿图
- `budget_usage_*.png` - 预算使用图
- `emission_comparison_*.png` - 排放对比图
- `anomaly_stats_*.png` - 异常统计图

### 8.2 报告文件
- `优化结果_*.xlsx` - Excel报告（8个工作表）
  - 优化摘要、推荐项目详情、目标得分
  - 帕累托前沿、异常数据说明、冲突与修正建议
  - 部门排放数据、预算上限数据、减碳项目数据
  - 业务指标数据（如有）、预算使用明细
- `优化结果_*.json` - 结构化JSON数据
- `优化报告_*.txt` - 易读文本报告

### 8.3 敏感性分析（启用后）
- `budget_sensitivity_*.png` - 预算敏感性图
- `reduction_sensitivity_*.png` - 减排比例敏感性图
- `project_sensitivity_*.png` - 项目敏感性排名
- `weight_sensitivity_*.png` - 目标权重敏感性图
- `敏感性分析_*.xlsx` - 敏感性分析详情

---

## 九、数据格式规范

### 9.1 部门排放数据 (department_emissions.csv)
```csv
department_id,department_name,emission,period,unit,remark,source
DEPT001,生产一部,1250.5,2024-Q1,ton_CO2e,备注内容,数据源
```
**必需列：** department_id, department_name, emission, period

### 9.2 预算上限数据 (budget_limits.csv)
```csv
department_id,budget_amount,period,budget_type,currency,remark
,2000000,2024-Q1,carbon,CNY,公司整体预算
```
**必需列：** budget_amount, period
**注意：** department_id为空表示公司整体预算

### 9.3 减碳项目数据 (reduction_projects.csv)
```csv
project_id,project_name,department_id,cost,reduction_potential,duration_months,status,priority,dependencies,mutually_exclusive,remark
PROJ001,LED改造,DEPT001,150000,120.5,3,planned,3,,,
```
**必需列：** project_id, project_name, department_id, cost, reduction_potential
**互斥/依赖：** 多个ID用逗号分隔

### 9.4 业务指标数据 (business_indicators.csv)
```csv
department_id,indicator_name,indicator_value,period,unit,expected_arrival
DEPT001,产量,15000,2024-Q1,件,2024-04-10
```

---

## 十、常见问题

### Q1: 数据有错误，运行不了怎么办？
A: 使用 `--ignore-errors` 参数跳过错误继续运行，或查看异常说明修复数据。

### Q2: 提示"未能找到可行的优化方案"怎么办？
A: 尝试以下方法：
1. 加 `--allow-over-budget` 看看可行方案
2. 降低 `--min-reduction` 的值
3. 提高 `--max-budget` 的值

### Q3: 如何让结果只选性价比高的项目？
A: 使用 `--objective minimize_cost` 或调高成本权重。

### Q4: 敏感性分析运行很慢？
A: 项目数量较多时敏感性分析会较慢，这是正常的。可以减少项目数量或跳过敏感性分析。

### Q5: 如何添加新的约束条件？
A: 目前支持的约束都有对应的命令行参数。如需更复杂的约束，可以使用Python API直接调用 `OptimizationConstraint`。

---

## 十一、Python API 使用示例

```python
import pandas as pd
from multi_objective_carbon.data_cleaner import DataCleaner
from multi_objective_carbon.optimizer import MultiObjectiveOptimizer
from multi_objective_carbon.models import OptimizationConstraint, ObjectiveType

# 1. 加载和清洗数据
cleaner = DataCleaner()
emissions_df = pd.read_csv("examples/department_emissions.csv")
budgets_df = pd.read_csv("examples/budget_limits.csv")
projects_df = pd.read_csv("examples/reduction_projects.csv")

emissions, _ = cleaner.clean_department_emissions(emissions_df)
budgets, _ = cleaner.clean_budget_limits(budgets_df)
projects, _ = cleaner.clean_reduction_projects(projects_df)

# 2. 定义约束
constraint = OptimizationConstraint(
    max_budget_utilization=1.0,
    min_reduction_ratio=0.15,
    allow_over_budget=False
)

# 3. 运行优化
optimizer = MultiObjectiveOptimizer(emissions, budgets, projects)
result = optimizer.optimize(constraint, ObjectiveType.BALANCE)

# 4. 检查预算
primary = result["primary_result"]
print(f"总成本: {primary['total_cost']:.2f} 元")
print(f"预算使用率: {primary['budget_utilization']*100:.2f}%")
print(f"是否超限: {'是' if primary['over_budget_amount']>0 else '否'}")
```

---

**文档版本：** 1.0.0
**最后更新：** 2026-05-31
