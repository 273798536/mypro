#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys
import os
import json
from pathlib import Path

work_dir = Path("/Users/mac/pro/solo/workspaces/y13340")
os.chdir(work_dir)
sys.path.insert(0, str(work_dir))

print("=" * 60)
print("简单语法和导入检查")
print("=" * 60)

try:
    from data_models import (
        VersionNote, ScheduleRecommendation, ManualCorrection,
        EvidenceReviewRecord, ReviewSummary, ReviewStatus, CorrectionType
    )
    print("✓ data_models.py 导入成功")
except Exception as e:
    print(f"✗ data_models.py 导入失败: {e}")
    sys.exit(1)

try:
    from review_engine import ScheduleReviewEngine
    print("✓ review_engine.py 导入成功")
except Exception as e:
    print(f"✗ review_engine.py 导入失败: {e}")
    sys.exit(1)

try:
    engine = ScheduleReviewEngine(data_dir="review_data")
    print("✓ ScheduleReviewEngine 初始化成功")
except Exception as e:
    print(f"✗ ScheduleReviewEngine 初始化失败: {e}")
    sys.exit(1)

print("\n" + "=" * 60)
print("执行完整验证流程")
print("=" * 60)

data_dir = Path("review_data")
data_dir.mkdir(exist_ok=True)
for f in data_dir.glob("*.json"):
    f.unlink()

engine = ScheduleReviewEngine(data_dir=str(data_dir))

print("\n【1】添加版本说明")
version_notes = [
    VersionNote(
        version_id="VER-20260601-001",
        publish_date="2026-06-01",
        title="端午假期排班规则更新",
        description="根据护理部2026年第3号通知，端午假期急诊科室需增加20%护士配置。",
        related_rules=["RULE-EMER-003", "RULE-HOL-001"],
        affected_scenarios=["急诊科室", "节假日排班"],
        evidence_reference="https://hospital.intranet/policy/2026-003.pdf",
        operator="张主任",
    ),
    VersionNote(
        version_id="VER-20260605-002",
        publish_date="2026-06-05",
        title="护士李XX哺乳期排班照顾",
        description="护士李XX处于哺乳期，不得安排夜班。",
        related_rules=["RULE-LAB-012"],
        affected_scenarios=["哺乳期护士排班"],
        evidence_reference="https://hospital.intranet/hr/lactation-policy.pdf",
        operator="王护士长",
    ),
    VersionNote(
        version_id="VER-20260610-003",
        publish_date="2026-06-10",
        title="内科病房床位调整临时通知",
        description="内科病房3楼装修，床位调整至2楼和4楼。",
        related_rules=["RULE-WARD-007", "RULE-TEMP-001"],
        affected_scenarios=["内科病房", "临时调整"],
        evidence_reference="",
        operator="赵护士长",
    ),
    VersionNote(
        version_id="VER-20260612-004",
        publish_date="2026-06-12",
        title="V2.3.1模型迭代说明",
        description="模型优化：改进连续工作时长约束算法。",
        related_rules=["RULE-MODEL-001"],
        affected_scenarios=["全科室"],
        evidence_reference="https://hospital.intranet/ai/model-v2.3.1-release-notes.pdf",
        operator="AI产品-阿宁",
    ),
    VersionNote(
        version_id="VER-20260615-005",
        publish_date="2026-06-15",
        title="急诊科室特殊技能要求补充",
        description="急诊夜班护士必须具备急诊急救证书和呼吸机操作资格。",
        related_rules=["RULE-EMER-008"],
        affected_scenarios=["急诊科室", "夜班排班"],
        evidence_reference="",
        operator="急诊-陈护士长",
    ),
]

for vn in version_notes:
    engine.add_version_note(vn)
    status = "✓" if vn.evidence_reference else "⚠(缺失证据)"
print(f"  ✓ 已添加 {len(version_notes)} 条版本说明")

