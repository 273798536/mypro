#!/bin/bash
cd /Users/mac/pro/solo/workspaces/y12352
python3 test_cli_load_fix.py > /tmp/test_output.txt 2>&1
echo "Exit code: $?" >> /tmp/test_output.txt
cat /tmp/test_output.txt
