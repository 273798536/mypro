# 琴房课时排期冲突检测系统

## 一、启动

```bash
pip install -r requirements.txt
python3 scripts/init_test_data.py    # 可选：初始化演示数据
python3 -m uvicorn main:app --host 127.0.0.1 --port 8765
```

启动后访问 `http://127.0.0.1:8765/docs` 查看所有接口。

---

## 二、重跑冲突检测

调用接口：

```
POST /api/v1/conflicts/run
```

功能：重新扫描所有琴房排期，检测四类冲突（琴房时间重叠、文件名与曲目不匹配、时码偏差、演奏者冲突），清空旧的 pending 状态冲突，写入新结果。

返回示例：
```json
{
  "total_conflicts": 7,
  "new_conflicts": 7,
  "by_type": {
    "room_time_overlap": 1,
    "file_repertoire_mismatch": 2,
    "timecode_deviation": 3,
    "performer_overlap": 1
  },
  "filter_criteria": { "source": "system_auto_run", "timestamp": "..." }
}
```

---

## 三、查看异常队列

### 3.1 列表查询（支持筛选）

```
GET /api/v1/conflicts/queue
```

筛选参数（全部可选，导出口径与此一致）：

| 参数 | 说明 |
|------|------|
| conflict_type | 冲突类型：room_time_overlap / file_repertoire_mismatch / timecode_deviation / performer_overlap |
| status | 状态：pending / resolved / ignored / withdrawn |
| schedule_date_from | 排期日期起 YYYY-MM-DD |
| schedule_date_to | 排期日期止 YYYY-MM-DD |
| piano_room_id | 琴房编号 |
| performer | 演奏者 |
| operator | 处理人 |
| skip / limit | 分页 |

### 3.2 单条详情

```
GET /api/v1/conflicts/{conflict_id}
```

字段说明：
- `raw_source`：时码偏差/文件名不匹配时，**舞台通道表的原始说法**（原始描述、时码、行号）
- `filter_criteria`：冲突产生时的筛选口径，导出时保留
- `timecode_deviation_seconds`：时码偏差秒数

### 3.3 导出 Excel

```
GET /api/v1/conflicts/export/download
```

**导出口径与 3.1 列表筛选参数完全一致**，不传参数即导出全部。

导出字段包含：冲突ID、冲突类型、状态、描述、琴房编号、排期日期/时间、演奏者、原始来源、时码偏差、处理人、最后结论、筛选口径。

---

## 附：其他常用接口

| 接口 | 说明 |
|------|------|
| `PATCH /api/v1/conflicts/{id}` | 处理冲突（改状态/写结论），操作进历史 |
| `PATCH /api/v1/schedules/{id}/remark` | 改排期备注，改动进历史 |
| `POST /api/v1/schedules/{id}/withdraw` | 撤回排期，**与冲突最后结论关联** |
| `GET /api/v1/histories/operations` | 查看备注/判断/结论的改动历史 |
| `GET /api/v1/histories/withdrawals` | 查看撤回记录（含关联的冲突结论） |
