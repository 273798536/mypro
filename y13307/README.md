# 病历问答人工改判 CLI

用于病历问答模型的人工改判工作台。解决以下几个具体痛点：

1. **输出不再只给总数**：总数 / 坏行 / 跳过行 / 已处理行**分开统计**，每条都标清楚是哪几条。
2. **引用缺失不着急算完**：发现版本说明引用了不存在的样本，先**给出待确认原因和影响范围**，不输出最终判定。
3. **混入晚到附件**：版本说明里若带 `is_late` 附件，也作为待确认事项单独列出。
4. **前后两版对比**：样本判定、阈值、指标、人工修正次数**分得清**。
5. **人工修正留痕**：周姐临时改过的判断**留在历史轨迹**，下一班可以看到**完整修正历史，不是只有最终结果。
6. **小数据试跑包**：`data/` 下内置三四条贴近现场的样本，算法值班可以照着走完：**顺利记录 / 补录记录 / 异常记录**。

## 快速开始

```bash
pip install click pydantic
# 或
pip install -r requirements.txt
```

## 目录结构

```
├── cli.py            # CLI 入口（所有命令都在这里）
├── models.py          # 数据模型
├── engine.py          # 分类 / 修正 / 补录 / 指标计算
├── version_parser.py # 版本说明解析 + 引用缺失 / 晚到附件检测
├── history.py        # 历史记录 / 版本对比 / 修正轨迹
├── utils.py           # IO / 格式化工具
├── selftest.py        # 自测脚本（一键走完所有场景）
└── data/
│   ├── samples_v1.json           # v1 样本（5条）
│   ├── samples_v2.json           # v2 样本（6条，含空字段、跳过、新增）
│   ├── version_note_v1.json       # v1 版本说明（干净）
│   ├── version_note_v2.json       # v2 版本说明（含引用缺失 + 晚到附件）
│   └── history.json                # 运行后自动生成
```

## 常用命令

### 1. 跑一次改判

```bash
python3 cli.py run \
  --samples data/samples_v1.json \
  --version-note data/version_note_v1.json \
  --operator 周姐
```

输出分块：**版本说明信息 → 待确认事项 → 处理统计（已处理/坏行/跳过行，分别列出样本ID） → 指标汇总。

如果版本说明里存在 **引用缺失** 或 **晚到附件**，会打印 `待确认事项` 并提示"暂停最终判定输出"。

### 2. 人工修正（周姐改判）

```bash
python3 cli.py correct \
  --version v2024.05.14 \
  --sample-id QA-2024-0514-006 \
  --new-status 正确 \
  --reason "部分指南推荐CT平扫为排除出血首选" \
  --operator 周姐
```

每次 `correct` 不会覆盖历史，而是**追加一条修正记录到 `corrections`，下一班 `trail` 能完整看到谁什么时候把什么从什么改为什么。

### 3. 补录坏行

```bash
python3 cli.py supplement \
  --version v2024.05.14 \
  --sample-id QA-2024-0512-003 \
  --question "上消化道出血最常见的病因是？" \
  --answer "消化性溃疡" \
  --reference "消化性溃疡（PU）" \
  --operator 周姐
```

补录后自动重新分类，如果仍缺字段会保留坏行并提示原因。

### 4. 查看人工修正轨迹（下一班查岗用）

```bash
python3 cli.py trail                # 全部版本
python3 cli.py trail --version v2024.05.14   # 只看某版
```

每条都会列出：样本ID / 第几次修正 / 操作人 / 原状态 / 新状态 / 原因 / 时间。

### 5. 两版对比

```bash
python3 cli.py diff --a v2024.05.12 --b v2024.05.14
```

对比四块：

- 🔁 **样本变化**：每条样本的判定 / 预测 / 行状态 / 修正次数的前后值
- 🎚 **阈值变化**：版本说明里的 `threshold_adjustment` 新旧值
- 📈 **指标变化**：有效样本数 / 正确数 / 错误数 / 待确认 / 正确率
- 📝 **人工修正对比**：两版各自的修正次数及新增条数

### 6. 查看历史版本列表

```bash
python3 cli.py history
```

## 一键自测

```bash
python3 selftest.py
```

这个脚本会按顺序执行：跑 v1 → 跑 v2（触发引用缺失 + 晚到附件） → 人工修正 → 补录坏行 → 打印完整修正轨迹 → 两版对比。

## 测试数据设计说明（贴近现场，不过分干净）

- `samples_v1.json`（5 条）：
  - QA-2024-0512-001：周姐已从"错误"人工改为"正确"（有修正历史）
  - QA-2024-0512-002：正常判错
  - QA-2024-0512-003：问题字段丢失（异常记录用）
  - QA-2024-0512-004：正常判对
  - QA-2024-0512-005：周姐临时改"待确认"（等专家附件）

- `samples_v2.json`（6 条）：
  - 上面 5 条延续，其中 002、005 被模型修正，周姐又做了二次复核
  - 003 故意留了"跳过"标记（notes 含"跳过"
  - 新增 QA-2024-0514-006：脑梗死新题

- `version_note_v2.json`：
  - 故意引用了 **不存在的 `QA-2024-0514-007` 和 `QA-2024-0514-008`（触发引用缺失）
  - 带一份 **晚到附件** `高血压危象用药专家共识_20240513.pdf（is_late=true）
  - 阈值相比 v1 下调了 0.02（触发阈值对比）

## 数据格式约定

### samples.json（样本）

```json
[
  {
    "sample_id": "QA-xxxx",
    "question": "问题文本",
    "answer": "模型输出答案",
    "reference_answer": "参考答案（可选）",
    "predicted_status": "正确|错误|待确认|跳过",
    "final_status": "正确|错误|待确认|跳过",
    "corrections": [
      {
        "operator": "周姐",
        "old_status": "错误",
        "new_status": "正确",
        "reason": "改判原因",
        "timestamp": "2024-05-12T10:30:00"
      }
    ],
    "notes": "其他备注"
  }
]
```

### version_note.json（版本说明）

```json
{
  "version": "v2024.05.14",
  "release_time": "2024-05-14T09:00:00",
  "operator": "算法值班-小王",
  "description": "本次迭代做了xxx",
  "referenced_sample_ids": ["QA-xxxx", ...],
  "attachments": [
    {
      "name": "附件名称",
      "content": "附件内容或链接",
      "is_late": true,
      "arrive_time": "2024-05-14T16:30:00"
    }
  ],
  "threshold_adjustment": {
    "关键词匹配阈值": 0.76
  }
}
```
