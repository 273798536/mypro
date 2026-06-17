#!/bin/bash
cd /Users/mac/pro/solo/workspaces/y13314
npm run check > /tmp/ts-check-result.txt 2>&1
cat /tmp/ts-check-result.txt
echo "EXIT_CODE=$?"
