import ast
import sys

files = [
    'main.py',
    'app/core/database.py',
    'app/models/models.py',
    'app/models/schemas.py',
    'app/services/refund_service.py',
    'app/services/batch_import_service.py',
    'app/services/review_export_service.py',
    'app/services/amendment_service.py',
    'app/api/daily.py',
    'app/api/refund.py',
]

all_ok = True
for f in files:
    try:
        with open(f) as fp:
            ast.parse(fp.read())
        print(f'\u2713 {f} 语法正确')
    except SyntaxError as e:
        print(f'\u2717 {f} 语法错误: {e}')
        all_ok = False

if all_ok:
    print('\n\u2713 所有文件语法正确')
    sys.exit(0)
else:
    sys.exit(1)
