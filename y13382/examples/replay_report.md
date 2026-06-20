# 模型压缩异常回放报告 — Run `RUN-0171fce003`

> 生成时间: 2026-06-20 17:10:21

> **交付说明**: 推荐算法小许可以把这份报告直接对给别人看。
> 每份报告都包含: ①版本别名清单 ②公式与边界值总表 ③结论+证据链三件套 ④样本回放明细
> ⑤坏数据清单 ⑥完整处理记录链 ⑦原始日志关键行。

## ① 执行概览

- **总样本数**: 4
- **边界样本数**: 🟡 1
- **改判样本数**: 🔄 3
- **坏数据行数**: ⚫ 2
- **处理记录数**: 📝 45
- **结论条数**: 📌 4
- **回放开始**: 2026-06-20 17:10:21
- **回放完成**: (进行中)
- **运行ID**: `RUN-0171fce003`

## ② 版本别名清单（防止用错旧文件）

| 别名 | 目标路径 | 冻结 | 备注 | SHA256前16位 |
|------|----------|------|------|--------------|
| `旧模型日志_20240115` | `/Users/mac/pro/solo/workspaces/y13382/examples/old_training.log` | ✅ 已冻结 | 2024-01-15 跑的旧4bit量化实验，当时误判了S-001 | `8e917e78b5654921` |

## ③ 公式与边界值总表（摆在明处）

| 指标 | 下界 | 上界 | 越界时预期行为 | 关联结论ID |
|------|-----:|-----:|---------------|------------|
| `kl_divergence` | - | < 0.05 | KL>5%时压缩保真度不足，需回退量化比特数或增加蒸馏温度 | CONCL-KL-BOUND |
| `compression_ratio` | ≥ 2.0 | - | 压缩比<2x说明压缩效率不足，需检查剪枝率或量化位宽 | CONCL-RATIO-BOUND |
| `accuracy_drop_percent` | - | ≤ 0.02 | 掉点超过2%必须回退到8bit并补蒸馏轮次 | CONCL-ACC-TIGHT |
| `weight_sparsity` | ≥ 0.0 | ≤ 0.99 | 稀疏度超出[0, 0.99]说明剪枝配置异常 | CONCL-SPARSITY-BOUND |
| `quantization_bits` | ≥ 1 | ≤ 32 | 位宽超出[1,32]为非法配置 | CONCL-BITS-BOUND |
| `distillation_temperature` | ≥ 0.1 | ≤ 20.0 | 蒸馏温度越界会导致教师信号畸变 | CONCL-TEMP-BOUND |
| `fisher_information_norm` | > 1e-06 | ≤ 1000.0 | Fisher范数越界说明该层参数敏感，不应过度剪枝 | CONCL-FISHER-BOUND |

**指标公式速查**：

| 指标 | 单位 | 纯文本公式 |
|------|------|----------|
| `kl_divergence` | bits/dim | D_KL(P||Q) = Σ P(x) * log2(P(x)/Q(x)), P/Q=softmax(logits/T) |
| `compression_ratio` | x(倍) | r = 原始字节数 / 压缩后字节数 |
| `accuracy_drop_percent` | % | Δacc% = (基线精度 - 压缩后精度) × 100 |
| `weight_sparsity` | % | 稀疏度 = 零值参数个数 / 总参数个数 |
| `fisher_information_norm` | 无单位 | ||F||₂ = sqrt(Σ F_l²) |

## ④ 逐条结论（每条都附证据链）

### 1. [ℹ️ INFO] 改判结论: ANOMALY → COMPRESSED


- **结论ID**: `CONCL-782a304e8a`

- **生成时间**: 2026-06-20 17:10:21


样本[S-001]由旧模型判定为ANOMALY，新系统改判为COMPRESSED。

改判依据：全部指标在边界内，判定正常

旧理由：旧系统看到KL>某阈值就打异常，未结合精度影响

边界样本=False，边界违规条数=0


**证据链：**


- 🔗 关联样本ID: S-001

- 📊 关联指标: `kl_divergence`, `compression_ratio`, `accuracy_drop_percent`, `weight_sparsity`

- 📝 关联日志行: [LOG:L5], [LOG:L6]


**样本 [S-001] 指标快照**


| 指标 | 值 | 状态 |
|------|----|------|

| `kl_divergence` | 0.00035952 bits/dim | 🟢 边界内 |
| `compression_ratio` | 3.2 x | 🟢 边界内 |
| `accuracy_drop_percent` | 0.72% | 🟢 边界内 |
| `weight_sparsity` | 60.00% | 🟢 边界内 |


### 2. [⚠️ WARNING] 改判结论: COMPRESSED → BOUNDARY


- **结论ID**: `CONCL-373497beac`

- **生成时间**: 2026-06-20 17:10:21


样本[S-002]由旧模型判定为COMPRESSED，新系统改判为BOUNDARY。

改判依据：指标接近边界阈值，标记为边界样本（用于复现边缘case）

旧理由：压缩比2x, 精度掉点小

