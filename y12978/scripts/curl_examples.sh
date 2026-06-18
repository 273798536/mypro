#!/bin/bash
# 常用 curl 示例

BASE_URL="http://127.0.0.1:8000"

echo "=== curl 示例 ==="
echo ""

echo "# 1. 日常备份校验"
echo "curl -s ${BASE_URL}/api/audit/backup-check | python -m json.tool"
echo ""

echo "# 2. 月底权限审计"
echo "curl -s ${BASE_URL}/api/audit/permission | python -m json.tool"
echo ""

echo "# 3. 筛选索引失效记录"
echo "curl -s '${BASE_URL}/api/audit/records?status=index_invalid' | python -m json.tool"
echo ""

echo "# 4. 追溯完整链路 (用上面查到的 conclusion_id)"
echo "curl -s ${BASE_URL}/api/audit/trace/2 | python -m json.tool"
echo ""

echo "# 5. 查看数据字典"
echo "curl -s ${BASE_URL}/api/dictionary | python -m json.tool"
echo ""

echo "# 6. 查看源记录(含原始行号和来源备注)"
echo "curl -s ${BASE_URL}/api/source/records | python -m json.tool"
echo ""

echo "# 7. 对单条源记录做时区字段比对"
echo "curl -s ${BASE_URL}/api/audit/timezone-compare/1 | python -m json.tool"
echo ""

echo "# 8. 执行去重检测 (防止同一件事两份结论)"
echo "curl -s -X POST ${BASE_URL}/api/audit/deduplicate | python -m json.tool"
echo ""

echo "# 9. 新增数据字典条目"
echo "curl -s -X POST ${BASE_URL}/api/dictionary \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"table_name\":\"new_table\",\"column_name\":\"created_at\",\"expected_timezone\":\"UTC\"}' | python -m json.tool"
echo ""

echo "# 10. 新增源记录 (保留原始行号/来源备注)"
echo "curl -s -X POST ${BASE_URL}/api/source/record \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"source_table\":\"user_login\",\"source_row_number\":999,\"source_file\":\"user_login_20260618.csv\",\"source_remark\":\"日常导入\",\"import_batch\":\"BATCH-TEST\",\"column_name\":\"login_time\",\"column_value\":\"2026-06-18 10:00:00+08:00\",\"detected_timezone\":\"Asia/Shanghai\"}' | python -m json.tool"
