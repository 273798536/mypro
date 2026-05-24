#!/bin/bash
set -e

BATCH_ID="$1"

if [ -z "$BATCH_ID" ]; then
  echo "Usage: $0 <batch-id>"
  exit 1
fi

echo "Exporting batch: $BATCH_ID"

curl -s -X POST "http://localhost:8080/api/v1/batches/$BATCH_ID/export" \
  -H "Content-Type: application/json" \
  -H "X-Operator-ID: SCRIPT_OP" \
  -H "X-Operator-Name: 脚本操作员" \
  -d "{}" | jq .
