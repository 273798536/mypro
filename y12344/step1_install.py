#!/usr/bin/env python3
import sys
import subprocess
import os

os.chdir('/Users/mac/pro/solo/workspaces/y12344')

print("=" * 60)
print("命令1: python3 -m pip install -e .")
print("=" * 60)

result = subprocess.run(
    [sys.executable, '-m', 'pip', 'install', '-e', '.'],
    capture_output=True, text=True
)

print(result.stdout)
if result.stderr:
    print("--- STDERR ---")
    print(result.stderr)

print(f"\n返回码: {result.returncode}")
print(f"成功: {'✅ 是' if result.returncode == 0 else '❌ 否'}")

with open('/Users/mac/pro/solo/workspaces/y12344/cmd1_output.txt', 'w') as f:
    f.write(result.stdout)
    if result.stderr:
        f.write("\n--- STDERR ---\n")
        f.write(result.stderr)
    f.write(f"\n返回码: {result.returncode}\n")
    f.write(f"成功: {'是' if result.returncode == 0 else '否'}\n")
