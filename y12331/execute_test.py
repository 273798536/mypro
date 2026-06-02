#!/usr/bin/env python3
import sys
import os

sys.path.insert(0, '.')

output_file = 'test_output.txt'

class Tee(object):
    def __init__(self, *files):
        self.files = files
    def write(self, obj):
        for f in self.files:
            f.write(obj)
            f.flush()
    def flush(self):
        for f in self.files:
            f.flush()

if os.path.exists('.schedule_state.json'):
    os.remove('.schedule_state.json')

f = open(output_file, 'w', encoding='utf-8')
original = sys.stdout
sys.stdout = Tee(sys.stdout, f)

try:
    from test_cli_flow import main
    main()
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
finally:
    sys.stdout = original
    f.close()
    print(f"\n输出已保存到 {output_file}")
