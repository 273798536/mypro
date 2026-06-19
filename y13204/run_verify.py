#!/usr/bin/env python3
import sys
import io
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

output_capture = io.StringIO()
old_stdout = sys.stdout
old_stderr = sys.stderr

class TeeOutput:
    def __init__(self, *files):
        self.files = files
    
    def write(self, data):
        for f in self.files:
            f.write(data)
            f.flush()
    
    def flush(self):
        for f in self.files:
            f.flush()

tee = TeeOutput(old_stdout, output_capture)
sys.stdout = tee
sys.stderr = tee

try:
    from verify_flow import main
    exit_code = main()
except Exception as e:
    import traceback
    print(f"\n❌ 执行出错: {e}")
    traceback.print_exc()
    exit_code = 1
finally:
    sys.stdout = old_stdout
    sys.stderr = old_stderr

full_output = output_capture.getvalue()

with open(Path(__file__).parent / "verify_output.txt", "w", encoding="utf-8") as f:
    f.write(full_output)

print(f"\n\n📄 完整输出已保存到 verify_output.txt")
print(f"🔚 退出码: {exit_code}")

sys.exit(exit_code)
