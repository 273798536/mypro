#!/usr/bin/env python3
import sys
import os

BASE = '/Users/mac/pro/solo/workspaces/y13204'
os.chdir(BASE)
sys.path.insert(0, BASE)

try:
    import src
except Exception as e:
    import traceback
    print(f"Error: {e}")
    traceback.print_exc()
    sys.exit(1)
