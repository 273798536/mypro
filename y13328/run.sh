#!/bin/bash
cd /Users/mac/pro/solo/workspaces/y13328
python3 playback.py > playback_output.txt 2>&1
echo "EXIT_CODE=$?" >> playback_output.txt
echo "=== PLAYBACK_RESULT.JSON EXISTS ===" >> playback_output.txt
ls -la playback_result.json >> playback_output.txt 2>&1
