# 🧪 MLOps 提示词版本灰度看板

> 面向 MLOps 工程师的 Prompt 版本灰度评测 + 人工反馈联动平台

解决的核心问题：**人工反馈改了以后，安全规则和结论要不要跟着变？一眼知道。

---

## ✨ 功能特性

| 模块 | 状态 | 说明 |
|------|------|------|
| 🧪 **灰度对比看板** | ✅ P0 | A/B 版本逐样本对比、diff 高亮、评分波动、违规对比 |
| 📈 **分布统计** | ✅ P0 | 评分分布直方图 / PASS/FAIL 分布 / 安全违规饼图 / 多版本趋势曲线 |
| 🔍 **评测回放** | ✅ P1 | 结论溯源链：样本 → 标注反馈 → 关联安全规则 → 提示词片段 |
| 📦 **版本管理** | ✅ P0 | 提示词版本录入 + 安全规则快照 + 样本数统计 |
| 📋 **反馈日志** | ✅ P0 | 全量人工反馈 + 三档决策结论汇总 |
| 🤖 **决策引擎** | ✅ P0 | 自动判定 🟢 可直接用 / 🟡 待MLOps复核 / 🔴 需重新评测 |
| 📥 **导出 CSV/JSON** | ✅ P1 | 导出内容与界面摘要 MD5 校验一致，杜绝界面"通过"文件"待确认" |
| 🛠 **可操作错误** | ✅ P1 | 所有错误附修复建议 curl 示例，不抛裸 Internal Error |

---

## ⚡ 从空目录跑通（5 分钟上手）

> 以下全部命令可**从空目录复制粘贴即可**，不需要改任何东西。

### 环境要求
- **Python ≥ 3.11+
- **Node.js ≥ 18+
- 不需要装数据库（内置 SQLite，零配置）

```bash
# ============================================================
# Step 1：安装所有依赖（首次运行）
# ============================================================
cd y12905   # 进入项目根目录

# 安装根目录依赖（并发启动脚本）
npm install

# 安装后端 Python 依赖（自动建虚拟环境 .venv
npm run setup:backend

# 安装前端 React 依赖
npm run setup:frontend

# ============================================================
# Step 2：初始化数据库 + 载入种子数据（3版本 + 360样本 + 2对比 + ~60反馈
npm run seed
# ✅ 看到「种子数据初始化完成！即完成

# ============================================================
# Step 3：启动（前后端并发启动）
# ============================================================
npm run dev
# 🟢 Backend   → http://localhost:8000
# 🟣 Frontend  → http://localhost:5173
# 📘 API 文档 → http://localhost:8000/docs

# ============================================================
# Step 4：跑 demo 流程（开新终端）
# ============================================================
bash scripts/demo-flow.sh
# ✅ 7 步 demo：建版本 → 录入样本 → 创建对比 → 提交反馈 → 导出 → 触发错误示例
```

---

## 📁 第一份样例数据位置

