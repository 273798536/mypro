import sys
import os

BASE = '/Users/mac/pro/solo/workspaces/y13204'
os.chdir(BASE)
sys.path.insert(0, BASE)

exec(open(os.path.join(BASE, '_auto_exec.py')).read())
