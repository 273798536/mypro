# 提示词版本灰度看板 - 技术架构文档

## 1. 技术选型

### 1.1 后端 (Python)
| 组件 | 选型 | 理由 |
|------|------|------|
| Web 框架 | **FastAPI** (0.110.0) | 原生异步、自动 OpenAPI、类型安全、性能优秀 |
| 数据库 | **SQLite** (内置) + **SQLAlchemy** (2.0.x) | 零配置本地部署，ORM 便于切换数据库 |
| 数据校验 | **Pydantic** v2 | FastAPI 原生集成，严格类型校验 |
| CSV/JSON | 标准库 + **orjson** | 高性能序列化，导出一致性校验 |

### 1.2 前端 (React + TypeScript)
| 组件 | 选型 | 理由 |
|------|------|------|
| 构建工具 | **Vite** (5.x) | 秒级冷启动，开发体验优秀 |
| UI 框架 | **React 18** + **TypeScript 5** | 生态成熟，类型安全 |
| 样式方案 | **Tailwind CSS** 3.4 + 自定义 CSS 变量 | 高信息密度控制台需要精细控制 |
| 图表库 | **Recharts** 2.12 | React 原生，分布统计/趋势图开箱即用 |
| HTTP 客户端 | **Axios** + **@tanstack/react-query** 5 | 数据缓存、自动重试、乐观更新 |
| 状态管理 | Zustand | 轻量，替代 Redux 繁琐样板 |

### 1.3 开发工具
- **Node.js** ≥ 18, **Python** ≥ 3.11
- **concurrently**: 前后端单命令同时启动
- **pytest**: 后端单测

---

## 2. 目录结构

```
y12905/
├── backend/                          # FastAPI 后端
│   ├── app/
│   │   ├── main.py                   # 入口，CORS、路由注册
│   │   ├── database.py               # SQLAlchemy 引擎 + SessionLocal
│   │   ├── models.py                 # ORM 模型定义
│   │   ├── schemas.py                # Pydantic 请求/响应模型
│   │   ├── crud.py                   # 数据库操作封装
│   │   ├── routers/
│   │   │   ├── prompt_versions.py    # /api/prompt-versions
│   │   │   ├── eval_samples.py       # /api/eval-samples
│   │   │   ├── gray_compare.py       # /api/gray-compare
│   │   │   ├── statistics.py         # /api/statistics
│   │   │   ├── human_feedback.py     # /api/human-feedback
│   │   │   ├── replay.py             # /api/replay
│   │   │   └── export.py             # /api/export
│   │   ├── services/
│   │   │   ├── consistency.py        # 界面/导出一致性校验 (MD5)
│   │   │   ├── decision_engine.py    # 人工反馈状态机 (APPROVED/REVIEW/RERUN)
│   │   │   └── diff_service.py       # 文本 diff 算法
│   │   ├── errors/
│   │   │   └── handlers.py           # 可操作错误格式化器
│   │   └── seed.py                   # 种子数据初始化
│   ├── requirements.txt              # Python 依赖 (锁定版本)
│   └── start.sh                      # 后端启动脚本
│
├── frontend/                         # Vite + React 前端
│   ├── src/
│   │   ├── main.tsx                  # 入口
│   │   ├── App.tsx                   # 路由 + 布局
│   │   ├── api/                      # Axios 封装 + React Query hooks
│   │   ├── stores/                   # Zustand stores
│   │   ├── pages/
│   │   │   ├── GrayCompare.tsx       # 灰度对比看板 (核心)
│   │   │   ├── Statistics.tsx        # 分布统计
│   │   │   ├── Replay.tsx            # 评测回放
│   │   │   ├── PromptVersions.tsx    # 版本管理
│   │   │   └── FeedbackLog.tsx       # 人工反馈日志
│   │   ├── components/
│   │   │   ├── StatusBadge.tsx       # 🟢🟡🔴 状态标签 (全局统一)
│   │   │   ├── DiffViewer.tsx        # 文本 diff 渲染
│   │   │   ├── SummaryCards.tsx      # 顶部摘要卡片 (一致性校验)
│   │   │   ├── VersionSelector.tsx   # A/B 版本选择器
│   │   │   └── ActionableError.tsx   # 可操作错误提示组件
│   │   ├── styles/
│   │   │   └── globals.css           # Tailwind 指令 + 主题变量
│   │   └── types/                    # 共享 TS 类型
│   ├── index.html
│   ├── package.json                  # 依赖锁定
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── scripts/
│   ├── demo-flow.sh                  # 端到端 curl 示例流程 (从空目录跑通)
│   ├── seed_samples.json             # 样例数据文件
│   └── test-api.sh                   # API 冒烟测试
│
├── .gitignore
├── README.md                         # 完整使用文档 (含 curl 示例)
└── package.json                      # 根目录：并发启动前后端
```

