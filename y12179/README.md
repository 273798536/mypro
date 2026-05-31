# 旋律动机检索器

## 启动方式

```bash
# 基本检索：用 motif_theme_A 查询所有已导入动机
python run.py --samples samples/basic_motif.json samples/transposition_misalign.json --query motif_theme_A

# 带人工补全：补全缺失的 name 字段
python run.py \
  --samples samples/basic_motif.json samples/transposition_misalign.json \
  --query motif_theme_A \
  --fill-field motif_theme_A_reprise name 再现部主题A

# 带小节偏移修正：设定片段小节偏移
python run.py \
  --samples samples/basic_motif.json samples/transposition_misalign.json \
  --query motif_theme_A \
  --fill-field motif_theme_A_reprise name 再现部主题A \
  --set-offset frag_transposed_misaligned 2

# 指定输出路径
python run.py \
  --samples samples/basic_motif.json samples/transposition_misalign.json \
  --query motif_theme_A \
  --output output/my_report.json \
  --audit-output output/my_audit.json \
  --text-output output/my_report.txt

# 导入晚到小节
python run.py \
  --samples samples/basic_motif.json samples/late_measures.json \
  --query motif_theme_A
```

## 样例文件位置

| 文件 | 内容 |
|---|---|
| `samples/basic_motif.json` | 基础动机 + 移调再现，含完整小节 |
| `samples/transposition_misalign.json` | 移调变奏+小节错位混合、节奏拉伸、拉伸+错位复合 |
| `samples/late_measures.json` | 晚到小节（第5-8小节） |

## 样例JSON格式

片段格式：
```json
{
  "fragments": [
    {
      "id": "片段ID",
      "remarks": ["备注1", "备注2"],
      "notes": [
        {"pitch": 60, "onset": 0.0, "duration": 1.0, "velocity": 80}
      ],
      "measure_offset": null,
      "motif": {
        "id": "动机ID",
        "name": "动机名（可缺省）",
        "tags": ["标签1"]  // 可缺省
      }
    }
  ]
}
```

小节格式：
```json
{
  "measures": [
    {"index": 0, "start_beat": 0.0, "end_beat": 4.0, "time_signature": "4/4"}
  ],
  "arrived_late": false
}
```

## 怎样触发移调变奏检测

移调变奏在以下条件时自动触发：

1. **纯移调**：两个动机的音程序列（相邻音符的半音差）完全一致，但绝对音高存在固定偏移。例如 C-D-E 和 F-G-A，音程序列都是 +2+2，但整体移调 5 半音。

2. **移调+小节错位**：音程序列一致 + 起始位置存在拍偏移。样例 `frag_transposed_misaligned` 就是这种情况：音程序列与主题A一致，但 onset 从 -4.0 开始，表示提前了4拍（1小节）。

3. **移调+节奏拉伸**：音程序列一致 + 时值比率不同。

4. **三种复合**：音程序列一致 + 起始偏移 + 时值拉伸同时存在。

### 关键判定规则

- 移调变奏不给模糊结论：如果音程序列匹配，会明确给出移调半音数和移调方向
- 近似移调（80%音程匹配）也会报告，但置信度降低，并列出不匹配位置
- 小节错位和节奏拉伸会给出可操作的修正建议（具体偏移拍数、拉伸比、应调整的音符序号）
- 复合变奏建议按 "错位→拉伸→移调" 顺序分步修正

## 审计留痕

所有人工修正和系统判断变更都会记录：

- 导入片段、提取动机
- 人工补全缺失字段
- 人工设定小节偏移
- 变奏识别从一种类型变更为另一种时，旧批注标记为 superseded，新批注创建并关联旧批注
- 片段证据和批注历史随变奏识别联动更新

审计日志保存在 JSON 文件中，包含完整的 before/after 和操作者信息。
