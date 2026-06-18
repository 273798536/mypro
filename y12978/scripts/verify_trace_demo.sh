#!/bin/bash
# 验收用: 拿一条索引失效记录倒查
set -e

BASE_URL="http://127.0.0.1:8000"

echo "=== 验收: 索引失效记录倒查 ==="
echo ""

echo "[Step 1] 查索引失效记录列表..."
RECORDS=$(curl -s "${BASE_URL}/api/audit/records?status=index_invalid")
echo "$RECORDS" | python -m json.tool

CONCLUSION_ID=$(echo "$RECORDS" | python -c "import json,sys;d=json.load(sys.stdin);print(d[0]['id'] if d else '')")
if [ -z "$CONCLUSION_ID" ]; then
    echo "没有找到索引失效记录"
    exit 1
fi

echo ""
echo "[Step 2] 用结论ID=$CONCLUSION_ID 追溯完整链路 (结论→来源→处理记录→字典)..."
curl -s "${BASE_URL}/api/audit/trace/${CONCLUSION_ID}" | python -m json.tool

echo ""
echo "[Step 3] 查看重复导入去重结果..."
curl -s -X POST "${BASE_URL}/api/audit/deduplicate" | python -m json.tool

echo ""
echo "验收完成."
