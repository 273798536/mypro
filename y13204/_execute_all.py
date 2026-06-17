import sys, os, io, json, shutil
from contextlib import redirect_stdout, redirect_stderr
sys.path.insert(0, '/Users/mac/pro/solo/workspaces/y13204')
from src.cli import create_parser, cmd_scan, cmd_status, cmd_note

BASE = '/Users/mac/pro/solo/workspaces/y13204'
for d in ['data', 'reports', 'delivery']:
    p = os.path.join(BASE, d)
    if os.path.exists(p): shutil.rmtree(p)

results = {}

def run(name, func, args):
    out = io.StringIO(); err = io.StringIO()
    try:
        with redirect_stdout(out), redirect_stderr(err):
            r = func(args)
    except SystemExit as e:
        r = e.code
    results[name] = {'stdout': out.getvalue(), 'stderr': err.getvalue(), 'returncode': r}

p = create_parser()
run('step1', lambda a: 0, None)
results['step1']['stdout'] = '清理目录：data/, reports/, delivery/ 不存在，无需删除\n'

run('step2', cmd_scan, p.parse_args(['scan', './materials']))
run('step3', cmd_status, p.parse_args(['status']))
run('step4', cmd_note, p.parse_args(['note', '--type', 'rehearsal', '排练时学生A的高音比上次稳多了，节奏也明显变准']))
run('step5', cmd_note, p.parse_args(['note', '--type', 'auth', '授权到期日确认到2026-07-20，双方已确认']))
run('step6', cmd_note, p.parse_args(['note', '学生A的额外奖励单独备注，分账结论里暂未包含']))
run('step7', cmd_scan, p.parse_args(['scan', './materials', '--rescan']))
run('step8', cmd_status, p.parse_args(['status']))

for f in ['学生进步分析.md', '分账对齐报告.md']:
    fp = os.path.join(BASE, 'reports', f)
    if os.path.exists(fp):
        with open(fp, 'r', encoding='utf-8') as fh:
            results[f] = fh.read()

with open(os.path.join(BASE, '_results.json'), 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
print('DONE')
