# 概率抽样参数沙盘 —— 实用手册

> 说明里不写空话，直接放样例位置、常用命令、异常查看方法。

---

## 1. 样例数据与请求在哪里

| 文件 | 作用 |
|---|---|
| [samples/error_questions_mixed.csv](file:///Users/mac/pro/solo/workspaces/y13406/samples/error_questions_mixed.csv) | CSV 测试包（含缺值/单位缺失/边界异常/后补说明/旧称呼） |
| [samples/error_questions_mixed.json](file:///Users/mac/pro/solo/workspaces/y13406/samples/error_questions_mixed.json) | 同内容 JSON 版 |
| [samples/request_pipeline_minimal.json](file:///Users/mac/pro/solo/workspaces/y13406/samples/request_pipeline_minimal.json) | 最小合法 pipeline 请求样例 |
| [samples/error_invalid_params.json](file:///Users/mac/pro/solo/workspaces/y13406/samples/error_invalid_params.json) | 参数校验错误返回样例 |
| [samples/error_unsupported_format.json](file:///Users/mac/pro/solo/workspaces/y13406/samples/error_unsupported_format.json) | 文件格式错误返回样例 |
| [samples/error_missing_file.json](file:///Users/mac/pro/solo/workspaces/y13406/samples/error_missing_file.json) | 缺少上传文件错误返回样例 |
| [samples/demo_local.py](file:///Users/mac/pro/solo/workspaces/y13406/samples/demo_local.py) | 本地直接跑模块的完整演示脚本 |
| [samples/curl_demos.sh](file:///Users/mac/pro/solo/workspaces/y13406/samples/curl_demos.sh) | 调 HTTP API 的 curl 合集 |
| [openapi.yaml](file:///Users/mac/pro/solo/workspaces/y13406/openapi.yaml) | API 契约（字段不用猜） |

---

## 2. 常用命令

```bash
# 安装依赖
pip install -r requirements.txt

# 启动服务（默认 5001 端口）
python app.py

# 健康检查
curl http://localhost:5001/health

# 查看 OpenAPI 契约
curl http://localhost:5001/openapi

# 跑本地演示（不启动服务，直接调用模块，能看到所有中间输出）
python samples/demo_local.py

# 跑 HTTP 演示（先启动服务）
bash samples/curl_demos.sh
```

---

## 3. 异常怎么查（复核人/下一班接手）

### 3.1 单位缺失只在导入阶段发现的，后面怎么看到它被排除？

- **清洗返回**里看 `excluded_unit_missing_ids`：直接列出被排除的样本 ID 数组
- **清洗返回**里每条样本的 `status` 字段：`unit_missing` 就是因单位缺失被标记
- **异常仪表盘**里看 `unit_missing_detail`：学生、行号、数值、单位字段全列出来

### 3.2 抽样的公式和单位去哪里看？

- 不用回代码，HTTP 返回的 `intermediate_steps` 数组，每一步包含：
  - `step_name`：步骤名
  - `formula`：公式字符串
  - `variables`：代入的变量值
  - `unit_check`：每个变量对应的单位说明
  - `result_value`：本步计算结果

### 3.3 异常分流总览怎么拿？

直接调 `POST /api/v1/pipeline`，返回里：

| 字段 | 看什么 |
|---|---|
| `cleanse_summary` | 导入总数/有效/排除/缺值/单位缺失/边界/后补合并 各多少 |
| `cleanse_log_lines` | 可直接粘报告的文本日志行 |
| `exception_dashboard.status_distribution` | 各状态样本数 |
| `exception_dashboard.by_issue_type` | 按问题类型分组的明细 |
| `exception_dashboard.unit_missing_excluded_ids` | 单位缺失被排除的 ID 列表（图表层直接过滤） |
| `exception_dashboard.boundary_outlier_detail` | 边界异常明细 |
| `exception_dashboard.supplement_detail` | 后补说明合并前后对照 |
| `excluded_from_sampling` | 抽样阶段额外排除的记录及原因 |

### 3.4 测试包故意混入的那些坑在哪个文件、哪几行？

测试包文件：[samples/error_questions_mixed.csv](file:///Users/mac/pro/solo/workspaces/y13406/samples/error_questions_mixed.csv)

| 行号(含表头) | 坑 | 工具怎么分流 |
|---|---|---|
| 3 (S002) | `后补说明` 非空 | 合并入 `remark`，状态仍 valid，标记 `supplement_merged` issue |
| 4 (S003) | `错题数` 空 | 标记 `missing_value`，排除 |
| 5 (S004) | `错题数=7` 无单位 | 标记 `unit_missing`，`excluded_unit_missing_ids` 中能看到 |
| 6 (S005) | `错题数=250` 超过上限 200 | 标记 `boundary_outlier`，抽样阶段默认排除 |
| 7 (S006) | `失分=-5` 低于下限 0 | 同上 |
| 8 (S007) | 只有 `后补说明` 没有 `备注` | 后补直接当备注用，状态 valid |
| 9 (S008) | 备注 + 后补都有 | 合并为 `原备注 \| 后补追加` |
| 10 (S009) | `错题数` 用单位 `道` | 正常解析，单位字段保留为 `道` |
| 11 (S010) | `失分` 用单位 `points` | 正常解析，单位字段保留为 `points` |
| 15 (S014) | 题数和失分单位都缺失 | 标记 `unit_missing`，进入排除列表 |

---

## 4. API 快速索引（字段不用猜，完整契约看 openapi.yaml）

| 接口 | 方法 | 入参要点 | 返回要点 |
|---|---|---|---|
| `/health` | GET | - | 服务状态、允许的抽样方法和状态枚举 |
| `/api/v1/cleanse` | POST | `multipart/form-data: file` 或 `JSON: {records}` | `summary` + `excluded_unit_missing_ids` + `cleanse_log` + `samples[]` |
| `/api/v1/sample` | POST | `JSON: {samples[], params}` | `summary` + `selected_ids` + `intermediate_steps[]` + `excluded_from_sampling[]` |
| `/api/v1/pipeline` | POST | 文件上传 + form `params`(JSON字符串) 或 JSON body | 上面所有字段合并 + `exception_dashboard` + `cleanse_log_lines` |
| `/api/v1/exceptions` | POST | `JSON: {cleanse, sampling}` | 单独的异常仪表盘视图 |
| `/openapi` | GET | - | YAML 格式完整契约 |

---

## 5. 关键代码位置（真需要改代码的时候）

| 文件 | 改什么 |
|---|---|
| [config.py](file:///Users/mac/pro/solo/workspaces/y13406/config.py) | 单位白名单、边界阈值、旧称呼映射表 |
| [models.py](file:///Users/mac/pro/solo/workspaces/y13406/models.py) | 数据结构（Sample 状态枚举、抽样参数、中间过程结构） |
| [data_cleanse.py](file:///Users/mac/pro/solo/workspaces/y13406/data_cleanse.py) | 导入清洗：单位剥离、缺值检测、旧称呼重命名、后补合并、边界判断 |
| [sampling.py](file:///Users/mac/pro/solo/workspaces/y13406/sampling.py) | 样本量计算（Cochran + FPC）、四种抽样方法、中间过程构造 |
| [exceptions.py](file:///Users/mac/pro/solo/workspaces/y13406/exceptions.py) | 异常仪表盘聚合、清洗日志行导出 |
| [app.py](file:///Users/mac/pro/solo/workspaces/y13406/app.py) | Flask 路由、请求解析、错误返回封装 |
| [openapi.yaml](file:///Users/mac/pro/solo/workspaces/y13406/openapi.yaml) | API 契约（改接口必须同步更新这个文件） |
