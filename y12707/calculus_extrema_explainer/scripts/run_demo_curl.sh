#!/bin/bash
# 微积分极值讲解器 - 端到端跑通脚本 (使用 curl)
# 从空目录开始：启动 -> 初始化 -> 导入数据 -> 建批 -> 处理 -> 看异常 -> 复核 -> 导出

BASE_URL="http://127.0.0.1:5000"
DATA_DIR="$(cd "$(dirname "$0")/../data" && pwd)"
SAMPLE="$DATA_DIR/sample_data.json"

echo "=========================================="
echo " 微积分极值讲解器 - 端到端流程 (curl)"
echo "=========================================="

echo
echo "[1/8] 健康检查 & 初始化数据库..."
curl -s "$BASE_URL/health" | python3 -m json.tool
curl -s -X POST "$BASE_URL/init" | python3 -m json.tool

echo
echo "[2/8] 导入学生..."
curl -s -X POST "$BASE_URL/students" \
  -H "Content-Type: application/json" \
  -d "$(python3 -c "import json; print(json.dumps(json.load(open('$SAMPLE'))['students']))")" \
  | python3 -m json.tool

echo
echo "[3/8] 导入题目..."
curl -s -X POST "$BASE_URL/questions" \
  -H "Content-Type: application/json" \
  -d "$(python3 -c "import json; print(json.dumps(json.load(open('$SAMPLE'))['questions']))")" \
  | python3 -m json.tool

echo
echo "[4/8] 导入学生错题 (含历史评分缺失的记录)..."
WA_IDS=$(curl -s -X POST "$BASE_URL/wrong_answers" \
  -H "Content-Type: application/json" \
  -d "$(python3 -c "import json; print(json.dumps(json.load(open('$SAMPLE'))['wrong_answers']))")" \
  | python3 -c "import sys,json; print(','.join(map(str,json.load(sys.stdin)['ids'])))")
echo "  错题IDs: $WA_IDS"

echo
echo "[5/8] 创建处理批次并挂接错题..."
BATCH_RESP=$(curl -s -X POST "$BASE_URL/batches" \
  -H "Content-Type: application/json" \
  -d "{\"batch_code\":\"BATCH_$(date +%Y%m%d_%H%M%S)\",\"batch_name\":\"演示批次_学生错题极值分析\",\"wrong_answer_ids\":[$WA_IDS]}")
echo "$BATCH_RESP" | python3 -m json.tool
BATCH_ID=$(echo "$BATCH_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

echo
echo "[6/8] 执行批次处理 (约束校验 + 误差分析 共用同一批记录)..."
curl -s -X POST "$BASE_URL/batches/$BATCH_ID/process" | python3 -m json.tool

echo
echo "[7/8] 查看异常列表 (含历史评分缺失缺口 和 除零边界违规)..."
ANOMALIES=$(curl -s "$BASE_URL/anomalies")
echo "$ANOMALIES" | python3 -m json.tool

echo
echo "[8/8] 【复核入口】以风控分析师身份对第一条异常给出处理意见..."
FIRST_AID=$(echo "$ANOMALIES" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['id'] if d else '')")
if [ -n "$FIRST_AID" ]; then
  echo "  对异常 ID=$FIRST_AID 进行复核..."
  curl -s -X POST "$BASE_URL/anomalies/$FIRST_AID/review" \
    -H "Content-Type: application/json" \
    -d '{"reviewer":"风控分析师_老王","decision":"补充历史评分后重新处理","handling_opinion":"已联系教学组补录S2024002同学Q_EXT_001的历史评分(4.2分)，可重新跑批","supplemental_data":"historical_score=4.2"}' \
    | python3 -m json.tool

  echo
  echo "【异常回溯】顺着异常 ID=$FIRST_AID 反查到学生错题和处理意见..."
  curl -s "$BASE_URL/anomalies/$FIRST_AID/trace" | python3 -m json.tool
fi

echo
echo "【导出结果】批次结果导出为 CSV..."
curl -s -o "/tmp/batch_export_$$.csv" "$BASE_URL/batches/$BATCH_ID/export?format=csv"
echo "  已导出到 /tmp/batch_export_$$.csv"

echo
echo "=========================================="
echo " 流程完成。可访问："
echo "  - 所有批次:   $BASE_URL/batches"
echo "  - 异常列表:   $BASE_URL/anomalies"
echo "  - 待补缺口:   $BASE_URL/gaps"
echo "  - 全部错题:   $BASE_URL/wrong_answers"
echo "=========================================="
