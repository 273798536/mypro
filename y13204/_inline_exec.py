import sys
import os
from pathlib import Path

BASE = '/Users/mac/pro/solo/workspaces/y13204'
os.chdir(BASE)
sys.path.insert(0, BASE)

output_file = Path(BASE) / "verify_output.txt"

f_out = open(output_file, "w", encoding="utf-8")
old_stdout = sys.stdout
old_stderr = sys.stderr
sys.stdout = f_out
sys.stderr = f_out

try:
    exec(open(Path(BASE) / "verify_flow.py").read())
    exit_code = main()
except SystemExit as e:
    exit_code = e.code
except Exception as e:
    import traceback
    print(f"\n❌ 执行出错: {e}")
    traceback.print_exc()
    exit_code = 1
finally:
    sys.stdout = old_stdout
    sys.stderr = old_stderr
    f_out.close()

with open(output_file, "r", encoding="utf-8") as f:
    content = f.read()

print(content)
print(f"\n\n返回码: {exit_code}")
