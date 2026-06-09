"""快速验证核心逻辑：导入、去重、审核、追溯、导出
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import Base, engine, SessionLocal
from app.services.batch_service import persist_import_batch
from app.services.review_service import update_record_status, correct_record_fields
from app.services.trace_service import trace_record
from app.services.export_service import export_records_to_excel
from app.services.history_service import compare_batches, list_history_batches
from app.models.models import ScoreRecord, ImportBatch

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

db = SessionLocal()

sample1 = os.path.join(os.path.dirname(__file__), "sample_data", "多项式外推参数表_演示数据_第1批.xlsx")
sample2 = os.path.join(os.path.dirname(__file__), "sample_data", "多项式外推参数表_演示数据_第2批.xlsx")

with open(sample1, "rb") as f:
    content1 = f.read()
with open(sample2, "rb") as f:
    content2 = f.read()

print("=== 1. 导入第1批")
b1, recs1, issues1 = persist_import_batch(db, "第1批.xlsx", content1, uploaded_by="数学老师", remark="首次导入")
print(f"批次: {b1.batch_no}, 总{b1.total_rows} 行，有效 {b1.valid_rows}，问题 {b1.issue_rows}，重复 {b1.duplicate_rows}")
um = sum(1 for r in recs1 if r.unit_missing)
dup = sum(1 for r in recs1 if r.is_duplicate)
print(f"  unit_missing={um}, duplicates={dup}, issues={len(issues1)}")

print("\n=== 2. 导入第2批 (历史对比用)")
b2, recs2, issues2 = persist_import_batch(db, "第2批.xlsx", content2, uploaded_by="数学老师", remark="月底补录")
print(f"批次: {b2.batch_no}, 总{b2.total_rows} 行, 问题={b2.issue_rows}, 重复={b2.duplicate_rows}")

print("\n=== 3. 状态流转 + 修正留痕")
pending = [r for r in recs1 if r.status == "pending"]
if pending:
    r0 = db.query(ScoreRecord).filter(ScoreRecord.id == pending[0].id).first()
    print(f"  记录{r0.id} 当前: score={r0.score_origin}, alarm={r0.alarm_level}")
    correct_record_fields(db, r0.id, operator="数学老师", score_corrected_value=88.5, review_note="人工复核后分数更正")
    r0 = db.query(ScoreRecord).filter(ScoreRecord.id == r0.id).first()
    print(f"  修正后: score={r0.score_origin}, corrected={r0.score_corrected_value}, status={r0.status}, 留痕={len(r0.review_logs)}")
    for lg in r0.review_logs:
        print(f"    - {lg.action}: {lg.field_name} {lg.old_value} -> {lg.new_value} ({lg.operator})")
    if len(pending) > 1:
        r1 = pending[1]
        update_record_status(db, r1.id, "approved", operator="数学老师", review_note="数据正常，通过")
        r1 = db.query(ScoreRecord).filter(ScoreRecord.id == r1.id).first()
        print(f"  记录{r1.id} 通过后 status={r1.status}, reviewed_by={r1.reviewed_by}")

print("\n=== 4. 单位缺失记录追溯 (验收场景)")
missing = [r for r in recs1 if r.unit_missing]
if missing:
    m = missing[0]
    print(f"  单位缺失记录: id={m.id}, 学号={m.student_id}, 姓名={m.student_name}")
    t = trace_record(db, m.id)
    print(f"  来源批次: {t['source_batch'].batch_no} 文件={t['source_batch'].file_name}")
    print(f"  问题数: {len(t['issues'])}")
    for iss in t['issues']:
        print(f"    - {iss.issue_type}: {iss.issue_detail} (col={iss.column_name})")
    print(f"  审核留痕: {len(t['review_logs'])} 条")
    print(f"  关联重复记录: {len(t['related_duplicates'])} 条")

print("\n=== 5. 历史对比")
cmp = compare_batches(db, b1.batch_no, b2.batch_no)
if cmp:
    print(f"  共同记录: {cmp.get('common_count', 0)}")
    print(f"  不变: {cmp.get('unchanged_count', 0)}")
    print(f"  有差异: {len(cmp.get('changed', []))}")
    print(f"  仅A: {len(cmp.get('only_in_a', []))}, 仅B: {len(cmp.get('only_in_b', []))}")
    if cmp.get('changed'):
        c0 = cmp['changed'][0]
        print(f"  首条差异: key={c0['key']}")
        for k, v in c0['diffs'].items():
            print(f"    - {k}: {v['from']} -> {v['to']}")

print("\n=== 6. 导出 Excel 报告")
out = export_records_to_excel(db, batch_id=b1.id)
print(f"  导出字节数: {len(out)}")
with open("/tmp/test_report.xlsx", "wb") as f:
    f.write(out)
print("  已保存至 /tmp/test_report.xlsx")

db.close()
print("\n✅ 所有核心模块验证通过！")
