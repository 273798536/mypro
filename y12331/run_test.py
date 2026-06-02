#!/usr/bin/env python3
import os
import sys
sys.path.insert(0, '.')

if os.path.exists('.schedule_state.json'):
    os.remove('.schedule_state.json')
    print("已清理旧状态")

from test_cli_flow import main
main()
