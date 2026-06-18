#!/bin/bash
set -e

BASE_URL="http://127.0.0.1:8000"

echo "=== 日常入口: 备份校验 ==="
echo ""
echo "[1/3] 运行备份校验..."
curl -s "${BASE_URL}/api/audit/backup-check" | python -m json.tool

echo ""
echo "[2/3] 查看索引失效记录..."
curl -s "${BASE_URL}/api/audit/records?status=index_invalid" | python -m json.tool

echo ""
echo "[3/3] 查看重复结论..."
curl -s "${BASE_URL}/api/audit/records?status=pass&audit_type=backup" | python -c "
import json,sys
data=json.load(sys.stdin)
dups=[c for c in data if c.get('is_duplicate')]
print(json.dumps(dups, indent=2, ensure_ascii=False))
print(f'共 {len(dups)} 条重复结论')
"

echo ""
echo "备份校验完成."
