#!/bin/bash
set -e

BATCH_ID="$1"
ACTION="$2"
REASON="${3:-操作}"

if [ -z "$BATCH_ID" ] || [ -z "$ACTION" ]; then
  echo "Usage: $0 <batch-id> <submit|recall|review|approve|reject|partial|freeze|cancel> [reason]"
  exit 1
fi

echo "Changing status of batch $BATCH_ID: $ACTION"

curl -s -X POST "http://localhost:8080/api/v1/batches/$BATCH_ID/$ACTION" \
  -H "Content-Type: application/json" \
  -H "X-Operator-ID: SCRIPT_OP" \
  -H "X-Operator-Name: 脚本操作员" \
  -d "{
    \"reason\": \"$REASON\"
  }" | jq .
