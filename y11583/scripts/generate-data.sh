#!/bin/bash
set -e

BATCH_ID="$1"
COUNT="${2:-50}"
WITH_ERRORS="${3:-false}"

if [ -z "$BATCH_ID" ]; then
  echo "Usage: $0 <batch-id> [count] [with-errors]"
  exit 1
fi

echo "Generating $COUNT records for batch: $BATCH_ID"

curl -s -X POST "http://localhost:8080/api/v1/batches/$BATCH_ID/generate" \
  -H "Content-Type: application/json" \
  -H "X-Operator-ID: SCRIPT_OP" \
  -H "X-Operator-Name: 脚本操作员" \
  -d "{
    \"recharge_count\": $COUNT,
    \"refund_count\": 5,
    \"handover_count\": 3,
    \"include_errors\": $WITH_ERRORS
  }" | jq .
