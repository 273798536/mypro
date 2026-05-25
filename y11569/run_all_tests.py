#!/usr/bin/env python3
"""运行所有测试脚本"""
import sys
import os
import subprocess

scripts = [
    "examples/demo_workflow.py",
    "examples/test_edge_cases.py",
    "examples/role_view_demo.py",
    "examples/test_queue_and_replay.py",
]

results = []

for script in scripts:
    print(f"\n{'='*60}")
    print(f"运行: {script}")
    print("=" * 60)
    
    try:
        # Clean database before each test
        if os.path.exists("city_lighting.db"):
            os.remove("city_lighting.db")
        
        result = subprocess.run(
            [sys.executable, script],
            capture_output=True,
            text=True,
            timeout=60
        )
        
        print(result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr, file=sys.stderr)
        
        passed = result.returncode == 0
        results.append((script, passed, result.returncode))
        
        status = "✓ 通过" if passed else f"✗ 失败 (退出码: {result.returncode})"
        print(f"\n结果: {status}")
        
    except subprocess.TimeoutExpired:
        results.append((script, False, -1))
        print(f"错误: 脚本执行超时")
    except Exception as e:
        results.append((script, False, -2))
        print(f"错误: {e}")

print("\n" + "=" * 60)
print("测试结果汇总")
print("=" * 60)
for script, passed, code in results:
    status = "✓ 通过" if passed else f"✗ 失败 (退出码: {code})"
    print(f"  {script}: {status}")

passed_count = sum(1 for _, p, _ in results if p)
print(f"\n总计: {passed_count}/{len(results)} 测试通过")

sys.exit(0 if passed_count == len(results) else 1)
