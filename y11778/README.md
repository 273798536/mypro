# 赛事排名稳定器 (rank-stabilizer)

学校比赛积分排名工具：自动排序、同分裁决、弃权处理、异常标记、申诉追踪、修正留痕。

## 快速开始

```bash
# 用内置数据直接看效果
python3 -m rank_stabilizer rank --seed normal        # 正常数据
python3 -m rank_stabilizer rank --seed dirty          # 脏数据（有警告）
python3 -m rank_stabilizer rank --seed tie            # 同分对决

# 导出 JSON + CSV
python3 -m rank_stabilizer rank --seed dirty --export --prefix demo_
# → ./output/demo_ranking_report.json
# → ./output/demo_ranking_report.csv
# → ./output/demo_warnings.json
# → ./output/demo_audit_trail.json
```

## 四条命令

| 命令 | 用途 |
|------|------|
| `rank` | 计算排名、输出榜单 |
| `seed` | 生成测试数据到文件 |
| `check` | 只检查异常，不排名 |
| `appeal` | 处理申诉并可选重排 |

## rank — 计算排名

```bash
python3 -m rank_stabilizer rank --seed <数据集>
python3 -m rank_stabilizer rank --data-dir <目录>
```

| 参数 | 说明 |
|------|------|
| `--seed normal/dirty/tie` | 内置数据集 |
| `--data-dir <路径>` | 从目录读 JSON 文件 |
| `--title <标题>` | 报告标题，默认"赛事排名" |
| `--export` | 导出文件 |
| `--output <目录>` | 导出目录，默认 `./output` |
| `--prefix <前缀>` | 导出文件名前缀 |
| `--warnings-only` | 只输出警告 |
| `--audit-only` | 只输出修正轨迹 |

## seed — 造数据

```bash
python3 -m rank_stabilizer seed --type <类型> --output-dir <目录>
```

| 类型 | 内容 |
|------|------|
| `normal` | 10 名选手 × 4 项目，权重正常，无弃权 |
| `dirty` | 含弃权、负分、超满分、不存在的项目、重复同分规则、零/负权重、待处理申诉 |
| `tie` | 4 人完全同分，演示同分裁决链 |
| `all` | 全部生成 |

生成后目录结构：
```
seed_data/
  normal/  {events,scores,tie_rules}.json
  dirty/   {events,scores,tie_rules,withdrawals,appeals}.json
  tie/     {events,scores,tie_rules}.json
```

## check — 检查异常

```bash
python3 -m rank_stabilizer check --seed dirty
python3 -m rank_stabilizer check --data-dir ./seed_data/dirty
```

输出的三种级别：
- `✖` 错误：必须处理（权重 ≤ 0、项目不存在、无成绩未标记弃权）
- `⚠` 警告：需要确认（弃权用平均分、负分、超满分、待处理申诉）
- `ℹ` 信息：仅供参考（弃权零分、全局+项目规则并存）

## appeal — 处理申诉

```bash
python3 -m rank_stabilizer appeal \
  --appeal-id AP001 \
  --status accepted \
  --resolution "成绩确有误，已修正" \
  --data-dir ./seed_data/dirty \
  --recompute --export
```

| 参数 | 说明 |
|------|------|
| `--appeal-id` | 申诉编号 |
| `--status` | `pending/accepted/rejected/withdrawn` |
| `--resolution` | 处理说明 |
| `--data-dir` | 数据目录（必填） |
| `--recompute` | 处理后重新排名 |
| `--export` | 导出结果 |

## 数据文件格式

每个文件是一个 JSON 数组，放在同一目录下，由 `--data-dir` 加载：

**events.json** — 比赛项目
```json
[
  {"event_id": "E100", "name": "100米跑", "weight": 1.0, "max_score": 100},
  {"event_id": "E200", "name": "200米跑", "weight": 1.5, "max_score": 100}
]
```

**scores.json** — 选手成绩
```json
[
  {"athlete_id": "A001", "athlete_name": "张伟", "event_id": "E100", "score": 85.0},
  {"athlete_id": "A002", "athlete_name": "李娜", "event_id": "E100", "score": null, "is_withdrawal": true}
]
```

**tie_rules.json** — 同分规则
```json
[
  {"rule_id": "TR01", "strategy": "gold_first", "priority": 10, "description": "按最高单项"},
  {"rule_id": "TR02", "strategy": "alphabetical", "priority": 5, "description": "按姓名拼音"}
]
```

可用策略：`gold_first` `silver_first` `bronze_first` `total_medals` `best_single` `head_to_head` `alphabetical` `draw_lot`

**withdrawals.json** — 弃权记录
```json
[
  {"athlete_id": "A002", "event_id": "E400", "reason": "伤病", "score_policy": "average"}
]
```

计分策略：`zero`（默认） `last_place` `average` `disqualify`

**appeals.json** — 申诉
```json
[
  {"appeal_id": "AP001", "athlete_id": "A004", "event_id": "E400", "description": "成绩录入有误", "status": "pending"}
]
```

## 异常路径一览

| 情况 | 检测时机 | 级别 | 处理方式 |
|------|---------|------|---------|
| 权重 ≤ 0 | check / rank | ✖ 错误 | 该项目得分 × 权重后为 0 或负值，不会静默跳过 |
| 成绩为负 | check / rank | ⚠ 警告 | 照常计入，但明确标注 |
| 成绩超满分 | check / rank | ⚠ 警告 | 照常计入，但明确标注 |
| 项目不存在 | check / rank | ✖ 错误 | 该成绩无法参与权重计算 |
| 无成绩未标记弃权 | check / rank | ✖ 错误 | 该项按 0 分处理 |
| 弃权用平均分 | check / rank | ⚠ 警告 | 可能虚高排名 |
| 重复同分策略 | check / rank | ✖ 错误 | 提示修正规则 |
| 同分规则优先级冲突 | check / rank | ⚠ 警告 | 按加载顺序处理 |
| 待处理申诉 | check / rank | ⚠ 警告 | 排名可能后续变动 |

所有修正（弃权计分调整、申诉通过后的成绩变更）都会写入审计轨迹，保留操作时间、旧值、新值、来源和原因。
