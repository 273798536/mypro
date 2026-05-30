# 组合投注风险分析工具 (Parlay Risk Analyzer)

专为体育数据分析师设计的本地CLI工具，用于生成组合投注风险表，解决日常对账、赔率对齐、相关性分析等痛点。

## ✨ 核心功能

- **📊 风险分层**：自动识别 LOW/MEDIUM/HIGH/CRITICAL 四个风险等级
- **🔍 赔率过期检测**：精确识别过期赔率，标注过期时长和更新延迟
- **🔗 相关性分析**：检测同场比赛、同联赛、同向结果等高相关性风险
- **💰 本金对账**：自动检测零本金、缺失本金等异常
- **📝 完整追溯**：从一条结果反查完整计算过程（赔率验证→组合计算→相关性分析→风险评估→收益计算）
- **📄 多格式报告**：终端摘要 + Markdown可转发报告 + JSON机器可读格式

## 🚀 快速开始

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 运行默认样例

```bash
python main.py
```

这会使用 `sample_input/` 目录下的样例数据，生成报告到 `output/` 目录。

### 3. 指定输入输出目录

```bash
python main.py --input-dir ./my_data --output-dir ./my_report
```

### 4. 追溯特定组合的计算过程

```bash
python main.py --trace PARLAY_002 --input-dir ./sample_input --output-dir ./output
```

### 5. 指定分析时间点（模拟历史分析）

```bash
python main.py --as-of 2026-05-28T00:00:00
```

## 📁 输入数据格式

输入目录需要包含以下4个JSON文件：

| 文件 | 说明 |
|------|------|
| `odds.json` | 比赛赔率数据 |
| `stakes.json` | 本金记录 |
| `results.json` | 赛果记录 |
| `parlays.json` | 组合投注配置 |

### odds.json - 比赛赔率

```json
{
  "match_id": "MATCH_001",
  "league": "英超",
  "home_team": "曼城",
  "away_team": "利物浦",
  "market_type": "全场胜负",
  "selection": "曼城胜",
  "odd_value": 1.85,
  "update_time": "2026-05-30T18:00:00",
  "expiry_time": "2026-06-01T20:00:00",
  "status": "VALID"
}
```

### stakes.json - 本金记录

```json
{
  "stake_id": "STK_001",
  "bettor_id": "ANALYST_A",
  "amount": 1000.00,
  "currency": "CNY",
  "placed_time": "2026-05-30T19:00:00",
  "parlay_id": "PARLAY_001"
}
```

### results.json - 赛果记录

```json
{
  "match_id": "MATCH_001",
  "home_score": 2,
  "away_score": 1,
  "completed_time": "2026-06-01T22:00:00",
  "is_final": true
}
```

### parlays.json - 组合投注配置

```json
{
  "parlay_id": "PARLAY_001",
  "description": "正常组合 - 跨联赛低相关性",
  "legs": [
    {
      "leg_id": "LEG_001_1",
      "match_id": "MATCH_001",
      "market_type": "全场胜负",
      "selection": "曼城胜"
    }
  ]
}
```

## 🎯 风险等级说明

| 等级 | 颜色 | 触发条件 |
|------|------|----------|
| **LOW** | 🟢 | 跨赛事低相关性，所有赔率有效 |
| **MEDIUM** | 🟡 | 存在一定相关性 (0.4-0.7) |
| **HIGH** | 🟠 | 高相关性 (≥0.7) 或部分赔率过期 |
| **CRITICAL** | 🔴 | 全部赔率过期 或 零本金 或 有效关卡<2 |

## ⚠️ 常见问题检测

### 1. 赔率过期 (ODD_EXPIRED)
- 检测赔率 `status = EXPIRED` 或 `expiry_time < 当前时间`
- 标注：过期时长、距上次更新小时数

### 2. 高相关性 (HIGH_CORRELATION)
- 同一场比赛的多个投注：相关系数 0.75-0.95
- 同联赛 + 关联球队：相关系数 0.45
- 提供详细的相关性原因说明

### 3. 本金异常 (STAKE_ZERO_OR_NEGATIVE)
- 检测本金金额 ≤ 0
- 标注关联的投注员和时间

### 4. 数据对齐问题
- 赔率缺失、赛果缺失、本金缺失等
- 每笔问题都关联到具体的leg_id，方便定位

## 🔍 可追溯性示例

每个组合都有唯一的 `trace_id`，可以查看完整的6步计算过程：

```
1. leg_validation      - 关卡验证（有效/过期数量）
2. odds_calculation    - 组合赔率计算（含计算公式）
3. correlation_analysis - 相关性分析（高风险配对）
4. result_calculation  - 赛果计算（每关命中情况）
5. risk_assessment     - 风险评估（风险评分构成）
```

## 📄 输出文件

```
output/
├── risk_report.md      # 可转发的Markdown报告（适合发给同事）
├── risk_report.json    # JSON格式（适合程序处理）
└── traces/
    ├── trace_index.json          # 追溯索引
    ├── trace_{trace_id1}.json    # 组合1的完整计算过程
    └── trace_{trace_id2}.json    # 组合2的完整计算过程
```

## 📂 项目结构

```
.
├── main.py                   # CLI入口
├── requirements.txt
├── sample_input/             # 样例输入数据
│   ├── odds.json
│   ├── stakes.json
│   ├── results.json
│   └── parlays.json
└── parlay_risk/              # 核心模块
    ├── __init__.py
    ├── models.py             # 数据模型定义
    ├── validator.py          # 数据验证器
    ├── correlation.py        # 相关性分析器
    ├── calculator.py         # 组合计算器
    └── report.py             # 报告生成器
```

## 💡 使用场景

1. **日常对账**：快速发现本金记录和投注组合不匹配问题
2. **赛前审核**：提交投注前检查是否有过期赔率或高相关风险
3. **赛后复盘**：追溯每笔投注的计算过程，确认盈亏原因
4. **风险汇报**：生成美观的Markdown报告，直接转发给团队

## 🔧 样例覆盖场景

样例数据包含6个组合，覆盖以下场景：

| 组合ID | 场景 | 预期风险等级 |
|--------|------|-------------|
| PARLAY_001 | 正常组合 - 跨联赛低相关 | LOW |
| PARLAY_002 | 高相关性 - 同场比赛串关 | HIGH |
| PARLAY_003 | 包含过期赔率 | HIGH |
| PARLAY_004 | 本金为零 - 对账异常 | CRITICAL |
| PARLAY_005 | 混合问题 - 过期+高相关 | HIGH |
| PARLAY_006 | 全过期赔率 | CRITICAL |
