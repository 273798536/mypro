#!/bin/bash
set -e

STORE_ID="${1:-STORE001}"
STORE_NAME="${2:-朝阳门店}"

echo "Creating batch for store: $STORE_ID - $STORE_NAME"

curl -s -X POST http://localhost:8080/api/v1/batches \
  -H "Content-Type: application/json" \
  -H "X-Operator-ID: SCRIPT_OP" \
  -H "X-Operator-Name: 脚本操作员" \
  -d "{
    \"store_id\": \"$STORE_ID\",
    \"store_name\": \"$STORE_NAME\"
  }" | jq .
