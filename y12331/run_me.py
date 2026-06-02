#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, '.')

if os.path.exists('.schedule_state.json'):
    os.remove('.schedule_state.json')
    print("已清理旧状态")

output_file = 'test_output.txt'
old_stdout = sys.stdout
f = open(output_file, 'w', encoding='utf-8')
sys.stdout = f

try:
    from test_cli_flow import main
    main()
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
finally:
    sys.stdout = old_stdout
    f.close()
    print("测试完成，结果已写入 test_output.txt")
