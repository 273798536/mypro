# 分段回归错题复盘 使用说明

## 1. 启动

准备好输入目录，里面放：
- 历史答案 CSV（文件名不含 "withdrawal"）
- 撤回记录 CSV（文件名含 "withdrawal"）

```bash
python3 segmented_regression_review.py \
  --input-dir ./sample_input \
  --output-dir ./sample_output
```

## 2. 重跑

修改输入 CSV 或换一套参数后，再执行一次同样的命令。输出目录中的 CSV 会被覆盖，终端摘要会重新打印。

```bash
python3 segmented_regression_review.py \
  --input-dir ./sample_input \
  --output-dir ./sample_output
```

## 3. 查看 CSV 明细

输出目录生成 5 份 CSV：

| 文件 | 内容 |
| --- | --- |
| `detail.csv` | 每条记录的逐行明细（flag 标记 ERROR/WITHDRAWN/SORT_UNSTABLE/OK） |
| `withdrawal_linkage.csv` | 撤回记录与最终结论的联动结果 |
| `instability_report.csv` | sort_key 重复导致的排序不稳定清单 |
| `calculation_trace.csv` | 中间计算过程与单位换算公式 |
| `bad_data_report.csv` | 坏数据来源文件、行号、具体问题 |

终端只看摘要，对照分析请打开 CSV 明细。
