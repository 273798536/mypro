# 负采样版本快照工具

> MLOps值班交接用 — 别让离线指标和线上口径对不上藏在失败队列后面

## 🚀 快速开始（小林先看这里）

**第一步：跑一条命令生成快照**

```bash
python neg_sample_snapshot.py \
  --samples data/samples.csv \
  --failed-queue data/failed_queue.jsonl \
  --manual-override data/manual_override.jsonl \
  --supplementary data/supplementary_notes.md \
  --version-tag v2.4_rc1 \
  --output reports/
```

**第二步：看这份Markdown报告**

跑完后打开 `reports/v2.4_rc1_report.md`，里面有：
- 坏行 / 跳过行 / 已处理行 分开统计
- 特征迟到样本清单
- 人工改判记录
- 是否需要人工确认的提示

**第三步：需要人工确认怎么办？**

CLI输出和报告里都会标出来，常见情况：
- 特征迟到 → 找特征组
- 人工改判 → 走review流程
- 坏行多 → 查上游管道

---

## 📁 材料包清单

```
.
├── neg_sample_snapshot.py    # 主工具（CLI）
├── README.md                  # 你正在看的这份
├── data/
│   ├── samples.csv            # 主样本（CSV格式）
│   ├── failed_queue.jsonl     # 失败队列（JSONL）
│   ├── manual_override.jsonl  # 人工改判记录（JSONL）
│   └── supplementary_notes.md # 后补说明（Markdown，用 --- 分隔多条）
└── reports/                   # 生成的快照报告放这里
```

---

## 🔧 工具参数说明

| 参数 | 必填 | 说明 |
|------|------|------|
| `--samples` | ✅ | 负采样样本CSV文件路径 |
| `--failed-queue` | ❌ | 失败队列JSONL文件 |
| `--manual-override` | ❌ | 人工改判JSONL文件 |
| `--supplementary` | ❌ | 后补说明Markdown文件 |
| `--output` | ❌ | 报告输出目录，默认 `reports/` |
| `--version-tag` | ❌ | 版本标签，默认自动生成时间戳 |
| `--required-features` | ❌ | 必填特征列表（逗号分隔），用于特征迟到检测。默认 `user_profile,item_embedding,ctr_7d` |
| `--no-report` | ❌ | 只看CLI输出，不生成报告文件 |
| `--quiet` | ❌ | 静默模式，只输出一行统计数字 |

---

## 📊 统计口径说明

**三类行分开算，线上线下对齐：**

| 类别 | 定义 | 是否计入统计分母 |
|------|------|------------------|
| 总读取行数 | 原始文件所有行 | - |
| 已处理行 | 格式正确、特征完整的行 | ✅ 线上线下都用这个 |
| 坏行 | sample_id空、label非法、JSON解析失败等 | ❌ 直接丢弃 |
| 跳过行 | 特征为空、格式可识别但不参与统计 | ❌ 跳过但保留明细 |

> 💡 核心原则：线上指标以「已处理行」为分母。做版本对比时，两个快照都用已处理行的数字比，别用总读取行数比。

---

## 🧪 示例数据说明

示例数据里故意放了这些场景，交接时能对照着讲：

| 场景 | 样本ID | 说明 |
|------|--------|------|
| 正常负样本 | s_0001, s_0003 等 | 格式完整 |
| 正常正样本 | s_0002, s_0004 等 | 格式完整 |
| label非法（坏行） | s_0006, s_0013 | label=2 或 label=bad_label_here |
| sample_id空（坏行） | 第7行 | 没sample_id |
| features空（跳过行） | s_0008 | features字段全空 |
| ctr_7d空（特征迟到） | s_0012 | 部分必填特征缺失 |
| 人工改判 | s_0005 | 旧模型误判，从负改正 |
| 失败队列 | s_fq_101 ~ 103 | 特征服务超时回退的 |

---

## 📝 交接Checklist

- [ ] 跑一遍命令，CLI输出的坏行/跳过行/已处理行数字对得上
- [ ] 打开报告，确认报告里的数字和CLI一致
- [ ] 检查是否有「需要人工确认」的提示
- [ ] 失败队列样本数是否在合理范围
- [ ] 人工改判理由是否充分
- [ ] 把报告链接发群里，标注版本号

---

## ❓ 常见问题

**Q: 报告里的数字和CLI输出对不上怎么办？**
A: 不会，都是同一份stats对象生成的。如果觉得对不上，先看看是不是用了不同的参数跑了两次。

**Q: 失败队列的样本会影响负采样比例吗？**
A: 会。失败队列样本会追加到已处理行里，一起算正负比例。如果失败队列里正样本多，比例会偏高。

**Q: 怎么只看数字不生成报告？**
A: 加 `--no-report` 参数。
