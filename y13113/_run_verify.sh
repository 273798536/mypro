#!/bin/bash
cd /Users/mac/pro/solo/workspaces/y13113
rm -f queue_analysis.db /tmp/verify_out.txt
python3 verify_fix.py > /tmp/verify_out.txt 2>&1
EXIT_CODE=$?
echo "=== EXIT CODE: $EXIT_CODE ==="
echo "=== LAST 40 LINES OF OUTPUT ==="
tail -40 /tmp/verify_out.txt
echo "=== END ==="
exit $EXIT_CODE
