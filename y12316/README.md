# 蒙特卡洛亏损沙盘 (MC Loss Sandbox)

精算团队使用的本地 CLI 工具，用于保险赔付风险的蒙特卡洛随机模拟。

## 功能特性

- ✅ **多源数据整合**: 支持保单样本、赔付分布、费用率、免赔规则等多源输入
- 🔍 **冲突自动检测**: 数据冲突时先留痕再判断，保留完整审计轨迹
- 📊 **风险量化分析**: 计算 VaR、CVaR 等核心风险指标
- 📈 **敏感性分析**: 评估损失规模变化对风险指标的影响
- 📋 **双口径输出**: 终端摘要（日常处理）+ JSON 报告（事后复盘）
- 🎯 **可追溯复核**: 保单样本、赔付分布、导出图表的对应关系完整记录

## 快速开始

### 方式一：使用 Poetry 安装（推荐）

```bash
# 安装依赖
poetry install

# 激活虚拟环境
poetry shell

# 生成示例数据
mc-sandbox init-example -o ./example_data

# 运行模拟
mc-sandbox run -i ./example_data -o ./results
```

### 方式二：使用 pip 安装

```bash
pip install -e .

# 生成示例数据
mc-sandbox init-example -o ./example_data

# 运行模拟
mc-sandbox run -i ./example_data -o ./results
```

### 方式三：直接运行模块

```bash
# 生成示例数据
python3 -m mc_loss_sandbox.cli init-example -o ./example_data

# 运行模拟
python3 -m mc_loss_sandbox.cli run -i ./example_data -o ./results -n 10000
```

## CLI 命令说明

### `init-example` - 生成示例数据

```bash
mc-sandbox init-example -o <输出目录>
```

在指定目录生成 4 类测试文件：
- `policies.csv` - 50 条保单样本
- `loss_distributions.json` - 2 类赔付分布配置
- `expense_rates.json` - 2 类费用率配置
- `deductible_rules.json` - 2 类免赔规则（含晚到场景）

### `run` - 执行蒙特卡洛模拟

```bash
mc-sandbox run [选项]

选项:
  -i, --input-dir      输入数据目录（必需）
  -o, --output-dir     输出结果目录（必需）
  -n, --simulations    蒙特卡洛模拟次数（默认: 10000）
  -s, --seed           随机种子（默认: 42）
```

## 输入数据格式

### 1. 保单样本 (`*polic*.csv` / `*polic*.json`)

| 字段 | 类型 | 说明 |
|------|------|------|
| policy_id | string | 保单号 |
| insured_amount | float | 承保金额 |
| policy_type | string | 险种类型 |
| effective_date | datetime | 生效日期 |
| expiry_date | datetime | 到期日期 |
| deductible | float | 免赔额（可选） |

### 2. 赔付分布 (`*loss*.json` / `*dist*.json`)

```json
[
  {
    "policy_type": "车险",
    "distribution_type": "lognormal",
    "params": {"mean": 8.0, "sigma": 1.5},
    "sample_size": 500
  }
]
```

支持的分布类型: `lognormal`, `gamma`, `exponential`, `normal`

### 3. 费用率 (`*expense*.json`)

```json
[
  {
    "policy_type": "车险",
    "expense_rate": 0.25,
    "acquisition_cost": 0.15,
    "administrative_cost": 0.10
  }
]
```

### 4. 免赔规则 (`*deduct*.json`)

```json
[
  {
    "policy_type": "车险",
    "deductible_amount": 5000,
    "effective_date": "2026-01-01T00:00:00",
    "received_date": "2026-01-01T12:00:00"
  }
]
```

**注意**: `received_date` 晚于 `effective_date` 会被标记为"免赔规则晚到"

## 输出说明

### 终端输出（日常处理用）

```
======================================================================
  蒙特卡洛亏损沙盘 - 模拟摘要
======================================================================

【数据概览】
  保单样本数: 50
  赔付分布数: 2
  ...

【核心风险指标】
  期望损失:     4344.24M
  VaR (95%):    16414.69M
  VaR (99%):    66725.50M
  CVaR (95%):   56527.83M
  ...

【冲突检测】 共发现 X 个问题
  - timing_issue: 1 个 (免赔规则晚到)
  - sample_insufficient: 1 个 (样本不足)
  ...

【执行时间线】
  [ 1] XX:XX:XX - 开始检测: 启动冲突检测流程
  [ 3] XX:XX:XX - 免赔规则晚到: 车险: 延迟 12.0 小时
  ...
```

### JSON 报告（事后复盘用）

输出目录结构:
```
results/
├── simulation_report.json    # 完整报告（可直接转发同事）
└── charts/
    ├── loss_histogram.png     # 损失分布直方图
    ├── loss_cdf.png           # 累积分布函数
    ├── risk_metrics.png       # 风险指标对比
    ├── sensitivity_analysis.png # 敏感性分析
    └── policy_distribution.png # 保单分布
```

### 报告复核关键路径

`simulation_report.json` 中的 `data_relationships` 字段记录了完整的追溯关系：

```json
{
  "data_relationships": [
    {
      "policy_type": "车险",
      "policy_count": 25,
      "policy_sources": ["policies.csv"],
      "loss_distribution": {"source": "loss_distributions.json"},
      "expense_rate": {"source": "expense_rates.json"},
      "deductible_rule": {"source": "deductible_rules.json"},
      "charts": {
        "loss_histogram": "charts/loss_histogram.png",
        "loss_cdf": "charts/loss_cdf.png",
        "risk_metrics": "charts/risk_metrics.png",
        "sensitivity": "charts/sensitivity_analysis.png",
        "policy_distribution": "charts/policy_distribution.png"
      }
    }
  ]
}
```

复核时可以从：
1. 保单样本 → 赔付分布 → 免赔规则 → 费用率
2. 数据来源 → 风险指标 → 对应图表

双向追溯。

## 冲突处理规则

| 冲突类型 | 处理方式 |
|----------|----------|
| 免赔规则晚到 | 使用晚到的规则，记录延迟时间 |
| 样本不足 | 继续模拟，标注结果不确定性 |
| 免赔额冲突 | 采用规则免赔额，记录与保单样本的差异 |
| 极端值风险 | 重点关注 CVaR 指标 |

## 核心检查点

使用时请确认：
1. ✅ 输入目录中数据文件命名符合规则（文件名含 policy/loss/expense/deduct 关键词）
2. ✅ 免赔规则的 effective_date / received_date 时间正确
3. ✅ 赔付分布 sample_size 是否充足（建议 ≥ 100）
4. ✅ 终端输出与 JSON 报告中风险指标口径一致
5. ✅ data_relationships 中引用的图表文件确实存在

## 风险提示

1. **数据质量风险**: 样本量不足时，模拟结果不确定性较高，建议补充历史数据后重新验证
2. **分布假设风险**: 当前假设赔付服从指定分布，实际可能存在模型风险
3. **参数敏感性**: 请结合 sensitivity_analysis 查看损失规模波动对结果的影响
4. **可比性风险**: 免赔规则变更前后的模拟结果需谨慎对比，报告中会标注晚到情况

## 项目结构

```
mc_loss_sandbox/
├── models.py            # 数据模型定义
├── data_loader.py       # 多格式数据加载器
├── conflict_detector.py # 冲突检测与留痕
├── simulator.py         # 蒙特卡洛模拟引擎
├── report_generator.py  # 终端+JSON报告生成
├── charts.py            # 图表导出
└── cli.py               # CLI 入口
```
