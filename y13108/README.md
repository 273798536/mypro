# 矩阵条件数图表解释

## 先跑哪条命令

```bash
python3 calc_condition_number.py input/matrix_inputs.json output
```

## 再看哪份截图说明

跑完命令后，依次查看以下输出文件中的对应锚点：

1. `output/condition_number_report.txt` — 文本版报告，直接打开看
   - 【统计数字】区块：`empty_input_samples` 字段说明空集合被当合法输入计数
   - 【明细表】区块：每个参数组的 `单位追踪`、`空集合处理`、`中间计算过程`
2. `output/condition_number_report.json` — 结构化数据，供截图对照
   - `screenshot_explanation_keys` 列出了截图标注的 5 个关键字段

---

## 三件事讲清

### 1. 放样例

输入样例位于 `input/matrix_inputs.json`，共 3 组：

| 组别 | 说明 | 关注点 |
| --- | --- | --- |
| A组 | 正常 2x2，单位 mm | 单位换算 mm → m 的中间步骤 |
| B组 | 正常 2x2，单位缺失 | 单位追踪字段追到计算草稿原始说法 |
| C组 | 空集合输入（空列表） | 空集合视为合法输入，条件数记 N/A |

### 2. 重跑

- 改输入：编辑 `input/matrix_inputs.json`，可加更多 `param_groups`
- 改筛选：修改 `filter_conditions` 字段
- 重跑：重新执行上面那条 `python3` 命令，`output/` 目录会被刷新

### 3. 查看截图说明

截图说明锚点（即需要在截图上圈出的位置）：

- `statistics.condition_number_avg` — 条件数均值
- `statistics.empty_input_samples` — 空输入样本数（证明空集合被正常统计）
- `detail_rows[*].empty_set_decision` — 空集合处理链的判断文字
- `detail_rows[*].unit_warning_detail` — 单位缺失追到计算草稿原文
- `detail_rows[*].intermediate_steps` — A/B 两组参数对照的中间计算与单位换算

---

## 本材料包含哪些东西

```
.
├── README.md                          # 你现在看的这份
├── calc_condition_number.py           # 计算脚本
├── input/
│   └── matrix_inputs.json             # 放样例（A/B/C 三组参数）
└── output/                            # 跑完命令后生成
    ├── condition_number_report.json   # 结构化结果
    └── condition_number_report.txt    # 文本结果（含截图说明锚点）
```

教研编辑阿宁：先跑命令，再打开 output 里的 txt 报告对照看即可。
