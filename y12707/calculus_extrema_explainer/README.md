# 微积分极值讲解器 - 使用说明

面向风控分析师和运营同事。围绕"学生错题"这条线跑批。

## 一、启动

```bash
cd calculus_extrema_explainer
pip install -r requirements.txt

# 方式A：直接跑通全流程（Python脚本，无需起服务）
python scripts/run_demo.py

# 方式B：先起 Web 服务，再用 curl 逐步操作
python run.py                    # 默认端口 5000
curl http://127.0.0.1:5000/health
curl -X POST http://127.0.0.1:5000/init
```

数据文件：`data/calculus_extrema.db`（SQLite，首次启动自动生成）。

## 二、导入数据

POST 接口都支持单条或数组批量。

```bash
# 1. 学生
curl -X POST http://127.0.0.1:5000/students \
  -H "Content-Type: application/json" \
  -d '[{"student_code":"S001","student_name":"张三","class_name":"高数A班"}]'

# 2. 题目（标记 has_zero_division_risk=1 的题会做除零边界判断）
curl -X POST http://127.0.0.1:5000/questions \
  -H "Content-Type: application/json" \
  -d '[{"question_code":"Q_EXT_001","question_text":"求 f(x)=1/x+x 的极小值",
        "correct_answer":2.0,"correct_derivative":"-1/(x*x)+1",
        "critical_points":"0,1","has_zero_division_risk":1}]'

# 3. 学生错题（historical_score 可留空，留空不影响批次继续运行，会单独记缺口）
curl -X POST http://127.0.0.1:5000/wrong_answers \
  -H "Content-Type: application/json" \
  -d '[{"student_code":"S001","question_code":"Q_EXT_001",
        "student_answer":1.0,"student_derivative":"-1/x + 1",
        "historical_score":null}]'
```

## 三、跑批（约束校验 + 误差分析共用同一批记录）

```bash
# 1. 建批并挂接错题ID（wrong_answer_ids 来自上一步返回的 ids）
curl -X POST http://127.0.0.1:5000/batches \
  -H "Content-Type: application/json" \
  -d '{"batch_code":"BATCH_001","batch_name":"6月第1批","wrong_answer_ids":[1,2,3]}'

# 2. 执行处理
curl -X POST http://127.0.0.1:5000/batches/1/process
```

处理过程中，同一批记录的 `batch_record_id` 会同时写入：
- `constraint_checks`（除零边界判断、历史评分是否存在、答案值域等）
- `error_analyses`（误差类型、误差大小、根因）

历史评分缺失时：该条不会让整批失败，约束校验与误差分析照常计算，同时在 `anomalies` 中记一条 `historical_score_missing` 的缺口给风控分析师。

## 四、查看异常 & 复核入口

```bash
# 查看全部异常（含缺口和除零边界违规）
curl http://127.0.0.1:5000/anomalies

# 仅看待补缺口（历史评分缺失且未复核）
curl http://127.0.0.1:5000/gaps

# 顺着一条异常反查：学生错题 -> 批次记录 -> 约束校验 -> 误差分析 -> 复核意见
curl http://127.0.0.1:5000/anomalies/1/trace

# 复核入口（风控分析师给处理意见，不用重新导入）
curl -X POST http://127.0.0.1:5000/anomalies/1/review \
  -H "Content-Type: application/json" \
  -d '{"reviewer":"风控分析师_老王",
        "decision":"补充历史评分后重新处理",
        "handling_opinion":"已联系教学组补录该生历史评分为4.2",
        "supplemental_data":"historical_score=4.2"}'
```

## 五、导出结果

```bash
# CSV（推荐给运营同事）
curl -o batch_001.csv "http://127.0.0.1:5000/batches/1/export?format=csv"

# JSON
curl -o batch_001.json "http://127.0.0.1:5000/batches/1/export?format=json"
```

导出文件位于 `exports/` 目录，同一条 `batch_record_id` 的约束校验和误差分析并列在一行，界面和报告用的是同一份处理记录。

## 六、验收回溯路径

顺着一条异常往回查：

```
/anomalies/<id>/trace
  └─ student_code / student_name / class_name       （哪个学生）
  └─ question_code / question_text / correct_answer （哪道题）
  └─ student_answer / student_derivative / student_work （学生错在哪里）
  └─ constraint_checks（除零边界判断是否通过、历史评分是否存在）
  └─ error_analyses（误差类型、大小、根因）
  └─ review_decisions（风控分析师的处理意见，如有）
```
