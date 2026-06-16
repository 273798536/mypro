# 公园噪声方案比选

## 三步操作

```bash
# 1. 导入点位CSV（第一次）
python3 cli.py import samples/batch1.csv --source batch1

# 2. 补材料时加 --replace（取代旧版但保留可追溯）
python3 cli.py import samples/batch2.csv --source batch2 --replace

# 3. 出报告
python3 cli.py compare --show-changelog
```

输出都在 `output/` 目录。

---

## 坏材料来了该看哪里

| 碰到的问题 | 看哪里 | 怎么看 |
|---|---|---|
| 旧版意见为什么被新表盖掉 | `output/version_history.txt` | 每个点位全版本链，标注"已被取代"的仍保留，来源行带时间戳 |
| 异常点要追明细 | `output/anomaly_trace.txt` | 按异常类型分组，每条带 ↳ 来源文件:行号 |
| 后补材料无声覆盖早先判断 | `output/version_history.txt` + `data/points.json` | 旧版数据 `status="已被取代"`，`superseded_by` 指向新版，永不删除 |
| 容量超限没看到 | `output/source_trace.csv` | 筛"异常标记"列，"容量超限XdB"自动标，影响范围和来源行都在 |
| 合并反馈看不出原始说法 | `output/source_trace.csv` | 最后两列"反馈原始说法"和"反馈合并后说法"分开存 |
| 哪些已处理 / 还要补证据 | `python3 cli.py status` 或报告首屏 | 状态柱状图 + 待办清单 □ 打勾项 |

---

## 常用命令

```bash
python3 cli.py status              # 状态概览 + 待补证据清单
python3 cli.py trace 东门入口        # 单个点位溯源（所有版本）
python3 cli.py bad                 # 坏材料排查指南 + 当前异常
```

## 数据在哪

- `data/points.json` — 所有点位（含历史版本）
- `data/schemes.json` — 方案配置
- `data/feedbacks.json` — 社区反馈（原始+合并）
- `output/*.txt / *.csv` — 报告输出
