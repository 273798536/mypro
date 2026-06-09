# 化学方程式配平 CLI (chemeq-balancer)

面向药化课题组的化学方程式配平与批次报告管理 CLI 工具。

---

## 适用范围与单位约定

| 项目 | 说明 |
|---|---|
| 适用反应 | 无机反应(氧化还原/酸碱中和/沉淀)、基础有机反应(燃烧/取代/加成)、含同位素标记、含水合物化学式 |
| 不适用 | 极复杂多步串联机理、自由基半反应、非化学计量比固相反应 |
| 核心公式 | Σ(反应物系数 × 元素原子数) = Σ(产物系数 × 元素原子数) |
| 系数单位 | 无量纲整数 (mol : mol 摩尔比) |
| 质量单位 | g (工具中不直接计算质量, 系数可换算) |
| 物质的量 | mol |

---

## 快速开始 (从空目录开始)

### 1. 安装依赖

```bash
cd /path/to/y12763
pip install -e .
```

> 如果只是想快速试用而不全局安装:
> ```bash
> pip install click rich numpy sympy pandas pydantic pyyaml
> python -m chemeq_balancer.cli --help
> ```

### 2. 启动命令

全局安装后:
```bash
chemeq --help
```

或模块方式:
```bash
python -m chemeq_balancer.cli --help
```

### 3. 一键看完整演示

```bash
chemeq demo --clean
```

这会创建演示批次、添加样例反应、走一遍复测/质控/追溯/导出全流程。
演示结束后会提示批次 ID 和关键命令速查。

### 4. 第一份样例位置

- 配平示例数据: `chemeq_balancer/examples/sample_equations.json`
- 运行 `chemeq demo` 后, 数据存储在: `~/.config/chemeq/store.json`
- 导出报告用: `chemeq export --batch-id <批次ID> -o ./report.txt` (TXT/CSV/JSON 三种格式)

---

## 子命令一览

### 日常入口 (每天先跑这个)
```bash
chemeq retest list
```
自动扫描所有批次, 列出: 配平失败、需复测、空白对照缺失、指纹冲突、超期待确认的待处理事项。

### 快速配平 (不涉及批次管理)
```bash
chemeq balance 'H2 + O2 -> H2O'
chemeq balance 'KMnO4 + HCl -> KCl + MnCl2 + Cl2 + H2O' --method matrix
```

### 批次报告管理
```bash
chemeq batch list                             # 列出所有批次
chemeq batch create --title "6月合成批次"      # 创建新批次
chemeq batch show --batch-id <ID>             # 查看批次详情 (摘要与导出同源)
chemeq batch add-reaction --batch-id <ID> --equation 'H2 + O2 -> H2O' --exp-id EXP-001
chemeq batch add-reaction --batch-id <ID> --equation '...' --blank   # 标记空白对照
chemeq batch set-status --batch-id <ID> --reaction-id <ID> --status verified
chemeq batch qc-check --batch-id <ID>         # 质控检查 (空白对照缺失检测等)
```

### 月底/课前: 报告导出
```bash
chemeq export --batch-id <ID>                  # 打印人可读 TXT 到终端
chemeq export --batch-id <ID> -o report.txt    # 保存 TXT
chemeq export --batch-id <ID> --format csv -o report.csv
chemeq export --batch-id <ID> --format json -o report.json
```
> **重要不变量**: 导出文件中的 summary 与 `chemeq batch show` 显示的摘要使用
> `BatchReport.compute_summary()` 同一来源, 绝不出现"界面通过/文件待确认"的不一致。

### 验收倒查: 数据追溯
```bash
chemeq trace --reaction-id rct_xxxxxx          # 通过反应 ID 追溯
chemeq trace --equation '2H2 + O2 -> 2H2O'     # 通过方程式内容反查
```
从结果可以一路看到: 原始输入、配平过程(含元素守恒表)、所有审核/修改/补录操作记录、
同指纹关联的其它记录。

---

## 关键机制说明

### 1. 空白对照检测
每个批次**必须**包含至少一条 `--blank` 的空白对照记录, 否则 `retest` 和 `qc-check`
都会弹出 CRITICAL 级别的告警。

验收会拿"空白对照缺失"倒查时, 可直接 `chemeq trace` 看到该批次从未添加过
空白对照记录 (audit_trail 中无 MARK_BLANK 动作)。

### 2. 去重 & 补录 (不允许同一件事出现两份结论)
系统基于**指纹**(正则化方程式 + 反应条件 + 实验编号的 SHA-256)去重:

| 场景 | 行为 |
|---|---|
| 指纹不存在 | 新增记录 |
| 指纹已存在, 旧记录 PENDING/REJECTED | **补录合并** (保留原 ID, 更新内容, 写 SUPPLEMENT 审计) |
| 指纹已存在, 旧记录 VERIFIED | **拒绝添加** (提示"已验证通过, 需修改请先驳回") |
| 指纹已存在但多份状态冲突 | retest 自动生成 HIGH 优先级复测建议 |

### 3. 失败原因清单

| 代码 | 含义 |
|---|---|
| PARSE_ERROR | 输入格式解析失败 (括号不匹配/元素符号错误/无分隔符等) |
| NO_SOLUTION | 反应物产物元素不一致 或 矩阵零空间为空, 方程无解 |
| INFINITE_SOLUTIONS | 零空间维度>1, 可能是多步独立反应未拆分 |
| OVERFLOW | 配平系数>10000, 需人工介入或拆分反应 |
| UNKNOWN | 其它未知错误, 请反馈 |

---

## 数据存储

- 默认路径 (macOS/Linux): `~/.config/chemeq/store.json`
- 默认路径 (Windows): `%APPDATA%/chemeq/store.json`
- 自定义路径: 设置环境变量 `CHEMEQ_STORE_PATH=/your/path/store.json`
  或使用 `chemeq --store-path /your/path/store.json ...` 全局参数

---

## 验收自测

```bash
# 一键跑演示数据, 覆盖所有功能
chemeq demo --clean

# 验证批配平算法
chemeq balance 'H2 + O2 -> H2O'
chemeq balance 'Ca(OH)2 + HCl -> CaCl2 + H2O'

# 验证空白对照缺失告警
# (创建无空白对照的批次后)
chemeq retest list

# 验证导出一致性
chemeq batch show --batch-id <ID>    # 记下通过/待确认数量
chemeq export --batch-id <ID>         # 对比导出文件中 summary 字段
```
