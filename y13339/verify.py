#!/usr/bin/env python3
"""一键验证：语法检查 + 单元测试 + 示例数据生成"""
import sys
import os
import py_compile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

FILES = [
    "app/__init__.py",
    "app/errors.py",
    "app/models.py",
    "app/material_manager.py",
    "app/metrics.py",
    "app/leak_detector.py",
    "app/storage.py",
    "app/main.py",
    "scripts/run_pipeline.py",
    "examples/generate_recalls.py",
    "tests/test_core.py",
    "start.py",
]

ok = 0
fail = 0
for f in FILES:
    try:
        py_compile.compile(f, doraise=True)
        ok += 1
        print(f"✅ 语法OK: {f}")
    except Exception as e:
        fail += 1
        print(f"❌ 语法错误: {f} - {e}")

print(f"\n语法检查: {ok}/{ok+fail} 通过")
if fail > 0:
    sys.exit(1)

print("\n" + "="*60)
print("🧪 运行核心逻辑测试...")
print("="*60)

from tests.test_core import main as run_tests
run_tests()
