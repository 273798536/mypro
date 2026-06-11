#!/usr/bin/env python3
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app import storage
from app.models import WarningStatus
from collections import Counter

storage.init_db()

print("=" * 60)
print("CHECKPOINT 1: 所有冲突记录")
print("=" * 60)
from app import storage as s
with s.get_conn() as conn:
    cur = conn.cursor()
    cur.execute("SELECT id, batch_id, investor_name, amount, warning_ids, calibres, resolved, resolution FROM conflict_records ORDER BY id")
    conflicts = cur.fetchall()
    for r in conflicts:
        d = dict(r)
        print(f"  ID={d['id']} investor={d['investor_name']} amount={d['amount']} "
              f"warning_ids={d['warning_ids']} calibres={d['calibres']} "
              f"resolved={bool(d['resolved'])} resolution={d['resolution']!r}")

print()
print("=" * 60)
print("CHECKPOINT 2: 预警状态分布 + 未收尾预警明细")
print("=" * 60)
from app.storage import get_warnings_by_batch, get_receipt_by_id
ws = get_warnings_by_batch("20260609-01")
c = Counter(w.status.value for w in ws)
print(f"  status counts: {dict(c)}")
print()
for w in ws:
    if w.status in (WarningStatus.CONFLICT, WarningStatus.PENDING_CONFIRM, WarningStatus.IMPORTED):
        r = get_receipt_by_id(w.receipt_id)
        src = f"{r.source_file}:{r.row_number}" if r else "-"
        cal = r.calibre if r else "-"
        print(f"  [UNFINISHED] warning_id={w.id} code={w.warning_code} status={w.status.value} "
              f"reason={w.confirm_reason} src={src} calibre={cal}")

print()
print("=" * 60)
print("CHECKPOINT 3: 报告中概览数据")
print("=" * 60)
report_path = "reports/warning_report_20260609-01.md"
if os.path.exists(report_path):
    with open(report_path, encoding="utf-8") as f:
        lines = f.readlines()
    in_overview = False
    for ln in lines[:40]:
        print(ln.rstrip())
else:
    print(f"  报告不存在: {report_path}")
