# 激光散斑报告导出

把传感器日志里单位混写、数量级对不上的记录捋顺，保留历史备注和旧截图。

---

## 一、放样例

```bash
python speckle_report.py --example
```

会在当前目录下生成 `sample_input/`，里面有：
- `sensor_log_20260610.csv`  —— 含单位混写（uW/mW/W 混用）、重复设备、补记备注、多版本截图
- `shots/` —— 截图占位文件

## 二、跑一次 / 重跑

```bash
python speckle_report.py -i sample_input -o sample_output
```

- `-i` / `--input` ：材料入口（放 CSV 的目录）
- `-o` / `--output`：报告输出目录（已存在就覆盖，重跑直接再执行一次）
- 遇到设备编号重复：会暂停出最终值，先给「待确认原因」和「影响范围」
- 确认后强制出报告加 `--force`（按最新时间戳取终值）

## 三、查看截图说明

终端摘要只放数值，截图说明单独存：

```bash
python speckle_report.py --show-captions sample_output
```

或直接打开 `sample_output/screenshot_captions.md`。

---

**对照两组参数？** 看 `sample_output/calc_trace.txt`，单位换算、散斑衬比步骤全展开。

**历史备注 / 旧截图？** 进 `sample_output/history_versions/` 看，不会被「最终值」覆盖。
