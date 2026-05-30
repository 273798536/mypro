# 投资组合前沿试算工具

## 快速启动

### 1. 安装依赖
```bash
pip install -r requirements.txt
```

### 2. 基础运行（无约束）
```bash
python portfolio_frontier.py \
  --assets sample_data/asset_returns.csv \
  --cov sample_data/covariance_matrix.csv
```

### 3. 带约束运行
```bash
python portfolio_frontier.py \
  --assets sample_data/asset_returns.csv \
  --cov sample_data/covariance_matrix.csv \
  --constraints sample_data/constraints.yaml
```

### 4. 指定目标收益率分析
```bash
python portfolio_frontier.py \
  --assets sample_data/asset_returns.csv \
  --cov sample_data/covariance_matrix.csv \
  --constraints sample_data/constraints.yaml \
  --target-return 0.09
```

---

## 样例数据位置

所有样例数据位于 `sample_data/` 目录：

| 文件 | 用途 | 说明 |
|------|------|------|
| `asset_returns.csv` | 资产收益率 | 含note字段，可写备注 |
| `asset_returns_missing.csv` | 缺失数据测试 | 部分资产收益率为空 |
| `covariance_matrix.csv` | 协方差矩阵 | 故意留空部分字段 |
| `constraints.yaml` | 基础约束 | 常规约束配置 |
| `constraints_late.yaml` | 追加约束 | 模拟客户晚半天补来的条件 |
| `constraints_allow_short.yaml` | 允许做空 | **触发负权重的配置** |
| `constraints_conflict.yaml` | 冲突约束 | 测试约束冲突检测 |

---

## 触发负权重的方法

### 方法1：使用允许做空的约束配置
```bash
python portfolio_frontier.py \
  --assets sample_data/asset_returns.csv \
  --cov sample_data/covariance_matrix.csv \
  --constraints sample_data/constraints_allow_short.yaml \
  --target-return 0.12
```

**关键点**：
- 在约束YAML中设置 `allow_short_selling: true`
- 为资产设置负的 `min_weight`（如 `-0.2` 表示最多做空20%）
- 目标收益率设得较高时，优化器更可能通过做空低收益资产来筹资

### 方法2：观察输出
输出中会明确标记负权重：
```
🔴 做空检测已启用
============================
当前配置允许做空，负权重为正常结果。
权重校验会明确标注每一项空头资产及其比例。

📋 资产权重:
  🔴     A:   -15.32%  (做空)
  🟢     B:    25.00%  (做多)
  ...
```

### 负权重结论不模糊
- ✅ 允许做空时：明确标注"做空验证通过"，列出每项空头及比例
- ❌ 未授权时：明确报错，给出3条可操作修正建议

---

## 重要特性

### 1. 数据缓存机制（结果不越跑越乱）
- 输入数据MD5哈希校验
- 数据未变化时自动复用上次结果
- 强制重算：加 `--force` 参数
- 忽略缓存：加 `--skip-cache` 参数
- 每次计算同时保存：
  - `results/frontier_latest.json`（最新结果，覆盖）
  - `results/frontier_时间戳_哈希.json`（历史版本，不覆盖）

### 2. 脏数据容忍
- 资产收益表中的 `note` 字段自动忽略，不影响计算
- 协方差矩阵空值自动智能填充（对角线用均值，非对角线用对称值）
- 非正定矩阵自动正则化修正

### 3. 数据问题告警（可操作建议）
**资产缺历史**：
```
[missing_return] 资产[C]缺少历史收益率数据。建议：
  1) 补充最近3-5年的历史数据
  2) 使用同类型资产收益率作为临时替代
  3) 从组合中暂时移除该资产
```

**约束冲突**：
```
[sector_conflict] 板块最低权重和(1.1000) > 板块上限(0.7)。建议：
  1) 降低板块内单资产最低要求
  2) 提高板块上限
  3) 移除部分资产的最低权重约束
```

### 4. 约束晚到处理
客户补来新约束时，只需指向新的约束文件：
```bash
# 先用基础约束
python portfolio_frontier.py ... --constraints sample_data/constraints.yaml

# 客户补充约束后
python portfolio_frontier.py ... --constraints sample_data/constraints_late.yaml
```
工具会自动检测输入变化，重新计算前沿。

### 5. 均值方差动态更新
有效前沿不是一次性判断，以下变化触发重新计算：
- 资产预期收益率调整 → 前沿上下移动
- 协方差矩阵变化 → 前沿形状改变
- 约束条件更新 → 前沿截断或平移

权重校验和风险分解会随前沿自动更新。

---

## 输入文件格式

### 资产收益率 (CSV)
```csv
asset,return,note
A,0.08,沪深300指数，2018年后数据
B,0.12,创业板指，波动较大
...
```

### 协方差矩阵 (CSV)
```csv
asset,A,B,C,D,E,F
A,0.04,0.025,0.001,0.018,,0.035
B,0.025,0.09,0.002,0.022,0.015,0.055
...
```

### 约束条件 (YAML)
```yaml
constraints:
  - type: weight_sum
    value: 1.0
  - type: min_weight
    asset: A
    value: 0.05
  - type: max_weight
    asset: F
    value: 0.25
  - type: sector_limit
    sector: 权益类
    assets: [A, B, D, F]
    max_total: 0.7
allow_short_selling: false
```

**约束类型**：
- `weight_sum`：权重和约束
- `min_weight`：单资产最小权重
- `max_weight`：单资产最大权重
- `sector_limit`：板块合计上限

---

## 常用命令汇总

```bash
# 基础试算
python portfolio_frontier.py --assets sample_data/asset_returns.csv --cov sample_data/covariance_matrix.csv

# 带约束 + 目标收益率
python portfolio_frontier.py --assets sample_data/asset_returns.csv --cov sample_data/covariance_matrix.csv --constraints sample_data/constraints.yaml --target-return 0.10

# 测试做空（负权重）
python portfolio_frontier.py --assets sample_data/asset_returns.csv --cov sample_data/covariance_matrix.csv --constraints sample_data/constraints_allow_short.yaml --target-return 0.13

# 测试数据缺失
python portfolio_frontier.py --assets sample_data/asset_returns_missing.csv --cov sample_data/covariance_matrix.csv

# 测试约束冲突
python portfolio_frontier.py --assets sample_data/asset_returns.csv --cov sample_data/covariance_matrix.csv --constraints sample_data/constraints_conflict.yaml --target-return 0.08

# 强制重算
python portfolio_frontier.py --assets sample_data/asset_returns.csv --cov sample_data/covariance_matrix.csv --force
```
