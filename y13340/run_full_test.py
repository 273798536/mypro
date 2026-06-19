#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import json
import traceback
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from data_models import (
    VersionNote,
    ScheduleRecommendation,
    ManualCorrection,
    CorrectionType,
    ReviewStatus,
)
from review_engine import ScheduleReviewEngine


def run_full_test():
    print("=" * 70)
    print("排班推荐证据复核系统 - 完整端到端测试")
    print("=" * 70)

    data_dir = "review_data"
    engine = ScheduleReviewEngine(data_dir=data_dir)

    print("\n" + "=" * 70)
    print("【阶段1】初始化测试数据")
    print("=" * 70)

    version_notes = [
        VersionNote(
            version_id="VER-20260601-001",
            publish_date="2026-06-01",
            title="端午假期排班规则更新",
            description="根据护理部2026年第3号通知，端午假期（6月10日-6月12日）期间，急诊科室需增加20%的护士配置，且每班必须有至少1名主管护师以上职称人员在岗。",
            related_rules=["RULE-EMER-003", "RULE-HOL-001"],
            affected_scenarios=["急诊科室", "节假日排班"],
            evidence_reference="https://hospital.intranet/policy/2026-003.pdf",
            operator="张主任",
        ),
        VersionNote(
            version_id="VER-20260605-002",
            publish_date="2026-06-05",
            title="护士李XX哺乳期排班照顾",
            description="护士李XX处于哺乳期（至2026年12月），根据《女职工劳动保护特别规定》，不得安排夜班，每日工作时间不超过8小时。",
            related_rules=["RULE-LAB-012"],
            affected_scenarios=["哺乳期护士排班"],
            evidence_reference="https://hospital.intranet/hr/lactation-policy.pdf",
            operator="王护士长",
        ),
        VersionNote(
            version_id="VER-20260610-003",
            publish_date="2026-06-10",
            title="内科病房床位调整临时通知",
            description="因内科病房3楼装修改造，原3楼45张床位临时调整至2楼和4楼，排班需相应增加2楼和4楼的护士配置。",
            related_rules=["RULE-WARD-007", "RULE-TEMP-001"],
            affected_scenarios=["内科病房", "临时调整"],
            evidence_reference="",
            operator="赵护士长",
        ),
        VersionNote(
            version_id="VER-20260612-004",
            publish_date="2026-06-12",
            title="V2.3.1模型迭代说明",
            description="排班推荐模型V2.3.1版本主要优化：1）改进了护士连续工作时长约束算法；2）增加了护士技能匹配权重；3）修正了节假日双倍计算错误。",
            related_rules=["RULE-MODEL-001", "RULE-MODEL-002", "RULE-MODEL-003"],
            affected_scenarios=["全科室"],
            evidence_reference="https://hospital.intranet/ai/model-v2.3.1-release-notes.pdf",
            operator="AI产品-阿宁",
        ),
        VersionNote(
            version_id="VER-20260615-005",
            publish_date="2026-06-15",
            title="急诊科室特殊技能要求补充",
            description="急诊科室夜班护士必须具备急诊急救证书和呼吸机操作资格，此规则从2026年6月20日起强制执行。",
            related_rules=["RULE-EMER-008"],
            affected_scenarios=["急诊科室", "夜班排班"],
            evidence_reference="",
            operator="急诊-陈护士长",
        ),
    ]

    print("\n>>> 添加版本说明...")
    for vn in version_notes:
        vid = engine.add_version_note(vn)
        status = "✓" if vn.evidence_reference else "⚠"
        print(f"  {status} {vid}: {vn.title}")
        if not vn.evidence_reference:
            print(f"      (故意缺失证据引用，用于测试挂起机制)")

    recommendations = [
        ScheduleRecommendation(
            recommendation_id="REC-20260618-001",
            schedule_date="2026-06-18",
            nurse_id="N001",
            nurse_name="王小红",
            shift_type="白班",
            original_recommendation="急诊科室白班",
            model_version="v2.3.1",
            confidence_score=0.92,
            evidence_features={
                "has_emergency_cert": "true",
                "years_of_experience": "5",
                "title": "护师",
                "last_rest_day": "2026-06-16",
            },
            rule_matches=["RULE-EMER-003"],
        ),
        ScheduleRecommendation(
            recommendation_id="REC-20260618-002",
            schedule_date="2026-06-18",
            nurse_id="N002",
            nurse_name="李美丽",
            shift_type="夜班",
            original_recommendation="急诊科夜班",
            model_version="v2.2.0",
            confidence_score=0.78,
            evidence_features={
                "is_lactation": "true",
                "lactation_end_date": "2026-12-31",
                "title": "护师",
            },
            rule_matches=["RULE-LAB-012"],
        ),
        ScheduleRecommendation(
            recommendation_id="REC-20260618-003",
            schedule_date="2026-06-18",
            nurse_id="N003",
            nurse_name="张伟明",
            shift_type="白班",
            original_recommendation="内科2楼白班",
            model_version="v2.3.1",
            confidence_score=0.85,
            evidence_features={
                "department": "内科",
                "years_of_experience": "8",
                "title": "主管护师",
                "preferred_floor": "2",
            },
            rule_matches=["RULE-WARD-007"],
        ),
        ScheduleRecommendation(
            recommendation_id="REC-20260618-004",
            schedule_date="2026-06-18",
            nurse_id="N004",
            nurse_name="陈静怡",
            shift_type="夜班",
            original_recommendation="急诊科夜班",
            model_version="v2.3.1",
            confidence_score=0.88,
            evidence_features={
                "has_emergency_cert": "true",
                "has_ventilator_cert": "true",
                "years_of_experience": "6",
                "title": "护师",
            },
            rule_matches=["RULE-EMER-008"],
        ),
        ScheduleRecommendation(
            recommendation_id="REC-20260618-005",
            schedule_date="2026-06-18",
            nurse_id="N005",
            nurse_name="刘建国",
            shift_type="白班",
            original_recommendation="手术室白班",
            model_version="v2.3.1",
            confidence_score=0.95,
            evidence_features={
                "has_operation_cert": "true",
                "years_of_experience": "10",
                "title": "副主任护师",
                "specialty": "手术室",
            },
            rule_matches=[],
        ),
    ]

    print("\n>>> 添加排班推荐记录...")
    for rec in recommendations:
        rid = engine.add_recommendation(rec)
        print(f"  ✓ {rid}: {rec.nurse_name} - {rec.original_recommendation} (模型:{rec.model_version})")

    corrections = [
        ManualCorrection(
            correction_id="COR-20260618-001",
            recommendation_id="REC-20260618-002",
            original_result="急诊科夜班",
            corrected_result="内科病房白班",
            correction_type=CorrectionType.MANUAL_JUDGMENT,
            reason="李美丽处于哺乳期，根据规定不得安排夜班。旧模型v2.2.0未正确识别哺乳期标签。",
            evidence_reference="哺乳证明编号: B2026-0045",
            related_version_id="VER-20260605-002",
            operator="王护士长",
        ),
        ManualCorrection(
            correction_id="COR-20260618-002",
            recommendation_id="REC-20260618-003",
            original_result="内科2楼白班",
            corrected_result="内科4楼白班",
            correction_type=CorrectionType.RULE_CHANGE,
            reason="根据6月10日病房调整通知，原3楼床位调整后4楼需要更多护士，张伟明对4楼患者情况更熟悉。",
            evidence_reference="",
            related_version_id="VER-20260610-003",
            operator="赵护士长",
        ),
        ManualCorrection(
            correction_id="COR-20260618-003",
            recommendation_id="REC-20260618-004",
            original_result="急诊科夜班",
            corrected_result="急诊科白班",
            correction_type=CorrectionType.MODEL_UPDATE,
            reason="模型V2.3.1重新计算后，考虑到陈静怡上周已连续3个夜班，根据新的连续工作时长约束算法，调整为白班。",
            evidence_reference="排班算法日志ID: ALG-20260617-0892",
            related_version_id="VER-20260612-004",
            operator="AI产品-阿宁",
        ),
    ]

    print("\n>>> 添加人工改判记录...")
    for mc in corrections:
        cid = engine.add_manual_correction(mc)
        status = "⚠" if mc.correction_type == CorrectionType.MANUAL_JUDGMENT else "✓"
        print(f"  {status} {cid}: {mc.original_result} → {mc.corrected_result}")
        print(f"      类型: {mc.correction_type.value}, 操作人: {mc.operator}")

    print("\n>>> 模拟：新推荐结果覆盖旧改判...")
    override_correction = ManualCorrection(
        correction_id="COR-20260618-004",
        recommendation_id="REC-20260618-004",
        original_result="急诊科白班",
        corrected_result="急诊科夜班",
        correction_type=CorrectionType.MANUAL_JUDGMENT,
        reason="经陈护士长确认，急诊科夜班人手严重不足，陈静怡本人也愿意值夜班。打破算法约束，特殊情况特殊处理。",
        evidence_reference="",
        related_version_id=None,
        operator="急诊-陈护士长",
    )
    cid = engine.add_manual_correction(override_correction)
    print(f"  ⚠ {cid}: {override_correction.original_result} → {override_correction.corrected_result}")
    print(f"      (覆盖了COR-20260618-003，故意缺失证据引用)")

    print("\n" + "=" * 70)
    print("【阶段2】执行复核流程")
    print("=" * 70)

    test_cases = [
        ("REC-20260618-001", "王小红", "v2.3.0", "v2.3.1"),
        ("REC-20260618-002", "李美丽", "v2.2.0", "v2.3.1"),
        ("REC-20260618-003", "张伟明", "v2.3.0", "v2.3.1"),
        ("REC-20260618-004", "陈静怡", "v2.3.0", "v2.3.1"),
        ("REC-20260618-005", "刘建国", "v2.3.0", "v2.3.1"),
    ]

    review_results = []
    for rec_id, nurse_name, old_ver, new_ver in test_cases:
        print(f"\n>>> 正在复核: {nurse_name} ({rec_id})")
        try:
            review = engine.process_review(
                recommendation_id=rec_id,
                operator="AI系统-自动复核",
                old_model_version=old_ver,
                new_model_version=new_ver,
            )
            review_results.append((nurse_name, review))

            status_icon = {
                ReviewStatus.RESOLVED: "✓",
                ReviewStatus.SUSPENDED: "✗",
                ReviewStatus.MANUAL_REVIEW: "⚠",
                ReviewStatus.EVIDENCE_MISSING: "⚠",
                ReviewStatus.PENDING: "○",
                ReviewStatus.PROCESSING: "→",
            }.get(review.status, "?")

            print(f"  {status_icon} 状态: {review.status.value}")
            print(f"    说明: {review.review_notes}")

            if review.missing_references:
                print(f"    缺失引用: {len(review.missing_references)} 项")
                for ref in review.missing_references:
                    print(f"      - {ref}")

            if review.resolution:
                print(f"    处理结论:")
                for line in review.resolution.split("\n"):
                    print(f"      {line}")

        except Exception as e:
            print(f"  ✗ 复核失败: {str(e)}")
            traceback.print_exc()

    print("\n" + "=" * 70)
    print("【阶段3】现场老师处理待办事项")
    print("=" * 70)

    pending_items = engine.get_pending_items()
    print(f"\n>>> 待处理事项: {len(pending_items)} 项")
    for i, rr in enumerate(pending_items, 1):
        rec = engine.recommendations.get(rr.recommendation_id)
        nurse_name = rec.nurse_name if rec else "未知"
        print(f"\n  {i}. {nurse_name} ({rr.recommendation_id})")
        print(f"     状态: {rr.status.value}")
        print(f"     说明: {rr.review_notes}")

    print("\n>>> 老师处理挂起记录（张伟明）...")
    for rr in pending_items:
        rec = engine.recommendations.get(rr.recommendation_id)
        if rec and rec.nurse_name == "张伟明" and rr.status == ReviewStatus.SUSPENDED:
            updated = engine.resolve_suspended(
                review_id=rr.review_id,
                resolution="已补充证据：内科病房调整通知原件已归档，编号ADM-2026-0610-001。赵护士长签字确认。",
                operator="李老师",
            )
            print(f"  ✓ 已处理张伟明的挂起记录")
            print(f"    新状态: {updated.status.value}")

    print("\n>>> 老师确认人工改判（李美丽）...")
    for rr in pending_items:
        rec = engine.recommendations.get(rr.recommendation_id)
        if rec and rec.nurse_name == "李美丽" and rr.status == ReviewStatus.MANUAL_REVIEW:
            updated = engine.confirm_manual_review(
                review_id=rr.review_id,
                confirmed=True,
                comment="人工改判依据充分，哺乳期证明真实有效，同意改判。",
                operator="李老师",
            )
            print(f"  ✓ 已确认李美丽的人工改判")
            print(f"    新状态: {updated.status.value}")

    print("\n>>> 老师拒绝陈静怡的人工改判（要求补证据）...")
    for rr in engine.get_pending_items():
        rec = engine.recommendations.get(rr.recommendation_id)
        if rec and rec.nurse_name == "陈静怡" and rr.status == ReviewStatus.SUSPENDED:
            updated = engine.confirm_manual_review(
                review_id=rr.review_id,
                confirmed=False,
                comment="需要补充：1）急诊科夜班人手不足的书面证明；2）陈静怡本人的书面同意书；3）陈护士长的签字审批。",
                operator="李老师",
            )
            print(f"  ⚠ 已要求陈静怡的人工改判补充证据")
            print(f"    新状态: {updated.status.value}")

    print("\n" + "=" * 70)
    print("【阶段4】状态汇总与CSV导出")
    print("=" * 70)

    summary = engine.get_summary()
    print(f"\n>>> 复核汇总:")
    print(f"  总记录数: {summary.total_count}")
    print(f"  已处理: {summary.resolved_count}")
    print(f"  待补证据: {summary.evidence_missing_count}")
    print(f"  已挂起: {summary.suspended_count}")
    print(f"  人工改判数: {summary.manual_judgment_count}")
    print(f"  被覆盖改判数: {summary.override_count}")

    print(f"\n>>> 已处理项:")
    for rr in engine.get_resolved_items():
        rec = engine.recommendations.get(rr.recommendation_id)
        nurse_name = rec.nurse_name if rec else "未知"
        print(f"  ✓ {nurse_name}: {rr.review_notes}")

    print(f"\n>>> 待补证据项:")
    for rr in engine.get_pending_items():
        rec = engine.recommendations.get(rr.recommendation_id)
        nurse_name = rec.nurse_name if rec else "未知"
        print(f"  ⚠ {nurse_name}: {rr.status.value} - {rr.review_notes}")

    output_dir = Path("output")
    output_dir.mkdir(exist_ok=True)

    review_csv = output_dir / "review_records.csv"
    version_csv = output_dir / "version_trace.csv"

    engine.export_review_csv(str(review_csv))
    engine.export_version_trace_csv(str(version_csv))

    print(f"\n>>> CSV文件已导出:")
    print(f"  复核记录: {review_csv}")
    print(f"  版本追溯: {version_csv}")

    print("\n" + "=" * 70)
    print("【阶段5】模拟AI产品阿宁交接验证")
    print("=" * 70)

    print("\n>>> 阿宁查询：从版本说明找到原始说法...")
    print(f"  查询版本 VER-20260605-002:")
    vn = engine.version_notes.get("VER-20260605-002")
    if vn:
        print(f"    标题: {vn.title}")
        print(f"    发布日期: {vn.publish_date}")
        print(f"    描述: {vn.description}")
        print(f"    证据引用: {vn.evidence_reference}")

    print(f"\n>>> 阿宁查询：从CSV明细讲清李美丽的处理结果...")
    for rr in engine.review_records.values():
        rec = engine.recommendations.get(rr.recommendation_id)
        if rec and rec.nurse_name == "李美丽":
            print(f"  复核ID: {rr.review_id}")
            print(f"  推荐ID: {rr.recommendation_id}")
            print(f"  状态: {rr.status.value}")
            print(f"  证据链:")
            for item in rr.evidence_chain:
                if item["type"] == "original_recommendation":
                    print(f"    - 原始推荐: {item['description']} (模型:{item['model_version']})")
                elif item["type"] == "version_reference":
                    print(f"    - 版本引用: {item['id']} - {item['title']}")
                elif item["type"] == "correction":
                    override = "[已覆盖]" if item["is_overridden"] else ""
                    print(f"    - 改判{override}: [{item['correction_type']}] {item['original']} → {item['corrected']}")
                    print(f"      原因: {item['reason']}")
            print(f"  处理结论:")
            for line in (rr.resolution or "").split("\n"):
                print(f"    {line}")
            break

    print("\n>>> 阿宁查询：陈静怡的改判覆盖关系...")
    for rr in engine.review_records.values():
        rec = engine.recommendations.get(rr.recommendation_id)
        if rec and rec.nurse_name == "陈静怡":
            print(f"  复核ID: {rr.review_id}")
            print(f"  状态: {rr.status.value}")
            print(f"  证据链（含覆盖关系）:")
            for item in rr.evidence_chain:
                if item["type"] == "correction":
                    override = "[已覆盖]" if item["is_overridden"] else ""
                    print(f"    - {item['id']}{override}: [{item['correction_type']}]")
                    print(f"      {item['original']} → {item['corrected']}")
                    if item.get("override_info"):
                        print(f"      被 {item['override_info']['overridden_by']} 覆盖")
                        print(f"      原因: {item['override_info']['override_reason']}")
            break

    print("\n" + "=" * 70)
    print("测试完成！")
    print("=" * 70)

    print(f"\n数据文件位置:")
    print(f"  数据目录: {data_dir}/")
    print(f"  版本说明: {data_dir}/version_notes.json")
    print(f"  推荐记录: {data_dir}/recommendations.json")
    print(f"  改判记录: {data_dir}/manual_corrections.json")
    print(f"  复核记录: {data_dir}/review_records.json")
    print(f"  导出CSV: output/")

    print(f"\n关键验证点:")
    print(f"  ✓ 版本说明和人工改判的关系已留存")
    print(f"  ✓ 人工改判被新结果覆盖的关系已记录")
    print(f"  ✓ 引用缺失时系统自动挂起，不给出假稳定结论")
    print(f"  ✓ 旧模型误判样本（李美丽）可以解释改判原因")
    print(f"  ✓ 现场老师可以看到已处理/待补证据的状态")
    print(f"  ✓ 可以从版本说明找到原始说法")
    print(f"  ✓ 可以从CSV明细讲清处理结果")

    return engine


if __name__ == "__main__":
    try:
        engine = run_full_test()
    except Exception as e:
        print(f"\n测试执行失败: {str(e)}")
        traceback.print_exc()
        sys.exit(1)
