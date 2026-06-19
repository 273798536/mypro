# 排班推荐灰度对比工具

可追溯、易交接的灰度对比小工具。结论变化、标签冲突、晚到附件、人工修改——样样有来路。

---

## 两三步操作

### 1. 准备输入目录

```
input/
├── samples/          # 样本表（CSV 或 JSON，含原始标签和原始说法）
│   └── sample_table.csv
├── old/              # 旧模型结果（CSV 或 JSON）
│   └── results.json
├── new/              # 新模型结果（CSV 或 JSON）
│   └── results.json
└── late_attachments/ # 晚到附件（txt / md / json，文件名前缀匹配 sample_id）
    └── S003_late_note.txt
```

### 2. 跑对比

```bash
python -m gray_compare compare -i input/ -o output/
```

终端会打印**简洁摘要**。完整细节在输出目录里。

### 3. 看结果

- `output/terminal_summary.txt` — 终端同款摘要，复制即用
- `output/screenshot_report.md` — **截图说明完整版**，可直接贴飞书
- `output/detail.json` — 机器可读，二次分析用
- `output/history.json` — 人工修改历史，交接班不丢信息

---

## 坏材料来了该看哪里

> 阈值改了？旧结论说不清？按这个顺序查。

| 问题 | 看哪里 | 找什么 |
|------|--------|--------|
| 为什么这个样本改判了？ | `screenshot_report.md` → 「二、结论变化明细」 | 每个变了的样本都列了旧结论/新结论/理由/标签/样本表原始说法/晚到附件/历史修改，整条链路串起来 |
| 晚到附件有没有影响结论？ | 同上面，找「晚到附件 → 结论链路」小节 | 附件内容、到达时间、来源文件都列着，和最终结论对照着看 |
| 标签冲突到底谁说了算？ | `screenshot_report.md` → 「三、标签冲突汇总」 | 样本表原始标签 vs 模型标签，附带**来源表名+行号+原始说法**，直接翻样本表对质 |
| 阿宁临时改过的判断呢？ | `screenshot_report.md` → 「四、全部历史记录」 | 谁改的、改了什么字段、原值新值、原因，全留着，下一班不会只看到最终结果 |
| 我想放回一条旧误判样本验证 | 把样本塞回 `samples/`，新旧结果各放对应目录，重新跑 | 看「结论变化明细」里的完整链路，就能知道新模型为什么改判 |

---

## 其他命令

**加一条人工修改记录**（比如阿宁临时改了结论）：

```bash
python -m gray_compare add-history -o output/ \
  --sample-id S003 \
  --field conclusion \
  --old-value 拒绝 \
  --new-value 通过 \
  --operator 阿宁 \
  --reason "晚到附件补了打卡记录，人工复核通过"
```

**查历史记录**：

```bash
python -m gray_compare view-history -o output/
python -m gray_compare view-history -o output/ --sample-id S003
```

---

## 文件格式说明

### 样本表（CSV）必需字段

| 字段 | 说明 |
|------|------|
| `sample_id` 或 `id` | 样本唯一ID |
| `label` 或 `原始标签` | 样本表上的原始标签（用于标签冲突比对） |
| `text` 或 `原始文本` 或 `原始说法` | 原始描述（标签冲突时溯源用） |

### 模型结果（JSON）必需字段

```json
{
  "sample_id": "S001",
  "conclusion": "通过",
  "confidence": 0.95,
  "reason": "理由文本",
  "tags": ["通过", "正常"]
}
```

也支持 CSV 格式，列名对应即可。

### 晚到附件

- txt/md 文件：文件名前缀为 sample_id（如 `S003_xxx.txt` 会匹配到 S003）
- json 文件：数组格式，每项含 `sample_id` 和 `content`

---

## 项目结构

```
gray_compare/
├── __init__.py
├── __main__.py      # python -m 入口
├── cli.py           # 命令行解析
├── models.py        # 数据结构定义
├── loader.py        # 输入目录读取
├── comparator.py    # 核心对比逻辑
├── reporter.py      # 报告生成（终端摘要 + 截图报告）
└── history.py       # 历史记录管理
```