边界样本=True，边界违规条数=0


**证据链：**


- 🔗 关联样本ID: S-002

- 📊 关联指标: `kl_divergence`, `compression_ratio`, `accuracy_drop_percent`, `weight_sparsity`

- 📝 关联日志行: [LOG:L7]


**样本 [S-002] 指标快照**


| 指标 | 值 | 状态 |
|------|----|------|

| `kl_divergence` | 0.00850615 bits/dim | 🟢 边界内 |
| `compression_ratio` | 2 x | 🟢 边界内 |
| `accuracy_drop_percent` | 0.43% | 🟢 边界内 |
| `weight_sparsity` | 10.00% | 🟢 边界内 |


### 3. [❌ ERROR] 越界结论: ANOMALY


- **结论ID**: `CONCL-4070ad3058`

- **生成时间**: 2026-06-20 17:10:21


样本[S-003]触发指标越界。

越界明细：指标[accuracy_drop_percent]=4.85% 越界。边界: x ≤ 0.02；预期行为: 掉点超过2%必须回退到8bit并补蒸馏轮次

判定理由：精度掉点=4.85%(边界:x ≤ 0.02)，来源:['[LOG:L9]', '[LOG:L10]']


**证据链：**


- 🔗 关联样本ID: S-003

- 📊 关联指标: `kl_divergence`, `compression_ratio`, `accuracy_drop_percent`, `weight_sparsity`

- 📝 关联日志行: [LOG:L9], [LOG:L10]


**样本 [S-003] 指标快照**


| 指标 | 值 | 状态 |
|------|----|------|

| `kl_divergence` | 0.0198603 bits/dim | 🟢 边界内 |
| `compression_ratio` | 5 x | 🟢 边界内 |
| `accuracy_drop_percent` | 4.85% | 🔴 越界 |
| `weight_sparsity` | 90.00% | 🟢 边界内 |


**触发的边界违规**：


- 指标[accuracy_drop_percent]=4.85% 越界。边界: x ≤ 0.02；预期行为: 掉点超过2%必须回退到8bit并补蒸馏轮次



### 4. [ℹ️ INFO] 改判结论: NORMAL → COMPRESSED


- **结论ID**: `CONCL-0575fbac20`

- **生成时间**: 2026-06-20 17:10:21


样本[S-004]由旧模型判定为NORMAL，新系统改判为COMPRESSED。

改判依据：全部指标在边界内，判定正常

旧理由：旧系统未设置边界预警

边界样本=False，边界违规条数=0


**证据链：**


- 🔗 关联样本ID: S-004

- 📊 关联指标: `kl_divergence`, `compression_ratio`, `accuracy_drop_percent`, `weight_sparsity`

- 📝 关联日志行: [LOG:L14]


**样本 [S-004] 指标快照**


| 指标 | 值 | 状态 |
|------|----|------|

| `kl_divergence` | 0.000955488 bits/dim | 🟢 边界内 |
| `compression_ratio` | 2.4 x | 🟢 边界内 |
| `accuracy_drop_percent` | 0.92% | 🟢 边界内 |
| `weight_sparsity` | 50.00% | 🟢 边界内 |


## ⑤ 样本回放明细

### 样本 `S-001` — 🔵 COMPRESSED(已压缩)


- **输入引用**: `user-item#48291（旧模型误判案例）`

- **版本别名**: `旧模型日志_20240115`

- **旧判定→新判定**: 🔴 ANOMALY(异常) → **🔵 COMPRESSED(已压缩)**

- **旧判定理由**: 旧系统看到KL>某阈值就打异常，未结合精度影响

- **判定理由**: 全部指标在边界内，判定正常

- **边界样本**: 否

- **关联结论ID**: `CONCL-782a304e8a`


**指标明细（公式+单位+边界值在明处）**


| 项目 | 内容 |
|------|------|

| **kl_divergence** | `0.00035952 bits/dim` | 🟢 边界内 |
| &nbsp;&nbsp;📐 公式 | D_KL(P||Q) = Σ P(x) * log2(P(x)/Q(x)), P/T分布由logits经softmax(T)得到 |
| &nbsp;&nbsp;📏 边界 | x < 0.05 |
| &nbsp;&nbsp;💡 越界后果 | KL>5%时压缩保真度不足，需回退量化比特数或增加蒸馏温度 |
| &nbsp;&nbsp;🔗 日志来源 | [LOG:L5], [LOG:L6] |

| **compression_ratio** | `3.2 x` | 🟢 边界内 |
| &nbsp;&nbsp;📐 公式 | r = 原始字节数 / 压缩后字节数, 节省比例 = 1 - 1/r |
| &nbsp;&nbsp;📏 边界 | x ≥ 2.0 |
| &nbsp;&nbsp;💡 越界后果 | 压缩比<2x说明压缩效率不足，需检查剪枝率或量化位宽 |
| &nbsp;&nbsp;🔗 日志来源 | [LOG:L5], [LOG:L6] |

