# 冷却塔水滴报告导出工具

> 全链路可追溯的冷却塔水滴异常报告系统
>
> —— 实验老师小林再也不怕"铭牌翻出旧说法，报警备注对不上"了

---

## 快速开始

### 第零步：先跑 demo 看看效果

```bash
python -m cooling_tower_report.cli demo
```

这会生成一套演示数据：水滴记录、铭牌版本、两份报告，还会自动做一次跳变分析。
跑完你就知道这套工具大概是干什么的了。

### 第一步：生成报告

```bash
python -m cooling_tower_report.cli generate --operator 小林
```

会输出：
- 报告ID（比如 `report_20240614_153000`）
- 异常数量
- 铭牌版本
- 生成的CSV文件路径

### 第二步：看异常明细

生成报告后，CSV会自动导出到 `output/csv/` 目录下：

| 文件 | 给谁看 | 内容 |
|------|--------|------|
| `{报告ID}_anomalies.csv` | 快速排查 | 异常清单，有哪些点超了 |
| `{报告ID}_detail.csv` | 追根溯源 | 每条异常带完整追溯链：触发了哪个阈值、来自哪版铭牌、有哪些备注影响了判断 |
| `{报告ID}_summary.csv` | 给领导 | 统计摘要，一页纸看全貌 |

排班同事从图表上点一个异常点，搜 `_detail.csv` 里的 `record_id`，
就能一路追回到原始数据、铭牌说法、甚至备注是谁加的、影响了什么。

---

## 常用命令

### 查看报告列表

```bash
python -m cooling_tower_report.cli list
```

### 对比两份报告为什么不一样（跳变分析）

```bash
python -m cooling_tower_report.cli jump 旧报告ID 新报告ID
```

会告诉你结果跳变是因为：
- 🔧 **阈值改了** —— 哪几个阈值变了，变了多少
- 📐 **单位变了** —— 比如从 L/min 改成了 m³/h
- 📝 **加了新备注** —— 谁加的，影响了哪些判断
- ↩️ **撤回了备注** —— 之前的说法不算数了，原因是什么
- 📊 **数据本身变了** —— 原始数据文件不一样

### 一键校验报告一致性

```bash
python -m cooling_tower_report.cli check [报告ID]
```

不传报告ID就校验最新的一份。检查三件事：
1. 报告里的铭牌版本，和铭牌库里的同版本对不对得上
2. 报告用的原始数据，和当前数据文件对不对得上
3. CSV明细和报告JSON对不对得上

早上来跑一遍，放心。

### 管理铭牌备注

```bash
# 查看当前所有备注和版本历史
python -m cooling_tower_report.cli note list

# 追加一条备注（必须写清楚"影响了哪些判断"）
python -m cooling_tower_report.cli note add \
  --operator 小林 \
  --content "二号塔填料检修，高温阈值临时调至32度" \
  --impact "温度高于32℃即算高温异常，原35℃阈值暂时失效"

# 撤回一条备注（错了的说法不能删，要标撤回）
python -m cooling_tower_report.cli note retract \
  --operator 小林 \
  --note-id note_2_1 \
  --reason "检修完成，恢复原阈值"
```

> **重要：** 追加备注的时候，`--impact` 一定要写清楚"这条备注改变了哪些判断"。
> 不写的话，下午换班的同事看报告会懵：这报警到底是按新说法还是旧说法算的？

### 管理安全阈值

```bash
# 查看当前阈值
python -m cooling_tower_report.cli threshold show

# 修改阈值（必须说明原因和操作人）
python -m cooling_tower_report.cli threshold set \
  --operator 小林 \
  --reason "夏季高温预警" \
  --temp-high 38
```

### 导出CSV

```bash
# 导出最新报告的CSV
python -m cooling_tower_report.cli export

# 导出指定报告的CSV
python -m cooling_tower_report.cli export 报告ID
```

---

## 目录结构

```
cooling_tower_report/   # 源代码
  ├── nameplate.py      # 设备铭牌管理（版本化，支持备注/撤回）
  ├── water_drop.py     # 水滴数据处理（原始数据，不掺判断）
  ├── anomaly.py        # 异常检测（用某版铭牌去检测数据）
  ├── report.py         # 报告生成 + 跳变分析
  ├── consistency.py    # 一致性校验
  └── cli.py            # 命令行工具

data/                   # 输入数据
  ├── nameplate.json    # 铭牌数据库（所有版本都在里面）
  └── water_drops.csv   # 水滴原始数据

output/
  ├── reports/          # 历史报告（每份报告一个文件夹）
  │   └── index.json    # 报告索引
  └── csv/              # 导出的CSV文件
```

---

## 设计原则

这套工具是为了解决几个具体的痛点设计的：

### 1. 铭牌和报警不能对不上 → 全链路版本化

- 设备铭牌是**版本化**的，每次改阈值、加备注、撤备注，都会生成新版本
- 每份报告都记录了"基于哪一版铭牌生成的"，还有快照哈希
- 每条异常都带追溯链，从图表点进去能一路追到原始数据和铭牌说法

### 2. 下午换班前补的备注，要说清改了什么判断 → impact_description

- 每条铭牌备注都必须写 `impact_description`（影响说明）
- 报告里会把这些影响说明一起带出来，换班的同事一看就懂

### 3. 安全阈值改了不能是含糊警告 → 追到设备铭牌原始说法

- 阈值变动会在铭牌历史里留痕：谁改的、什么时候、为什么
- 跳变分析会明确指出"是阈值变了导致的"，而不是一句笼统的"参数调整"

### 4. 结果突然跳变，要知道为什么 → 跳变分析

对比两份报告，自动归类原因：
- 阈值变了
- 单位变了
- 加了/撤了备注
- 数据本身变了

### 5. 重启重跑后数据要对得上 → 一致性校验 + 不可变报告

- 生成的报告是**不可变**的，存下来就不会被覆盖
- 每份报告都带数据指纹（data_hash + nameplate_hash）
- `check` 命令一键验明正身：报告、铭牌、CSV、原始数据，是不是对得上

### 6. 错了的说法不能一删了之 → 撤回而非删除

- 备注错了就**撤回**（retract），不是删除
- 已撤回的备注在历史报告里依然可见，会标注"已撤回"和原因
- 这样跳变分析才能说清："那段时间的异常是按一条已撤回的备注算的"

---

## 典型工作流

### 日常交班

1. 小林上班，跑 `python -m cooling_tower_report.cli generate --operator 小林`
2. 看 `output/csv/{报告ID}_anomalies.csv`，有几个异常心里有数
3. 有疑问就开 `_detail.csv`，追一下是触发了哪个阈值、哪版铭牌
4. 交班时把报告ID告诉下一班的同事

### 发现结果不对，要改铭牌

1. 先 `note add` 追加一条备注，写清楚影响了哪些判断
2. 重新 `generate`，生成新报告
3. 用 `jump 旧报告ID 新报告ID` 看一下变化对不对
4. 确认没问题再交班

### 事后核对

1. 翻出当时的报告ID
2. `check 报告ID` 确认数据没被动过
3. `note list` 看当时有哪些备注、哪些是已撤回的
4. 该是谁的锅，一清二楚

---

## 数据格式

### water_drops.csv（水滴原始数据）

```csv
timestamp,temperature,flow_rate,tower_id
2024-06-14 08:00:00,28.5,45.2,CT-001
2024-06-14 08:05:00,29.0,46.1,CT-001
```

- `timestamp`: 记录时间
- `temperature`: 水滴温度（℃）
- `flow_rate`: 流量（单位和铭牌一致）
- `tower_id`: 冷却塔编号
