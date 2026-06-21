# 联邦客户端上线守门

**给谁用**：项目经理日常脚本 + 训练负责人老周人工兜底
**解决啥问题**：以前灰度配置乱改没人管、重跑就覆盖旧证据、人工判断没历史、
复会复盘说不清。

---

## 🚀 老周快速上手（3 步走）

> 每天早上打开电脑，按这个顺序做就行。

### 第 ① 步：跑一次守门（项目经理的日常脚本也调这条）
```bash
cd fed_gatekeeper
python3 gatekeeper.py run \
  --model-version v2.3.0 \
  --gray-config examples/gray_good.json \
  --rollback-id RB-20250614-001 \
  --extra-materials examples/extra_metric_report.txt
```
- 结论是 **PASS** → 今天没大事，跳到第③步看一眼队列
- 结论是 **WARN / FAIL** → 进入第②步
- **退出码**：PASS=0，WARN/FAIL=非0（项目经理脚本用这个判断要不要报警

### 第 ② 步：看异常队列
```bash
python3 gatekeeper.py queue
```
把里面的待处理项一条一条过，用 `approve` 做人工判断：
```bash
# 先 list 找到 RECORD_ID
python3 gatekeeper.py list --with-approvals

# 对具体某条做人工放行 / 驳回 / 暂缓
python3 gatekeeper.py approve \
  --record-id 20250618_153012_v2.3.0 \
  --decision pass \
  --comment "灰度 20% 先放，召回率和延迟都在阈值内，RB-20250614-001 关联完毕"
```

### 第 ③ 步（可选）：打包材料发给项目经理 / 复盘会用
```bash
python3 gatekeeper.py pack --record-id 20250618_153012_v2.3.0
```
生成 `data/materials/materials_xxx.zip`，里面有当时的灰度配置副本、检查项表、所有人工确认历史，开会直接转发就行。

---

## 📋 命令全表（完整说明）

| 命令 | 什么时候用 | 关键参数（固定！）
|---|---|---|
| `gatekeeper run` | 每次发版前跑一次 | `--model-version` 模型版<br>`--gray-config` 灰度配置路径<br>`--rollback-id` 撤回记录ID（修复版要传）<br>`--extra-materials` 指标报告等附件<br>`--output-dir` 输出目录（默认./data） |
| `gatekeeper queue` | 每天早上看一眼，有啥要处理的 | `--output-dir` |
| `gatekeeper approve` | WARN/FAIL项做人工兜底 | `--record-id`<br>`--decision pass\|reject\|hold`<br>`--comment` 理由（进历史，复盘要解释）<br>`--approver` 谁确认的（默认老周） |
| `gatekeeper list` | 看所有历史记录 | `--with-approvals` 连人工确认一起看 |
| `gatekeeper diff` | 对比两次结果（模型换版前后） | `--record-id-1` 旧的那条<br>`--record-id-2` 新的那条 |
| `gatekeeper pack` | 发材料包（开会/复盘 | `--record-id` |

> **注意：上面的参数名，以及所有输出格式，固定了就不动了，项目经理日常脚本靠它们。

---

## 🧠 设计要点（复盘用这些能解释给项目经理听）

### 1. 永不覆盖旧证据
- 每次 `run` 生成新文件：`data/records/{时间戳}_{模型版}.json`
- 重跑**不会**覆盖上次的记录，哪怕模型版本一样，时间戳不一样也不会盖
- 所以**人工确认也不盖**：`data/approvals/{record_id}.json` 是追加写入
  模型换版 → 新的 `record_id`，旧 record 的确认完整保留

### 2. 灰度配置写错 → 追到原始说法
不是含糊的"灰度比例不对"，而是告诉你：
```
[FAIL] 灰度比例范围 | L3: "ratio": 1.5, | 灰度比例 1.5 超出合法范围 [0.0, 1.0]。原始配置写法 -> L3: "ratio": 1.5,
```
直接告诉你第 3 行写了啥，打开配置文件改就行。

### 3. 撤回记录 ↔ 最终结论强关联
`--rollback-id` 传的 ID 会被记录在：
- run 的 JSON 里
- 队列里
- 材料包里
复盘时"这个修复版对应哪个撤回"直接能串起来。

### 4. 两次结果对比
```bash
python3 gatekeeper diff \
  --record-id-1 20250618_100000_v2.3.0 \
  --record-id-2 20250618_153012_v2.3.1
```
会对比：基础信息（模型版、结论、灰度比例、检查项状态）、连**各自的人工确认历史
旧 record 的人工确认不会被新 record 盖掉。

### 5. 失败输出格式稳定，脚本可以 grep
```bash
# 只看 FAIL：
python3 gatekeeper.py run ... | grep '\[FAIL\]'
```

---

## 📂 目录结构

```
fed_gatekeeper/
├── gatekeeper.py          # 主入口（所有命令都从这进）
├── src/
│   ├── checker.py      # 检查逻辑（灰度比例、必填字段、撤回关联…）
│   ├── storage.py      # 存记录/取记录（永不覆盖！）
│   ├── diff.py         # 两次结果对比
│   └── exporter.py   # 材料包打包
├── examples/
│   ├── gray_good.json          # ✅ 好的配置示例
│   ├── gray_bad_ratio.json   # ❌ 灰度比例写错的例子
│   ├── gray_full_rollback.json  # ⚠️ 全量发布+撤回关联的例子
│   └── extra_metric_report.txt # 额外材料示例
└── data/                    # ← 所有输出都在这里
    ├── records/*.json          # 每次守门记录（不会被覆盖
    ├── approvals/*.json        # 人工确认（按 record_id 分开存
    ├── queue.json              # 异常/待处理队列
    └── materials/*.zip      # 打包的材料包
```

---

## 🔧 常见问题

**Q: 我刚才不小心 run 了两次，会不会把第一次的记录覆盖掉？**
不会。每次 run 的文件名是时间戳+模型版，重跑两次的时间戳不一样，会是两条不同的 record。
用 `gatekeeper list` 两条都能看到。

**Q: 模型从 v2.3.0 换成 v2.3.1，老周对 v2.3.0 那条的人工判断会不会没了？
不会。不同模型版本不一样，`approvals/ 下面是按 record_id 分开存的，用 `diff` 能一起对比。

**Q: 复盘时怎么证明"当时灰度比例就是 0.2**
打开 `data/materials/materials_xxx.zip` 里的 `02_gray_config.json` 和 `02b_gray_config_lines.txt`，有当时的配置原文和行号。