| 路径：[scripts/seed_samples.json](file:///Users/mac/pro/solo/workspaces/y12905/scripts/seed_samples.json)

直接通过 API 批量导入：
```bash
# 1. 先创建一个提示词版本（若没有）
curl -X POST http://localhost:8000/api/prompt-versions \
  -H 'Content-Type: application/json' \
  -d '{
    "version_tag": "v1.0-my-first",
    "content": "你是一个客服助手，礼貌回答用户问题。",
    "safety_rules_snapshot": {"rules": []},
    "change_log": "第一个版本"
  }'

# 2. 用 seed_samples.json 中的 samples 数组批量录入
#    假设上面创建的版本 ID 是 1
curl -X POST http://localhost:8000/api/eval-samples \
  -H 'Content-Type: application/json' \
  -d "{
    \"prompt_version_id\": 1,
    \"samples\": $(cat scripts/seed_samples.json | python3 -c 'import sys,json; print(json.dumps(json.load(sys.stdin)[\"samples\"])'
  }"
```

---

## 🎯 日常使用流程

```
┌──────────────────────────────────────────────────────────────────────────┐
│  1. 录入 Prompt 版本（带安全规则快照 POST /api/prompt-versions   │
│                         ↓                                     │
│  2. 批量录入评测样本 POST /api/eval-samples              │
│                         ↓                                     │
│  3. 创建灰度对比任务  POST /api/gray-compare               │
│                         ↓                                     │
│  4. 看板看灰度对比（界面 / GET /gray-compare/{id}?include_diff=true
│                         ↓                                     │
│  5. 人工审核 / 提交反馈  POST /api/human-feedback           │
│     → 决策引擎自动判定 🟢🟡🔴                            │
│     → 联动安全规则变更自动标红需复核                           │
│                         ↓                                     │
│  6. 导出 CSV/JSON    GET /api/export/{id}                 │
│     → 响应头 x-summary-hash 与界面一致                      │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔗 核心 API（可直接 curl 用）

> API 文档（Swagger UI）：http://localhost:8000/docs

### 🔵 提示词版本
```bash
# 列表
curl http://localhost:8000/api/prompt-versions

# 录入（含安全规则快照）
curl -X POST http://localhost:8000/api/prompt-versions \
  -H 'Content-Type: application/json' \
  -d @- <<'EOF'
{
  "version_tag": "v2.0-new",
  "content": "粘贴完整系统提示词内容...",
  "change_log": "这次改了 XXX 逻辑",
  "safety_rules_snapshot": {
    "rules": [
      {"id": "R-001", "text": "禁止隐私", "version": "1.0"},
      {"id": "R-007", "text": "未成年人安全", "version": "1.2"}
    ]
  }
}
EOF
```

### 🟣 灰度对比
```bash
# 创建 A/B 对比
curl -X POST http://localhost:8000/api/gray-compare \
  -H 'Content-Type: application/json' \
  -d '{"version_a_id": 1, "version_b_id": 2}'

# 查询完整对比结果（逐样本 diff）
curl "http://localhost:8000/api/gray-compare/1?include_diff=true" | python3 -m json.tool

# 摘要哈希（与导出时对比一致性校验用）
curl http://localhost:8000/api/gray-compare/1/summary-hash
```

### 🟢 人工反馈（核心，触发决策引擎）
```bash
curl -X POST http://localhost:8000/api/human-feedback \
  -H 'Content-Type: application/json' \
  -d '{
    "eval_sample_id": 12,
    "evaluator": "zhangsan",
    "feedback_text": "这条回复合规，通过",
    "revised_score": 4.6,
    "affects_safety_rules": false,
    "affected_rule_ids": []
  }' | python3 -c "import sys,json; d=json.load(sys.stdin); print('👉 最终决策:', d['final_decision']); print('原因:', d['reason']"
```

### 📤 导出（CSV / JSON）
```bash
# CSV（Excel 直接打开，带 BOM）
curl -OJ "http://localhost:8000/api/export/1?format=csv&checksum=true"

# JSON
curl "http://localhost:8000/api/export/1?format=json" \
  -H 'Accept: application/json' \
  -D /tmp/headers.txt
# 检查 /tmp/headers.txt 里的 x-summary-hash 与页面一致吗？

# 一致性预览（与前端 SummaryCards 同源）
curl http://localhost:8000/api/export/1/preview
```

### 📊 分布统计
```bash
# 评分分布（分桶
curl "http://localhost:8000/api/statistics/distribution?prompt_version_id=1&metric=score"

# PASS/FAIL 分布
curl "http://localhost:8000/api/statistics/distribution?prompt_version_id=1&metric=status"

# 安全违规分布
curl "http://localhost:8000/api/statistics/safety-violations?prompt_version_id=1"

# 多版本趋势（平均评分 + 通过率
curl "http://localhost:8000/api/statistics/trend?version_ids=1,2,3"
```

### 🔍 评测回放（结论溯源）
```bash
curl -X POST http://localhost:8000/api/replay/trace \
  -H 'Content-Type: application/json' \
  -d '{"eval_sample_id": 42}' | python3 -m json.tool
