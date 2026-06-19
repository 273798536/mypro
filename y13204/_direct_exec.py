import sys
import os
from pathlib import Path

os.chdir(str(Path(__file__).parent))
sys.path.insert(0, str(Path(__file__).parent))

output_file = Path(__file__).parent / "verify_output.txt"

with open(output_file, "w", encoding="utf-8") as f:
    old_stdout = sys.stdout
    old_stderr = sys.stderr
    sys.stdout = f
    sys.stderr = f
    
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

print(f"执行完成，退出码: {exit_code}")
print(f"输出已保存到: {output_file}")
