#!/bin/bash
set -e

BASE_URL="http://127.0.0.1:8000"

echo "=== 月底/课前入口: 权限审计 ==="
echo ""
echo "[1/3] 运行权限审计..."
curl -s "${BASE_URL}/api/audit/permission" | python -m json.tool

echo ""
echo "[2/3] 查看未授权批次关联的源记录..."
curl -s "${BASE_URL}/api/source/records" | python -c "
import json,sys
data=json.load(sys.stdin)
from collections import Counter
batches=Counter([s.get('import_batch') for s in data])
for b,c in batches.most_common():
    print(f'批次 {b}: {c} 条记录')
"

echo ""
echo "[3/3] 查看补录待复核记录..."
curl -s "${BASE_URL}/api/audit/records?status=pending&audit_type=permission" | python -m json.tool

echo ""
echo "权限审计完成."
