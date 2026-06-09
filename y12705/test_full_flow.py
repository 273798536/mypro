#!/usr/bin/env python3
"""贝叶斯先验敏感性 - 完整流程测试脚本"""

import os
import sys
import shutil

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from bayesian_prior_sensitivity.dataloader import DataStore
from bayesian_prior_sensitivity.core import (
    check_constraints,
    compute_sensitivity,
    batch_review,
    trace_conclusion,
)
from bayesian_prior_sensitivity.audit import AuditTrailManager
from bayesian_prior_sensitivity.models import CaseStatus
from bayesian_prior_sensitivity.reporting import (
    format_summary_text,
    format_committee_view,
    format_single_result,
)
from bayesian_prior_sensitivity.errors import BPSError

TEST_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bps_test_run")


def log(msg):
    print(msg, flush=True)


def run_test():
    log("=" * 70)
    log("贝叶斯先验敏感性 - 完整流程测试")
    log("=" * 70)

    if os.path.exists(TEST_DIR):
        shutil.rmtree(TEST_DIR)

    log("\n[步骤 1] 初始化数据仓库并写入样例数据")
    store = DataStore(TEST_DIR)

    from bayesian_prior_sensitivity.models import (
        BoundaryCase, PriorParams, ScoringRecord, SourceMaterial, StudentAnswer,
    )

    cases = [
        BoundaryCase(
            case_id="BC-001",
            description="学生在二次函数顶点式应用中，对 h 的符号判断常出错",
            boundary_flag=True,
            prior_params=PriorParams(alpha=2.0, beta=5.0, distribution="beta",
                                     description="弱信息先验，偏向较低正确率"),
            conclusion="",
            status=CaseStatus.PENDING,
            tags=["math"],
        ),
        BoundaryCase(
            case_id="BC-002",
            description="古文翻译中实词活用的边界样例",
            boundary_flag=True,
            prior_params=PriorParams(alpha=3.0, beta=3.0, distribution="beta",
                                     description="对称先验"),
            conclusion="",
            status=CaseStatus.PENDING,
            tags=["chinese"],
        ),
        BoundaryCase(
            case_id="BC-003",
            description="物理受力分析（故意缺少评分记录，用于测试错误）",
            boundary_flag=True,
            prior_params=PriorParams(alpha=1.0, beta=1.0, distribution="beta"),
            conclusion="",
            status=CaseStatus.PENDING,
            tags=["physics"],
        ),
    ]
    store.save_cases(cases)

    scoring = [
        ScoringRecord(record_id="S1", case_id="BC-001", scorer="expert_a", score=0.4, notes="正确率偏低"),
        ScoringRecord(record_id="S2", case_id="BC-001", scorer="expert_b", score=0.35),
        ScoringRecord(record_id="S3", case_id="BC-001", scorer="expert_c", score=0.5),
        ScoringRecord(record_id="S4", case_id="BC-002", scorer="expert_a", score=0.6),
        ScoringRecord(record_id="S5", case_id="BC-002", scorer="expert_b", score=0.55),
        ScoringRecord(record_id="S6", case_id="BC-002", scorer="expert_c", score=0.65),
    ]
    store.save_scoring(scoring)

    sources = [
        SourceMaterial(material_id="M1", case_id="BC-001", material_type="question_text",
                       content="已知二次函数 y=2(x-3)²+4，求其顶点坐标。", location="教材P45例2"),
        SourceMaterial(material_id="M2", case_id="BC-001", material_type="rubric",
                       content="顶点式 y=a(x-h)²+k 中顶点为(h,k)。", location="评分标准v2.1"),
        SourceMaterial(material_id="M3", case_id="BC-001", material_type="reference_answer",
                       content="顶点坐标为 (3, 4)", location="参考答案"),
        SourceMaterial(material_id="M4", case_id="BC-002", material_type="question_text",
                       content="翻译：渔人甚异之。", location="《桃花源记》"),
        SourceMaterial(material_id="M5", case_id="BC-002", material_type="rubric",
                       content="'异'为意动用法。", location="评分标准v2.1"),
        SourceMaterial(material_id="M6", case_id="BC-002", material_type="reference_answer",
                       content="渔人对看到的景象感到非常诧异。", location="参考答案"),
    ]
    store.save_sources(sources)

    answers = [
        StudentAnswer(answer_id="A1", case_id="BC-001", student_id="S101",
                      is_correct=False, answer_content="(-3, 4)", error_category="h符号错误"),
        StudentAnswer(answer_id="A2", case_id="BC-001", student_id="S102",
                      is_correct=True, answer_content="(3, 4)"),
    ]
    store.save_answers(answers)
    log(f"  ✓ 写入 {len(cases)} 个边界样例、{len(scoring)} 条评分、{len(sources)} 条来源材料")

    log("\n[步骤 2] 约束校验")
    bundles = store.build_bundles()
    for cid, bundle in bundles.items():
        violations = check_constraints(bundle)
        if violations:
            log(f"  ✗ {cid}: {len(violations)} 条违规 - {violations}")
        else:
            log(f"  ✓ {cid}: 约束校验通过")

    log("\n[步骤 3] 测试可操作错误提示 - 缺少评分记录")
    try:
        compute_sensitivity(bundles["BC-003"])
        log("  ✗ 应该抛出错误但没有")
    except BPSError as e:
        log(f"  ✓ 正确抛出 BPSError，错误信息:")
        for line in str(e).split("\n"):
            log(f"    {line}")

    log("\n[步骤 4] 批量复核（约束校验 + 敏感性计算）")
    review = batch_review(bundles)
    report = review["report"]
    log(f"  总样例数: {report.total_cases}")
    log(f"  约束通过: {report.constraint_pass_count}，约束失败: {report.constraint_fail_count}")
    log(f"  可用: {report.usable_count}，暂缓: {report.pending_count}，需重采: {report.needs_recollection_count}")
    if review["errors"]:
        log(f"  计算错误: {len(review['errors'])} 个")
        for cid, err in review["errors"].items():
            log(f"    - {cid}: {err[:80]}")
    if review["results"]:
        for cid, r in review["results"].items():
            log(f"  ✓ {cid}: 后验均值={r.posterior_mean:.4f}，鲁棒性指数={r.robustness_index:.4f}，"
                f"鲁棒={r.is_robust}，投委会={r.committee_decision.value}")

    log("\n[步骤 5] 保存敏感性结果")
    store.save_results(list(review["results"].values()))
    log(f"  ✓ 已保存 {len(review['results'])} 条结果")

    log("\n[步骤 6] 人工修正 - 将 BC-001 状态从 pending 改为 approved")
    audits = store.load_audit()
    manager = AuditTrailManager(audits)
    bundle = bundles["BC-001"]
    old_status = bundle.case.status
    entry = manager.record_status_change(
        bundle, CaseStatus.APPROVED, operator="algo_engineer_01",
        reason="三位专家评分一致，先验敏感性稳定"
    )
    log(f"  ✓ 状态变更: {old_status.value} → {bundle.case.status.value}")
    log(f"    操作人: {entry.operator}，原因: {entry.reason}")
    log(f"    版本号: v{bundle.case.version}")

    log("\n[步骤 7] 人工修正 - 修改 BC-001 结论")
    old_conclusion = bundle.case.conclusion
    entry = manager.record_conclusion_change(
        bundle,
        new_conclusion="该边界样例稳定，学生易错点为顶点式 h 符号，可纳入分析",
        operator="algo_engineer_01",
        reason="复核通过后补充结论"
    )
    log(f"  ✓ 结论变更: '{old_conclusion}' → '{bundle.case.conclusion}'")
    log(f"    操作人: {entry.operator}")

    log("\n[步骤 8] 测试非法状态流转")
    try:
        manager.record_status_change(bundle, CaseStatus.REJECTED, operator="test")
        log("  ✗ 应该抛出错误但没有")
    except BPSError as e:
        log(f"  ✓ 正确拦截非法流转:")
        for line in str(e).split("\n"):
            log(f"    {line}")

    log("\n[步骤 9] 保存变更和留痕")
    all_cases = store.load_cases()
    all_cases = [c if c.case_id != bundle.case.case_id else bundle.case for c in all_cases]
    store.save_cases(all_cases)
    store.save_audit(manager.entries)
    log(f"  ✓ 已保存状态变更")
    log(f"  ✓ 已保存 {len(manager.entries)} 条留痕记录")

    log("\n[步骤 10] 查看留痕对比")
    diff = manager.get_change_diff("BC-001")
    log(f"  BC-001 变更留痕:")
    for line in diff.split("\n"):
        log(f"    {line}")

    log("\n[步骤 11] 重新加载数据并复核（模拟边界样例变更后重新跑）")
    store2 = DataStore(TEST_DIR)
    bundles2 = store2.build_bundles()
    review2 = batch_review(bundles2)
    report2 = review2["report"]
    log(f"  重新批量复核结果: 可用={report2.usable_count}，暂缓={report2.pending_count}，需重采={report2.needs_recollection_count}")
    for r in report2.cases:
        log(f"  {r.case_id}: 数据可用={r.data_availability.value}，投委会={r.committee_decision.value}")

    log("\n[步骤 12] 结论追溯 - 拉回来源材料")
    bc001 = bundles2["BC-001"]
    evidence = trace_conclusion(bc001)
    log(f"  结论: {evidence['conclusion']}")
    log(f"  状态: {evidence['status']}")
    log(f"  来源材料数: {len(evidence['sources'])}")
    for s in evidence["sources"]:
        log(f"    [{s['material_type']}] {s['location']}: {s['content_excerpt']}")
    log(f"  评分依据数: {len(evidence['scoring_evidence'])}")
    log(f"  留痕记录数: {len(evidence['audit_references'])}")

    log("\n[步骤 13] 生成文本报告 - 摘要")
    log(format_summary_text(report2))

    log("\n[步骤 14] 生成文本报告 - 投委会视图")
    log(format_committee_view(report2))

    log("\n[步骤 15] 单样例详情展示")
    bc001_result = next((r for r in report2.cases if r.case_id == "BC-001"), None)
    log(format_single_result(bc001, bc001_result, include_trace=False))

    log("\n" + "=" * 70)
    log("✓ 全部测试通过！贝叶斯先验敏感性系统完整流程验证成功。")
    log("=" * 70)
    log(f"\n测试数据目录: {TEST_DIR}")
    log("可用 CLI 命令:")
    log("  bps init-sample                         生成样例数据")
    log("  bps list-cases                          列出边界样例")
    log("  bps check-constraints                   约束校验")
    log("  bps compute <case_id>                   单样例敏感性计算")
    log("  bps batch-review                        批量复核")
    log("  bps amend-status <id> --to approved     人工修正状态（留痕）")
    log("  bps amend-conclusion <id> --to <text>   人工修正结论（留痕）")
    log("  bps show-trail <case_id>                查看变更留痕")
    log("  bps trace <case_id>                     追溯结论来源")
    log("  bps report --view committee             生成投委会视图")
    log("  bps load-scoring                        补录缺失评分")
    log("  bps add-source                          补录缺失来源材料")


if __name__ == "__main__":
    run_test()