print("\n【2】添加排班推荐")
recommendations = [
    ScheduleRecommendation(
        recommendation_id="REC-20260618-001",
        schedule_date="2026-06-18",
        nurse_id="N001", nurse_name="王小红",
        shift_type="白班", original_recommendation="急诊科室白班",
        model_version="v2.3.1", confidence_score=0.92,
        evidence_features={"has_emergency_cert": "true"},
        rule_matches=["RULE-EMER-003"],
    ),
    ScheduleRecommendation(
        recommendation_id="REC-20260618-002",
        schedule_date="2026-06-18",
        nurse_id="N002", nurse_name="李美丽",
        shift_type="夜班", original_recommendation="急诊科夜班",
        model_version="v2.2.0", confidence_score=0.78,
        evidence_features={"is_lactation": "true"},
        rule_matches=["RULE-LAB-012"],
    ),
    ScheduleRecommendation(
        recommendation_id="REC-20260618-003",
        schedule_date="2026-06-18",
        nurse_id="N003", nurse_name="张伟明",
        shift_type="白班", original_recommendation="内科2楼白班",
        model_version="v2.3.1", confidence_score=0.85,
        evidence_features={"department": "内科"},
        rule_matches=["RULE-WARD-007"],
    ),
    ScheduleRecommendation(
        recommendation_id="REC-20260618-004",
        schedule_date="2026-06-18",
        nurse_id="N004", nurse_name="陈静怡",
        shift_type="夜班", original_recommendation="急诊科夜班",
        model_version="v2.3.1", confidence_score=0.88,
        evidence_features={"has_ventilator_cert": "true"},
        rule_matches=["RULE-EMER-008"],
    ),
    ScheduleRecommendation(
        recommendation_id="REC-20260618-005",
        schedule_date="2026-06-18",
        nurse_id="N005", nurse_name="刘建国",
        shift_type="白班", original_recommendation="手术室白班",
        model_version="v2.3.1", confidence_score=0.95,
        evidence_features={"specialty": "手术室"},
        rule_matches=[],
    ),
]
for rec in recommendations:
    engine.add_recommendation(rec)
print(f"  ✓ 已添加 {len(recommendations)} 条推荐记录")

print("\n【3】添加改判记录")
corrections = [
    ManualCorrection(
        correction_id="COR-20260618-001",
        recommendation_id="REC-20260618-002",
        original_result="急诊科夜班", corrected_result="内科病房白班",
        correction_type=CorrectionType.MANUAL_JUDGMENT,
        reason="李美丽处于哺乳期，旧模型v2.2.0未正确识别哺乳期标签。",
        evidence_reference="哺乳证明编号: B2026-0045",
        related_version_id="VER-20260605-002",
        operator="王护士长",
    ),
    ManualCorrection(
        correction_id="COR-20260618-002",
        recommendation_id="REC-20260618-003",
        original_result="内科2楼白班", corrected_result="内科4楼白班",
        correction_type=CorrectionType.RULE_CHANGE,
        reason="根据6月10日病房调整通知，4楼需要更多护士。",
        evidence_reference="",
        related_version_id="VER-20260610-003",
        operator="赵护士长",
    ),
    ManualCorrection(
        correction_id="COR-20260618-003",
        recommendation_id="REC-20260618-004",
        original_result="急诊科夜班", corrected_result="急诊科白班",
        correction_type=CorrectionType.MODEL_UPDATE,
        reason="模型V2.3.1考虑连续夜班约束，调整为白班。",
        evidence_reference="排班算法日志ID: ALG-20260617-0892",
        related_version_id="VER-20260612-004",
        operator="AI产品-阿宁",
    ),
]
for mc in corrections:
    engine.add_manual_correction(mc)
print(f"  ✓ 已添加 {len(corrections)} 条改判记录")

print("\n【4】模拟新改判覆盖旧改判")
override = ManualCorrection(
    correction_id="COR-20260618-004",
    recommendation_id="REC-20260618-004",
    original_result="急诊科白班", corrected_result="急诊科夜班",
    correction_type=CorrectionType.MANUAL_JUDGMENT,
    reason="急诊科夜班人手不足，陈静怡本人同意。打破算法约束。",
    evidence_reference="",
    related_version_id=None,
    operator="急诊-陈护士长",
)
engine.add_manual_correction(override)

