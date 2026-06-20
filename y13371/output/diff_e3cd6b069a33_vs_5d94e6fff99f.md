# 版本对比报告

> 旧版本: e3cd6b069a33
> 新版本: 5d94e6fff99f
> 生成时间: 2026-06-20T15:57:45.669000

## 一、样本变化

新增样本: 4 个
删除样本: 1 个
修改样本: 12 个

### 修改详情

| sample_id | 状态变化 | 灰度变化 | 边界变化 | 修改类型 |
|-----------|----------|----------|----------|----------|
| sample_005 | boundary → processed | 未变 | True → False | 未变 |
| sample_006 | 未变 | normal → gray_candidate | 未变 | 未变 |
| sample_007 | boundary → processed | normal → gray_candidate | True → False | 未变 |
| sample_008 | 未变 | normal → gray_candidate | 未变 | 未变 |
| sample_009 | boundary → processed | 未变 | True → False | 未变 |
| sample_016 | bad → boundary | 未变 | False → True | 未变 |
| sample_017 | bad → processed | 未变 | 未变 | none → threshold_adjustment |
| sample_019 | skipped → processed | 未变 | 未变 | 未变 |
| sample_020 | bad → boundary | 未变 | False → True | 未变 |
| sample_022 | boundary → processed | 未变 | True → False | none → manual_correction |
| sample_023 | boundary → processed | 未变 | True → False | 未变 |
| sample_024 | boundary → processed | 未变 | True → False | 未变 |

## 二、阈值变化

| 特征 | 变化类型 | 阈值变化 | 手动设置 |
|------|----------|----------|----------|
| feature1 | modified | [0.0, 50.0] → [0.0, 100.0] | 是 |
| feature2 | modified | [0.0, 50.0] → [0.0, 100.0] | 否 |
| feature3 | modified | [0.0, 50.0] → [0.0, 100.0] | 否 |
| feature4 | modified | [0.0, 50.0] → [0.0, 100.0] | 否 |

## 三、人工修正

| sample_id | 修改类型 | 修改说明 |
|-----------|----------|----------|
| sample_017 | threshold_adjustment | 阈值调整后不再是坏行 |
| sample_021 | manual_correction | 人工修正：feature1从1.00改为1.50 |
| sample_022 | manual_correction | 人工修正：feature1从2.60改为2.80 |
| sample_027 | auto_fix | 自动修复异常值 |

## 四、指标变化

| 特征 | 均值变化 | 标准差变化 | 异常值变化 |
|------|----------|------------|------------|
| feature1 | -2.6919 | -6.9070 | -1 |
| feature2 | -3.0021 | -16.7842 | +1 |
| feature3 | -10.7459 | -40.3474 | +0 |
| feature4 | -12.0445 | -51.3900 | -1 |

## 五、状态变化

| 指标 | 旧值 | 新值 | 变化 |
|------|------|------|------|
| total | 25 | 28 | +3 |
| processed | 20 | 28 | +8 |
| bad | 3 | 0 | -3 |
| skipped | 2 | 0 | -2 |
| boundary | 12 | 10 | -2 |
| gray_candidate | 5 | 8 | +3 |
| manual_corrections | 1 | 2 | +1 |
| auto_fixes | 0 | 1 | +1 |
| threshold_adjustments | 0 | 1 | +1 |

## 六、灰度变化

灰度配置比例变化: 0.2 → 0.3

实际灰度比例变化: 20.00% → 28.57% (+8.57%)

灰度样本变化: 新增 3 个, 移除 0 个
  新增: sample_006, sample_007, sample_008