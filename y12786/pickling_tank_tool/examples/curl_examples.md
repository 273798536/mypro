# 酸洗槽浓度补加质检系统 - curl 示例

## 基础信息
- API 基础地址: `http://localhost:8000/api`
- 在线文档: `http://localhost:8000/docs`

---

## 1. 称量单操作

### 1.1 创建称量单
```bash
curl -X POST "http://localhost:8000/api/weighing-forms/" \
    -H "Content-Type: application/json" \
    -d '{
        "batch_no": "SX-2026-0610-001",
        "tank_no": "酸洗槽#1",
        "reagent_name": "浓硝酸",
        "required_amount": 2500,
        "actual_amount": 2480,
        "unit": "mL",
        "weighing_operator": "张工",
        "weighing_date": "2026-06-10T09:30:00",
        "weighing_time": "09:30",
        "balance_no": "BL-001",
        "remarks": "日常浓度补加"
    }'
```

### 1.2 查询称量单列表
```bash
# 查询所有
curl "http://localhost:8000/api/weighing-forms/"

# 按批次号搜索
curl "http://localhost:8000/api/weighing-forms/?batch_no=SX-2026"

# 分页
curl "http://localhost:8000/api/weighing-forms/?skip=0&limit=10"
```

### 1.3 查询称量单详情（含台账、处理意见、追踪）
```bash
curl "http://localhost:8000/api/weighing-forms/{form_id}/detail"
```

### 1.4 更新称量单
```bash
curl -X PUT "http://localhost:8000/api/weighing-forms/{form_id}" \
    -H "Content-Type: application/json" \
    -d '{
        "actual_amount": 2485,
        "remarks": "更新备注信息"
    }'
```

---

## 2. 试剂台账操作

### 2.1 录入试剂台账
```bash
curl -X POST "http://localhost:8000/api/reagent-ledgers/" \
    -H "Content-Type: application/json" \
    -d '{
        "weighing_form_id": 1,
        "reagent_batch_no": "HNO3-20260415",
        "reagent_cas_no": "7697-37-2",
        "purity": "65-68%",
        "concentration": "65%",
        "concentration_value": 65,
        "concentration_unit": "%",
        "manufacturer": "国药集团化学试剂有限公司",
        "production_date": "2026-04-15T00:00:00",
        "expiry_date": "2027-04-14T00:00:00",
        "storage_condition": "阴凉通风处",
        "receiver": "李工",
        "receive_date": "2026-04-20T00:00:00",
        "usage_record": "2026-05-15 补加#2槽 2000mL"
    }'
```

### 2.2 查询试剂台账
```bash
# 按ID查询
curl "http://localhost:8000/api/reagent-ledgers/{ledger_id}"

# 按称量单ID查询
curl "http://localhost:8000/api/weighing-forms/{form_id}/reagent-ledger"
```

---

## 3. 处理意见操作

### 3.1 创建处理意见
```bash
curl -X POST "http://localhost:8000/api/treatment-opinions/" \
    -H "Content-Type: application/json" \
    -d '{
        "weighing_form_id": 1,
        "inspector": "王工",
        "inspection_date": "2026-06-10T10:00:00",
        "original_concentration": 120,
        "target_concentration": 150,
        "calculated_supplement": 2500,
        "actual_supplement": 2480,
        "spectrum_peak_overlap": false,
        "preliminary_judgment": "合格",
        "final_judgment": "合格",
        "processing_remarks": "硝酸浓度偏低，按计算量补加"
    }'
```

### 3.2 带谱峰重叠的处理意见
```bash
curl -X POST "http://localhost:8000/api/treatment-opinions/" \
    -H "Content-Type: application/json" \
    -d '{
        "weighing_form_id": 1,
        "inspector": "陈工",
        "inspection_date": "2026-06-10T10:00:00",
        "original_concentration": 105,
        "target_concentration": 130,
        "calculated_supplement": 1800,
        "actual_supplement": 1820,
        "spectrum_peak_overlap": true,
        "overlap_material": "2026-05-28 批次 304不锈钢试样",
        "overlap_details": "谱图中Fe³+峰与Cr⁶+峰发生部分重叠，干扰区域在220-230nm波长处",
        "preliminary_judgment": "待复核",
        "final_judgment": "待复核",
        "run_count": 1
    }'
```

### 3.3 重复运行分析
```bash
curl -X POST "http://localhost:8000/api/treatment-opinions/{opinion_id}/rerun"
```

### 3.4 人工确认
```bash
curl -X POST "http://localhost:8000/api/treatment-opinions/{opinion_id}/manual-confirm?operator=张主管&remarks=同意合格结论"
```

### 3.5 导出报告
```bash
curl -X POST "http://localhost:8000/api/treatment-opinions/{opinion_id}/export-report"
```

### 3.6 修改最终判断（会记录变更）
```bash
curl -X PUT "http://localhost:8000/api/treatment-opinions/{opinion_id}" \
    -H "Content-Type: application/json" \
    -d '{
        "final_judgment": "合格",
        "judgment_changed": true,
        "change_reason": "谱峰重叠已通过差谱法扣除干扰"
    }'
```

---

## 4. 补录操作

### 4.1 补录称量单数据
```bash
curl -X POST "http://localhost:8000/api/weighing-forms/{form_id}/supplement?source=纸质记录单%2320260530-001&remarks=5月30日系统故障，今日补录&operator=刘工"
```

---

## 5. 批次追踪

