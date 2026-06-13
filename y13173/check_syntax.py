"""语法检查脚本。"""
import py_compile
import os
import sys

files_to_check = [
    "deflection_attribution/__init__.py",
    "deflection_attribution/models.py",
    "deflection_attribution/field_mapper.py",
    "deflection_attribution/gap_detector.py",
    "deflection_attribution/attribution_engine.py",
    "deflection_attribution/data_io.py",
    "deflection_attribution/status_manager.py",
    "deflection_attribution/report_generator.py",
    "deflection_attribution/demo_data.py",
    "deflection_attribution/cli.py",
    "run_attribution.py",
    "test_system.py",
]

base_dir = os.path.dirname(os.path.abspath(__file__))
all_ok = True

for f in files_to_check:
    path = os.path.join(base_dir, f)
    try:
        py_compile.compile(path, doraise=True)
        print(f"  ✓ {f}")
    except py_compile.PyCompileError as e:
        print(f"  ✗ {f}: {e}")
        all_ok = False
    except FileNotFoundError:
        print(f"  ? {f}: 文件不存在")
        all_ok = False

print()
if all_ok:
    print("所有文件语法检查通过！")
    sys.exit(0)
else:
    print("存在语法错误！")
    sys.exit(1)
