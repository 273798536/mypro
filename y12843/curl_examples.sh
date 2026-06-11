#!/bin/bash
# ==========================================
#  血液检验复测建议系统 - curl 示例脚本
# ==========================================

BASE_URL="http://localhost:5001/api"
DATA_DIR="$(cd "$(dirname "$0")" && pwd)/sample_data"

echo "=========================================="
echo "  血液检验复测建议系统 - API 示例"
echo "=========================================="
echo ""

echo "[1] 健康检查"
curl -s "$BASE_URL/health" | python3 -m json.tool
echo ""
read -p "按回车继续..."

echo ""
echo "[2] 导入第一批数据 (BATCH-20260601) - 包含4条培养记录"
echo "    其中 S001/S002/S003 含低质量读段，S003 为边界不清病例"
curl -s -X POST "$BASE_URL/import" \
  -H "Content-Type: application/json" \
  -H "X-Operator: 李技师" \
  -d @"$DATA_DIR/batch_20260601.json" | python3 -m json.tool
echo ""
read -p "按回车继续..."

echo ""
echo "[3] 优先查看: 低质量读段记录 (质控第一关)"
echo "    技师拿到复测建议时，最先看这个！"
curl -s "$BASE_URL/low-quality" | python3 -m json.tool
echo ""
read -p "按回车继续..."

echo ""
echo "[4] 日常入口: 分组统计 (日常工作界面)"
curl -s "$BASE_URL/statistics/groups" | python3 -m json.tool
echo ""
read -p "按回车继续..."

echo ""
echo "[5] 创建复核会话 - 把显微照片、试剂批号、低质量读段放入同一轮复核"
echo "    针对批次 BATCH-20260601 (sample_batch_id=1)"
curl -s -X POST "$BASE_URL/review/sessions" \
  -H "Content-Type: application/json" \
  -H "X-Operator: 王质控" \
  -d '{
    "sample_batch_id": 1,
    "session_name": "20260601批次复核 - 含低质量读段"
  }' | python3 -m json.tool
echo ""
read -p "按回车继续..."

echo ""
echo "[6] 查看复核会话详情 - 同屏显示低质量读段、显微照片、试剂批号"
echo "    注意: S003 标记为 needs_review=1，排在最前"
curl -s "$BASE_URL/review/sessions/1" | python3 -m json.tool
echo ""
read -p "按回车继续..."

echo ""
echo "[7] 提交 S003 (边界不清病例) 的复核结论 - 建议复测"
echo "    review_item_id 对应 S003 的那条 (通常是 id=3)"
curl -s -X POST "$BASE_URL/review/items/3" \
  -H "Content-Type: application/json" \
  -H "X-Operator: 王质控" \
  -d '{
    "review_notes": "读段质量普遍偏低，显微照片显示杂菌形态不典型，边界不清，疑似标本污染。结合试剂批号REAG-2026-001同批次其他样本，建议重新采样复测。",
    "review_result": "可疑",
    "conclusion_text": "样本S003低质量读段占比高，显微照片见多种形态杂菌，结合培养结果边界不清，判断为疑似污染。建议重新采集标本进行复测。",
    "conclusion_type": "suspicious",
    "retest_needed": true,
    "retest_reason": "低质量读段过多 + 形态不典型 + 疑似污染",
    "final_decision": "建议复测"
  }' | python3 -m json.tool
echo ""
read -p "按回车继续..."

echo ""
echo "[8] 提交 S001 的复核结论 - 正常报告"
curl -s -X POST "$BASE_URL/review/items/1" \
  -H "Content-Type: application/json" \
  -H "X-Operator: 王质控" \
  -d '{
    "review_notes": "低质量读段为个别情况，不影响整体判断。显微照片清晰显示革兰氏阳性球菌链状排列，结合试剂正常。",
    "review_result": "正常",
    "conclusion_text": "S001检出金黄色葡萄球菌，低质量读段仅2条不影响结论，无需复测。",
    "conclusion_type": "normal",
    "retest_needed": false,
    "final_decision": "报告发出"
  }' | python3 -m json.tool
echo ""
read -p "按回车继续..."

echo ""
echo "[9] 溯源能力测试: 从结果倒查 S003 (culture_id=3)"
echo "    验收会用这条边界不清记录倒查，看是否能回到来源和处理记录"
curl -s "$BASE_URL/trace/record/3" | python3 -m json.tool
echo ""
read -p "按回车继续..."

echo ""
echo "[10] 试剂批号溯源: 从试剂 REAG-2026-001 反查所有结论"
echo "     复盘时不用再人工查表！"
curl -s "$BASE_URL/trace/reagent/REAG-2026-001" | python3 -m json.tool
echo ""
read -p "按回车继续..."

echo ""
echo "[11] 查看 S003 当前有效的结论 (应该只有1条，防重复)"
curl -s "$BASE_URL/conclusions/active/3" | python3 -m json.tool
echo ""
read -p "按回车继续..."

echo ""
echo "[12] 月底质控视图: 月度质控报告 (2026-06)"
curl -s "$BASE_URL/statistics/monthly/2026-06" | python3 -m json.tool
echo ""
echo "=========================================="
echo "  基础流程演示完成！"
echo "  接下来请运行 ./test_duplicate.sh 测试重复导入和补录场景"
echo "=========================================="
