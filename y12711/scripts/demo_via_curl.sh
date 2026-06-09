#!/usr/bin/env bash
# =============================================================================
# 同事从空目录跑通全流程的 curl 示例
#
# 先在一个终端启动本地 HTTP 服务：
#     python3 scripts/http_server.py --port 8765
#
# 然后另一个终端执行：
#     bash scripts/demo_via_curl.sh
# =============================================================================
set -euo pipefail

BASE="http://127.0.0.1:8765"

echo "=== [1/6] 初始化数据库 ==="
curl -s "$BASE/api/init" | python3 -m json.tool

echo ""
echo "=== [2/6] 导入三种口径数据 ==="
echo "--- 历史答案 ---"
curl -s -X POST "$BASE/api/import" \
  -H "Content-Type: application/json" \
  -d '{"file":"samples/historical_answers.json","source":"historical_answers"}' \
  | python3 -m json.tool

echo ""
echo "--- 学生错题 ---"
curl -s -X POST "$BASE/api/import" \
  -H "Content-Type: application/json" \
  -d '{"file":"samples/student_mistakes.csv","source":"student_mistakes"}' \
  | python3 -m json.tool

echo ""
echo "--- 题目清单 ---"
curl -s -X POST "$BASE/api/import" \
  -H "Content-Type: application/json" \
  -d '{"file":"samples/question_list.tsv","source":"question_list"}' \
  | python3 -m json.tool

echo ""
echo "=== [3/6] 执行多目标调参计算 ==="
curl -s -X POST "$BASE/api/run" -H "Content-Type: application/json" -d '{}' \
  | python3 -m json.tool

echo ""
echo "=== [4/6] 查看 Q1003 公式前后差异（外推越界样例） ==="
curl -s "$BASE/api/trace?question=Q1003" | python3 -m json.tool

echo ""
echo "=== [5/6] 列出所有边界异常（教研编辑待复核） ==="
curl -s "$BASE/api/edges" | python3 -m json.tool

echo ""
echo "=== [6/6] 生成投委会报告（JSON 摘要） ==="
curl -s "$BASE/api/report" | python3 -m json.tool

echo ""
echo "=== 完成 ==="
echo "单题 JSON 报告："
echo "  curl -s '$BASE/api/report?question=Q1003' | python3 -m json.tool"
echo "复核某条计算记录（adjust）："
echo "  curl -s -X POST '$BASE/api/review' \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"calculation_id\":1,\"action\":\"adjust\",\"note\":\"人工修正\",\"parameter_adjustment\":{\"adjusted_value\":0.8}}' | python3 -m json.tool"
