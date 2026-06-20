# 琴房课时版本复核

## 一、启动

### 0. 前置要求
Python 3.10+，使用项目根目录下的命令。

### 1. 安装依赖（三种方式任选其一，别混用）
```bash
# 方式A：使用requirements.txt（推荐，版本锁定可复现）
python3 -m pip install --no-cache-dir -r requirements.txt

# 方式B：直接装精确版本
python3 -m pip install fastapi==0.104.1 uvicorn==0.24.0 pydantic==2.5.0
```

### 2. 启动服务（必须在项目根目录执行）
```bash
cd /Users/mac/pro/solo/workspaces/y13235
python3 run.py
```

启动成功标志：看到 `Uvicorn running on http://127.0.0.1:8000`  
接口文档：http://127.0.0.1:8000/docs

### 3. 先跑验证脚本，确认可复现
```bash
cd /Users/mac/pro/solo/workspaces/y13235
python3 verify.py
```
**核心检查点**：第2步的测试"拜厄练习曲No.8两次运行分数完全一致"必须通过。

---

## 二、重跑

### 第一次启动复核
```bash
curl -s -X POST "http://127.0.0.1:8000/api/review/start?folder_path=./data/audio_folders/2026-06-15_琴房A_记录.txt&folder_name=2026-06-15_琴房A" | python3 -m json.tool
```

返回示例：
```json
{
  "review_id": "11111111-1111-1111-1111-111111111111",
  "status": "异常-需立即处理",
  "review_time": "2026-06-20T...",
  "message": "复核完成，状态: 异常-需立即处理，异常数: 10"
}
```
**核心检查点**：同一记录文件连续跑两次，`status` 和 `异常数` 相同；同一首曲子（如拜厄练习曲No.8）`overall_score` 相同。

### 补排练/授权备注后重扫
把第一次返回的 `review_id` 替换进下面命令：
```bash
curl -s -X POST "http://127.0.0.1:8000/api/review/rerun?review_id=替换为第一次返回的review_id&annotation=第12行是乐队排练已授权，不计入课时&delivery_list_version=v1.2" | python3 -m json.tool
```

---

## 三、查看接口返回

### 3.1 查看复核结果（含异常和进步记录）
```bash
curl -s "http://127.0.0.1:8000/api/review/{review_id}" | python3 -m json.tool
```

关键字段说明：
| 字段 | 含义 |
|------|------|
| `status` | 四档：正常通过 / 待复核-有疑点 / 异常-高优先级 / 异常-需立即处理 |
| `anomalies[]` | 异常列表，每条含 `raw_line`、`folder_path`、`severity`、`expected`、`actual` |
| `progress_records[]` | 学生进步记录，每条含 `raw_line`、`metrics.*`、`notes` |
| `calculation_rule` | 本次使用的计算口径（name/version/formula/thresholds） |
| `annotation` | 人工批注（重跑时传入） |
| `delivery_list_version` | 交付清单版本 |
| `previous_review_id` | 旧版本ID，用于串联版本链 |

### 3.2 查看图表数据（服务前端 + 异常点回溯）
```bash
curl -s "http://127.0.0.1:8000/api/review/{review_id}/chart" | python3 -m json.tool
```
每个异常点都带 `click_back`，可直接跳回 `folder_path#Lraw_line` 和对应计算口径版本：
```json
{
  "click_back": {
    "folder_path": "./data/audio_folders/2026-06-15_琴房A_记录.txt",
    "raw_line": 7,
    "calculation_rule_version": "v1.0"
  }
}
```

### 3.3 异常点上下文（点到异常 → 回到音频行 + 口径）
```bash
curl -s "http://127.0.0.1:8000/api/review/{review_id}/anomaly/7" | python3 -m json.tool
```

### 3.4 版本对照（新版本 vs 旧版本）
```bash
curl -s "http://127.0.0.1:8000/api/review/{新版本id}/compare/{旧版本id}" | python3 -m json.tool
```
关键返回：
- `summary.same_input_rerun`：true = 只是加了批注/清单重扫，**进步记录完全没动，不算进步**
- `summary.changed_records`：实际有分数变化的记录数（同输入重扫时为0）
- `score_diffs`：只有真正变了的才会出现在这里，空数组=数据未变
- `current_annotation` / `previous_annotation`：人工批注对照
- `current_delivery` / `previous_delivery`：交付清单对照

