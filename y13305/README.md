# 病历问答证据复核

一条命令跑完整包样例,标签冲突不急着算完,先说清卡在哪、谁影响了结论。

## 一条命令

```bash
python run_review.py                       # 跑完整包,有标签冲突则非零退出
python run_review.py --confirm MR-003       # 小孟人工确认改判后重跑
python run_review.py --timeline            # 把历史时间线对给别人看
```

## 小孟对给别人看的三样东西

| 给谁看 | 文件 | 说明 |
| --- | --- | --- |
| 样本表 | [data/sample_table.csv](file:///Users/mac/pro/solo/workspaces/y13305/data/sample_table.csv) | 当前样本表(旧版见 [sample_table_old.csv](file:///Users/mac/pro/solo/workspaces/y13305/data/sample_table_old.csv)) |
| 处理记录 | [out/processing_records.json](file:///Users/mac/pro/solo/workspaces/y13305/out/processing_records.json) | 每条冲突的来源/原因/影响范围 + 模型误判复盘 |
| 历史时间线 | [out/history.jsonl](file:///Users/mac/pro/solo/workspaces/y13305/out/history.jsonl) | 人工确认前后变化、模型复盘,JSONL 追加,`--timeline` 可读打印 |

## 本次混入的样本来源(分清谁影响了结论)

- **旧版样本表** `data/sample_table_old.csv` — 与当前标签漂移的来源
- **人工改判** `data/manual_overrides.json` — 一条 `MR-003` 待复核→支持,默认未确认
- **口头备注** `data/verbal_notes.json` — MR-002 "先别用"、MR-005 "需再确认"
- **旧模型误判样本** `data/model_misjudgment.json` — MR-006 放回,看新结果能否解释改判

## 退出提示怎么看

退出码非零 = 有标签冲突未确认,**不计入社区公示**。最后一行会列出卡在哪条样本:

```
⚠ 退出原因: 标签冲突卡在 MR-002, MR-003, MR-004
```

每条带"待确认原因 + 影响范围"。小孟确认后用 `--confirm <sample_id>` 重跑,冲突收敛、退出码归零即可公示。
