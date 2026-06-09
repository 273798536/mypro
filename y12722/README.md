# 几何相似判定工具 使用说明

本工具用于批量判定两个三角形是否几何相似，支持 SSS / SAS / AA 三种判定方法，可反查每条记录的来源、处理过程和复核意见。

---

## 一、启动准备

### 1. 安装依赖

在项目根目录执行：

```bash
pip install -r requirements.txt
```

### 2. 生成示例数据（可选）

如需体验，可一键生成包含 10 条不同场景的示例 CSV：

```bash
python -m geo_similarity.cli demo
```

生成的文件位于 `data/demo_input.csv`。

---

## 二、导入数据并批量判定

### CSV 输入格式

CSV 必须包含以下 6 列（三角形的三边长）：

| 列名 | 含义 |
|---|---|
| t1_a, t1_b, t1_c | 三角形①的三条边长 |
| t2_a, t2_b, t2_c | 三角形②的三条边长 |

可选列：

| 列名 | 含义 |
|---|---|
| t1_angle_A/B/C, t2_angle_A/B/C | 三角形的内角度数（单位：度） |
| t1_label, t2_label | 三角形标签/题目编号 |
| unit | 边长单位（仅展示，不做换算） |
| method | 单条记录指定判定方法：AUTO / SSS / SAS / AA |

### 执行判定

```bash
python -m geo_similarity.cli run -i <你的CSV文件路径>
```

常用参数：

- `-t, --tolerance`：比例容差（默认 1e-4），即三组边比值的相对偏差小于该值视为成比例
- `-a, --angle-tolerance`：角度容差（默认 0.01 度）
- `-m, --method`：强制整批使用某种判定方法（AUTO/SSS/SAS/AA）

示例：

```bash
python -m geo_similarity.cli run -i data/demo_input.csv
python -m geo_similarity.cli run -i data/demo_input.csv -m SSS -t 0.001
```

处理完成后会输出：
- 批次号（如 `abc123def4`）
- 批次概览（总数、相似数、不相似数、失败数、警告数）
- 异常记录截图路径
- CSV 结果与 HTML 报告路径

---

## 三、查看异常记录

处理完一个批次后，查看哪些记录需要复核：

```bash
python -m geo_similarity.cli abnormal --batch <批次号>
```

会列出每条异常的：
- 记录 ID、来源 CSV 行号
- 判定方法、结果、误差幅度
- 失败原因、警告
- 复核状态
- 关联的图表截图路径

---

## 四、复核单条记录

对异常记录写入处理意见，或人工修正判定结果：

```bash
python -m geo_similarity.cli review --batch <批次号> --record <记录ID> --note "复核意见"
```

如需人工推翻原判定：

```bash
python -m geo_similarity.cli review --batch <批次号> --record <记录ID> --note "人工确认相似" --override yes
```

参数：
- `--override yes`：人工修正为"相似"
- `--override no`：人工修正为"不相似"

复核完成后会自动重新导出 CSV 和 HTML 报告。

---

## 五、反查追踪（验收倒查）

从一条异常记录一路回溯到来源和处理细节：

```bash
python -m geo_similarity.cli trace --batch <批次号> --record <记录ID>
```

输出包含：
- 批次号、记录 ID、处理时间
- 来源文件、CSV 原始行号
- 判定方法、结果、误差幅度
- 失败原因、警告
- **公式说明**、**适用范围**、**计算详情**
- 复核状态、复核意见
- 图表截图路径

如需 JSON 格式（便于程序对接），加 `--json` 参数。

---

## 六、导出结果

每个批次处理后会自动导出，也可随时手动重新导出（复核后建议执行）：

```bash
python -m geo_similarity.cli export --batch <批次号>
```

加上 `--with-screenshots` 可重新生成所有截图：

```bash
python -m geo_similarity.cli export --batch <批次号> --with-screenshots
```

导出产物：
- `output/batch_<批次号>_results.csv`：表格结果
- `output/batch_<批次号>_report.html`：完整 HTML 报告（含公式、适用范围、截图链接、反查入口）
- `output/screenshots/batch_<批次号>_record_<记录ID>.png`：三角形对比图

---

## 七、查看所有批次

```bash
python -m geo_similarity.cli list
```

---

## 文件目录说明

```
项目根目录/
├── data/
│   ├── demo_input.csv              # 示例输入
│   └── batch_<批次号>.json         # 每个批次的完整处理记录（界面和报告共用同一份）
├── output/
│   ├── batch_<批次号>_results.csv  # 判定结果表格
│   ├── batch_<批次号>_report.html  # 完整报告
│   └── screenshots/                # 三角形对比图截图
└── geo_similarity/                 # 源代码
```

处理记录统一保存在 `data/batch_<批次号>.json`，所有导出、复核、反查都读取同一份，保证界面、报告、复核三方数据一致。
