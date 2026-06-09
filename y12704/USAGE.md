# 凸包面积试算 CLI 使用说明

本工具用于导入坐标点、计算凸包面积、识别异常并导出报告。以下按日常操作顺序说明。

---

## 一、启动

环境要求：Python 3.8+。

```bash
# 可选：安装依赖（用于生成图表；不装也能跑，图表会降级为文本）
pip install -r requirements.txt

# 查看命令帮助
python convex_hull_cli.py --help
python convex_hull_cli.py run --help
```

工具运行后会在当前目录生成两个文件夹：
- `history/`：每次计算的版本快照（不会覆盖旧结果）
- `output/`：图表、导出报告、明细 CSV

---

## 二、导入数据并计算

### 2.1 输入文件格式（CSV）

列名（UTF-8 编码，支持带 BOM）：

| 列名      | 必须 | 说明                                    |
|-----------|------|-----------------------------------------|
| x         | 是   | 横坐标（数值）                          |
| y         | 是   | 纵坐标（数值）                          |
| unit      | 建议 | 单位，如 米 / 厘米 / 像素               |
| record_id | 建议 | 记录编号，缺失时自动生成 `ROW_行号`     |
| source    | 否   | 来源备注                                |

示例：`sample_data.csv`

### 2.2 参数表（可选，JSON）

```json
{
  "version": "v1.2",
  "timestamp": "2026-06-01T10:00:00"
}
```

### 2.3 执行计算

```bash
# 基础
python convex_hull_cli.py run --input sample_data.csv

# 带参数表 + 指定预期参数版本（版本不符会提示受影响结论，不覆盖旧结果）
python convex_hull_cli.py run \
  --input sample_data.csv \
  --params sample_params.json \
  --expected-param v1.2 \
  --notes "出题会前最后一次试算" \
  --reason "补录 P005 数据"
```

运行后会输出：结果 ID、版本号、面积、异常明细、图表路径。
每次 `run` 会在 `history/` 新增一个版本快照，旧版本自动保留。

---

## 三、查看异常

异常不汇总成单一红色数字，而是按「下一步怎么做」分组：

- **补材料**：缺单位、缺点数等
- **改口径**：约束冲突
- **核对数据**：坐标填成非数值
- **等参数表**：参数表版本滞后

```bash
# 看最新一次
python convex_hull_cli.py anomalies --latest

# 按版本号
python convex_hull_cli.py anomalies --version v001

# 按结果 ID
python convex_hull_cli.py anomalies --result-id abc12345
```

每条异常会显示：是否阻断、影响的记录/字段、以及下一步建议。
**阻断类异常**（如单位缺失）会让本次结果标记为「无效」，导出报告里也会明确标注被拦截的原因。

---

## 四、查看看板与历史对比

```bash
# 文本看板（同一批数据同时给图表/明细/导出使用，页面里会校验数据一致性）
python convex_hull_cli.py dashboard --latest

# 所有历史版本
python convex_hull_cli.py history --list

# 两个版本对比（会列出受影响的结论：面积、单位、参数版本、输入点集等）
python convex_hull_cli.py history --compare v001 v002

# 某个版本详情
python convex_hull_cli.py history --show v001
```

参数表晚到的情况：用 `--expected-param` 指定目标版本后，若当前参数表滞后，会：
1. 标记「参数表版本滞后」为提示类异常
2. 明确列出可能受影响的结论（面积换算、单位校准）
3. 旧版本结果保留在 `history/`，不会被悄悄覆盖

---

## 五、导出结果

```bash
# 文本报告（运营同事只看这份也能读懂单位缺失为什么被拦截）
python convex_hull_cli.py export --latest --format txt

# JSON（用于二次开发）
python convex_hull_cli.py export --latest --format json

# CSV（点表 + 异常表两份）
python convex_hull_cli.py export --latest --format csv
```

文本报告末尾包含：
- 被拦截原因（阻断类异常列表）
- 每条异常的下一步行动（补材料 / 改口径 / 核对数据 / 等参数表）
- 数学老师复核时可直接根据 `anomalies_by_action` 判断整改方向

---

## 六、图表

```bash
# 生成或重生成图表（截图补录后，公式计算沿用同一批数据，不会出现图表和数字对不上）
python convex_hull_cli.py chart --latest
```

图表、看板、导出报告均来自同一份 `UnifiedDataset`，确保数字一致。
