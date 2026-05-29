# KMeans分群讲解台 - 详细分析报告

**生成时间**: 2026-05-29 11:15:28

---

## 📊 基本信息

| 指标 | 值 |
|------|-----|
| 总样本数 | 500 |
| 有效样本 | 498 |
| 异常样本 | 2 |
| 聚类数量 | 3 |
| 随机种子 | 42 |
| Inertia | 408.7730 |

---

## 👥 客户分群分布

- **簇 0**: 159 人 (31.9%)
- **簇 1**: 177 人 (35.5%)
- **簇 2**: 162 人 (32.5%)

---

## 🎯 聚类质量评估

### 轮廓系数 (Silhouette Score)
- **得分**: 0.4323
- **解释**: 一般 - 聚类结构较弱

### Calinski-Harabasz 指数
- **得分**: 749.9973
- **解释**: 数值越高，聚类越密集、分离度越好

### Davies-Bouldin 指数
- **得分**: 0.8728
- **解释**: 良好 - 聚类间有较好区分度

### 各簇轮廓系数

| 簇 | 轮廓系数 |
|----|----------|
| 0 | 0.4120 |
| 1 | 0.3976 |
| 2 | 0.4902 |

---

## 💡 聚类形成原因解释

每个簇的关键特征（与整体均值的偏差）：

### 簇 0 形成原因

| 特征 | 偏差值 | 方向 |
|------|--------|------|
| income | +1.1027 | 高于均值 |
| age | +1.0588 | 高于均值 |
| purchase_frequency | -0.9427 | 低于均值 |
| tenure | +0.6311 | 高于均值 |
| spending_score | -0.1867 | 低于均值 |

### 簇 1 形成原因

| 特征 | 偏差值 | 方向 |
|------|--------|------|
| purchase_frequency | -0.2456 | 低于均值 |
| income | +0.0360 | 高于均值 |
| age | -0.0232 | 低于均值 |
| spending_score | -0.0130 | 低于均值 |
| tenure | +0.0122 | 高于均值 |

### 簇 2 形成原因

| 特征 | 偏差值 | 方向 |
|------|--------|------|
| purchase_frequency | +1.1688 | 高于均值 |
| income | -1.0930 | 低于均值 |
| age | -0.9984 | 低于均值 |
| tenure | -0.6256 | 低于均值 |
| spending_score | +0.1967 | 高于均值 |

---

## ⚠️  数据与规则差异检测

- **总差异数**: 4

### 详细差异

1. **income** (method_conflict)
   - 数据: 建议: standard（范围:151207.72, 偏度:0.45）
   - 规则: 规则: log
   - 说明: 特征 'income' 的数据特征建议使用 standard，但规则使用 log

2. **purchase_frequency** (method_conflict)
   - 数据: 建议: robust（范围:33.05, 偏度:0.70）
   - 规则: 规则: standard
   - 说明: 特征 'purchase_frequency' 的数据特征建议使用 robust，但规则使用 standard

3. **spending_score** (method_conflict)
   - 数据: 建议: standard（范围:103.08, 偏度:-0.17）
   - 规则: 规则: minmax
   - 说明: 特征 'spending_score' 的数据特征建议使用 standard，但规则使用 minmax

4. **tenure** (method_conflict)
   - 数据: 建议: standard（范围:94.27, 偏度:0.36）
   - 规则: 规则: robust
   - 说明: 特征 'tenure' 的数据特征建议使用 standard，但规则使用 robust

---

## 🔧 标准化规则

| 特征 | 标准化方法 |
|------|----------|
| age | standard |
| income | log |
| purchase_frequency | standard |
| spending_score | minmax |
| tenure | robust |

---

*报告由 KMeans分群讲解台 自动生成*