```

---

## 🚦 决策引擎规则（人工反馈 → 结论）

| 条件 | 结论 |
|------|------|
| 修订评分 ≥ 4.0 + 无安全违规 + 规则未变 | 🟢 **APPROVED 可直接用** |
| 评分波动 > 1.0 分 OR 规则版本变更 OR 标记影响安全规则 | 🟡 **REVIEW_REQUIRED 待MLOps复核** |
| 提示词本体变更 > 100字 OR 新增安全规则 | 🔴 **RERUN 需重新评测** |

> 决策结果在页面 🟢🟡🔴 三色徽标 + 导出文件的 `decision_label` 字段 **完全一致**，杜绝页面/文件不一致。

---

## 🛠️ 错误可操作化示例（不抛裸 500）

### ✗ 旧做法（你看不到具体错误：
```json
{ "detail": "Internal Server Error" }
```

### ✓ 新做法（明确指出缺什么 + 怎么修：
```json
{
  "error_code": "PROMPT_VERSION_MISSING",
  "message": "灰度对比任务 version_a 引用了提示词版本 ID=999，但该版本不存在",
  "action": "请先通过 POST /api/prompt-versions 录入该版本，或检查 version_id 参数。\n可通过 GET /api/prompt-versions 查看已存在的版本列表。",
  "request_id": "a1b2c3d4"
}
```

**所有 ≥400/500 错误均按此格式返回，含 `action` 字段（修复建议 curl 示例）。

---

## 📂 项目结构

```
y12905/
├── backend/                         # FastAPI + SQLite
│   ├── app/
│   │   ├── main.py                # 入口 + 全局错误处理器
│   │   ├── database.py            # SQLAlchemy 引擎
│   │   ├── models.py            # ORM 模型（4张表）
│   │   ├── schemas.py           # Pydantic 请求/响应
│   │   ├── crud.py               # 数据访问层
│   │   ├── seed.py               # ✅ 种子数据（3 版本 360 样本）
│   │   ├── routers/
│   │   │   ├── prompt_versions.py    # POST/GET 版本
│   │   │   ├── eval_samples.py         # 批量录入样本
│   │   │   ├── gray_compare.py       # 对比任务 CRUD
│   │   │   ├── statistics.py         # 分布/趋势 API
│   │   │   ├── human_feedback.py     # 人工反馈（决策引擎
│   │   │   ├── replay.py              # 评测回放
│   │   │   └── export.py             # CSV/JSON 导出+一致性
│   │   ├── services/
│   │   │   ├── decision_engine.py # 🧠 三档决策规则引擎
│   │   │   ├── consistency.py     # 摘要 MD5 一致性校验
│   │   │   └── diff_service.py    # 文本 token diff 算法
│   │   └── errors/handlers.py    # 🛠 全局错误格式化器
│   └── requirements.txt
│
├── frontend/                        # Vite + React 18 + TypeScript
│   └── src/
│   │   ├── pages/
│   │   │   ├── GrayCompare.tsx       # 🧪 灰度对比看板（核心
│   │   │   ├── Statistics.tsx         # 📈 分布统计（Recharts
│   │   │   ├── Replay.tsx             # 🔍 评测回放溯源
│   │   │   ├── PromptVersions.tsx    # 📦 版本管理
│   │   │   └── FeedbackLog.tsx       # 📋 反馈日志
│   │   ├── components/
│   │   │   ├── StatusBadge.tsx       # 🟢🟡🔴 统一徽标
│   │   │   ├── DiffViewer.tsx         # 文本差异渲染
│   │   │   ├── SummaryCards.tsx       # 摘要卡片（一致性
│   │   │   ├── VersionSelector.tsx  # 版本选择器
│   │   │   └── ActionableError.tsx    # 错误提示
│   │   ├── api/hooks.ts           # React Query hooks
│   │   ├── stores/                 # Zustand
│   │   └── styles/globals.css         # 深色工业风主题
│   ├── tailwind.config.js
│   └── vite.config.ts             # /api → 8000 代理
│
├── scripts/
│   ├── demo-flow.sh                # ✅ 完整 demo 流程脚本
│   └── seed_samples.json          # ✅ 第一份样例数据
│
├── README.md                      # 本文件
└── package.json                  # npm run dev 并发启动
```

---

## ✅ 界面与导出一致性保障机制

1. **单一数据源原则**：导出与 SummaryCards 共用后端 `build_compare_summary()` 同一函数
2. **哈希校验**：后端导出 API 在响应头写 `x-summary-hash`，前端 `SummaryCards` 组件实时显示并实时校验一致则绿色 ✓ 否则红 ⚠️ 警告
3. **状态字段权威**：`final_decision` 字段由后端决策引擎写入数据库，前端/导出都直接复用该字段，禁止前端自行根据 score 推导颜色
4. **导出头注释**：CSV 头部 `#决策统计: 可直接用=XX 待复核=XX 需重跑=XX 与界面卡片数字完全一致

---

## 🐛 常见问题

| 问题 | 解决 |
|------|------|
| 后端启动报错 `Address already in use` | `lsof -ti:8000 \| xargs kill -9` 清 8000 端口 |
| 前端请求 502 | 确认后端已启动，Vite 代理 `/api` → 8000 |
| 数据库位置 | 误删后重新 `npm run seed` 自动重建 |
| 一致性校验失败红色 | 点击「+ 新建对比任务重新生成，或 `npm run seed` 重置 |

---

## 📜 License

内部使用。