| **accuracy_drop_percent** | `0.72%` | 🟢 边界内 |
| &nbsp;&nbsp;📐 公式 | Δacc% = (基线精度 - 压缩后精度) * 100 |
| &nbsp;&nbsp;📏 边界 | x ≤ 0.02 |
| &nbsp;&nbsp;💡 越界后果 | 掉点超过2%必须回退到8bit并补蒸馏轮次 |
| &nbsp;&nbsp;🔗 日志来源 | [LOG:L5], [LOG:L6] |

| **weight_sparsity** | `60.00%` | 🟢 边界内 |
| &nbsp;&nbsp;📐 公式 | 稀疏度 = 零值参数个数 / 总参数个数 |
| &nbsp;&nbsp;📏 边界 | x ≥ 0.0 且 x ≤ 0.99 |
| &nbsp;&nbsp;💡 越界后果 | 稀疏度超出[0, 0.99]说明剪枝配置异常 |
| &nbsp;&nbsp;🔗 日志来源 | [LOG:L5], [LOG:L6] |



**关联日志行（原始文本）**


- **L5** [2024-01-15 09:12:10] [INFO] [forward] `[2024-01-15 09:12:10] [INFO] [forward] sample_id=S-001 input_ref=user-item#48291 original_size_bytes=499200000 compresse...`

- **L6** [2024-01-15 09:12:11] [WARNING] [quantize] `[2024-01-15 09:12:11] [WARNING] [quantize] S-001 被旧模型误标为异常: kl偏高疑似过压缩`



### 样本 `S-002` — 🟡 BOUNDARY(边界样本)


- **输入引用**: `user-item#51024（正常样本）`

- **版本别名**: `旧模型日志_20240115`

- **旧判定→新判定**: 🔵 COMPRESSED(已压缩) → **🟡 BOUNDARY(边界样本)**

- **旧判定理由**: 压缩比2x, 精度掉点小

- **判定理由**: 指标接近边界阈值，标记为边界样本（用于复现边缘case）

- **边界样本**: ✅ 是

- **关联结论ID**: `CONCL-373497beac`


**指标明细（公式+单位+边界值在明处）**


| 项目 | 内容 |
|------|------|

| **kl_divergence** | `0.00850615 bits/dim` | 🟢 边界内 |
| &nbsp;&nbsp;📐 公式 | D_KL(P||Q) = Σ P(x) * log2(P(x)/Q(x)), P/T分布由logits经softmax(T)得到 |
| &nbsp;&nbsp;📏 边界 | x < 0.05 |
| &nbsp;&nbsp;💡 越界后果 | KL>5%时压缩保真度不足，需回退量化比特数或增加蒸馏温度 |
| &nbsp;&nbsp;🔗 日志来源 | [LOG:L7] |

| **compression_ratio** | `2 x` | 🟢 边界内 |
| &nbsp;&nbsp;📐 公式 | r = 原始字节数 / 压缩后字节数, 节省比例 = 1 - 1/r |
| &nbsp;&nbsp;📏 边界 | x ≥ 2.0 |
| &nbsp;&nbsp;💡 越界后果 | 压缩比<2x说明压缩效率不足，需检查剪枝率或量化位宽 |
| &nbsp;&nbsp;🔗 日志来源 | [LOG:L7] |

| **accuracy_drop_percent** | `0.43%` | 🟢 边界内 |
| &nbsp;&nbsp;📐 公式 | Δacc% = (基线精度 - 压缩后精度) * 100 |
| &nbsp;&nbsp;📏 边界 | x ≤ 0.02 |
| &nbsp;&nbsp;💡 越界后果 | 掉点超过2%必须回退到8bit并补蒸馏轮次 |
| &nbsp;&nbsp;🔗 日志来源 | [LOG:L7] |

| **weight_sparsity** | `10.00%` | 🟢 边界内 |
| &nbsp;&nbsp;📐 公式 | 稀疏度 = 零值参数个数 / 总参数个数 |
| &nbsp;&nbsp;📏 边界 | x ≥ 0.0 且 x ≤ 0.99 |
| &nbsp;&nbsp;💡 越界后果 | 稀疏度超出[0, 0.99]说明剪枝配置异常 |
| &nbsp;&nbsp;🔗 日志来源 | [LOG:L7] |



**关联日志行（原始文本）**


- **L7** [2024-01-15 09:12:15] [INFO] [forward] `[2024-01-15 09:12:15] [INFO] [forward] sample_id=S-002 input_ref=user-item#51024 original_size_bytes=499200000 compresse...`



### 样本 `S-003` — 🔴 ANOMALY(异常)


- **输入引用**: `user-item#33917（真正异常样本）`

- **版本别名**: `旧模型日志_20240115`

- **旧判定→新判定**: 🔴 ANOMALY(异常) → **🔴 ANOMALY(异常)**

- **旧判定理由**: KL严重越界+精度掉点4.85%

- **判定理由**: 精度掉点=4.85%(边界:x ≤ 0.02)，来源:['[LOG:L9]', '[LOG:L10]']

