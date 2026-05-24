#!/bin/bash

BASE_URL="http://localhost:8000"

echo "========================================"
echo "水务抢修材料异常回执状态机 API 测试流程"
echo "========================================"
echo ""

echo "[1/8] 健康检查..."
curl -s "$BASE_URL/api/health" | python3 -m json.tool
echo ""

echo "[2/8] 创建批次（包含部分失败数据）..."
curl -s -X POST "$BASE_URL/api/batches" \
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
      },
      {
        "original_row_no": 2,
        "work_order_no": "WO-2024-002",
        "valve_code": "V-002",
        "valve_name": "DN50球阀",
        "inventory_before": 2,
        "used_quantity": 3,
        "inventory_after": -1,
        "repair_date": "2024-05-20T03:15:00",
        "site": "王府井大街88号",
        "construction_person": "王师傅"
      },
      {
        "original_row_no": 3,
        "work_order_no": "",
        "valve_code": "V-003",
        "valve_name": "DN80蝶阀"
      }
    ]
  }' | python3 -m json.tool
echo ""

echo "[3/8] 重复提交相同批次号（预期失败）..."
curl -s -X POST "$BASE_URL/api/batches" \
  -H "Content-Type: application/json" \
  -d '{
    "batch_no": "WATER-2024-05-001",
    "source_file_name": "重复提交测试.xlsx",
    "operator": "李四",
    "station": "西城区水务站",
    "records": []
  }' | python3 -m json.tool
echo ""

echo "[4/8] 提交批次审核..."
curl -s -X POST "$BASE_URL/api/batches/1/submit" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "operator=张三" | python3 -m json.tool
echo ""

echo "[5/8] 复核改判（主管权限）..."
curl -s -X POST "$BASE_URL/api/records/2/review" \
  -H "Content-Type: application/json" \
  -d '{
    "new_status": "approved",
    "reason": "夜间紧急抢修，先用料后补录属正常流程，现场照片已核实",
    "operator": "王主管",
    "permission_level": "supervisor"
  }' | python3 -m json.tool
echo ""

echo "[6/8] 冻结批次结算..."
curl -s -X POST "$BASE_URL/api/batches/1/freeze" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "月末结算前冻结，准备导出报表",
    "operator": "财务_刘姐"
  }' | python3 -m json.tool
echo ""

echo "[7/8] 尝试冻结后改判（预期失败）..."
curl -s -X POST "$BASE_URL/api/records/1/review" \
  -H "Content-Type: application/json" \
  -d '{
    "new_status": "rejected",
    "reason": "测试冻结后修改",
    "operator": "王主管",
    "permission_level": "supervisor"
  }' | python3 -m json.tool
echo ""

echo "[8/8] 导出批次汇总（站点负责人查看）..."
curl -s "$BASE_URL/api/batches/1/export" | python3 -m json.tool
echo ""

echo "========================================"
echo "基础流程测试完成"
echo "========================================"
echo ""
echo "查看失败记录清单: curl -s $BASE_URL/api/batches/1/failed-records | python3 -m json.tool"
echo "查看记录状态历史: curl -s $BASE_URL/api/records/2/history | python3 -m json.tool"
echo "查看改判历史: curl -s $BASE_URL/api/records/2/overrides | python3 -m json.tool"
echo ""
