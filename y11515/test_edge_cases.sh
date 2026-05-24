#!/bin/bash

BASE_URL="http://localhost:8000"

echo "========================================"
echo "边界情况测试"
echo "========================================"
echo ""

echo "[1] 撤回后再提交测试..."
echo ""

echo "1.1 创建新批次..."
BATCH_RESPONSE=$(curl -s -X POST "$BASE_URL/api/batches" \
  -H "Content-Type: application/json" \
  -d '{
    "batch_no": "WATER-2024-05-002",
    "source_file_name": "测试撤回批次.xlsx",
    "operator": "测试员",
    "station": "测试水务站",
    "records": [
      {
        "original_row_no": 1,
        "work_order_no": "WO-TEST-001",
        "valve_code": "V-TEST-001",
        "valve_name": "测试阀门"
      }
    ]
  }')
echo "$BATCH_RESPONSE" | python3 -m json.tool
echo ""

echo "1.2 提交审核..."
curl -s -X POST "$BASE_URL/api/batches/2/submit" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "operator=测试员" | python3 -m json.tool
echo ""

echo "1.3 撤回记录..."
curl -s -X POST "$BASE_URL/api/records/3/withdraw" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "operator=测试员&reason=信息不全需要补充" | python3 -m json.tool
echo ""

echo "1.4 查看撤回后的状态..."
curl -s "$BASE_URL/api/records/3" | python3 -m json.tool
echo ""

echo "1.5 撤回后重新提交..."
curl -s -X POST "$BASE_URL/api/batches/2/submit" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "operator=测试员" | python3 -m json.tool
echo ""

echo "1.6 查看状态历史..."
curl -s "$BASE_URL/api/records/3/history" | python3 -m json.tool
echo ""

echo "[2] 人工改判前后对比..."
echo ""

echo "2.1 改判前状态..."
curl -s "$BASE_URL/api/records/3" | python3 -m json.tool
echo ""

echo "2.2 执行人工改判..."
curl -s -X POST "$BASE_URL/api/records/3/review" \
  -H "Content-Type: application/json" \
  -d '{
    "new_status": "approved",
    "reason": "经核实，该抢修为应急事件，流程合规",
    "operator": "李总监",
    "permission_level": "supervisor"
  }' | python3 -m json.tool
echo ""

echo "2.3 改判后查看详情..."
curl -s "$BASE_URL/api/records/3" | python3 -m json.tool
echo ""

echo "2.4 查看改判历史（原始证据保留）..."
curl -s "$BASE_URL/api/records/3/overrides" | python3 -m json.tool
echo ""

echo "[3] 冻结和解冻测试..."
echo ""

echo "3.1 冻结批次..."
curl -s -X POST "$BASE_URL/api/batches/2/freeze" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "审计核查中",
    "operator": "审计员"
  }' | python3 -m json.tool
echo ""

echo "3.2 冻结状态下尝试上传附件（预期失败）..."
echo "  跳过附件上传测试（需要真实文件）"
echo ""

echo "3.3 解冻批次..."
curl -s -X POST "$BASE_URL/api/batches/2/unfreeze" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "审计完成，恢复正常流程",
    "operator": "审计员"
  }' | python3 -m json.tool
echo ""

echo "3.4 查看批次状态历史..."
curl -s "$BASE_URL/api/batches/2" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print('批次状态:', data['status'])
print('是否冻结:', data['is_frozen'])
"
echo ""

echo "========================================"
echo "边界情况测试完成"
echo "========================================"
echo ""