- **边界样本**: 否

- **关联结论ID**: `CONCL-4070ad3058`


**指标明细（公式+单位+边界值在明处）**


| 项目 | 内容 |
|------|------|

| **kl_divergence** | `0.0198603 bits/dim` | 🟢 边界内 |
| &nbsp;&nbsp;📐 公式 | D_KL(P||Q) = Σ P(x) * log2(P(x)/Q(x)), P/T分布由logits经softmax(T)得到 |
| &nbsp;&nbsp;📏 边界 | x < 0.05 |
| &nbsp;&nbsp;💡 越界后果 | KL>5%时压缩保真度不足，需回退量化比特数或增加蒸馏温度 |
| &nbsp;&nbsp;🔗 日志来源 | [LOG:L9], [LOG:L10] |

| **compression_ratio** | `5 x` | 🟢 边界内 |
| &nbsp;&nbsp;📐 公式 | r = 原始字节数 / 压缩后字节数, 节省比例 = 1 - 1/r |
| &nbsp;&nbsp;📏 边界 | x ≥ 2.0 |
| &nbsp;&nbsp;💡 越界后果 | 压缩比<2x说明压缩效率不足，需检查剪枝率或量化位宽 |
| &nbsp;&nbsp;🔗 日志来源 | [LOG:L9], [LOG:L10] |

| **accuracy_drop_percent** | `4.85%` | 🔴 越界 |
| &nbsp;&nbsp;📐 公式 | Δacc% = (基线精度 - 压缩后精度) * 100 |
| &nbsp;&nbsp;📏 边界 | x ≤ 0.02 |
| &nbsp;&nbsp;💡 越界后果 | 掉点超过2%必须回退到8bit并补蒸馏轮次 |
| &nbsp;&nbsp;🔗 日志来源 | [LOG:L9], [LOG:L10] |

| **weight_sparsity** | `90.00%` | 🟢 边界内 |
| &nbsp;&nbsp;📐 公式 | 稀疏度 = 零值参数个数 / 总参数个数 |
| &nbsp;&nbsp;📏 边界 | x ≥ 0.0 且 x ≤ 0.99 |
| &nbsp;&nbsp;💡 越界后果 | 稀疏度超出[0, 0.99]说明剪枝配置异常 |
| &nbsp;&nbsp;🔗 日志来源 | [LOG:L9], [LOG:L10] |



**关联日志行（原始文本）**


- **L9** [2024-01-15 09:12:20] [INFO] [forward] `[2024-01-15 09:12:20] [INFO] [forward] sample_id=S-003 input_ref=user-item#33917 original_size_bytes=499200000 compresse...`

- **L10** [2024-01-15 09:12:21] [ERROR] [quantize] `[2024-01-15 09:12:21] [ERROR] [quantize] S-003 kl_div严重越界 accuracy_drop=4.85%`



**边界违规明细**


1. 指标[accuracy_drop_percent]=4.85% 越界。边界: x ≤ 0.02；预期行为: 掉点超过2%必须回退到8bit并补蒸馏轮次



### 样本 `S-004` — 🔵 COMPRESSED(已压缩)


- **输入引用**: `user-item#60002（边界样本）`

- **版本别名**: `旧模型日志_20240115`

- **旧判定→新判定**: 🟢 NORMAL(正常) → **🔵 COMPRESSED(已压缩)**

- **旧判定理由**: 旧系统未设置边界预警

- **判定理由**: 全部指标在边界内，判定正常

- **边界样本**: 否

- **关联结论ID**: `CONCL-0575fbac20`


**指标明细（公式+单位+边界值在明处）**


| 项目 | 内容 |
|------|------|

| **kl_divergence** | `0.000955488 bits/dim` | 🟢 边界内 |
| &nbsp;&nbsp;📐 公式 | D_KL(P||Q) = Σ P(x) * log2(P(x)/Q(x)), P/T分布由logits经softmax(T)得到 |
| &nbsp;&nbsp;📏 边界 | x < 0.05 |
| &nbsp;&nbsp;💡 越界后果 | KL>5%时压缩保真度不足，需回退量化比特数或增加蒸馏温度 |
| &nbsp;&nbsp;🔗 日志来源 | [LOG:L14] |

| **compression_ratio** | `2.4 x` | 🟢 边界内 |
| &nbsp;&nbsp;📐 公式 | r = 原始字节数 / 压缩后字节数, 节省比例 = 1 - 1/r |
| &nbsp;&nbsp;📏 边界 | x ≥ 2.0 |
| &nbsp;&nbsp;💡 越界后果 | 压缩比<2x说明压缩效率不足，需检查剪枝率或量化位宽 |
| &nbsp;&nbsp;🔗 日志来源 | [LOG:L14] |

