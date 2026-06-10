#!/bin/bash
set -e

echo "========================================="
echo " 酸洗槽浓度补加质检系统 - 导入样例数据"
echo "========================================="

echo ""
echo "📥 导入 5 条样例数据..."
echo ""

RESPONSE=$(curl -s -X POST "http://localhost:8000/api/import-sample-data")

echo "$RESPONSE" | python3 -m json.tool

echo ""
echo "✅ 样例数据导入完成！"
echo ""
echo "样例数据说明："
echo "  1. SX-2026-0601-001 - 正常记录，合格"
echo "  2. SX-2026-0602-002 - 补录数据，谱峰重叠，已人工确认"
echo "  3. SX-2026-0603-003 - 旧表数据，漏填单位，数据存疑"
echo "  4. SX-2026-0603-004 - 坏数据，试剂浓度错填(65%→650%)"
echo "  5. SX-2026-0604-005 - 混合酸，谱峰重叠严重，待复核"
echo ""
echo "访问前端界面查看: http://localhost:8000/static/index.html"
