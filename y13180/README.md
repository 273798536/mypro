# 冷却塔水滴实验复算 - 数据处理链

## 一、先跑哪条命令

打开终端，进到项目目录，执行：

```
python run_pipeline.py
```

跑完后所有结果都会输出到 `data/processed/` 目录，按处理步骤编号，一眼能看到顺序。

---

## 二、再看哪份 CSV 明细

算法值班人不用看功能表，按下面顺序看就行：

| 序号 | CSV 文件 | 看什么 | 什么时候看 |
|------|----------|--------|-----------|
| 1 | `06_status_summary.csv` | **总览**：共多少条、已处理多少、待补证据多少、按原因分类 | 最先看，心里有数 |
| 2 | `06_status_detail.csv` | **每条记录的最终状态**：已处理 / 待补证据_单位异常 / 待补证据_公式失败 / 待补证据_阈值越界 / 待补证据_设备重复 / 待补证据_字段缺失 | 想知道每条卡在哪一步时看 |
| 3 | `04_duplicate_devices.csv` | **设备编号重复的记录**，单独拎出来了，不会揉进正常结果 | 怕重复数据搞乱结果时看 |
| 4 | `02_normalized_units.csv` | **单位归一化结果**，原始单位是什么、换算系数多少、换算后数量级对不对 | 卡单位时看 |
| 5 | `03_calculation_results.csv` | **公式计算结果**，成功/失败一目了然，失败原因写清楚了 | 卡公式时看 |
| 6 | `05_jump_detection.csv` | **结果跳变的记录**，每条跳变都标了是阈值、单位还是正常记录造成的 | 结果突然变了找原因时看 |
| 7 | `01_raw_backup.csv` | **原始数据备份**，所有修改都有痕迹，脏数据不会被修得看不出 | 想回到最初原始数据时看 |

---

## 三、处理链干了啥（从上到下依次跑）

```
原始传感器日志
     │
     ▼
[1] 数据加载 + 原始备份     → 01_raw_backup.csv  （保留原始来源，不破坏脏数据）
     │
     ▼
[2] 单位归一化 + 数量级校验 → 02_normalized_units.csv  （m3/h、L/min、m3/s 等统一成 m³/h）
     │                      单位混写、数量级不对的都标出来
     ▼
[3] 公式计算 + 失败分类     → 03_calculation_results.csv  （卡公式/卡阈值/卡参数都写清楚）
     │
     ▼
[4] 设备编号去重            → 04_duplicate_devices.csv  （重复设备单独拎出，不揉进正常结果）
     │
     ▼
[5] 跳变检测 + 归因         → 05_jump_detection.csv  （突然跳变？是阈值、单位还是正常记录造成的）
     │
     ▼
[6] 处理状态汇总            → 06_status_summary.csv  （已处理 vs 待补证据，一眼看清）
                          → 06_status_detail.csv   （每条记录的最终状态 + 需要补什么证据）
```

---

## 四、算不出的记录去哪了

**不会消失**，全部保留，每条都标了卡在哪：

- 卡 **单位**：`待补证据_单位异常` — 单位识别不了，或换算后数量级存疑
- 卡 **公式**：`待补证据_公式计算失败` — 缺参数 / 除零 / 计算异常
- 卡 **阈值**：`待补证据_阈值越界` — 输入或结果超出正常范围
- 卡 **设备重复**：`待补证据_设备编号重复` — 同一设备出现多次，单独拎出
- 卡 **字段缺失**：`待补证据_字段缺失` — 原始日志里字段就没填

看 `06_status_detail.csv` 的 `failure_reasons` 列，具体为啥卡写得明明白白。

---

## 五、跳变了怎么找原因

看 `05_jump_detection.csv` 的 `jump_cause` 列，会直接写：

- 水流量跳变 + 倍率多少
- 水温跳变 + 倍率多少
- 水滴直径跳变 + 倍率多少
- 有没有阈值/单位异常的记录参与比较
- 如果都不是，就是正常波动

---

## 六、原始数据不会被修得看不出痕迹

- `01_raw_backup.csv` 是原始数据完整备份，字段名都带 `raw_` 前缀
- 所有处理步骤的输出都保留 `record_id`、`source_file`，能追溯到哪来的
- 单位换算会记 `flow_conversion_from` 和 `flow_conversion_factor`，能反向还原

---

## 七、目录结构

```
.
├── run_pipeline.py          ← 运行入口（先跑这个）
├── README.md                ← 你正在看的
├── data/
│   ├── raw/
│   │   └── sensor_logs.csv  ← 原始传感器日志（输入）
│   └── processed/           ← 处理结果（输出，按顺序编号）
│       ├── 01_raw_backup.csv
│       ├── 02_normalized_units.csv
│       ├── 03_calculation_results.csv
│       ├── 04_duplicate_devices.csv
│       ├── 05_jump_detection.csv
│       ├── 06_status_detail.csv
│       └── 06_status_summary.csv
└── src/
    ├── config.py            ← 单位换算表、阈值、公式参数
    ├── loader.py            ← 数据加载
    ├── unit_normalizer.py   ← 单位归一化
    ├── calculator.py        ← 公式计算
    ├── dedup.py             ← 设备去重
    ├── jump_detector.py     ← 跳变检测
    ├── pipeline.py          ← 处理链编排
    └── status_summary.py    ← 状态汇总
```
