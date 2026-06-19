#!/usr/bin/env bash
set -e

BASE_URL="http://127.0.0.1:5001"
SAMPLE_DIR="$(cd "$(dirname "$0")/../sample_data" && pwd)"

echo "========================================================"
echo " 事务隔离异常演示 - curl 使用示例"
echo "========================================================"
echo
echo "Base URL: $BASE_URL"
echo "示例数据: $SAMPLE_DIR"
echo

echo "--------------------------------------------------------"
echo " 1) 健康检查"
echo "--------------------------------------------------------"
echo "curl -s $BASE_URL/api/health | python3 -m json.tool"
curl -s "$BASE_URL/api/health" | python3 -m json.tool
echo

echo "--------------------------------------------------------"
echo " 2) 导入权限清单"
echo "--------------------------------------------------------"
echo "curl -s -X POST $BASE_URL/api/import/permissions \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d @$SAMPLE_DIR/permissions_batch1.json | python3 -m json.tool"
IMPORT_RESP=$(curl -s -X POST "$BASE_URL/api/import/permissions" \
    -H 'Content-Type: application/json' \
    -d "@$SAMPLE_DIR/permissions_batch1.json")
echo "$IMPORT_RESP" | python3 -m json.tool
BATCH_NO=$(echo "$IMPORT_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('batch_no',''))")
echo "  批次号: $BATCH_NO"
echo

echo "--------------------------------------------------------"
echo " 3) 重复导入演示（检测重复）"
echo "--------------------------------------------------------"
echo "curl -s -X POST $BASE_URL/api/import/permissions \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d @$SAMPLE_DIR/permissions_batch1.json | python3 -m json.tool"
curl -s -X POST "$BASE_URL/api/import/permissions" \
    -H 'Content-Type: application/json' \
    -d "@$SAMPLE_DIR/permissions_batch1.json" | python3 -m json.tool
echo

echo "--------------------------------------------------------"
echo " 4) 执行越权检测"
echo "--------------------------------------------------------"
echo "curl -s -X POST $BASE_URL/api/detect/violations \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"source_system\":\"core_db_prod\",\"operator\":\"audit_zhang\"}' | python3 -m json.tool"
curl -s -X POST "$BASE_URL/api/detect/violations" \
    -H 'Content-Type: application/json' \
    -d '{"source_system":"core_db_prod","operator":"audit_zhang"}' | python3 -m json.tool
echo

echo "--------------------------------------------------------"
echo " 5) 查看违规列表（含可用性标记）"
echo "--------------------------------------------------------"
echo "curl -s $BASE_URL/api/violations | python3 -m json.tool"
curl -s "$BASE_URL/api/violations" | python3 -m json.tool
echo

echo "--------------------------------------------------------"
echo " 6) 注册完整备份并校验"
echo "--------------------------------------------------------"
echo "curl -s -X POST $BASE_URL/api/backup/register \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d @$SAMPLE_DIR/backup_valid.json | python3 -m json.tool"
curl -s -X POST "$BASE_URL/api/backup/register" \
    -H 'Content-Type: application/json' \
    -d "@$SAMPLE_DIR/backup_valid.json" | python3 -m json.tool
echo
echo "curl -s -X POST $BASE_URL/api/backup/BK-20260615-COREDB-001/verify \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"expected_checksum\":\"a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2\",\"expected_record_count\":15420387}' | python3 -m json.tool"
curl -s -X POST "$BASE_URL/api/backup/BK-20260615-COREDB-001/verify" \
    -H 'Content-Type: application/json' \
    -d '{"expected_checksum":"a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2","expected_record_count":15420387}' | python3 -m json.tool
echo

echo "--------------------------------------------------------"
echo " 7) 注册不完整备份并校验（演示错误提示）"
echo "--------------------------------------------------------"
echo "curl -s -X POST $BASE_URL/api/backup/register \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d @$SAMPLE_DIR/backup_incomplete.json | python3 -m json.tool"
curl -s -X POST "$BASE_URL/api/backup/register" \
    -H 'Content-Type: application/json' \
    -d "@$SAMPLE_DIR/backup_incomplete.json" | python3 -m json.tool
echo
echo "curl -s -X POST $BASE_URL/api/backup/BK-20260616-COREDB-002/verify \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{}' | python3 -m json.tool"
curl -s -X POST "$BASE_URL/api/backup/BK-20260616-COREDB-002/verify" \
    -H 'Content-Type: application/json' \
    -d '{}' | python3 -m json.tool
echo

echo "--------------------------------------------------------"
echo " 8) Schema对比"
echo "--------------------------------------------------------"
echo "curl -s -X POST $BASE_URL/api/schema/compare \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d @$SAMPLE_DIR/schema_compare.json | python3 -m json.tool"
curl -s -X POST "$BASE_URL/api/schema/compare" \
    -H 'Content-Type: application/json' \
    -d "@$SAMPLE_DIR/schema_compare.json" | python3 -m json.tool
echo

echo "--------------------------------------------------------"
echo " 9) 导出审计报告 (Excel) - 保存到 audit_report.xlsx"
echo "--------------------------------------------------------"
echo "curl -s -o audit_report.xlsx $BASE_URL/api/report/export"
echo "ls -lh audit_report.xlsx"
curl -s -o audit_report.xlsx "$BASE_URL/api/report/export"
ls -lh audit_report.xlsx
echo
echo "报告已保存至: $(pwd)/audit_report.xlsx"
echo

echo "--------------------------------------------------------"
echo " 10) 回滚导入批次（如需要）"
echo "--------------------------------------------------------"
if [ -n "$BATCH_NO" ]; then
    echo "curl -s -X POST $BASE_URL/api/import/$BATCH_NO/rollback \\"
    echo "     -H 'Content-Type: application/json' -d '{}' | python3 -m json.tool"
    curl -s -X POST "$BASE_URL/api/import/$BATCH_NO/rollback" \
        -H 'Content-Type: application/json' -d '{}' | python3 -m json.tool
else
    echo "  (跳过: 无批次号)"
fi
echo

echo "========================================================"
echo " 所有 curl 示例执行完成！"
echo " 审计报告: $(pwd)/audit_report.xlsx"
echo "========================================================"
