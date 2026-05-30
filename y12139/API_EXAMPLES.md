# 冷链融霜能耗分析服务 - API 使用指南

## 快速开始

```bash
# 安装依赖
npm install

# 启动服务
npm start

# 运行测试
npm test
```

## API 端点

### 1. 提交分析任务

**POST** `/api/analysis`

请求体：
```json
{
  "cold_storage_id": "CS_001",
  "raw_data": {
    "defrost_records": [
      {
        "record_id": "DEF_001",
        "start_time": "2024-01-15T02:00:00Z",
        "end_time": "2024-01-15T02:30:00Z",
        "energy_consumption": 4.2
      }
    ],
    "temperature_readings": [
      {
        "probe_id": "PROBE_001",
        "reading_time": "2024-01-15T00:00:00Z",
        "temperature": -18.2
      }
    ],
    "fan_status": [],
    "door_status": []
  },
  "config": {
    "volume": 1000,
    "targetTemp": -18
  }
}
```

响应：
```json
{
  "success": true,
  "data": {
    "session_id": "uuid",
    "summary": {
      "total_anomalies": 5,
      "anomaly_breakdown": {
        "defrost_overlap": 1,
        "probe_offline": 1,
        "door_open_too_long": 1
      }
    },
    "anomalies": [
      {
        "anomaly_type": "defrost_overlap",
        "severity": "high",
        "attribution": {...},
        "correction_suggestions": [...]
      }
    ]
  }
}
```

### 2. 获取分析结果

**GET** `/api/analysis/:sessionId`

### 3. 列出分析会话

**GET** `/api/analysis?cold_storage_id=CS_001&limit=20`

### 4. 版本对比（验收测试用）

**POST** `/api/analysis/compare`

请求体：
```json
{
  "base_session_id": "session-uuid-1",
  "modified_session_id": "session-uuid-2"
}
```

响应包含：
```json
{
  "success": true,
  "data": {
    "anomalies": {
      "added": [],
      "removed": []
    },
    "energy": {
      "change_percent": "-5.2"
    },
    "summary": {
      "has_significant_changes": true
    }
  }
}
```

## 异常类型说明

| 异常类型 | 说明 |
|---------|------|
| `defrost_overlap` | 融霜重叠 |
| `probe_offline` | 探头离线 |
| `door_open_too_long` | 门长开 |
| `abnormal_defrost_energy` | 融霜能耗异常 |
| `fan_start_delay` | 风机启动延迟 |

## 验收测试流程

1. 提交原始数据分析 → session_001
2. 修改一条融霜记录
3. 提交修改后数据分析 → session_002
4. 调用对比接口 → 显示差异
