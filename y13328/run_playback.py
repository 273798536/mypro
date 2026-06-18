#!/usr/bin/env python3
import subprocess
import sys
import os

os.chdir("/Users/mac/pro/solo/workspaces/y13328")

result = subprocess.run(
    ["python3", "playback.py"],
    capture_output=True,
    text=True
)

print("=== STDOUT ===")
print(result.stdout)
print("=== STDERR ===")
print(result.stderr)
print("=== EXIT CODE ===")
print(result.returncode)

with open("playback_output.txt", "w", encoding="utf-8") as f:
    f.write("=== STDOUT ===\n")
    f.write(result.stdout)
    f.write("\n=== STDERR ===\n")
    f.write(result.stderr)
    f.write(f"\n=== EXIT CODE ===\n{result.returncode}\n")

print(f"\nOutput saved to playback_output.txt")
print(f"playback_result.json exists: {os.path.exists('playback_result.json')}")
