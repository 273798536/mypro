# 电机扭矩阈值预警 · 使用说明

只讲三件事：启动、重跑（调档复算）、查看页面摘要。

---

## 一、启动（初次运行）

```bash
cd /path/to/project
python3 run_torque_warning.py \
  --input-dir ./sample_input \
  --output-dir ./output \
  --param-level 1
```

参数：

| 参数 | 说明 |
|---|---|
| `-i / --input-dir` | 输入材料目录，必须含 4 个子目录：<br>`nameplates/`（设备铭牌 JSON）<br>`readings/`（基础扭矩读数 JSON）<br>`attachments/`（晚到附件 JSON）<br>`notes/`（后补说明 JSON） |
| `-o / --output-dir` | 输出目录，运行后会生成 3 个文件：<br>`torque_warning_report.json`（结构化全量数据）<br>`page_summary.html`（给现场老师看的页面摘要）<br>`param_compare.md`（仅调档复算时出现） |
| `-l / --param-level` | 参数档编号，初次就写 1 |
| `-t / --threshold-adjust` | 阈值调节量（±%），默认 0 |
| `--no-confirm` | 关闭人工确认提示，适合脚本批量跑 |

初次启动后，终端会打印 **终端摘要**，重点看：
- 预警等级分布（正常/注意/预警/严重）
- 「保留的极端值」条目 — 老唐要的：不被均值掩盖的尖峰
- 「边界样本」条目 — 距阈值 ±2% 的读数
- 「⚠ 需人工确认事项」— 方向符号写反/漏填等

---

## 二、重跑（调一档再复算）

把参数调一档（例如阈值收紧 +5% 或放宽 -5%），然后重跑：

```bash
# 示例：阈值收紧 +5%，参数档写 2
python3 run_torque_warning.py \
  --input-dir ./sample_input \
  --output-dir ./output \
  --param-level 2 \
  --threshold-adjust +5.0

# 示例：再调一档，阈值放宽 -10%，参数档写 3
python3 run_torque_warning.py \
  --input-dir ./sample_input \
  --output-dir ./output \
  --param-level 3 \
  --threshold-adjust -10.0
```

重跑后会额外生成 `output/param_compare.md`，里面按设备逐条写明：
- 新旧档位的预警等级、阈值、峰值对比
- 边界样本为什么让结果变化（旧/新阈值归属差异）
- 公式、单位原文列出

---

## 三、查看页面摘要

运行完任何一档后，直接用浏览器打开：

```
output/page_summary.html
```

页面摘要按 **三色分区** 排布：

| 分区 | 背景色 | 含义 |
|---|---|---|
| 已处理 | 蓝色 | 材料齐全、自动判定完成 |
| 待补材料 | 琥珀色 | 缺读数或晚到附件明确写了"待补" |
| 人工改判 | 紫色 | 后补说明里有老师签字改阈值的设备 |

每张设备卡片：
- 顶部色带 = 预警等级（绿/黄/橙/红）
- 左侧竖条 = 分区归属（蓝/琥珀/紫）
- 点开「计算依据 · 公式 · 单位」可以看到公式和单位对照
- 「⚠ 保留的极端值」「▤ 边界样本」「⇄ 方向异常」三个块在命中时出现
