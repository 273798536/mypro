# 水务抢修材料异常回执状态机 API - 快速启动指南

## 快速启动

```bash
# 1. 启动服务
chmod +x start.sh && ./start.sh

# 2. 查看 API 文档
# 浏览器访问: http://localhost:8000/docs
```

## 核心功能 curl 命令顺序

### 1. 创建批次（导入数据）
```bash
curl -X POST "http://localhost:8000/api/batches" \
  -H "Content-Type: application/json" \
  -d '{
    "batch_no": "WATER-2024-05-001",
    "source_file_name": "夜间抢修材料清单_20240520.xlsx",
    "operator": "张三",
    "station": "东城区水务站",
    "records": [
      {
        "original_row_no": 1,
        "work_order_no": "WO-2024-001",
        "valve_code": "V-001",
        "valve_name": "DN100闸阀",
        "inventory_before": 5,
        "used_quantity": 3,
        "inventory_after": 2,
        "repair_date": "2024-05-20T02:30:00",
        "site": "东单大街12号",
        "construction_person": "李师傅"
      }
    ]
  }'
```

### 2. 补传现场照片（单条记录）
```bash
curl -X POST "http://localhost:8000/api/records/1/attachments" \
  -F "file=@site_photo.jpg" \
  -F "attachment_type=site_photo" \
  -F "uploaded_by=张三" \
  -F "description=夜间抢修现场照片"
```

### 3. 补传门店交接纸（批次级别）
```bash
curl -X POST "http://localhost:8000/api/batches/1/attachments" \
  -F "file=@handover_paper.pdf" \
  -F "attachment_type=handover_paper" \
  -F "uploaded_by=张三" \
  -F "description=门店交接单扫描件"
```

### 4. 提交批次审核
```bash
curl -X POST "http://localhost:8000/api/batches/1/submit" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "operator=张三"
```

### 5. 复核改判（主管权限）
```bash
curl -X POST "http://localhost:8000/api/records/1/review" \
  -H "Content-Type: application/json" \
  -d '{
    "new_status": "approved",
    "reason": "夜间紧急抢修，先用料后补录属正常流程，现场照片已核实",
    "operator": "王主管",
    "permission_level": "supervisor"
  }'
```

### 6. 冻结结算（导出前）
```bash
curl -X POST "http://localhost:8000/api/batches/1/freeze" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "月末结算前冻结，准备导出报表",
    "operator": "财务_刘姐"
  }'
```

### 7. 导出汇总报表（站点负责人查看）
```bash
curl "http://localhost:8000/api/batches/1/export" | python3 -m json.tool
```

### 8. 撤回归档
```bash
curl -X POST "http://localhost:8000/api/batches/1/archive" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "operator=管理员&reason=流程完成，归档保存"
```

## 边界情况验证命令

### 查看失败记录清单
```bash
curl "http://localhost:8000/api/batches/1/failed-records" | python3 -m json.tool
```

### 查看单条记录状态历史
```bash
curl "http://localhost:8000/api/records/1/history" | python3 -m json.tool
```

### 查看改判历史（原始证据）
```bash
curl "http://localhost:8000/api/records/1/overrides" | python3 -m json.tool
```

### 查看附件列表
```bash
curl "http://localhost:8000/api/records/1/attachments" | python3 -m json.tool
```

### 查询负库存记录
```bash
curl "http://localhost:8000/api/records?is_negative=true" | python3 -m json.tool
```

## 状态流转图

```
draft → submitted → under_review → approved → frozen → archived
  ↓          ↓            ↓           ↓
withdrawn  withdrawn    withdrawn    archived
  ↓
submitted (重新提交)
```

## 数据保留说明

1. **原始数据保留**: `original_record_data` 表保存导入时的原始值、来源文件、行号
2. **状态轨迹**: `*_state_histories` 表记录每次状态变更，包括操作人、时间、原因
3. **改判证据**: `override_records` 表保存人工改判记录，不覆盖原始状态
4. **冻结快照**: 导出时包含冻结前后状态、冻结原因、冻结操作人

## 测试脚本

```bash
# 完整流程测试
./test_flow.sh

# 边界情况测试
./test_edge_cases.sh
```
