#!/bin/bash
set -e

BASE_URL="${1:-http://localhost:5001}"

echo "========================================="
echo "  危化品领用审计 - 完整流程演示"
echo "========================================="
echo ""

echo "步骤1: 查看可用试剂列表"
echo "-----------------------------------------"
curl -s "$BASE_URL/api/reagents" | python3 -m json.tool
echo ""

echo "步骤2: 登记一笔 pH 越界的领用（浓硫酸 pH=5.0，标准 0-1）"
echo "-----------------------------------------"
REQ1=$(curl -s -X POST "$BASE_URL/api/requisitions" \
  -H "Content-Type: application/json" \
  -d '{
    "reagent_id": 1,
    "concentration": 96.0,
    "ph_value": 5.0,
    "quantity": 500,
    "unit": "ml",
    "project_group": "有机合成一组",
    "applicant": "张三",
    "apply_date": "2026-06-09",
    "purpose": "小试实验前预处理"
  }')
echo "$REQ1" | python3 -m json.tool
REQ1_ID=$(echo "$REQ1" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo ""

echo "步骤3: 登记一笔浓度错填的领用（盐酸 20%，标准 36%-38%）"
echo "-----------------------------------------"
REQ2=$(curl -s -X POST "$BASE_URL/api/requisitions" \
  -H "Content-Type: application/json" \
  -d '{
    "reagent_id": 3,
    "concentration": 20.0,
    "ph_value": 0.5,
    "quantity": 250,
    "unit": "ml",
    "project_group": "材料催化组",
    "applicant": "李四",
    "apply_date": "2026-06-10",
    "purpose": "催化剂酸洗"
  }')
echo "$REQ2" | python3 -m json.tool
REQ2_ID=$(echo "$REQ2" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo ""

echo "步骤4: 导出第一笔领用的审计报告（pH越界，未补材料）"
echo "-----------------------------------------"
curl -s "$BASE_URL/api/requisitions/$REQ1_ID/report"
echo ""

echo "步骤5: 为第一笔领用补充安全备注（pH检测记录），系统自动复核"
echo "-----------------------------------------"
REMARK1=$(curl -s -X POST "$BASE_URL/api/requisitions/$REQ1_ID/remarks" \
  -H "Content-Type: application/json" \
  -d '{
    "remark_text": "本批次浓硫酸实测pH 5.0，因含有少量有机酸缓冲体系，属正常现象，附pH检测原始记录扫描件见附件20260610-pH-001.pdf，组长已签字确认。",
    "operator": "王质检"
  }')
echo "$REMARK1" | python3 -m json.tool
echo ""

echo "步骤6: 再次导出第一笔领用报告（pH异常已闭环，配平已更新）"
echo "-----------------------------------------"
curl -s "$BASE_URL/api/requisitions/$REQ1_ID/report"
echo ""

echo "步骤7: 查看第二笔领用详情（浓度错填严重，需改口径）"
echo "-----------------------------------------"
curl -s "$BASE_URL/api/requisitions/$REQ2_ID" | python3 -m json.tool
echo ""

echo "步骤8: 导出第二笔领用报告（课题组仅看报告也能明白为什么被拦）"
echo "-----------------------------------------"
curl -s "$BASE_URL/api/requisitions/$REQ2_ID/report"
echo ""

echo "========================================="
echo "  演示完毕，共登记2笔领用，1笔补材料闭环，1笔需改口径"
echo "========================================="