### 5.1 查询批次追踪记录
```bash
# 按批次号查询
curl "http://localhost:8000/api/batch-tracks/?batch_no=SX-2026-0601-001"

# 按称量单ID查询
curl "http://localhost:8000/api/batch-tracks/?form_id=1"

# 查询所有批次的追踪汇总
curl "http://localhost:8000/api/batch-tracking"
```

---

## 6. 谱峰重叠检查

### 6.1 检查谱峰重叠
```bash
curl "http://localhost:8000/api/weighing-forms/{form_id}/spectrum-overlap"
```

返回示例：
```json
{
    "has_overlap": true,
    "material": "2026-05-28 批次 304不锈钢试样",
    "details": "谱图中Fe³+峰与Cr⁶+峰发生部分重叠...",
    "final_judgment": "合格",
    "confirmer": "张主管"
}
```

---

## 7. 坏数据标记

### 7.1 标记坏数据
```bash
curl -X POST "http://localhost:8000/api/weighing-forms/{form_id}/mark-bad-data?reason=试剂浓度错填，65%误写为650%"
```

---

## 8. 导入样例数据

### 8.1 一键导入所有样例
```bash
curl -X POST "http://localhost:8000/api/import-sample-data"
```

返回示例：
```json
{
    "message": "样例数据导入成功",
    "count": 5,
    "records": [
        {
            "weighing_form_id": 1,
            "batch_no": "SX-2026-0601-001",
            "reagent_ledger_id": 1,
            "treatment_opinion_id": 1
        }
    ]
}
```

---

## 9. 坏数据示例（试剂浓度错填）

### 9.1 创建一条坏数据（故意填错浓度）
```bash
# 创建称量单
FORM_RESPONSE=$(curl -s -X POST "http://localhost:8000/api/weighing-forms/" \
    -H "Content-Type: application/json" \
    -d '{
        "batch_no": "SX-BAD-20260610-001",
        "tank_no": "酸洗槽#5",
        "reagent_name": "硝酸",
        "required_amount": 3000,
        "actual_amount": 3050,
        "unit": "mL",
        "weighing_operator": "测试员",
        "weighing_date": "2026-06-10T08:45:00",
        "weighing_time": "08:45",
        "balance_no": "BL-004",
        "remarks": "坏数据测试",
        "is_bad_data": true,
        "bad_data_reason": "试剂浓度错填：应为65%，误写为650%"
    }')

FORM_ID=$(echo "$FORM_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")

# 录入错误的试剂台账（浓度650%，明显异常）
curl -X POST "http://localhost:8000/api/reagent-ledgers/" \
    -H "Content-Type: application/json" \
    -d "{
        \"weighing_form_id\": $FORM_ID,
        \"reagent_batch_no\": \"HNO3-BAD-20260501\",
        \"purity\": \"650%\",
        \"concentration\": \"650%\",
        \"concentration_value\": 650,
        \"concentration_unit\": \"%\",
        \"manufacturer\": \"国药集团化学试剂有限公司\",
        \"remarks\": \"典型坏数据：浓度不可能达到650%，录入时多写了一个0\"
    }"

# 标记为坏数据
curl -X POST "http://localhost:8000/api/weighing-forms/$FORM_ID/mark-bad-data?reason=试剂浓度错填，65%误写为650%，导致计算补加量错误"
```

---

## 10. Python 脚本示例

```python
import requests
import json

BASE_URL = "http://localhost:8000/api"

def create_complete_record():
    """创建完整的称量单+台账+处理意见"""
    
    # 1. 创建称量单
    form_data = {
        "batch_no": "SX-PY-20260610-001",
        "tank_no": "酸洗槽#3",
        "reagent_name": "浓盐酸",
        "required_amount": 1500,
        "actual_amount": 1485,
        "unit": "mL",
        "weighing_operator": "李工"
    }
    r = requests.post(f"{BASE_URL}/weighing-forms/", json=form_data)
    form_id = r.json()["id"]
    print(f"✅ 创建称量单: ID={form_id}")
    
    # 2. 录入试剂台账
    ledger_data = {
        "weighing_form_id": form_id,
        "reagent_batch_no": "HCl-20260301",
        "purity": "36-38%",
        "concentration": "37%",
        "concentration_value": 37,
        "concentration_unit": "%"
    }
    r = requests.post(f"{BASE_URL}/reagent-ledgers/", json=ledger_data)
    print(f"✅ 录入试剂台账")
    
    # 3. 创建处理意见
    opinion_data = {
        "weighing_form_id": form_id,
        "inspector": "王工",
        "original_concentration": 110,
        "target_concentration": 130,
        "calculated_supplement": 1500,
        "actual_supplement": 1485,
        "preliminary_judgment": "合格",
        "final_judgment": "合格"
    }
    r = requests.post(f"{BASE_URL}/treatment-opinions/", json=opinion_data)
    opinion_id = r.json()["id"]
    print(f"✅ 创建处理意见: ID={opinion_id}")
    
    # 4. 人工确认
    r = requests.post(f"{BASE_URL}/treatment-opinions/{opinion_id}/manual-confirm",
                     params={"operator": "张主管", "remarks": "确认合格"})
    print(f"✅ 人工确认完成")
    
    # 5. 导出报告
    r = requests.post(f"{BASE_URL}/treatment-opinions/{opinion_id}/export-report")
    print(f"✅ 报告导出完成，版本: {r.json()['report_version']}")
    
    return form_id

if __name__ == "__main__":
    form_id = create_complete_record()
    print(f"\n🎉 完成！查看详情: {BASE_URL}/weighing-forms/{form_id}/detail")
```
