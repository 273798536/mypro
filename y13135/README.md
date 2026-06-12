# 马尔可夫链错题复盘

给建模助教小岑用的错题复盘工具。跑一条命令，同时产出：
- **终端摘要**（只给数字和关键线索，不混报告内容）
- **Markdown 报告**（给复核人看的正式报告，分已处理 / 待补材料 / 人工改判三区）

## 先跑哪条命令

在项目根目录执行：

```bash
python -m mc_review --input sample_input --output output
```

参数说明：
- `--input` / `-i`：输入材料目录（里面放 CSV 题目清单、可选的 `screenshots/` 和 `history/`）
- `--output` / `-o`：输出目录（会生成 `review_report.md`）
- `--quiet`：只写报告、不打印终端摘要

## 再看哪份 Markdown 报告

命令跑完后，打开：

```
output/review_report.md
```

阅读顺序：
1. **总览与跳变溯源** —— 先看有没有阈值、单位或后补备注造成的分数跳变
2. **排序不稳定明细** —— 对照原始 CSV 行号定位哪些题顺序被打乱了
3. **已处理** → **待补材料** → **人工改判** 三个分区 —— 按题目卡片逐个复核，每道题都带完整「历史时间线」（含后补备注和旧版本，不只显示最终值）
4. **附录 JSON** —— 需要做二次加工时直接用

## 输入材料包里放什么

```
sample_input/
├── questions.csv          ← 主题目清单（CSV，UTF-8）
├── screenshots/           ← 题目截图，文件名里包含 qid 会自动关联
│   ├── M1_v1.png
│   └── ...
└── history/               ← 历史版本 CSV，会合并进每题的历史时间线
    └── questions_v1.csv
```

### 主 CSV 必需字段（中文名也可）

| 字段（英文） | 字段（中文） | 说明 |
|---|---|---|
| `qid` | 题目编号 | 唯一题号，如 M1、M2 |
| `title` | 题目 | 题目标题 |
| `score` | 得分 | 实得分 |
| `max_score` | 满分 | 该题满分 |
| `threshold` | 阈值 | 判分阈值（可选） |
| `unit` | 单位 | 如得分率、分、准确率（可选） |
| `status` | 状态 | 已处理 / 待补材料 / 人工改判（或英文 processed/pending/manual） |
| `history_note` | 历史备注 | 一行一条，推荐格式 `[2025-12-01T10:00:00] 助教A: 备注内容` |
| `manual_review_note` | 人工备注 | 人工改判说明 |

### 历史备注行格式（推荐但不强制）

```
[2025-12-01T10:00:00] 助教A: 后补备注：发现同学混淆稳态分布
```

- 规范行会解析出时间、作者、内容
- 不规范的行会保留为匿名系统记录，不会丢失

## 代码结构

```
mc_review/
├── __init__.py
├── __main__.py       ← CLI 入口（python -m mc_review）
├── models.py         ← 数据模型
├── parser.py         ← CSV 解析 + 历史合并 + 排序追踪 + 跳变检测
├── summary.py        ← 终端摘要渲染
└── report.py         ← Markdown 报告渲染
```

## 快速验证

```bash
python -m mc_review -i sample_input -o output
```

终端会输出摘要统计，`output/review_report.md` 会生成完整报告。
