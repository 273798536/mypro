#!/usr/bin/env python3
import sys
import os
import io
import json
from contextlib import redirect_stdout, redirect_stderr
from datetime import datetime

os.chdir("/Users/mac/pro/solo/workspaces/y13328")

stdout_capture = io.StringIO()
stderr_capture = io.StringIO()

exit_code = 0

try:
    with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
        import importlib.util
        spec = importlib.util.spec_from_file_location("playback", "playback.py")
        playback_module = importlib.util.module_from_spec(spec)
        sys.modules["playback"] = playback_module
        spec.loader.exec_module(playback_module)
except SystemExit as e:
    exit_code = e.code

stdout_output = stdout_capture.getvalue()
stderr_output = stderr_capture.getvalue()

print("=== STDOUT ===")
print(stdout_output)
print("=== STDERR ===")
print(stderr_output)
print("=== EXIT CODE ===")
print(exit_code)

with open("playback_output.txt", "w", encoding="utf-8") as f:
    f.write("=== STDOUT ===\n")
    f.write(stdout_output)
    f.write("\n=== STDERR ===\n")
    f.write(stderr_output)
    f.write(f"\n=== EXIT CODE ===\n{exit_code}\n")

result_json_exists = os.path.exists("playback_result.json")
print(f"\nplayback_result.json exists: {result_json_exists}")

if result_json_exists:
    with open("playback_result.json", "r", encoding="utf-8") as f:
        result_data = json.load(f)
    print(f"\n=== playback_result.json 内容摘要:")
    print(f"  duplicate_samples: {[d['sample_id'] for d in result_data.get('duplicate_samples', [])]}")
    print(f"  withdrawn_samples: {[w['sample_id'] for w in result_data.get('withdrawn_samples', [])}")
    print(f"  version_changes count: {len(result_data.get('version_changes', []))}")

print("\n=== 检查结果 ===")
print(f"1. 检测到重复样本 S002 和 S004: {'S002' in str(result_data.get('duplicate_samples', [])) and 'S004' in str(result_data.get('duplicate_samples', []))}")
print(f"2. 检测到撤回记录 S005: {'S005' in str(result_data.get('withdrawn_samples', []))}")
print(f"3. 版本对比 v1/v2: {len(result_data.get('metrics_v1', {})) > 0 and len(result_data.get('metrics_v2', {})) > 0}")
print(f"4. 退出码为 1: {exit_code == 1}")
print(f"5. playback_result.json 生成: {result_json_exists}")
