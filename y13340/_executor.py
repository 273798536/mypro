#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys
import os
import io
import contextlib
import traceback
from pathlib import Path

work_dir = Path("/Users/mac/pro/solo/workspaces/y13340")
os.chdir(work_dir)
sys.path.insert(0, str(work_dir))

output_capture = io.StringIO()
exit_code = 0

try:
    with contextlib.redirect_stdout(output_capture):
        with contextlib.redirect_stderr(output_capture):
            from run_and_verify import main
            success = main()
            exit_code = 0 if success else 1
except SystemExit as e:
    exit_code = e.code
except Exception as e:
    output_capture.write(f"\n执行异常: {str(e)}\n")
    output_capture.write(traceback.format_exc())
    exit_code = 1

output_text = output_capture.getvalue()

with open(work_dir / "execution_result.log", "w", encoding="utf-8") as f:
    f.write(output_text)
    f.write(f"\n\n退出码: {exit_code}")

print(f"执行完成，退出码: {exit_code}")
print(f"输出长度: {len(output_text)} 字符")
print(f"结果已保存到: execution_result.log")
