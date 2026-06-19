#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys
import io
import contextlib

log_capture = io.StringIO()
with contextlib.redirect_stdout(log_capture):
    with contextlib.redirect_stderr(log_capture):
        try:
            exec(open('run_full_test.py').read())
        except Exception as e:
            import traceback
            print(f"Error: {e}")
            traceback.print_exc()

output = log_capture.getvalue()

with open('test_output.log', 'w', encoding='utf-8') as f:
    f.write(output)

print("测试执行完成，结果已写入 test_output.log")
print(f"输出长度: {len(output)} 字符")
