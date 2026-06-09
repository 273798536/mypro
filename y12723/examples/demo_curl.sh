#!/bin/bash

BASE_URL="http://127.0.0.1:5000"

echo "=========================================="
echo " 随机游走路径复盘 - curl 示例脚本"
echo "=========================================="
echo ""

echo "[1/8] 健康检查..."
curl -s "$BASE_URL/api/health" | python3 -m json.tool
echo ""

echo "[2/8] 导入第一批错题数据 (BATCH-2026-06-A)..."
curl -s -X POST "$BASE_URL/api/import" \
  -H "Content-Type: application/json" \
  -d '{
    "batch_id": "BATCH-2026-06-A",
    "file_name": "错题表_20260601.xlsx",
    "operator": "张分析师",
    "note": "6月上旬日常导入",
    "records": [
      {
        "student_no": "S2024001",
        "student_name": "李明",
        "grade": "高一",
        "question_id": "MATH-001",
        "subject": "数学",
        "knowledge_point": "函数单调性",
        "wrong_count": 2,
        "walk_path": [
          {"from": "集合", "to": "函数概念", "prob": 0.8, "visit": 3},
          {"from": "函数概念", "to": "函数单调性", "prob": 0.6, "visit": 2}
        ]
      },
      {
        "student_no": "S2024001",
        "student_name": "李明",
        "grade": "高一",
        "question_id": "MATH-005",
        "subject": "数学",
        "knowledge_point": "三角函数",
        "wrong_count": 1,
        "data_status": "pending_review",
        "status_reason": "原始答题卡缺失部分信息"
      },
      {
        "student_no": "S2024002",
        "student_name": "王芳",
        "grade": "高一",
        "question_id": "PHY-003",
        "subject": "物理",
        "knowledge_point": "牛顿第二定律",
        "wrong_count": 3,
        "data_status": "need_recollect",
        "status_reason": "采集设备异常，需重测"
      }
    ]
  }' | python3 -m json.tool
echo ""

echo "[3/8] 尝试重复导入同一批次 (应报冲突)..."
curl -s -X POST "$BASE_URL/api/import" \
  -H "Content-Type: application/json" \
  -d '{
    "batch_id": "BATCH-2026-06-A",
    "records": []
  }' | python3 -m json.tool
echo ""

echo "[4/8] 查询学生 S2024001 的全部错题..."
curl -s "$BASE_URL/api/wrong-questions?student_no=S2024001" | python3 -m json.tool
echo ""

echo "[5/8] 风控分析师人工修正：将待确认改为通过，记录原因..."
FIRST_WQ=$(curl -s "$BASE_URL/api/wrong-questions?student_no=S2024001" | python3 -c "import sys,json; items=json.load(sys.stdin); print(items[0]['id'] if items else '')")
if [ -n "$FIRST_WQ" ]; then
  curl -s -X POST "$BASE_URL/api/wrong-questions/$FIRST_WQ/correct" \
    -H "Content-Type: application/json" \
    -d '{
      "new_status": "passed",
      "new_wrong_count": 1,
      "reason": "学生已提交订正，经老师确认思路正确，原答案誊录有误",
      "operator": "风控分析师-陈"
    }' | python3 -m json.tool
fi
echo ""

echo "[6/8] 历史对比（月底/课前使用）..."
curl -s "$BASE_URL/api/walk-path/compare?student_no=S2024001" | python3 -m json.tool
echo ""

echo "[7/8] 导出图表 (日常入口 - 状态分布)..."
curl -s -o exports/demo_status_chart.png "$BASE_URL/api/export/chart?type=status"
echo "图表已保存至 exports/demo_status_chart.png"

curl -s -o exports/demo_data_status.png "$BASE_URL/api/export/chart?type=data_status"
echo "数据可用性图表已保存至 exports/demo_data_status.png"
echo ""

echo "[8/8] 导出仪表盘概览 (给投委会准备前查看)..."
curl -s "$BASE_URL/api/export/dashboard" | python3 -m json.tool
echo ""

echo "=========================================="
echo " 示例流程执行完毕。"
echo " 可用数据：数学-函数单调性（已通过人工复核）"
echo " 暂缓数据：数学-三角函数（待复核，答题卡信息不全）"
echo " 需重采：物理-牛顿第二定律（设备异常）"
echo "=========================================="
