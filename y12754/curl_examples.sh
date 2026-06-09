#!/bin/bash
BASE_URL="http://localhost:5001"

echo "==== 1. 查看试剂列表 ===="
curl -s "$BASE_URL/api/reagents" | python3 -m json.tool
echo ""

echo "==== 2. 查看所有领用记录 ===="
curl -s "$BASE_URL/api/requisitions" | python3 -m json.tool
echo ""

echo "==== 3. 登记领用（pH越界案例） ===="
curl -s -X POST "$BASE_URL/api/requisitions" \
  -H "Content-Type: application/json" \
  -d '{
    "reagent_id": 1,
    "concentration": 96.0,
    "ph_value": 5.0,
    "quantity": 500,
    "unit": "ml",
    "project_group": "有机合成一组",
    "applicant": "张三",
    "apply_date": "2026-06-10",
    "purpose": "小试实验"
  }' | python3 -m json.tool
echo ""

echo "==== 4. 登记领用（浓度错填案例，偏离大，需改口径） ===="
curl -s -X POST "$BASE_URL/api/requisitions" \
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
  }' | python3 -m json.tool
echo ""

echo "==== 5. 查看某笔领用详情（含异常、备注、配平、日志） ===="
curl -s "$BASE_URL/api/requisitions/1" | python3 -m json.tool
echo ""

echo "==== 6. 对某笔领用补充安全备注（系统自动重新审计+更新配平） ===="
curl -s -X POST "$BASE_URL/api/requisitions/1/remarks" \
  -H "Content-Type: application/json" \
  -d '{
    "remark_text": "本批次浓硫酸实测pH 5.0，因含有少量有机酸缓冲体系，属正常现象，附pH检测原始记录扫描件见附件20260610-pH-001.pdf。",
    "operator": "王质检"
  }' | python3 -m json.tool
echo ""

echo "==== 7. 手动触发重新审计 ===="
curl -s -X POST "$BASE_URL/api/requisitions/1/audit" | python3 -m json.tool
echo ""

echo "==== 8. 导出纯文本审计报告（含普通话解释、异常分类、人工备注原话） ===="
curl -s "$BASE_URL/api/requisitions/1/report"
echo ""

echo "==== 9. 导出 JSON 格式报告 ===="
curl -s "$BASE_URL/api/requisitions/1/report?format=json" | python3 -m json.tool
echo ""
