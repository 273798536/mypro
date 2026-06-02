#!/usr/bin/env python3
import sys
sys.path.insert(0, '.')

import io
import contextlib

output = io.StringIO()
with contextlib.redirect_stdout(output):
    with open('tests/test_core_flow.py', 'r') as f:
        code = f.read()
    exec(code)

result = output.getvalue()
with open('test_output.txt', 'w') as f:
    f.write(result)

print(result)