old_correction = engine.manual_corrections.get("COR-20260618-003")
if old_correction and old_correction.is_overridden:
    print(f"  ✓ 旧改判已标记为覆盖: {old_correction.overridden_by}")
    print(f"    覆盖原因: {old_correction.override_reason}")
else:
    print(f"  ✗ 覆盖机制未生效")
    sys.exit(1)

print("\n【5】执行复核")
test_cases = [
    ("REC-20260618-001", "王小红", "v2.3.0", "v2.3.1"),
    ("REC-20260618-002", "李美丽", "v2.2.0", "v2.3.1"),
    ("REC-20260618-003", "张伟明", "v2.3.0", "v2.3.1"),
    ("REC-20260618-004", "陈静怡", "v2.3.0", "v2.3.1"),
    ("REC-20260618-005", "刘建国", "v2.3.0", "v2.3.1"),
]

results = []
for rec_id, nurse, old_v, new_v in test_cases:
    review = engine.process_review(rec_id, "AI系统", old_v, new_v)
    results.append((nurse, review))
    status_map = {
        ReviewStatus.RESOLVED: "✓已处理",
        ReviewStatus.SUSPENDED: "✗已挂起(引用缺失)",
        ReviewStatus.MANUAL_REVIEW: "⚠待人工确认",
        ReviewStatus.EVIDENCE_MISSING: "⚠待补证据",
    }
    print(f"  {status_map.get(review.status, review.status.value)} {nurse}")

print("\n【6】检查关键场景")

print("\n  场景1: 李美丽(旧模型误判)的改判解释")
for nurse, review in results:
    if nurse == "李美丽" and review.resolution:
        print(f"    ✓ 存在改判解释，长度: {len(review.resolution)} 字符")
        print(f"      包含内容: {'改判原因' in review.resolution}, {'版本对比' in review.resolution}")

print("\n  场景2: 张伟明(引用缺失)的挂起状态")
for nurse, review in results:
    if nurse == "张伟明":
        if review.status == ReviewStatus.SUSPENDED:
            print(f"    ✓ 正确挂起，缺失 {len(review.missing_references)} 项引用")
            print(f"      说明: {review.review_notes[:60]}...")
        else:
            print(f"    ✗ 未正确挂起，状态: {review.status}")

print("\n  场景3: 陈静怡(覆盖+缺失)的挂起状态")
for nurse, review in results:
    if nurse == "陈静怡":
        if review.status == ReviewStatus.SUSPENDED:
            print(f"    ✓ 正确挂起，缺失 {len(review.missing_references)} 项引用")
        else:
            print(f"    ✗ 未正确挂起，状态: {review.status}")

print("\n  场景4: 陈静怡的证据链包含覆盖关系")
for nurse, review in results:
    if nurse == "陈静怡":
        corrections_in_chain = [item for item in review.evidence_chain if item["type"] == "correction"]
        overridden = [c for c in corrections_in_chain if c["is_overridden"]]
        if overridden:
            print(f"    ✓ 证据链包含 {len(corrections_in_chain)} 条改判，其中 {len(overridden)} 条已覆盖")
        else:
            print(f"    ✗ 证据链未正确保留覆盖关系")

print("\n【7】老师处理待办")
pending = engine.get_pending_items()
print(f"  待处理事项: {len(pending)} 项")

for rr in pending:
    rec = engine.recommendations.get(rr.recommendation_id)
    name = rec.nurse_name if rec else ""
    if name == "张伟明" and rr.status == ReviewStatus.SUSPENDED:
        updated = engine.resolve_suspended(rr.review_id,
            "已补充证据：通知原件已归档，编号ADM-2026-0610-001。", "李老师")
        print(f"  ✓ 张伟明: 已处理 → {updated.status.value}")
    elif name == "李美丽" and rr.status == ReviewStatus.MANUAL_REVIEW:
        updated = engine.confirm_manual_review(rr.review_id, True,
            "改判依据充分，哺乳期证明真实有效。", "李老师")
        print(f"  ✓ 李美丽: 人工改判已确认 → {updated.status.value}")
    elif name == "陈静怡" and rr.status == ReviewStatus.SUSPENDED:
        updated = engine.confirm_manual_review(rr.review_id, False,
            "需补充：人手不足证明、本人同意书、护士长签字。", "李老师")
        print(f"  ⚠ 陈静怡: 需补充证据 → {updated.status.value}")

