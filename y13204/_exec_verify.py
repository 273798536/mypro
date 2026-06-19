import subprocess
import sys
from pathlib import Path

script_path = Path(__file__).parent / "verify_flow.py"
output_file = Path(__file__).parent / "verify_output.txt"

result = subprocess.run(
    [sys.executable, str(script_path)],
    cwd=str(Path(__file__).parent),
    capture_output=True,
    text=True
)

full_output = result.stdout
if result.stderr:
    full_output += "\n--- STDERR ---\n" + result.stderr

with open(output_file, "w", encoding="utf-8") as f:
    f.write(full_output)

print(full_output)
print(f"\n\n返回码: {result.returncode}")
sys.exit(result.returncode)
