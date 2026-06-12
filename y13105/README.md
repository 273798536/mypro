# 矩阵条件数错题复盘

一个轻便的小工具，帮教研编辑和复核人快速看清"矩阵条件数错题复盘"里藏了什么。

## 快速上手（3 步）

**第 1 步**：把错题整理成 JSON 数组，放在一个文件里。参考 [examples/sample_records.json](file:///Users/mac/pro/solo/workspaces/y13105/examples/sample_records.json)。

**第 2 步**：运行命令生成 Markdown 报告：

```bash
python3 review_cli.py -i examples/sample_records.json -o report.md
```

**第 3 步**：打开 `report.md`，或追加 `--json` 查看与接口一致的结构化结果：

```bash
python3 review_cli.py -i examples/sample_records.json -o report.md --json
```

## 坏材料来了看哪里？

| 出现的症状 | 去报告里看哪一节 | 状态徽章 |
|---|---|---|
| 输入一条记录都没有（空集合） | 「一、整体结论」会直接显示 **∅ 空集合** | ∅ |
| 混进了"学生错题旧版 / 人工改判 / 口头备注" | 「三、影响结论的记录」单独列出，逐条标注来源 | 🔴 会影响结论 |
| 单位缺失 | 「四、逐条明细」里对应条目的"单位"行写 **（缺失，本条非正常通过）**，整体状态为 ⚠️ 需关注 | ⚠️ |
| 条件数写的是文字或负数 | 状态直接打为 ❌ 处理异常，问题清单里写明原因 | ❌ |
| 想知道某条里的数字从哪个字段来的 | 「四、逐条明细」每条末尾的 **数字/信息溯源线索**，会写清 `字段名=原始值 → 说明` | — |

## 状态与接口一致性

- Markdown 报告里每一条的状态（✅/⚠️/❌/∅）与 `--json` 输出里的 `status`、`status_display`、`status_badge` 完全对应。
- 整体结论同样由 `overall_status` 字段统一驱动，不会出现"页面一个说法、文件一个说法"。

## 输入 JSON 字段参考

| 字段 | 说明 | 是否必填 |
|---|---|---|
| `record_id` | 记录编号 | 建议填写 |
| `source` | 来源：`official` / `student_old_version` / `manual_revision` / `verbal_note` | 否，默认 `official` |
| `question_text` | 题干 | **必填，空则记为空集合** |
| `student_answer` | 学生答案 | 否 |
| `correct_answer` | 参考答案 | 否 |
| `condition_number` | 矩阵条件数（数值） | 否，无法解析则标异常 |
| `unit` | 单位 | 否，缺失则本条不算正常通过 |
