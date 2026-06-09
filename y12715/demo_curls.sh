#!/bin/bash
set -e
BASE_URL="${1:-http://localhost:5001}"

echo "============================================"
echo " 组合计数错题归因 - API 调用示例 (curl)"
echo "============================================"
echo ""

echo "【1】初始化示例数据（清空并加载6条错题样例）"
echo "---"
curl -s -X POST "$BASE_URL/api/init-sample" | python3 -m json.tool
echo ""
echo ""

echo "【2】获取全部错题列表"
echo "---"
curl -s "$BASE_URL/api/questions" | python3 -m json.tool | head -60
echo ""
echo ""

echo "【3】按状态筛选（只看待确认 pending）"
echo "---"
curl -s "$BASE_URL/api/questions?status=pending" | python3 -m json.tool | head -40
echo ""
echo ""

echo "【4】查看单题详情（含审核留痕+约束校验）"
echo "---"
curl -s "$BASE_URL/api/questions/1" | python3 -m json.tool
echo ""
echo ""

echo "【5】新增一条错题（需保留原始行号/图片名/来源备注）"
echo "---"
curl -s -X POST "$BASE_URL/api/questions" \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "S2024999",
    "student_name": "测试学生",
    "question_content": "从6人中选4人排成一排，甲不在排头也不在排尾的排法？",
    "correct_answer": "P(4,2)*P(4,2)=288",
    "student_answer": "P(6,4)=360",
    "source_type": "excel",
    "source_ref": "约束排列专题第3行",
    "source_note": "周测卷第12题，扫描件 exam_2024_06_01.png",
    "attribution_category": "约束条件忽略",
    "attribution_reason": "未考虑甲的特殊位置",
    "status": "pending",
    "data_quality": "available"
  }' | python3 -m json.tool
echo ""
echo ""

echo "【6】风控分析师人工修正（状态从待确认→已通过，留痕）"
echo "---"
curl -s -X PUT "$BASE_URL/api/questions/1" \
  -H "Content-Type: application/json" \
  -d '{
    "analyst_name": "风控-李老师",
    "change_reason": "复核通过，归因结论与来源材料一致，公式混淆判定正确",
    "status": "approved",
    "attribution_category": "公式混淆",
    "attribution_reason": "学生将排列数P(5,3)=60当成组合数C(5,3)=10，未除以3!",
    "source_type": "excel",
    "source_ref": "习题册A第12行",
    "source_note": "期中测验卷扫描页3"
  }' | python3 -m json.tool
echo ""
echo ""

echo "【7】批量复核：多条待确认 → 已通过"
echo "---"
curl -s -X POST "$BASE_URL/api/questions/batch-review" \
  -H "Content-Type: application/json" \
  -d '{
    "ids": [2, 6],
    "status": "approved",
    "change_reason": "批量复核，归因均已核对来源材料",
    "analyst_name": "风控-批量"
  }' | python3 -m json.tool
echo ""
echo ""

echo "【8】查看该题的审核留痕历史（能说清前后变化）"
echo "---"
curl -s "$BASE_URL/api/questions/1/audit-logs" | python3 -m json.tool
echo ""
echo ""

echo "【9】对某题执行约束校验（把结论拉回来源材料）"
echo "---"
curl -s -X POST "$BASE_URL/api/questions/3/constraint-check" | python3 -m json.tool
echo ""
echo ""

echo "【10】获取统计数据"
echo "---"
curl -s "$BASE_URL/api/statistics" | python3 -m json.tool
echo ""
echo ""

echo "【11】导出图表 - 状态分布PNG"
echo "---"
curl -s -o /tmp/status.png "$BASE_URL/api/export/chart/status.png" && echo "已保存到 /tmp/status.png ($(wc -c < /tmp/status.png) bytes)"
echo ""

echo "【12】导出图表 - 综合图表PNG"
echo "---"
curl -s -o /tmp/combined.png "$BASE_URL/api/export/chart/combined.png" && echo "已保存到 /tmp/combined.png ($(wc -c < /tmp/combined.png) bytes)"
echo ""

echo "【13】导出全部错题 Excel"
echo "---"
curl -s -o /tmp/wrong_questions.xlsx "$BASE_URL/api/export/questions.xlsx" && echo "已保存到 /tmp/wrong_questions.xlsx ($(wc -c < /tmp/wrong_questions.xlsx) bytes)"
echo ""

echo "【14】导出审核留痕 Excel"
echo "---"
curl -s -o /tmp/audit_logs.xlsx "$BASE_URL/api/export/audit-logs.xlsx" && echo "已保存到 /tmp/audit_logs.xlsx ($(wc -c < /tmp/audit_logs.xlsx) bytes)"
echo ""

echo "============================================"
echo "全部示例执行完毕 ✓"
echo "  风控工作台: $BASE_URL/"
echo "  学生查看:   $BASE_URL/student"
echo "============================================"
