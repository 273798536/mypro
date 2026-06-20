# 模型压缩任务追踪

追踪每次模型压缩评估的结论来源、人工改判记录与样本级异常。解决后端只返回"成功"、小样本被整体均值掩盖、改判无迹可查的问题。

---

## 快速开始（阿岑看这里）

### 第一步：启动服务

```bash
# 1. 安装依赖
pip install -r requirements.txt

# 2. 启动服务（项目根目录下执行）
python backend/app.py
```

服务启动后监听 `http://localhost:9527`

### 第二步：打开看板摘要

浏览器打开 **http://localhost:9527**，首页看到：

| 看什么 | 在哪里 | 说明 |
|--------|--------|------|
| 哪些运行被人工改判过 | 首页"运行记录"表 `改判` 列 + `最终结论` 列 | 黄色行 = 有人工介入 |
| 哪些还在等人工确认 | 首页顶部"待人工确认"数字 | 点击 Run ID 进入详情 |
| 可疑样本是哪几行 | 详情页 "可疑样本" 表 | row_id 对应特征快照原始行 |
| 小样本分桶在哪 | 详情页 "小样本分桶" 表 | 样本数少、AUC 降幅大的分桶 |
| 改判原因和下一步 | 详情页 "结论溯源" 时间线 | 自动结论 → 人工改判，含证据引用 |

### 第三步：用 CLI 重复卡 run_id

```bash
# 查看指定 run 的详情（含改判记录、可疑样本、小样本分桶）
python scripts/cli.py show run_20260618_001

# 对某个 run 提交人工改判（结论会从自动结论被覆盖）
python scripts/cli.py adjust run_20260618_001 NEEDS_REVIEW \
  "新用户分桶AUC降0.04，小样本被均值掩盖" \
  "等待数据组补充该分桶样本"

# 确认一条改判单
python scripts/cli.py confirm adj_20260618_001 CONFIRMED "数据组已立项补样本"

# 对比两次运行
python scripts/cli.py compare run_20260618_001 run_20260619_002
```

---

## 目录结构

```
.
├── backend/
│   └── app.py                  # Flask 服务，提供 API 与页面
├── data/
│   ├── runs.json               # 每次压缩评估的运行记录
│   ├── feature_snapshots.json  # 特征快照（含可疑样本标记、小样本分桶）
│   └── manual_adjustments.json # 人工改判单（含证据引用、跟进讨论）
├── frontend/
│   ├── templates/
│   │   ├── index.html          # 看板首页（运行列表）
│   │   └── run_detail.html     # 运行详情（结论溯源/可疑样本/分桶拆解）
│   └── static/
│       └── style.css
├── scripts/
│   └── cli.py                  # 命令行工具：查 run / 改判 / 确认 / 对比
├── requirements.txt
└── README.md
```

---

## 数据说明

### 运行记录 (data/runs.json)

每次压缩评估产生一条运行记录，关键字段：

- `auto_conclusion`：pipeline 自动给出的结论（PASS/FAIL），后端返回"成功"不等于这个
- `final_conclusion`：最终结论（可能被人工改判覆盖）
- `final_conclusion_source`：结论来源，格式 `manual_adjustment:<adj_id>` 或 `auto`
- `has_adjustment` + `adjustment_ids`：是否有人工改判及改判单 ID 列表
- `metrics_summary`：总体指标（总体 AUC 降幅、体积缩减、延迟优化）
- `risk_flags`：风险标签，如 `small_sample_bucket_degradation`

### 特征快照 (data/feature_snapshots.json)

按 run_id 归档的特征快照，用来定位是哪几条样本拉偏了结论：

- `samples[]`：快照样本行，含 `row_id`、基线/压缩预测、差值、数据质量标记
- `suspicious_samples`：被标记可疑的 `row_id` 列表（评审时先看这些行）
- `small_sample_buckets[]`：小样本分桶，含样本数、AUC 降幅、说明
- `aggregate_metrics`：分品类、分新老用户的指标拆解（不只看总体）

### 人工改判单 (data/manual_adjustments.json)

每次改判可完整追溯：

- `original_conclusion` / `new_conclusion`：改判前后
- `created_by` / `created_by_name`：操作人
- `new_reason`：改判原因（必须说清楚哪几条样本/哪个分桶）
- `status`：当前状态（PENDING_CONFIRMATION / CONFIRMED / REJECTED）
- `next_action`：下一步处理
- `evidence_refs[]`：证据引用，支持三种类型：
  - `sample_row`：引用特征快照的具体 row_id
  - `small_bucket`：引用小样本分桶的 bucket_key
  - `cross_run_compare`：跨版本对比引用
- `followup_comments[]`：跟进讨论记录

---

## API 列表

| 方法 | 路径 | 说明 |
|------|------|------|
| GET  | `/api/runs` | 所有运行列表 |
| GET  | `/api/run/<run_id>` | 单 run 详情（含快照+改判） |
| GET  | `/api/run/<run_id>/suspicious` | 可疑样本 + 小样本分桶 |
| GET  | `/api/adjustments?run_id=xxx` | 改判单列表（可按 run_id 过滤） |
| POST | `/api/adjustment` | 提交人工改判 |
| POST | `/api/adjustment/<adj_id>/status` | 更新改判状态 / 加评论 |
| GET  | `/api/compare?base=xxx&target=yyy` | 两次运行对比 |
| GET  | `/api/health` | 健康检查 |

---

## 评审要点（给接手同事）

1. **不只要看总体 AUC**，先看 `aggregate_metrics` 下的分品类、分新老用户拆解
2. **看 `suspicious_samples` 里的 row_id**，到 `samples[]` 找对应行，看 `pred_diff` 和 `note`
3. **看 `small_sample_buckets`**，样本数 < 30 的分桶 AUC 降幅容易被总体均值盖掉
4. **看结论来源**，如果 `final_conclusion_source` 是 `manual_adjustment:*`，点开改判单看原因和证据引用
5. **坏数据不背锅**：`data_quality != normal` 的行，在特征快照里会标红，改判单里应明确指出是数据问题还是算法问题