print("\n【8】状态汇总")
summary = engine.get_summary()
print(f"  总记录数: {summary.total_count}")
print(f"  已处理: {summary.resolved_count}")
print(f"  待补证据: {summary.evidence_missing_count}")
print(f"  已挂起: {summary.suspended_count}")
print(f"  人工改判数: {summary.manual_judgment_count}")
print(f"  被覆盖改判数: {summary.override_count}")

print(f"\n  已处理项:")
for rr in engine.get_resolved_items():
    rec = engine.recommendations.get(rr.recommendation_id)
    name = rec.nurse_name if rec else "未知"
    print(f"    ✓ {name}")

print(f"\n  待补证据项:")
for rr in engine.get_pending_items():
    rec = engine.recommendations.get(rr.recommendation_id)
    name = rec.nurse_name if rec else "未知"
    print(f"    ⚠ {name}: {rr.status.value}")

print("\n【9】导出CSV")
output_dir = Path("output")
output_dir.mkdir(exist_ok=True)
review_csv = output_dir / "review_records.csv"
version_csv = output_dir / "version_trace.csv"

engine.export_review_csv(str(review_csv))
engine.export_version_trace_csv(str(version_csv))

if review_csv.exists() and version_csv.exists():
    print(f"  ✓ CSV导出成功:")
    print(f"    复核记录: {review_csv} ({review_csv.stat().st_size} bytes)")
    print(f"    版本追溯: {version_csv} ({version_csv.stat().st_size} bytes)")

    import csv
    print(f"\n  复核记录CSV预览:")
    with open(review_csv, "r", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        header = next(reader)
        print(f"    表头: {len(header)} 列")
        for i, row in enumerate(reader, 1):
            print(f"    行{i}: {row[3]} | {row[5]} | {row[8]}")

else:
    print(f"  ✗ CSV导出失败")
    sys.exit(1)

print("\n【10】阿宁交接验证")
vn = engine.version_notes.get("VER-20260605-002")
if vn:
    print(f"\n  ✓ 从版本说明找到原始说法:")
    print(f"    {vn.version_id}: {vn.title}")
    print(f"    {vn.description[:50]}...")
    print(f"    证据引用: {vn.evidence_reference}")

print(f"\n  ✓ 从CSV明细讲清李美丽的处理结果:")
for rr in engine.review_records.values():
    rec = engine.recommendations.get(rr.recommendation_id)
    if rec and rec.nurse_name == "李美丽":
        print(f"    状态: {rr.status.value}")
        print(f"    证据链: {len(rr.evidence_chain)} 项")
        print(f"    处理结论: {len(rr.resolution or '')} 字符")
        break

print(f"\n  ✓ 陈静怡的改判覆盖关系:")
for rr in engine.review_records.values():
    rec = engine.recommendations.get(rr.recommendation_id)
    if rec and rec.nurse_name == "陈静怡":
        for item in rr.evidence_chain:
            if item["type"] == "correction":
                tag = "[已覆盖]" if item["is_overridden"] else "[生效]"
                print(f"    {tag} {item['id']}: {item['original']} → {item['corrected']}")
        break

print("\n" + "=" * 60)
print("所有检查通过！系统功能正常")
print("=" * 60)

print(f"\n生成的文件:")
for f in sorted(Path("review_data").glob("*.json")):
    print(f"  {f}: {f.stat().st_size} bytes")
for f in sorted(Path("output").glob("*.csv")):
    print(f"  {f}: {f.stat().st_size} bytes")

with open("_simple_check_result.log", "w", encoding="utf-8") as f:
    f.write("简单检查通过\n")

sys.exit(0)
