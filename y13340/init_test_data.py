#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
from pathlib import Path

from data_models import (
    VersionNote,
    ScheduleRecommendation,
    ManualCorrection,
    CorrectionType,
)
from review_engine import ScheduleReviewEngine


def init_test_data(data_dir: str = "review_data"):
    engine = ScheduleReviewEngine(data_dir=data_dir)

    print("=" * 60)
    print("正在初始化排班推荐证据复核测试数据...")
    print("=" * 60)

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

    print("\n【1/5】正在添加版本说明...")
    for vn in version_notes:
        vid = engine.add_version_note(vn)
        print(f"  ✓ 已添加版本: {vid} - {vn.title}")

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

    print("\n【2/5】正在添加排班推荐记录...")
    for rec in recommendations:
        rid = engine.add_recommendation(rec)
        print(f"  ✓ 已添加推荐: {rid} - {rec.nurse_name} - {rec.original_recommendation}")

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

    print("\n【3/5】正在添加人工改判记录...")
    for mc in corrections:
        cid = engine.add_manual_correction(mc)
        print(f"  ✓ 已添加改判: {cid} - {mc.original_result} → {mc.corrected_result}")
        if mc.correction_type == CorrectionType.MANUAL_JUDGMENT:
            print(f"    ⚠  这是一条人工改判记录，需要老师确认")

    print("\n【4/5】模拟：新推荐结果覆盖旧改判...")
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
    print(f"  ✓ 新改判已覆盖旧结果: {cid}")
    print(f"    旧改判COR-20260618-003现在标记为[已覆盖]")

    print("\n【5/5】标记：旧模型误判样本...")
    print(f"  ✓ REC-20260618-002（李美丽）是旧模型v2.2.0的误判样本")
    print(f"    已在改判记录中保留了改判原因和版本引用")
    print(f"    后续复核时可以自动解释为什么需要改判")

    print("\n" + "=" * 60)
    print("测试数据初始化完成！")
    print("=" * 60)
    print(f"\n数据目录: {data_dir}")
    print(f"版本说明: {len(engine.version_notes)} 条")
    print(f"推荐记录: {len(engine.recommendations)} 条")
    print(f"改判记录: {len(engine.manual_corrections)} 条")
    print(f"\n特别说明：")
    print(f"  • VER-20260610-003 和 VER-20260615-005 故意未填写证据引用")
    print(f"  • COR-20260618-002 和 COR-20260618-004 故意未填写证据引用")
    print(f"  • COR-20260618-001 是人工改判，需要老师确认")
    print(f"  • COR-20260618-003 已被新改判覆盖")
    print(f"  • 这些不完整数据用于测试系统的挂起机制")

    return engine


if __name__ == "__main__":
    data_dir = sys.argv[1] if len(sys.argv) > 1 else "review_data"
    init_test_data(data_dir)
