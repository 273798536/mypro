# 嵌入向量漂移监控系统

用于监控大模型嵌入向量随时间/版本的分布漂移，集成安全规则审核、评测回放、人工修正与结果导出。

## 快速开始（空目录从零启动）

### 1. 安装依赖

```bash
cd /Users/mac/pro/solo/workspaces/y12935
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. 启动服务

```bash
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

启动后浏览器访问：**http://localhost:8000**

### 3. 加载第一份样例

首页会自动加载样例评测题库：`data/samples/eval_benchmark_v1.json`

也可以通过 API 手动触发：
```bash
curl http://localhost:8000/api/run-sample
```

## 目录说明

```
.
├── app/                     # 后端代码
│   ├── main.py              # FastAPI 入口 + 页面路由
│   ├── models.py            # 数据模型 (Pydantic)
│   ├── drift_engine.py      # 漂移检测核心：分布统计、KS检验、余弦距离
│   ├── security_rules.py    # 安全规则引擎 + 漏配检测
│   ├── evaluation.py        # 评测回放引擎
│   ├── exporter.py          # 结果导出 (JSON/CSV/图表)
│   ├── sample_data.py       # 可复现样例数据生成
│   └── templates/
│       └── index.html       # 前端仪表盘
├── data/
│   └── samples/             # 样例评测题库
├── exports/                 # 导出输出目录
└── requirements.txt
```

## 核心能力

| 模块 | 说明 |
|------|------|
| 分布统计 | KS 检验、余弦距离、均值漂移、维度方差 |
| 评测回放 | 逐条回放评测题库命中情况，定位漂移影响题目 |
| 安全规则 | 敏感类题目规则校验，检测规则漏配 |
| 人工修正 | 审核员可把结论拉回来源材料（覆盖自动判定） |
| 结果分类 | 标记「直接可用」与「需安全审核员复核」 |
| 导出 | JSON + CSV + PNG 图表，确保与界面摘要一致 |
| 错误提示 | 缺题库/缺向量等可操作错误（非内部错误） |
