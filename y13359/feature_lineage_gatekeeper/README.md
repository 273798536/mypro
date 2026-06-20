# 特征血缘上线守门操作手册

> 评测工程师：小唐
> 复核目标：特征血缘上线前，离线指标与线上口径对齐、失败队列原因明确、重复 run_id 影响可控

---

## 第一步：先跑版本对比

```bash
cd feature_lineage_gatekeeper
python3 diff_versions.py --v1 data/v1 --v2 data/v2
```

看什么：
- `output/diff_report.md` —— 前一版 vs 当前版，**样本变化 / 阈值变化 / 人工修正 / 指标变化** 四个维度分栏
- 若指标变化 > 阈值，会在报告里标红

## 第二步：再跑守门检查

```bash
python3 gatekeeper.py --failed-queue data/failed_queue.csv --normal data/normal_record.json --notes data/supplementary_notes.md
```

看什么：
- `output/gatekeeper_report.md` —— 公式、单位、边界值、失败队列逐条原因
- `output/pending_run_ids.json` —— **run_id 重复时，这里列出待确认原因和影响范围，不直接给最终数字**
- `output/failed_raw_lines.json` —— 失败队列里的**原始行号和具体对象**，方便翻源数据

## 第三步：翻失败队列时的顺序

1. 先看 `output/pending_run_ids.json`，把重复 run_id 确认清楚再往下走
2. 再看 `output/gatekeeper_report.md` 里的「失败队列明细」，每条带原始行号
3. 后补说明在 `data/supplementary_notes.md`，和失败队列一起对照着看

## 目录说明

```
feature_lineage_gatekeeper/
├── README.md                 ← 你现在看的这个
├── gatekeeper.py             ← 第二步跑的脚本
├── diff_versions.py          ← 第一步跑的脚本
├── data/
│   ├── v1/                   ← 前一版样本、阈值、人工修正、指标
│   ├── v2/                   ← 当前版同上
│   ├── failed_queue.csv      ← 失败队列（含重复 run_id 用例）
│   ├── normal_record.json    ← 一条正常通过的记录
│   └── supplementary_notes.md← 后补说明
└── output/                   ← 跑完后的结果都在这
```