| **accuracy_drop_percent** | `0.92%` | 🟢 边界内 |
| &nbsp;&nbsp;📐 公式 | Δacc% = (基线精度 - 压缩后精度) * 100 |
| &nbsp;&nbsp;📏 边界 | x ≤ 0.02 |
| &nbsp;&nbsp;💡 越界后果 | 掉点超过2%必须回退到8bit并补蒸馏轮次 |
| &nbsp;&nbsp;🔗 日志来源 | [LOG:L14] |

| **weight_sparsity** | `50.00%` | 🟢 边界内 |
| &nbsp;&nbsp;📐 公式 | 稀疏度 = 零值参数个数 / 总参数个数 |
| &nbsp;&nbsp;📏 边界 | x ≥ 0.0 且 x ≤ 0.99 |
| &nbsp;&nbsp;💡 越界后果 | 稀疏度超出[0, 0.99]说明剪枝配置异常 |
| &nbsp;&nbsp;🔗 日志来源 | [LOG:L14] |



**关联日志行（原始文本）**


- **L14** [2024-01-15 09:12:30] [INFO] [forward] `[2024-01-15 09:12:30] [INFO] [forward] sample_id=S-004 input_ref=user-item#60002 original_size_bytes=499200000 compresse...`


## ⑥ 坏数据清单（坏数据不带偏结论）

共检测到 **2** 行坏数据：


- **L8** [INFO] `NULL NULL NULL NULL NULL NULL 这行是乱材料 全是null` — **⚠️ 坏数据** (过多NULL值) — 解析提示: 坏数据: 过多NULL值

- **L11** [INFO] `Traceback (most recent call last):` — **⚠️ 坏数据** (Python异常栈帧) — 解析提示: 坏数据: Python异常栈帧

## ⑦ 完整处理记录链（审计凭证）

