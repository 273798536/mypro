import sys
import os
import io
import json
from contextlib import redirect_stdout, redirect_stderr

os.chdir("/Users/mac/pro/solo/workspaces/y13328")

with open("playback.py", "r", encoding="utf-8") as f:
    script_content = f.read()

stdout_capture = io.StringIO()
stderr_capture = io.StringIO()
exit_code = 0

namespace = {
    "__name__": "__main__",
    "__file__": "playback.py"
}

original_argv = sys.argv.copy()
sys.argv = ["playback.py"]

try:
    with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
        exec(compile(script_content, "playback.py", "exec"), namespace)
except SystemExit as e:
    exit_code = e.code
finally:
    sys.argv = original_argv

stdout_output = stdout_capture.getvalue()
stderr_output = stderr_capture.getvalue()

output_data = {
    "stdout": stdout_output,
    "stderr": stderr_output,
    "exit_code": exit_code,
    "playback_result_json_exists": os.path.exists("playback_result.json")
}

if output_data["playback_result_json_exists"]:
    with open("playback_result.json", "r", encoding="utf-8") as f:
        result_json = json.load(f)
    output_data["playback_result_json"] = result_json

with open("captured_result.json", "w", encoding="utf-8") as f:
    json.dump(output_data, f, ensure_ascii=False, indent=2)

print("Capture completed successfully!")
print(f"Exit code: {exit_code}")
print(f"playback_result.json exists: {output_data['playback_result_json_exists']}")
