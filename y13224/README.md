# 鼓组节拍分账对齐

## 一、启动

```bash
pip install -r requirements.txt
python run.py
```

服务启动在 `http://0.0.0.0:5000`。

用排练群截图数据发起一次对齐：

```bash
curl -X POST http://localhost:5000/api/align/start \
  -H "Content-Type: application/json" \
  -d '{"screenshots": [截图数据数组]}'
```

截图数据格式：

```json
{
  "screenshots": [
    {
      "file_name": "排练群_鼓组A段.jpg",
      "sender": "林姐",
      "sent_at": "2026-06-10T19:03:00",
      "is_late": false,
      "parsed_text": "白板内容文字",
      "beats": [
        {
          "beat_index": 1,
          "beat_type": "底鼓",
          "expected_count": 4,
          "actual_count": 4,
          "beat_label": "A段底鼓",
          "allocations": [
            {"performer": "小陈", "allocated_count": 4, "allocation_source": "白板拍照"}
          ]
        }
      ]
    }
  ]
}
```

- `is_late: true` 标记晚到附件，系统会自动生成晚到异常并标注数据可能不完整
- `legacy_master` 字段可标记旧版母带引用，会追到排练群截图原始说法

## 二、重跑

拿到新截图或修正数据后，用同一接口重跑：

```bash
curl -X POST http://localhost:5000/api/align/rerun \
  -H "Content-Type: application/json" \
  -d '{"screenshots": [新截图数据]}'
```

重跑会生成新的 batch，历史批次数据保留不动。

## 三、查看异常队列

### 列出异常

```bash
curl http://localhost:5000/api/align/exceptions
curl "http://localhost:5000/api/align/exceptions?status=open"
curl "http://localhost:5000/api/align/exceptions?batch_id=batch_20260610..."
```

### 查看异常明细

```bash
curl http://localhost:5000/api/align/exceptions/{exception_id}
```

返回包含：异常原因（人话）、关联截图、旧版母带原始说法、确认历史。

### 人工确认

```bash
curl -X POST http://localhost:5000/api/align/confirm/{exception_id} \
  -H "Content-Type: application/json" \
  -d '{"operator": "林姐", "new_status": "confirmed", "note": "学生已补练"}'
```

确认前后变化自动进入历史，复盘时可追溯。

### 导出异常队列

```bash
curl http://localhost:5000/api/align/export > exceptions.json
curl "http://localhost:5000/api/align/export?status=open" > open_exceptions.json
```

导出结果与接口查询状态一致——同一份数据，两个出口，不会对不上。