| 时间 | 记录ID | 阶段 | 操作 | 关键输入/输出 | 关联日志 | 备注 |
|------|--------|------|------|---------------|----------|------|
| 17:10:21 | `ALIAS-8bf8c11b8e68` | 📥LOG_IMPORT | 注册版本别名 | in:alias=旧模型日志_20240115 ; in:target_path=/Users/mac/pro/solo/workspaces ; out:target_hash=8e917e78b5654921535d14cce6e58f ; out:frozen=True | - | 别名 旧模型日志_20240115 → /Users/mac/pro/solo/workspaces/y13382/examples/old_training.log ; 首次校验SHA256=8e917e78b5654921... (+1) |
| 17:10:21 | `ALIAS-d37b8d446b76` | 📥LOG_IMPORT | 校验版本别名通过 | in:alias=旧模型日志_20240115 ; in:path=/Users/mac/pro/solo/workspaces ; out:exists=True ; out:matches=True | - | 旧模型日志_20240115 文件哈希一致，材料未被篡改 |
| 17:10:21 | `LOG-5a939649bcd9` | 📥LOG_IMPORT | 解析日志字段 | in:line_number=1 ; out:extracted_keys=['09', 'run_id'] | [LOG:L1] | - |
| 17:10:21 | `LOG-49984e48dbf9` | 📥LOG_IMPORT | 解析日志字段 | in:line_number=2 ; out:extracted_keys=['09', 'baseline_acc', 'params | [LOG:L2] | - |
| 17:10:21 | `LOG-02153ff3fe87` | 📥LOG_IMPORT | 解析日志字段 | in:line_number=3 ; out:extracted_keys=['09', '配置', 'temperature', 'p | [LOG:L3] | - |
| 17:10:21 | `LOG-fb2b02b3bf96` | 📥LOG_IMPORT | 解析日志字段 | in:line_number=5 ; out:extracted_keys=['09', 'sample_id', 'input_ref | [LOG:L5] | - |
| 17:10:21 | `LOG-5535a0d649df` | 📥LOG_IMPORT | 解析日志字段 | in:line_number=6 ; out:extracted_keys=['09', '被旧模型误标为异常'] | [LOG:L6] | - |
| 17:10:21 | `LOG-9f907c12c1fe` | 📥LOG_IMPORT | 解析日志字段 | in:line_number=7 ; out:extracted_keys=['09', 'sample_id', 'input_ref | [LOG:L7] | - |
| 17:10:21 | `LOG-5dcd47ffecd0` | 🚫BAD_DATA_FILTER | 标记坏数据行 | in:line_number=8 ; in:reason=过多NULL值 ; out:is_corrupt=True | [LOG:L8] | 原始内容前80字: NULL NULL NULL NULL NULL NULL 这行是乱材料 全是null
 |
| 17:10:21 | `LOG-54fab09cba57` | 📥LOG_IMPORT | 解析日志字段 | in:line_number=9 ; out:extracted_keys=['09', 'sample_id', 'input_ref | [LOG:L9] | - |
| 17:10:21 | `LOG-6e583c006063` | 📥LOG_IMPORT | 解析日志字段 | in:line_number=10 ; out:extracted_keys=['09', 'accuracy_drop'] | [LOG:L10] | - |
| 17:10:21 | `LOG-6258e703a807` | 🚫BAD_DATA_FILTER | 标记坏数据行 | in:line_number=11 ; in:reason=Python异常栈帧 ; out:is_corrupt=True | [LOG:L11] | 原始内容前80字: Traceback (most recent call last):
 |
| 17:10:21 | `LOG-04fd4da7f011` | 📥LOG_IMPORT | 解析日志字段 | in:line_number=13 ; out:extracted_keys=['RuntimeError'] | [LOG:L13] | - |
| 17:10:21 | `LOG-6c5702fbf26e` | 📥LOG_IMPORT | 解析日志字段 | in:line_number=14 ; out:extracted_keys=['09', 'sample_id', 'input_ref | [LOG:L14] | - |
| 17:10:21 | `LOG-5a335f2f3e43` | 📥LOG_IMPORT | 解析日志字段 | in:line_number=15 ; out:extracted_keys=['09', 'epoch', 'summary_total | [LOG:L15] | - |
| 17:10:21 | `LOG-f4ab5de1d45a` | 📥LOG_IMPORT | 解析日志字段 | in:line_number=16 ; out:extracted_keys=['09'] | [LOG:L16] | - |
| 17:10:21 | `LOG-3b46e767050f` | 📥LOG_IMPORT | 导入日志文件 | in:file_path=/Users/mac/pro/solo/workspaces ; in:file_hash=8e917e78b5654921535d14cce6e58f ; out:parsed_entries=14 ; out:corrupt_entries=2 | - | 文件哈希SHA256=8e917e78b5654921 ; 版本别名=旧模型日志_20240115 |
| 17:10:21 | `METRIC-5dc2419855f9` | 🧮METRIC_CALCULATION | 计算指标[kl_divergence] | in:temperature=1.0 ; in:teacher_len=5 ; out:value=0.00035952036746621214 ; out:unit=bits/dim | [LOG:L5], [LOG:L6] | 输入维度N=5, 温度T=1.0 ; Teacher Softmax[0..2] = ['0.9983', '0.0011', '0.0000'] (+3) |
| 17:10:21 | `METRIC-080eeac6d78a` | 🧮METRIC_CALCULATION | 计算指标[compression_ratio] | in:original_size_bytes=499200000 ; in:compressed_size_bytes=156000000 ; out:value=3.2 ; out:saved_pct=0.6875 | [LOG:L5], [LOG:L6] | 原始大小 = 499,200,000 bytes = 476.07 MiB ; 压缩大小 = 156,000,000 bytes = 148.77 MiB (+2) |
| 17:10:21 | `METRIC-e479c5560029` | 🧮METRIC_CALCULATION | 计算指标[accuracy_drop_percent] | in:baseline_acc=0.9287 ; in:compressed_acc=0.9215 ; out:value=0.7199999999999984 ; out:unit=% | [LOG:L5], [LOG:L6] | 基线精度 = 92.8700% ; 压缩后精度 = 92.1500% (+1) |
| 17:10:21 | `METRIC-2228658baa72` | 🧮METRIC_CALCULATION | 计算指标[weight_sparsity] | in:total_params=124800000 ; in:zero_params=74880000 ; out:value=60.0 ; out:unit=% | [LOG:L5], [LOG:L6] | 总参数量 = 124,800,000 ; 零参数量 = 74,880,000 (+1) |
| 17:10:21 | `METRIC-e9396f891ff0` | 🧮METRIC_CALCULATION | 计算指标[kl_divergence] | in:temperature=1.0 ; in:teacher_len=5 ; out:value=0.00850615278275258 ; out:unit=bits/dim | [LOG:L7] | 输入维度N=5, 温度T=1.0 ; Teacher Softmax[0..2] = ['0.8638', '0.1292', '0.0058'] (+3) |
| 17:10:21 | `METRIC-5d6976e63d77` | 🧮METRIC_CALCULATION | 计算指标[compression_ratio] | in:original_size_bytes=499200000 ; in:compressed_size_bytes=249600000 ; out:value=2.0 ; out:saved_pct=0.5 | [LOG:L7] | 原始大小 = 499,200,000 bytes = 476.07 MiB ; 压缩大小 = 249,600,000 bytes = 238.04 MiB (+2) |
| 17:10:21 | `METRIC-655991065b72` | 🧮METRIC_CALCULATION | 计算指标[accuracy_drop_percent] | in:baseline_acc=0.9287 ; in:compressed_acc=0.9244 ; out:value=0.42999999999999705 ; out:unit=% | [LOG:L7] | 基线精度 = 92.8700% ; 压缩后精度 = 92.4400% (+1) |
| 17:10:21 | `METRIC-97fe92f29aef` | 🧮METRIC_CALCULATION | 计算指标[weight_sparsity] | in:total_params=124800000 ; in:zero_params=12480000 ; out:value=10.0 ; out:unit=% | [LOG:L7] | 总参数量 = 124,800,000 ; 零参数量 = 12,480,000 (+1) |
| 17:10:21 | `METRIC-769b169e4fe7` | 🧮METRIC_CALCULATION | 计算指标[kl_divergence] | in:temperature=1.0 ; in:teacher_len=5 ; out:value=0.019860283228415456 ; out:unit=bits/dim | [LOG:L9], [LOG:L10] | 输入维度N=5, 温度T=1.0 ; Teacher Softmax[0..2] = ['0.9999', '0.0001', '0.0000'] (+3) |
| 17:10:21 | `METRIC-ff2b969eeb30` | 🧮METRIC_CALCULATION | 计算指标[compression_ratio] | in:original_size_bytes=499200000 ; in:compressed_size_bytes=99840000 ; out:value=5.0 ; out:saved_pct=0.8 | [LOG:L9], [LOG:L10] | 原始大小 = 499,200,000 bytes = 476.07 MiB ; 压缩大小 = 99,840,000 bytes = 95.21 MiB (+2) |
| 17:10:21 | `METRIC-0e6cedc032f1` | 🧮METRIC_CALCULATION | 计算指标[accuracy_drop_percent] | in:baseline_acc=0.9287 ; in:compressed_acc=0.8802 ; out:value=4.849999999999999 ; out:unit=% | [LOG:L9], [LOG:L10] | 基线精度 = 92.8700% ; 压缩后精度 = 88.0200% (+1) |
| 17:10:21 | `METRIC-f9e184988173` | 🧮METRIC_CALCULATION | 计算指标[weight_sparsity] | in:total_params=124800000 ; in:zero_params=112320000 ; out:value=90.0 ; out:unit=% | [LOG:L9], [LOG:L10] | 总参数量 = 124,800,000 ; 零参数量 = 112,320,000 (+1) |
| 17:10:21 | `METRIC-ea013ea11216` | 🧮METRIC_CALCULATION | 计算指标[kl_divergence] | in:temperature=1.0 ; in:teacher_len=5 ; out:value=0.0009554881655091054 ; out:unit=bits/dim | [LOG:L14] | 输入维度N=5, 温度T=1.0 ; Teacher Softmax[0..2] = ['0.9865', '0.0121', '0.0002'] (+3) |
| 17:10:21 | `METRIC-cb30c31f29d5` | 🧮METRIC_CALCULATION | 计算指标[compression_ratio] | in:original_size_bytes=499200000 ; in:compressed_size_bytes=208000000 ; out:value=2.4 ; out:saved_pct=0.5833333333333333 | [LOG:L14] | 原始大小 = 499,200,000 bytes = 476.07 MiB ; 压缩大小 = 208,000,000 bytes = 198.36 MiB (+2) |
| 17:10:21 | `METRIC-c8dab0e5f0cd` | 🧮METRIC_CALCULATION | 计算指标[accuracy_drop_percent] | in:baseline_acc=0.9287 ; in:compressed_acc=0.9195 ; out:value=0.9199999999999986 ; out:unit=% | [LOG:L14] | 基线精度 = 92.8700% ; 压缩后精度 = 91.9500% (+1) |
| 17:10:21 | `METRIC-2845ed2b72bd` | 🧮METRIC_CALCULATION | 计算指标[weight_sparsity] | in:total_params=124800000 ; in:zero_params=62400000 ; out:value=50.0 ; out:unit=% | [LOG:L14] | 总参数量 = 124,800,000 ; 零参数量 = 62,400,000 (+1) |
| 17:10:21 | `REPLAY-cc72ad8b6ff6` | 🔁REPLAY_EXECUTION | 开始回放样本 | in:sample_id=S-001 ; in:prev_verdict=SampleVerdict.ANOMALY | [LOG:L5], [LOG:L6] | 样本ID=S-001 ; 输入引用=user-item#48291（旧模型误判案例） (+2) |
| 17:10:21 | `REPLAY-a2bd7fd49a84` | 🔁REPLAY_EXECUTION | 样本判定[改判] | in:sample_id=S-001 ; in:prev=SampleVerdict.ANOMALY ; out:verdict_reason=全部指标在边界内，判定正常 ; out:boundary_violations_count=0 | [LOG:L5], [LOG:L6] | 旧判定: ANOMALY → 新判定: COMPRESSED ; 理由摘要: 全部指标在边界内，判定正常 |
| 17:10:21 | `VERDICT-d9d6f8f92539` | ⚖️SAMPLE_VERDICT | 判定样本S-001 | in:metrics={'kl_divergence': 0.0003595203 ; out:verdict=SampleVerdict.COMPRESSED ; out:reason=全部指标在边界内，判定正常 | [LOG:L5], [LOG:L6] | 全部指标在边界内，判定正常 |
| 17:10:21 | `REPLAY-18492d33e5bf` | 🔁REPLAY_EXECUTION | 开始回放样本 | in:sample_id=S-002 ; in:prev_verdict=SampleVerdict.COMPRESSED | [LOG:L7] | 样本ID=S-002 ; 输入引用=user-item#51024（正常样本） (+2) |
| 17:10:21 | `REPLAY-d8ce961d42d6` | 🔁REPLAY_EXECUTION | 样本判定[改判] | in:sample_id=S-002 ; in:prev=SampleVerdict.COMPRESSED ; out:verdict_reason=指标接近边界阈值，标记为边界样本（用于复现边缘case） ; out:boundary_violations_count=0 | [LOG:L7] | 旧判定: COMPRESSED → 新判定: BOUNDARY ; 理由摘要: 指标接近边界阈值，标记为边界样本（用于复现边缘case） |
| 17:10:21 | `VERDICT-3c4af2d40e33` | ⚖️SAMPLE_VERDICT | 判定样本S-002 | in:metrics={'kl_divergence': 0.0085061527 ; out:verdict=SampleVerdict.BOUNDARY ; out:reason=指标接近边界阈值，标记为边界样本（用于复现边缘case） | [LOG:L7] | 指标接近边界阈值，标记为边界样本（用于复现边缘case） |
| 17:10:21 | `REPLAY-c2899f9e5e4c` | 🔁REPLAY_EXECUTION | 开始回放样本 | in:sample_id=S-003 ; in:prev_verdict=SampleVerdict.ANOMALY | [LOG:L9], [LOG:L10] | 样本ID=S-003 ; 输入引用=user-item#33917（真正异常样本） (+2) |
| 17:10:21 | `REPLAY-ff642607d91e` | 🔁REPLAY_EXECUTION | 样本判定[维持] | in:sample_id=S-003 ; in:prev=SampleVerdict.ANOMALY ; out:verdict_reason=精度掉点=4.85%(边界:x ≤ 0.02)，来源:['[ ; out:boundary_violations_count=1 | [LOG:L9], [LOG:L10] | 旧判定: ANOMALY → 新判定: ANOMALY ; 理由摘要: 精度掉点=4.85%(边界:x ≤ 0.02)，来源:['[LOG:L9]', '[LOG:L10]'] |
| 17:10:21 | `VERDICT-843938986d59` | ⚖️SAMPLE_VERDICT | 判定样本S-003 | in:metrics={'kl_divergence': 0.0198602832 ; out:verdict=SampleVerdict.ANOMALY ; out:reason=精度掉点=4.85%(边界:x ≤ 0.02)，来源:['[ | [LOG:L9], [LOG:L10] | 精度掉点=4.85%(边界:x ≤ 0.02)，来源:['[LOG:L9]', '[LOG:L10]'] |
| 17:10:21 | `REPLAY-245752be7b8a` | 🔁REPLAY_EXECUTION | 开始回放样本 | in:sample_id=S-004 ; in:prev_verdict=SampleVerdict.NORMAL | [LOG:L14] | 样本ID=S-004 ; 输入引用=user-item#60002（边界样本） (+2) |
| 17:10:21 | `REPLAY-f5c644911ca4` | 🔁REPLAY_EXECUTION | 样本判定[改判] | in:sample_id=S-004 ; in:prev=SampleVerdict.NORMAL ; out:verdict_reason=全部指标在边界内，判定正常 ; out:boundary_violations_count=0 | [LOG:L14] | 旧判定: NORMAL → 新判定: COMPRESSED ; 理由摘要: 全部指标在边界内，判定正常 |
| 17:10:21 | `VERDICT-fd35d36b0a17` | ⚖️SAMPLE_VERDICT | 判定样本S-004 | in:metrics={'kl_divergence': 0.0009554881 ; out:verdict=SampleVerdict.COMPRESSED ; out:reason=全部指标在边界内，判定正常 | [LOG:L14] | 全部指标在边界内，判定正常 |

## ⑧ 附录：全部日志行引用索引

| 引用ID | 行号 | 原始文本摘要 | 状态 |
|--------|-----:|-------------|------|
| `[LOG:L5]` | 5 | [2024-01-15 09:12:10] [INFO] [forward] sample_id=S-001 input... | ✅ 已解析 |
| `[LOG:L6]` | 6 | [2024-01-15 09:12:11] [WARNING] [quantize] S-001 被旧模型误标为异常: ... | ✅ 已解析 |
| `[LOG:L7]` | 7 | [2024-01-15 09:12:15] [INFO] [forward] sample_id=S-002 input... | ✅ 已解析 |
| `[LOG:L8]` | 8 | NULL NULL NULL NULL NULL NULL 这行是乱材料 全是null | ⚠️ 坏数据 |
| `[LOG:L9]` | 9 | [2024-01-15 09:12:20] [INFO] [forward] sample_id=S-003 input... | ✅ 已解析 |
| `[LOG:L10]` | 10 | [2024-01-15 09:12:21] [ERROR] [quantize] S-003 kl_div严重越界 ac... | ✅ 已解析 |
| `[LOG:L11]` | 11 | Traceback (most recent call last): | ⚠️ 坏数据 |
| `[LOG:L14]` | 14 | [2024-01-15 09:12:30] [INFO] [forward] sample_id=S-004 input... | ✅ 已解析 |

---
*本报告由 模型压缩异常回放系统 自动生成。*
