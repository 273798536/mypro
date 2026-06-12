# 凸包面积边界校验

教研编辑阿宁的凸包面积校验工具——给现场老师用的，不是给机器看的。

## 先跑哪条命令

```bash
python main.py
```

默认用 `data/` 下的示例材料跑一遍完整流程。

如果题目清单有单位缺失，工具会**暂停计算**并输出待确认报告。确认完单位后，加 `--skip-unit-check` 跳过检测继续：

```bash
python main.py --skip-unit-check
```

换一组参数（比如调跳变阈值）再跑：

```bash
python main.py --threshold 0.10
```

指定自己的材料文件：

```bash
python main.py --questions data/my_items.csv --overrides data/my_overrides.csv --notes data/my_notes.csv
```

## 再看哪份CSV明细

跑完后 `output/` 目录下生成三份文件，按顺序看：

| 序号 | 文件 | 看什么 |
|------|------|--------|
| 1 | `verification_status.csv` | 哪些已处理、哪些待补证据、哪些单位缺失——现场老师先看这张 |
| 2 | `verification_results.csv` | 每条题目的凸包面积、状态、跳变归因、备注 |
| 3 | `verification_trace.json` | 逐步骤追溯：每一步输入输出、哪一步让结果变化、变化原因 |

如果单位缺失，还会多出一份 `unit_missing_report.json`，列出待确认原因和影响范围。

## 示例材料说明

`data/` 目录下三份示例材料，量少但像真活：

- **question_items.csv**：6条题目，其中 Q003 和 Q006 故意缺失单位，Q004 用了 mm² 其余用 cm²
- **manual_overrides.csv**：2条人工改判——Q002 补录遗漏顶点，Q005 歧义修正
- **supplementary_notes.csv**：3条后补说明——对应改判和单位缺失的补充证据

## 结果跳变归因

当换参数再跑后凸包面积突然跳变，工具会自动归因：

- **阈值调整**：相对变化超过阈值但无其他因素
- **单位不一致**：该条目单位缺失或与基准不同
- **人工改判**：该条目被改判记录修改过

归因结果写在 `verification_results.csv` 的 `jump_causes` 列和 `verification_trace.json` 的跳变检测步骤里。

## 状态含义

| 状态 | 含义 |
|------|------|
| 已处理 | 凸包面积计算完成，无跳变，无需补充 |
| 待补证据 | 计算完成但存在跳变，需要补充证据说明 |
| 单位缺失-待确认 | 单位未标注，暂停计算，等确认后重跑 |
