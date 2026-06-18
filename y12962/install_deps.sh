#!/bin/bash
cd /Users/mac/pro/solo/workspaces/y12962
echo "INSTALL_START=$(date +%s)" > install_progress.log
npm install --no-fund --no-audit >> install_full.log 2>&1
code=$?
echo "INSTALL_DONE_EXIT=$code" >> install_progress.log
echo "INSTALL_END=$(date +%s)" >> install_progress.log