---

## 3. 后端架构

### 3.1 核心 API 设计

| Method | Path | 功能 | 关键参数 |
|--------|------|------|----------|
| POST | `/api/prompt-versions` | 录入提示词版本 | version_tag, content, safety_rules_snapshot |
| GET | `/api/prompt-versions` | 版本列表 | page, size |
| GET | `/api/prompt-versions/{id}` | 版本详情 | - |
| POST | `/api/eval-samples` | 批量录入评测样本 | prompt_version_id, samples[] |
| GET | `/api/eval-samples` | 样本列表 + 过滤 | prompt_version_id, status, score_range |
| POST | `/api/gray-compare` | 创建灰度对比任务 | version_a_id, version_b_id |
| GET | `/api/gray-compare/{id}` | 获取对比结果 | include_diff=true |
| GET | `/api/gray-compare` | 历史对比任务列表 | - |
| GET | `/api/statistics/distribution` | 评分分布 | prompt_version_id, metric |
| GET | `/api/statistics/safety-violations` | 违规类型分布 | prompt_version_id |
| GET | `/api/statistics/trend` | 多版本趋势曲线 | version_ids[] |
| POST | `/api/human-feedback` | 提交/修改人工反馈 | eval_sample_id, revised_score, feedback |
| GET | `/api/human-feedback/by-sample/{sample_id}` | 某样本反馈历史 | - |
| POST | `/api/replay/trace` | 结论溯源 | eval_sample_id |
| GET | `/api/export/{compare_id}` | 导出对比结果 | format=csv\|json, checksum=true |

### 3.2 人工反馈决策引擎 (decision_engine.py)

```
输入: (original_score, revised_score, safety_rules_diff, prompt_diff_chars)
输出: final_decision + affected_rule_ids + reason

决策矩阵:
───────────────────────────────────────────────────────
条件                                    → 决策
───────────────────────────────────────────────────────
1. revised_score ≥ 4
   AND 无安全违规
   AND safety_rules_diff = false        → APPROVED 🟢

2. |revised - original| > 1.0
   OR safety_rules_diff = true          → REVIEW_REQUIRED 🟡

3. prompt_diff_chars > 100
   OR 新增安全规则匹配                   → RERUN 🔴
───────────────────────────────────────────────────────
```

### 3.3 一致性校验服务 (consistency.py)
```python
def compute_summary_hash(compare_id: int) -> str:
    """对导出的摘要数据计算 MD5，前端展示时使用相同算法，确保一致"""
    data = get_compare_summary(compare_id)  # 通过率、各状态计数
    canonical = json.dumps(data, sort_keys=True)
    return hashlib.md5(canonical.encode()).hexdigest()
```
- 导出 API 返回 `x-summary-hash` header
- 前端 SummaryCards 用相同算法计算并校验，不一致时显示 ⚠️ 警告

### 3.4 可操作错误处理 (errors/handlers.py)
```python
class PromptVersionNotFound(APIError):
    code = "PROMPT_VERSION_MISSING"
    status_code = 404
    def action(self, version_tag: str) -> str:
        return f"请先通过 POST /api/prompt-versions 录入 {version_tag}，示例：curl -X POST ..."

# 全局异常处理器 → 统一响应格式:
{
  "error_code": "PROMPT_VERSION_MISSING",
  "message": "评测任务 #123 引用了提示词版本 v2.5，但数据库中未找到",
  "action": "请先通过 POST /api/prompt-versions 录入 v2.5 ...",
  "request_id": "uuid"
}
```

---

## 4. 前端架构

### 4.1 状态管理 (Zustand)
```typescript
// store/compareStore.ts
export const useCompareStore = create(() => ({
  versionA: null, versionB: null,
  currentCompare: null,
  summaryHash: null,   // 与后端 x-summary-hash 校验
  consistencyValid: true,
}));
```

### 4.2 主题系统 (globals.css CSS 变量)
```css
:root {
  --bg-primary: #0b0f17;
  --bg-secondary: #111827;
  --bg-tertiary: #1f2937;
  --status-approved: #10b981;
  --status-review: #f59e0b;
  --status-rerun: #ef4444;
  --text-primary: #f3f4f6;
  --text-secondary: #9ca3af;
  --border-color: #374151;
  --accent: #3b82f6;
  --mono-font: "JetBrains Mono", "SF Mono", Consolas, monospace;
}
```

### 4.3 核心页面路由
```
/                    → GrayCompare (默认，灰度对比)
/statistics          → Statistics (分布统计)
/replay              → Replay (评测回放)
/prompt-versions     → PromptVersions (版本管理)
/feedback-log        → FeedbackLog (反馈日志)
```

