# 风险价值分位回测系统 (VaR Quantile Backtest)

专为出题会前的教研场景设计：自动检查历史答案与图表截图一致性，分级提示补材料 / 改口径 / 重出图 / 复核。

## 核心能力

| 能力 | 说明 |
|---|---|
| **历史模拟法 VaR** | 自助法 95% 置信区间，支持分位数/窗口参数化 |
| **外推越界检测** | 样本不足时自动外推，偏离历史答案超阈值即拦截 |
| **增量约束校验** | 5 条规则引擎，不是一次性判断；补录样例后只重跑受影响的校验 |
| **图表联动更新** | 边界样例补录 → 计算结果更新 → 图表哈希变更 → 标记待校验 |
| **题目清单差异检测** | 题目清单晚到时，自动提示哪些旧结论受影响，**不覆盖旧结果** |
| **分级异常报告** | 异常不再汇总成一个红数字，每条都标注「下一步动作」：补材料 / 改口径 / 重出图 / 复核 |
| **运营导出报告** | HTML 报告里直接说明外推越界为什么被拦，运营无需懂模型也能看懂 |

## 从空目录跑起来

```bash
# 方式一：一键启动（推荐，首次会自动安装依赖 + 跑演示流程）
bash scripts/run.sh

# 方式二：分步执行
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python scripts/init_db.py        # 初始化数据库 + 默认校验规则
python scripts/run_demo.py       # 跑通完整演示流程（7 个步骤）
uvicorn var_backtest.main:app --host 127.0.0.1 --port 8000 --reload
```

启动后：
- API 地址：<http://127.0.0.1:8000>
- 接口文档：<http://127.0.0.1:8000/docs>

## curl 调用示例

```bash
# 先启动服务
bash scripts/run.sh

# 另开终端，跑完整 curl 示例
bash examples/curl_demo.sh
```

关键接口速查：

```bash
# 1) 导入题目清单
curl -X POST http://127.0.0.1:8000/api/question-lists \
  -H "Content-Type: application/json" \
  -d '{"batch_id":"B001","questions":[{"question_id":"Q1","quantile":0.95,"window":252}]}'

# 2) 执行回测
curl -X POST http://127.0.0.1:8000/api/backtest/runs \
  -H "Content-Type: application/json" \
  -d '{"batch_id":"BT001","question_list_batch_id":"B001","question_data":[{"question_id":"Q1","returns":[...],"historical_var_value":0.028}]}'

# 3) 教研编辑视图：分级异常（下一步是补材料还是改口径？）
curl http://127.0.0.1:8000/api/anomalies

# 4) 运营视图：含外推越界拦截说明
curl http://127.0.0.1:8000/api/backtest/runs/1/operator-report

# 5) 边界样例补录后：增量重校验
curl -X POST http://127.0.0.1:8000/api/backtest/runs/1/revalidate

# 6) 某题重出图 + 联动校验
curl -X POST http://127.0.0.1:8000/api/var-results/1/chart

# 7) 题目清单晚到：查询对旧结论的影响（不会覆盖旧结果）
curl http://127.0.0.1:8000/api/question-lists/B002/impact

# 8) 导出 HTML + JSON 报告
curl -X POST http://127.0.0.1:8000/api/backtest/runs/1/export
```

## 项目结构

```
.
├── var_backtest/
│   ├── main.py              # FastAPI 入口
│   ├── database.py          # SQLite 连接
│   ├── models.py            # ORM 数据模型
│   ├── schemas.py           # Pydantic 请求/响应模型
│   ├── var_calculator.py    # 核心：VaR 历史模拟 + 外推越界
│   ├── validator.py         # 增量约束校验引擎（5 条规则）
│   ├── question_diff.py     # 题目清单差异检测 + 影响提示
│   ├── charting.py          # 图表生成 + 哈希联动更新
│   ├── reporting.py         # 教研/运营双视角报告
│   └── exporter.py          # HTML/JSON 导出
├── scripts/
│   ├── init_db.py           # 初始化数据库
│   ├── run_demo.py          # 一键跑通完整演示流程
│   └── run.sh               # 一键启动服务
├── examples/
│   └── curl_demo.sh         # curl 完整调用示例
├── data/var_backtest.db     # 本地 SQLite 数据库（运行后生成）
├── charts/*.png             # 图表产物（运行后生成）
├── exports/*.html|json      # 导出报告（运行后生成）
└── requirements.txt
```

## 默认校验规则

| 编码 | 名称 | 触发动作 |
|---|---|---|
| R001 | 外推越界校验 | 补材料 / 改口径 |
| R002 | 历史答案一致性校验 | 复核 / 改口径 |
| R003 | 图表联动校验 | 重出图 |
| R004 | 样本充足性校验 | 补材料 |
| R005 | VaR 置信区间校验 | 补材料 |

## 面向角色

- **教研编辑**：关注 `GET /api/anomalies`，按「补材料 / 改口径 / 重出图 / 复核」分组处理。
- **运营同事**：关注导出的 HTML 报告，里面有「外推越界为什么被拦」的直白解释。
- **系统维护**：`POST /api/backtest/runs/{id}/revalidate` 支持增量重跑，不重复做已经过的检查。
