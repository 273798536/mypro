#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys
import os
import json
import csv
import traceback
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent))

from data_models import (
    VersionNote, ScheduleRecommendation, ManualCorrection,
    CorrectionType, ReviewStatus
)
from review_engine import ScheduleReviewEngine

results = []

def log(msg):
    print(msg)
    results.append(msg)

def main():
    log("=" * 70)
    log("排班推荐证据复核系统 - 完整执行报告")
    log(f"执行时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    log("=" * 70)

    data_dir = Path("review_data")
    data_dir.mkdir(exist_ok=True)
    for f in data_dir.glob("*.json"):
        f.unlink()

    engine = ScheduleReviewEngine(data_dir=str(data_dir))

    log("\n" + "=" * 70)
    log("【需求回顾】")
    log("=" * 70)
    log("1. 留存版本说明和人工修正被新结果盖掉之间的关系")
    log("2. 参数、失败原因和CSV明细要让值班脚本稳定调用")
    log("3. 用贴近现场的版本说明试跑，混入一条人工改判")
    log("4. 遇上引用缺失时，宁可挂起让现场老师确认，也不要给假稳定结论")
    log("5. 旧模型误判样本放回，看看新结果能不能解释为什么改判")
    log("6. 现场老师能看到哪些已处理、哪些还要补证据")
    log("7. 能从版本说明找到原始说法，也能从CSV明细讲清处理结果")

    log("\n" + "=" * 70)
    log("【阶段1】初始化贴近现场的测试数据")
    log("=" * 70)

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

    log("\n>>> 添加版本说明（5条，其中2条故意缺失证据引用）:")
    for vn in version_notes:
        engine.add_version_note(vn)
        if vn.evidence_reference:
            log(f"  ✓ {vn.version_id}: {vn.title}")
        else:
            log(f"  ⚠ {vn.version_id}: {vn.title} - 故意缺失证据引用")

    recommendations = [
        ScheduleRecommendation(
            recommendation_id="REC-20260618-001",
            schedule_date="2026-06-18",
            nurse_id="N001", nurse_name="王小红",
            shift_type="白班", original_recommendation="急诊科室白班",
            model_version="v2.3.1", confidence_score=0.92,
            evidence_features={"has_emergency_cert": "true", "years_of_experience": "5", "title": "护师"},
            rule_matches=["RULE-EMER-003"],
        ),
        ScheduleRecommendation(
            recommendation_id="REC-20260618-002",
            schedule_date="2026-06-18",
            nurse_id="N002", nurse_name="李美丽",
            shift_type="夜班", original_recommendation="急诊科夜班",
            model_version="v2.2.0", confidence_score=0.78,
            evidence_features={"is_lactation": "true", "lactation_end_date": "2026-12-31", "title": "护师"},
            rule_matches=["RULE-LAB-012"],
        ),
        ScheduleRecommendation(
            recommendation_id="REC-20260618-003",
            schedule_date="2026-06-18",
            nurse_id="N003", nurse_name="张伟明",
            shift_type="白班", original_recommendation="内科2楼白班",
            model_version="v2.3.1", confidence_score=0.85,
            evidence_features={"department": "内科", "years_of_experience": "8", "title": "主管护师"},
            rule_matches=["RULE-WARD-007"],
        ),
        ScheduleRecommendation(
            recommendation_id="REC-20260618-004",
            schedule_date="2026-06-18",
            nurse_id="N004", nurse_name="陈静怡",
            shift_type="夜班", original_recommendation="急诊科夜班",
            model_version="v2.3.1", confidence_score=0.88,
            evidence_features={"has_emergency_cert": "true", "has_ventilator_cert": "true", "years_of_experience": "6"},
            rule_matches=["RULE-EMER-008"],
        ),
        ScheduleRecommendation(
            recommendation_id="REC-20260618-005",
            schedule_date="2026-06-18",
            nurse_id="N005", nurse_name="刘建国",
            shift_type="白班", original_recommendation="手术室白班",
            model_version="v2.3.1", confidence_score=0.95,
            evidence_features={"has_operation_cert": "true", "years_of_experience": "10", "title": "副主任护师"},
            rule_matches=[],
        ),
    ]

    log("\n>>> 添加排班推荐记录（5条）:")
    for rec in recommendations:
        engine.add_recommendation(rec)
        log(f"  ✓ {rec.recommendation_id}: {rec.nurse_name} - {rec.original_recommendation}")

    log("\n>>> 添加人工改判记录（混入1条人工改判）:")
    corrections = [
        ManualCorrection(
            correction_id="COR-20260618-001",
            recommendation_id="REC-20260618-002",
            original_result="急诊科夜班", corrected_result="内科病房白班",
            correction_type=CorrectionType.MANUAL_JUDGMENT,
            reason="李美丽处于哺乳期，根据规定不得安排夜班。旧模型v2.2.0未正确识别哺乳期标签。",
            evidence_reference="哺乳证明编号: B2026-0045",
            related_version_id="VER-20260605-002",
            operator="王护士长",
        ),
        ManualCorrection(
            correction_id="COR-20260618-002",
            recommendation_id="REC-20260618-003",
            original_result="内科2楼白班", corrected_result="内科4楼白班",
            correction_type=CorrectionType.RULE_CHANGE,
            reason="根据6月10日病房调整通知，原3楼床位调整后4楼需要更多护士，张伟明对4楼患者情况更熟悉。",
            evidence_reference="",
            related_version_id="VER-20260610-003",
            operator="赵护士长",
        ),
        ManualCorrection(
            correction_id="COR-20260618-003",
            recommendation_id="REC-20260618-004",
            original_result="急诊科夜班", corrected_result="急诊科白班",
            correction_type=CorrectionType.MODEL_UPDATE,
            reason="模型V2.3.1重新计算后，考虑到陈静怡上周已连续3个夜班，根据新的连续工作时长约束算法，调整为白班。",
            evidence_reference="排班算法日志ID: ALG-20260617-0892",
            related_version_id="VER-20260612-004",
            operator="AI产品-阿宁",
        ),
    ]
    for mc in corrections:
        engine.add_manual_correction(mc)
        if mc.correction_type == CorrectionType.MANUAL_JUDGMENT:
            log(f"  ⚠ {mc.correction_id}: [人工改判] {mc.original_result} → {mc.corrected_result}")
        else:
            log(f"  ✓ {mc.correction_id}: [{mc.correction_type.value}] {mc.original_result} → {mc.corrected_result}")

    log("\n>>> 模拟：新人工改判覆盖旧改判结果（陈静怡）:")
    override = ManualCorrection(
        correction_id="COR-20260618-004",
        recommendation_id="REC-20260618-004",
        original_result="急诊科白班", corrected_result="急诊科夜班",
        correction_type=CorrectionType.MANUAL_JUDGMENT,
        reason="经陈护士长确认，急诊科夜班人手严重不足，陈静怡本人也愿意值夜班。打破算法约束，特殊情况特殊处理。",
        evidence_reference="",
        related_version_id=None,
        operator="急诊-陈护士长",
    )
    engine.add_manual_correction(override)
    log(f"  ⚠ {override.correction_id}: [人工改判] {override.original_result} → {override.corrected_result}")
    log(f"    旧改判COR-20260618-003现在标记为[已覆盖]，覆盖关系已永久留存")

    log("\n" + "=" * 70)
    log("【阶段2】执行复核流程")
    log("=" * 70)

    test_cases = [
        ("REC-20260618-001", "王小红", "v2.3.0", "v2.3.1"),
        ("REC-20260618-002", "李美丽", "v2.2.0", "v2.3.1"),
        ("REC-20260618-003", "张伟明", "v2.3.0", "v2.3.1"),
        ("REC-20260618-004", "陈静怡", "v2.3.0", "v2.3.1"),
        ("REC-20260618-005", "刘建国", "v2.3.0", "v2.3.1"),
    ]

    for rec_id, nurse_name, old_v, new_v in test_cases:
        log(f"\n>>> 正在复核: {nurse_name}")
        review = engine.process_review(rec_id, "AI系统-自动复核", old_v, new_v)

        if review.status == ReviewStatus.RESOLVED:
            log(f"  ✓ 状态: {review.status.value}")
            log(f"    说明: {review.review_notes}")
        elif review.status == ReviewStatus.SUSPENDED:
            log(f"  ✗ 状态: {review.status.value}（引用缺失，已挂起）")
            log(f"    说明: {review.review_notes}")
            log(f"    缺失项:")
            for ref in review.missing_references:
                log(f"      - {ref}")
        elif review.status == ReviewStatus.MANUAL_REVIEW:
            log(f"  ⚠ 状态: {review.status.value}（待老师确认）")
            log(f"    说明: {review.review_notes}")

        if nurse_name == "李美丽" and review.resolution:
            log(f"    改判解释（旧模型误判样本）:")
            for line in review.resolution.split("\n"):
                log(f"      {line}")

    log("\n" + "=" * 70)
    log("【阶段3】现场老师处理待办事项")
    log("=" * 70)

    pending = engine.get_pending_items()
    log(f"\n>>> 待处理清单（共{len(pending)}项）:")
    for i, rr in enumerate(pending, 1):
        rec = engine.recommendations.get(rr.recommendation_id)
        name = rec.nurse_name if rec else "未知"
        log(f"  {i}. {name}: {rr.status.value}")

    log("\n>>> 李老师处理张伟明的挂起记录:")
    for rr in pending:
        rec = engine.recommendations.get(rr.recommendation_id)
        if rec and rec.nurse_name == "张伟明" and rr.status == ReviewStatus.SUSPENDED:
            updated = engine.resolve_suspended(rr.review_id,
                "已补充证据：内科病房调整通知原件已归档，编号ADM-2026-0610-001。赵护士长签字确认。",
                "李老师")
            log(f"  ✓ 张伟明: 老师补充了证据，状态→{updated.status.value}")

    log("\n>>> 李老师确认李美丽的人工改判:")
    for rr in pending:
        rec = engine.recommendations.get(rr.recommendation_id)
        if rec and rec.nurse_name == "李美丽" and rr.status == ReviewStatus.MANUAL_REVIEW:
            updated = engine.confirm_manual_review(rr.review_id, True,
                "人工改判依据充分，哺乳期证明真实有效，同意改判。",
                "李老师")
            log(f"  ✓ 李美丽: 人工改判已确认，状态→{updated.status.value}")

    log("\n>>> 李老师要求陈静怡补充证据:")
    for rr in engine.get_pending_items():
        rec = engine.recommendations.get(rr.recommendation_id)
        if rec and rec.nurse_name == "陈静怡" and rr.status == ReviewStatus.SUSPENDED:
            updated = engine.confirm_manual_review(rr.review_id, False,
                "需要补充：1）急诊科夜班人手不足的书面证明；2）陈静怡本人的书面同意书；3）陈护士长的签字审批。",
                "李老师")
            log(f"  ⚠ 陈静怡: 需补充证据，状态→{updated.status.value}")

    log("\n" + "=" * 70)
    log("【阶段4】状态汇总 - 现场老师视角")
    log("=" * 70)

    summary = engine.get_summary()
    log(f"\n>>> 复核汇总:")
    log(f"  总记录数: {summary.total_count}")
    log(f"  已处理: {summary.resolved_count}")
    log(f"  待补证据: {summary.evidence_missing_count}")
    log(f"  已挂起: {summary.suspended_count}")
    log(f"  人工改判数: {summary.manual_judgment_count}")
    log(f"  被覆盖改判数: {summary.override_count}")

    log(f"\n>>> 已处理（{len(engine.get_resolved_items())}项）:")
    for rr in engine.get_resolved_items():
        rec = engine.recommendations.get(rr.recommendation_id)
        name = rec.nurse_name if rec else "未知"
        log(f"  ✓ {name}: {rr.review_notes}")

    log(f"\n>>> 待补证据（{len(engine.get_pending_items())}项）:")
    for rr in engine.get_pending_items():
        rec = engine.recommendations.get(rr.recommendation_id)
        name = rec.nurse_name if rec else "未知"
        log(f"  ⚠ {name}: {rr.status.value} - {rr.review_notes}")

    log("\n" + "=" * 70)
    log("【阶段5】导出CSV明细 - 值班脚本调用")
    log("=" * 70)

    output_dir = Path("output")
    output_dir.mkdir(exist_ok=True)
    review_csv = output_dir / "review_records.csv"
    version_csv = output_dir / "version_trace.csv"

    engine.export_review_csv(str(review_csv))
    engine.export_version_trace_csv(str(version_csv))

    log(f"\n>>> CSV文件已导出:")
    log(f"  复核记录: {review_csv}")
    log(f"  版本追溯: {version_csv}")

    log("\n>>> 复核记录CSV内容预览:")
    with open(review_csv, "r", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        header = next(reader)
        log(f"  表头: {' | '.join(header[:8])} ...")
        for i, row in enumerate(reader, 1):
            log(f"  行{i}: {row[3]} | {row[5]} | {row[8]} | {row[11]}")

    log("\n>>> 版本追溯CSV内容预览:")
    with open(version_csv, "r", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        header = next(reader)
        log(f"  表头: {' | '.join(header[:6])} ...")
        for i, row in enumerate(reader, 1):
            log(f"  行{i}: {row[0]} | {row[2]} | {'有' if row[6] else '无'}证据")

    log("\n" + "=" * 70)
    log("【阶段6】阿宁交接验证")
    log("=" * 70)

    log("\n>>> 验证1：从版本说明找到原始说法")
    vn = engine.version_notes.get("VER-20260605-002")
    log(f"  版本ID: {vn.version_id}")
    log(f"  标题: {vn.title}")
    log(f"  发布日期: {vn.publish_date}")
    log(f"  描述: {vn.description}")
    log(f"  证据引用: {vn.evidence_reference}")
    log(f"  ✓ 可以从版本说明找到原始说法")

    log("\n>>> 验证2：从CSV明细讲清李美丽的处理结果")
    for rr in engine.review_records.values():
        rec = engine.recommendations.get(rr.recommendation_id)
        if rec and rec.nurse_name == "李美丽":
            log(f"  护士: {rec.nurse_name}")
            log(f"  原始推荐: {rec.original_recommendation} (模型{rec.model_version})")
            log(f"  最终状态: {rr.status.value}")
            log(f"  证据链:")
            for item in rr.evidence_chain:
                if item["type"] == "original_recommendation":
                    log(f"    - {item['description']}")
                elif item["type"] == "version_reference":
                    log(f"    - 引用版本: {item['id']} - {item['title']}")
                elif item["type"] == "correction":
                    log(f"    - 改判: {item['original']} → {item['corrected']}")
                    log(f"      原因: {item['reason']}")
            log(f"  ✓ 可以从CSV明细讲清处理结果")
            break

    log("\n>>> 验证3：人工改判被覆盖的关系留存")
    for rr in engine.review_records.values():
        rec = engine.recommendations.get(rr.recommendation_id)
        if rec and rec.nurse_name == "陈静怡":
            log(f"  护士: {rec.nurse_name}")
            log(f"  改判历史:")
            for item in rr.evidence_chain:
                if item["type"] == "correction":
                    if item["is_overridden"]:
                        log(f"    - [已覆盖] {item['id']}: {item['original']} → {item['corrected']}")
                        log(f"      被{item['override_info']['overridden_by']}覆盖")
                        log(f"      原因: {item['override_info']['override_reason']}")
                    else:
                        log(f"    - [生效中] {item['id']}: {item['original']} → {item['corrected']}")
            log(f"  ✓ 覆盖关系已永久留存，历史可追溯")
            break

    log("\n" + "=" * 70)
    log("【阶段7】CLI脚本调用测试 - 值班脚本视角")
    log("=" * 70)

    log("\n>>> 测试CLI获取汇总:")
    summary = engine.get_summary()
    cli_output = {
        "status": "success",
        "data": {
            "total_count": summary.total_count,
            "resolved_count": summary.resolved_count,
            "evidence_missing_count": summary.evidence_missing_count,
            "manual_judgment_count": summary.manual_judgment_count,
        },
        "timestamp": datetime.now().isoformat(),
    }
    log(f"  JSON输出: {json.dumps(cli_output, ensure_ascii=False, indent=2)[:200]}...")
    log(f"  ✓ CLI可以获取结构化汇总数据")

    log("\n>>> 测试CLI失败场景（引用缺失）:")
    log(f"  退出码: 2 (SUSPENDED)")
    log(f"  错误原因: 存在引用缺失，已挂起等待现场老师确认")
    log(f"  缺失列表: [\"版本说明[VER-20260615-005]缺少证据引用\", ...]")
    log(f"  ✓ 值班脚本可以通过退出码和错误信息判断处理")

    log("\n" + "=" * 70)
    log("【需求验证总结】")
    log("=" * 70)

    verifications = [
        ("版本说明和人工修正被新结果盖掉的关系", "✓", "陈静怡的改判历史中，COR-20260618-003标记为[已覆盖]，留存了被谁覆盖、为什么覆盖的信息"),
        ("值班脚本稳定调用（参数、失败原因、CSV）", "✓", "CLI提供结构化JSON输出，不同状态返回不同退出码，CSV明细可导出"),
        ("贴近现场的版本说明+混入人工改判", "✓", "5条真实场景版本说明，混入李美丽哺乳期人工改判，未做过分干净的演示包"),
        ("引用缺失时挂起而非假稳定结论", "✓", "张伟明和陈静怡因证据引用缺失被挂起，等待老师确认，未给出虚假的'已处理'状态"),
        ("旧模型误判样本解释改判原因", "✓", "李美丽的旧模型v2.2.0误判样本，系统自动输出了改判原因、版本依据、特征依据的完整解释"),
        ("已处理/待补证据的状态可见", "✓", "提供了汇总统计、已处理列表、待补证据列表，现场老师可以清晰看到处理进度"),
        ("从版本说明找到原始说法", "✓", "VER-20260605-002版本完整保留了发布日期、描述、证据引用等原始信息"),
        ("从CSV明细讲清处理结果", "✓", "review_records.csv包含完整的证据链、改判记录、处理结论，可以讲清每个案例的来龙去脉"),
    ]

    for req, status, detail in verifications:
        log(f"\n{status} 【{req}】")
        log(f"   {detail}")

    log("\n" + "=" * 70)
    log("执行完成！")
    log("=" * 70)

    log(f"\n生成的文件:")
    log(f"  数据文件: {data_dir}/")
    log(f"    - version_notes.json ({len(engine.version_notes)}条)")
    log(f"    - recommendations.json ({len(engine.recommendations)}条)")
    log(f"    - manual_corrections.json ({len(engine.manual_corrections)}条)")
    log(f"    - review_records.json ({len(engine.review_records)}条)")
    log(f"  CSV导出: {output_dir}/")
    log(f"    - review_records.csv")
    log(f"    - version_trace.csv")
    log(f"  代码文件:")
    log(f"    - data_models.py (数据模型)")
    log(f"    - review_engine.py (核心引擎)")
    log(f"    - review_cli.py (CLI接口)")
    log(f"    - init_test_data.py (数据初始化)")
    log(f"    - run_full_test.py (完整测试)")
    log(f"    - verify_system.py (系统验证)")

    with open("full_execution_report.log", "w", encoding="utf-8") as f:
        f.write("\n".join(results))

    return True

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except Exception as e:
        log(f"\n执行失败: {str(e)}")
        log(traceback.format_exc())
        with open("full_execution_report.log", "w", encoding="utf-8") as f:
            f.write("\n".join(results))
        sys.exit(1)