### 4.4 StatusBadge 统一组件
所有展示状态的地方（列表行、摘要卡片、导出文件）都复用此组件，确保颜色/文案全局一致：
- 🟢 `<StatusBadge status="APPROVED">可直接用</StatusBadge>`
- 🟡 `<StatusBadge status="REVIEW_REQUIRED">待 MLOps 复核</StatusBadge>`
- 🔴 `<StatusBadge status="RERUN">需重新评测</StatusBadge>`

---

## 5. 数据库模型 (SQLAlchemy)

```python
# models.py
class PromptVersion(Base):
    __tablename__ = "prompt_versions"
    id = Column(Integer, PK)
    version_tag = Column(String, unique=True, nullable=False)
    content = Column(Text)
    safety_rules_snapshot = Column(JSON)  # {"rules":[{"id":"R-007","text":"...","version":"1.2"}]}
    change_log = Column(String)
    created_at = Column(DateTime, default=now)

class EvalSample(Base):
    __tablename__ = "eval_samples"
    id = Column(Integer, PK)
    prompt_version_id = Column(FK("prompt_versions.id"))
    input_text = Column(Text)
    model_output = Column(Text)
    score = Column(Float)
    safety_violations = Column(JSON)     # ["R-007", "R-012"]
    eval_status = Column(Enum)           # PASS / FAIL / REVIEW
    source_material_ref = Column(String)
    created_at = Column(DateTime, default=now)

class GrayCompareTask(Base):
    __tablename__ = "gray_compare_tasks"
    id = Column(Integer, PK)
    version_a_id = Column(FK)
    version_b_id = Column(FK)
    metrics_summary = Column(JSON)       # {pass_rate_a, pass_rate_b, violation_delta, ...}
    status = Column(Enum)                # PENDING / COMPLETED / FAILED
    consistency_flag = Column(Boolean)   # 安全规则是否一致
    created_at = Column(DateTime, default=now)

class HumanFeedback(Base):
    __tablename__ = "human_feedback"
    id = Column(Integer, PK)
    eval_sample_id = Column(FK)
    evaluator = Column(String)
    feedback_text = Column(Text)
    original_score = Column(Float)
    revised_score = Column(Float)
    affects_safety_rules = Column(Boolean)
    affected_rule_ids = Column(JSON)     # ["R-007"]
    final_decision = Column(Enum)        # APPROVED / REVIEW_REQUIRED / RERUN
    reason = Column(Text)                # 决策原因 (给业务方看)
    created_at = Column(DateTime, default=now)
```

---

## 6. 启动流程

```bash
# Step 1: 克隆/进入目录
cd y12905

# Step 2: 一键安装依赖 (根目录脚本)
npm run setup:all    # → pip install -r backend/requirements.txt
                     # → cd frontend && npm install

# Step 3: 初始化数据库 + 种子数据
cd backend && python -m app.seed
# → 生成 y12905.db (SQLite)
# → 种子数据: 3 个提示词版本 + 200 评测样本 + 2 个对比任务 + 30 条反馈

# Step 4: 启动 (根目录，并发启动前后端)
npm run dev
# → Backend:  http://localhost:8000  (FastAPI + auto-reload)
# → Frontend: http://localhost:5173  (Vite + HMR)
# → API 文档: http://localhost:8000/docs

# Step 5: 跑通 demo 流程
bash scripts/demo-flow.sh
# 内含 curl 示例: 建版本 → 提交样本 → 发起对比 → 导出
```

---

## 7. 一致性保障方案

### 7.1 数据层面
- 导出内容与 SummaryCards 共享同一套聚合函数 `build_summary()`
- 后端在导出时同时计算摘要哈希，放入响应头 `x-summary-hash`
- 前端拉取页面摘要时也调用后端 `GET /api/gray-compare/{id}/summary-hash` 对比

### 7.2 UI 层面
- `final_decision` 字段是权威来源，禁止前端自行推导
- StatusBadge 组件只接收 `final_decision` prop，不允许逻辑分支
- 导出 CSV 时直接序列化 `final_decision` 字段，确保与页面文字完全一致

---

## 8. 关键非功能保障

| 关注点 | 方案 |
|--------|------|
| 错误可操作 | 全局异常拦截器 → 所有错误包含 `action` 字段 |
| 数据完整性 | SQLAlchemy FK 约束 + 事务回滚 |
| 并发启动 | 根目录 `concurrently` → 单命令启动 |
| 前端热更新 | Vite HMR + React Query staleTime 配置 |
| 可追溯 | 所有写入操作带 `created_at`，反馈表保留 original/revised |
