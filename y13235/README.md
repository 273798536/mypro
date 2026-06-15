# 琴房课时版本复核

## 一、启动

```bash
pip install -r requirements.txt
python run.py
```

启动后访问: http://localhost:8000/docs

## 二、重跑

### 第一次启动复核
```bash
curl -X POST "http://localhost:8000/api/review/start?folder_path=./data/audio_folders/2026-06-15_琴房A_记录.txt&folder_name=2026-06-15_琴房A"
```

返回示例：
```json
{
  "review_id": "xxx-xxx-xxx",
  "status": "异常-需立即处理",
  "review_time": "2026-06-16T...",
  "message": "复核完成，状态: 异常-需立即处理，异常数: N"
}
```

### 补批注后重跑
```bash
curl -X POST "http://localhost:8000/api/review/rerun?review_id=xxx-xxx-xxx&annotation=第10行是排练授权&delivery_list_version=v1.2"
```

## 三、查看接口返回

### 查看复核结果
```bash
curl "http://localhost:8000/api/review/{review_id}"
```

返回关键字段：
- `status`: 状态（正常通过/待复核-有疑点/异常-高优先级/异常-需立即处理）
- `anomalies`: 异常列表，每个异常含：
  - `raw_line`: 原始行号
  - `folder_path`: 音频文件夹路径
  - `anomaly_type`: 异常类型
  - `severity`: 严重程度（critical/high/medium/low）
  - `field_name`: 具体字段
  - `expected`/`actual`: 期望值和实际值
- `progress_records`: 学生进步记录，含：
  - `raw_line`: 对应原始行
  - `metrics`: 各项评分
  - `notes`: 特殊标记（如"【旧版母带，不计入正常课时统计】"）
- `calculation_rule`: 本次计算口径
- `annotation`: 人工批注
- `delivery_list_version`: 交付清单版本
- `previous_review_id`: 旧版本ID

### 查看图表数据（可点击异常回溯）
```bash
curl "http://localhost:8000/api/review/{review_id}/chart"
```

每个异常点含 `click_back` 字段：
```json
{
  "click_back": {
    "folder_path": "./data/audio_folders/...txt",
    "raw_line": 7,
    "calculation_rule_version": "v1.0"
  }
}
```

### 异常点详情（回溯到原始行和计算口径）
```bash
curl "http://localhost:8000/api/review/{review_id}/anomaly/{raw_line}"
```

### 版本对照
```bash
curl "http://localhost:8000/api/review/{new_id}/compare/{old_id}"
```

返回：新旧版本状态、批注、交付清单、分数差异、异常增减对比。
