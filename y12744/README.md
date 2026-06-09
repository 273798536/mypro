# 圆锥曲线参数器 - 使用说明

## 1. 启动服务

**环境要求**：Python 3.9+

```bash
# 1. 安装依赖
pip install -r requirements.txt

# 2. 初始化样例数据（首次使用执行一次即可）
python scripts/seed_data.py

# 3. 启动服务
./start.sh
# 或
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

启动后访问：`http://localhost:8000/docs` 查看交互式 API 文档。

服务使用 SQLite 数据库（`data/conic.db`），重启服务后上一轮处理痕迹会完整保留。

---

## 2. 导入记录

**接口**：`POST /records/import`

支持批量导入，每条记录必须包含 `record_no`（唯一）、`student_name`，以及圆锥曲线参数：

```json
[
  {
    "record_no": "CONIC-2026-004",
    "student_name": "赵六",
    "question_id": "Q2026-HL-09",
    "curve_type": "hyperbola",
    "a": 4.0,
    "b": 3.0,
    "eccentricity": 1.25,
    "unit": "cm",
    "raw_formula": "x²/16 - y²/9 = 1"
  }
]
```

导入时系统会自动：
- 校验单位是否缺失（缺失则标记为 blocker 问题，状态设为 `pending_confirm`）
- 检测参数约束冲突（如椭圆离心率 ≥ 1 等）
- 计算曲线类型、焦点、顶点、标准方程并生成 v1 版本

---

## 3. 查看异常

### 3.1 查看某条记录的所有问题

**接口**：`GET /records/{record_id}/issues?unresolved_only=true`

### 3.2 问题类型说明

| 问题类型 | 严重程度 | 说明 |
|---------|---------|------|
| `unit_missing` | blocker | 单位缺失，**报告导出将被拦截** |
| `constraint_conflict` | error | 参数约束冲突（如 a、b 符号与曲线类型不匹配） |
| `insufficient_params` | error | 参数严重不足，无法识别曲线 |
| `student_mistake` | warning | 学生典型错误记录，用于对比教学 |
| `curve_type_mismatch` | warning | 填写的曲线类型与标准方程不一致 |

### 3.3 标记问题已解决

**接口**：`POST /records/{record_id}/issues/{issue_id}/resolve`

```json
{ "resolved": true }
```

---

## 4. 状态推进

**接口**：`POST /records/{record_id}/status`

```json
{ "target_status": "reviewing", "operator": "数学老师A" }
```

### 状态流转图

```
imported / pending_confirm
        │
        ▼
    reviewing ──────┐
     │    │         │
     │    └──► pending_confirm
     │
     ▼
  confirmed  (存在 blocker 未解决则不允许进入)
     │
     ▼
  exported
```

所有状态均可退回 `rejected`。

---

## 5. 图表补录 & 历史对比

### 5.1 图表补录后同步重算

**接口**：`POST /records/{record_id}/chart-supplement`

```json
{ "chart_supplied": true, "updated_by": "数学老师A" }
```

调用后会生成一个新版本，公式计算自动同步更新。

### 5.2 查看历史版本对比

**接口**：`GET /records/{record_id}/compare`

返回所有版本以及相邻版本间的字段差异（a、b、c、曲线类型、离心率、标准方程等）。

---

## 6. 晚到参数处理

当参数表晚到时，不要直接覆盖旧结果，而是提交晚到参数：

**接口**：`POST /records/{record_id}/late-params`

```json
{ "param_name": "a", "new_value": "6.0" }
```

系统会自动计算受影响的结论列表，并返回给前端展示。

### 查看晚到参数影响汇总

**接口**：`GET /records/{record_id}/late-params/impact-summary`

提示哪些结论受影响（如"焦点坐标""标准方程表达式"等），当前报告仍展示旧结果。

### 合并晚到参数并重新计算

**接口**：`POST /records/{record_id}/late-params/{late_param_id}/merge`

合并后自动生成新版本，旧版本仍保留可追溯。

---

## 7. 导出结果

**接口**：`GET /records/{record_id}/export`

**注意**：若存在未解决的 `blocker` 问题（如单位缺失），接口返回 **422**，并在响应体中明确说明拦截原因，例如：

```json
{
  "export_allowed": false,
  "reason": "存在阻断性问题未解决，导出已被拦截",
  "blocker_details": "单位缺失：圆锥曲线参数必须标注长度单位（如cm、m等），否则结论不具备物理意义，报告将被拦截导出。"
}
```

即使投委会成员只看导出报告（或被拦截的 JSON 响应），也能一目了然知道为什么被拦下。

正常导出时，报告会附带：
- 完整的参数与计算结果
- 历史答案、学生错题及判定
- 问题解决情况
- 版本审计轨迹
- 晚到参数警告（若有未合并项）

---

## 8. 样例数据说明

运行 `python scripts/seed_data.py` 会生成 3 条样例：

| 记录编号 | 类型 | 状态 | 特点 |
|---------|------|------|------|
| CONIC-2026-001 | 顺利记录 | confirmed | 参数完整、单位齐全、无约束冲突，可直接导出 |
| CONIC-2026-002 | 待确认记录 | pending_confirm | **单位缺失（blocker）**，含学生错题与历史正确答案对比 |
| CONIC-2026-003 | 明显坏数据 | reviewing | a、b 符号与曲线类型冲突、离心率越界、类型与方程不一致，多问题集中呈现 |

三条记录均在同一轮复核中，可直接用于向投委会演示。
