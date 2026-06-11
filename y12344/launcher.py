#!/usr/bin/env python3
import os
import sys

os.chdir('/Users/mac/pro/solo/workspaces/y12344')
sys.path.insert(0, '/Users/mac/pro/solo/workspaces/y12344/src')

with open('/Users/mac/pro/solo/workspaces/y12344/full_execution.py', 'r') as f:
    code = f.read()

exec(code, globals())
