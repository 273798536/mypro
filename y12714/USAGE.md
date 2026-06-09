# 统计显著性复核 - 使用说明

## 一、启动

无需安装，在项目根目录执行：

```bash
python -m src.main --help
```

查看所有可用子命令。

---

## 二、导入（准备输入数据）

把待复核的材料放到一个输入目录（例如 `./sample/input`），包含两个文件：

### 1. 题目清单 `questions.json`

```json
[
  {
    "question_id": "Q001",
    "content": "计算 3.14159 的平方，保留四位小数。",
    "correct_answer": 9.8696,
    "tolerance": 0.0001
  }
]
```

字段说明：
- `question_id`：题目唯一编号
- `correct_answer`：标准答案（数值）。**缺失时该题所有记录进入"待确认"**
- `tolerance`：绝对容差

### 2. 答题记录 `answers.json`

```json
[
  {
    "record_id": "A001",
    "question_id": "Q001",
    "student_answer": 9.8696,
    "submitted_at": "2026-06-01T10:00:00",
    "batch_id": "BATCH-2026-06",
    "is_late": false
  }
]
```

字段说明：
- `record_id`：答题记录唯一编号
- `student_answer`：学生作答（数值）。为空/null 视为"空集合输入"
- `batch_id`：批次号，便于分组导出
- `is_late`：标记为历史晚到答案（见下文"晚到答案处理"）

### 3. 题目补录

后续可直接在 `questions.json` 中追加题目，或在 `questions/` 子目录下追加独立 JSON 文件。**重跑时已存在结果会自动增量更新，不会越跑越乱**。

---

## 三、执行复核

```bash
python -m src.main run \
  --input ./sample/input \
  --output ./sample/output
```

常用参数：
- `--approx-threshold 0.05`：近似误差相对阈值（默认 5%）
- `--no-export`：只跑复核不导出报告
- `--format csv|md|txt|all`：指定导出格式

**重复执行同一批材料是安全的**：系统会保留已有复核记录，只对新数据或已更新数据做增量覆盖，并在 `state.json` 中记录每次运行。

---

## 四、查看异常

复核完成后，随时查看待处理的记录：

```bash
python -m src.main list-anomalies --output ./sample/output
```

会列出三类需要人工关注的记录：
- **未通过（rejected）**：近似误差过大或数据非法，已拦截
- **待确认（pending）**：空集合输入（缺少标准答案或学生作答为空）
- **受影响（affected）**：有历史答案晚到，原结论可能已变

---

## 五、导出结果

复核完成时会自动导出，也可单独执行：

```bash
python -m src.main export --output ./sample/output --format all
```

输出位置：`{output}/reports/`

| 文件 | 用途 | 适合读者 |
|------|------|----------|
| `review_report.csv` | 完整复核表，含每条记录的误差、阈值、拦截原因 | 投委会、排课老师 |
| `counterexamples.md` | 异常记录的反例对比详情 | 排课老师深入分析 |
| `summary.txt` | 简明摘要 + 受晚到影响清单 | 快速浏览 |

### 关于"近似误差过大"在报告中的呈现

CSV 报告的"拦截/待处理原因"列会明确写出：
- 误差幅度百分比与阈值对比
- 绝对误差与容差对比
- 关联反例数量

投委会即便只看 CSV，也能一眼看出某条记录为什么被拦。

---

## 六、历史答案晚到处理

当一条答题记录在首次复核之后才到达时：

1. 在 `answers.json` 中把该条记录的 `is_late` 设为 `true`
2. 重新执行 `run` 命令

系统行为：
- **不会静默覆盖原结论**；原复核状态会保存在 `previous_status` 字段
- 该记录的新状态被标记为 `affected`（受影响），并记录关联的晚到答案 ID
- `list-anomalies` 和导出报告中都会醒目标注此记录需人工重新确认
