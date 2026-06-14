#!/bin/bash
cd /Users/mac/pro/solo/workspaces/y13113
rm -f queue_analysis.db /tmp/FLASK_VERIFY_RESULT.txt
python3 _verify_with_flask_test.py
echo "===== DONE, exit=$? ====="
echo ""
echo "===== 验证结果文件最后50行 ====="
tail -60 /tmp/FLASK_VERIFY_RESULT.txt 2>/dev/null || echo "(no result file)"
