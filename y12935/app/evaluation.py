from __future__ import annotations

from typing import Dict, List, Optional

from .drift_engine import (
    compute_distribution_stats,
    detect_question_drift,
    overall_drift_status,
)
from .models import (
    DriftReport,
    DriftReportSummary,
    EvalBenchmark,
    EvaluationVerdict,
    HumanCorrectionRequest,
    QuestionEvalResult,
    ResultReadiness,
)
from .security_rules import check_security_rules, has_rule_misconfig


def _decide_auto_verdict(
    drifted: bool,
    misconfig: bool,
    is_sensitive_category: bool,
) -> EvaluationVerdict:
    if misconfig:
        return EvaluationVerdict.NEEDS_SECURITY_REVIEW
    if drifted and is_sensitive_category:
        return EvaluationVerdict.PENDING_REVIEW
    if drifted:
        return EvaluationVerdict.FAIL
    return EvaluationVerdict.PASS


def _decide_readiness(
    final_verdict: EvaluationVerdict,
    has_misconfig: bool,
) -> ResultReadiness:
    if has_misconfig:
        return ResultReadiness.NEEDS_SECURITY_AUDITOR
    if final_verdict == EvaluationVerdict.PASS:
        return ResultReadiness.DIRECTLY_USABLE
    return ResultReadiness.NEEDS_SECURITY_AUDITOR


SENSITIVE_CATEGORIES = {
    "security_sensitive",
    "medical",
    "financial",
    "legal",
}


def run_evaluation(
    benchmark: EvalBenchmark,
    baseline_embeddings: Dict[str, List[float]],
    target_embeddings: Dict[str, List[float]],
    baseline_model: str,
    target_model: str,
) -> DriftReport:
    question_results: List[QuestionEvalResult] = []

    for q in benchmark.questions:
        bv = baseline_embeddings.get(q.id)
        tv = target_embeddings.get(q.id)
        if bv is None or tv is None:
            continue

        drifted, cos_dist, norm_diff = detect_question_drift(bv, tv)
        sec_checks = check_security_rules(q)
        misconfig = has_rule_misconfig(sec_checks)
        is_sensitive = q.category.value in SENSITIVE_CATEGORIES

        auto_verdict = _decide_auto_verdict(drifted, misconfig, is_sensitive)
        final_verdict = auto_verdict
        readiness = _decide_readiness(final_verdict, misconfig)

        question_results.append(
            QuestionEvalResult(
                question_id=q.id,
                question_text=q.text,
                category=q.category,
                baseline_model_version=baseline_model,
                target_model_version=target_model,
                cosine_distance=round(cos_dist, 6),
                norm_diff=round(norm_diff, 6),
                drift_detected=drifted,
                security_checks=sec_checks,
                has_rule_misconfig=misconfig,
                auto_verdict=auto_verdict,
                human_verdict=None,
                human_note=None,
                human_corrected_by=None,
                readiness=readiness,
            )
        )

    distribution = compute_distribution_stats(baseline_embeddings, target_embeddings)

    total = len(question_results)
    drift_count = sum(1 for r in question_results if r.drift_detected)
    misconfig_count = sum(1 for r in question_results if r.has_rule_misconfig)
    auto_pass = sum(1 for r in question_results if r.auto_verdict == EvaluationVerdict.PASS)
    auto_fail = sum(1 for r in question_results if r.auto_verdict == EvaluationVerdict.FAIL)
    needs_sec = sum(
        1
        for r in question_results
        if r.auto_verdict == EvaluationVerdict.NEEDS_SECURITY_REVIEW
    )
    directly_usable = sum(
        1 for r in question_results if r.readiness == ResultReadiness.DIRECTLY_USABLE
    )
    needs_auditor = sum(
        1 for r in question_results if r.readiness == ResultReadiness.NEEDS_SECURITY_AUDITOR
    )

    drift_rate = drift_count / total if total else 0.0
    status = overall_drift_status(
        drift_rate=drift_rate,
        ks_p_value=distribution.ks_p_value,
        mean_cosine_similarity=distribution.mean_cosine_similarity,
    )

    summary = DriftReportSummary(
        benchmark_id=benchmark.id,
        benchmark_name=benchmark.name,
        baseline_model=baseline_model,
        target_model=target_model,
        total_questions=total,
        drift_count=drift_count,
        drift_rate=round(drift_rate, 4),
        security_rule_misconfig_count=misconfig_count,
        auto_pass_count=auto_pass,
        auto_fail_count=auto_fail,
        needs_security_review_count=needs_sec,
        directly_usable_count=directly_usable,
        needs_auditor_count=needs_auditor,
        overall_status=status,
    )

    return DriftReport(
        summary=summary,
        distribution=distribution,
        question_results=question_results,
        baseline_embeddings=baseline_embeddings,
        target_embeddings=target_embeddings,
    )


def apply_human_correction(
    report: DriftReport,
    correction: HumanCorrectionRequest,
) -> Optional[QuestionEvalResult]:
    for r in report.question_results:
        if r.question_id == correction.question_id:
            r.human_verdict = correction.verdict
            r.human_note = correction.note
            r.human_corrected_by = correction.corrected_by
            r.readiness = _decide_readiness(correction.verdict, r.has_rule_misconfig)
            return r
    return None


def recompute_summary_from_results(report: DriftReport) -> DriftReportSummary:
    results = report.question_results
    total = len(results)
    drift_count = sum(1 for r in results if r.drift_detected)
    misconfig_count = sum(1 for r in results if r.has_rule_misconfig)

    def final_verdict(r: QuestionEvalResult) -> EvaluationVerdict:
        return r.human_verdict if r.human_verdict is not None else r.auto_verdict

    auto_pass = sum(1 for r in results if final_verdict(r) == EvaluationVerdict.PASS)
    auto_fail = sum(1 for r in results if final_verdict(r) == EvaluationVerdict.FAIL)
    needs_sec = sum(
        1 for r in results if final_verdict(r) == EvaluationVerdict.NEEDS_SECURITY_REVIEW
    )
    directly_usable = sum(
        1 for r in results if r.readiness == ResultReadiness.DIRECTLY_USABLE
    )
    needs_auditor = sum(
        1 for r in results if r.readiness == ResultReadiness.NEEDS_SECURITY_AUDITOR
    )

    drift_rate = drift_count / total if total else 0.0
    status = overall_drift_status(
        drift_rate=drift_rate,
        ks_p_value=report.distribution.ks_p_value,
        mean_cosine_similarity=report.distribution.mean_cosine_similarity,
    )

    return DriftReportSummary(
        benchmark_id=report.summary.benchmark_id,
        benchmark_name=report.summary.benchmark_name,
        baseline_model=report.summary.baseline_model,
        target_model=report.summary.target_model,
        total_questions=total,
        drift_count=drift_count,
        drift_rate=round(drift_rate, 4),
        security_rule_misconfig_count=misconfig_count,
        auto_pass_count=auto_pass,
        auto_fail_count=auto_fail,
        needs_security_review_count=needs_sec,
        directly_usable_count=directly_usable,
        needs_auditor_count=needs_auditor,
        overall_status=status,
    )
