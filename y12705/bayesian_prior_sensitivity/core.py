"""核心算法模块 - 先验敏感性计算、约束校验、批量复核、结论追溯"""

from __future__ import annotations

from typing import Any

import numpy as np
from scipy import stats

from .errors import (
    ConstraintViolationError,
    MissingScoringRecordError,
    MissingSourceMaterialError,
    PriorSensitivityError,
)
from .models import (
    BoundaryCase,
    CaseBundle,
    CaseStatus,
    CommitteeDecision,
    DataAvailability,
    SensitivityResult,
)

REQUIRED_SCORERS = ["expert_a", "expert_b", "expert_c"]
REQUIRED_SOURCE_TYPES = ["question_text", "rubric", "reference_answer"]
ROBUSTNESS_THRESHOLD = 0.15


def _check_scoring_complete(bundle: CaseBundle) -> list[str]:
    """检查评分记录完整性，返回缺失的评分人列表"""
    existing_scorers = {s.scorer for s in bundle.scoring_records}
    return [s for s in REQUIRED_SCORERS if s not in existing_scorers]


def _check_source_complete(bundle: CaseBundle) -> list[str]:
    """检查来源材料完整性，返回缺失的材料类型列表"""
    existing_types = {m.material_type for m in bundle.source_materials}
    return [t for t in REQUIRED_SOURCE_TYPES if t not in existing_types]


def _check_prior_params(case: BoundaryCase) -> list[str]:
    """检查先验参数合法性"""
    violations = []
    p = case.prior_params
    if p.alpha <= 0:
        violations.append(f"先验参数 alpha={p.alpha} 必须大于 0")
    if p.beta <= 0:
        violations.append(f"先验参数 beta={p.beta} 必须大于 0")
    if p.distribution not in ("beta", "normal", "uniform"):
        violations.append(f"不支持的先验分布类型: {p.distribution}")
    return violations


def check_constraints(bundle: CaseBundle, raise_on_fail: bool = False) -> list[str]:
    """约束校验 - 返回违规项列表

    校验内容：
    - 评分记录完整性（3位专家评分）
    - 来源材料完整性（题干、评分标准、参考答案）
    - 先验参数合法性
    - 边界样例描述非空
    """
    violations: list[str] = []

    missing_scorers = _check_scoring_complete(bundle)
    if missing_scorers:
        scorer_list = "、".join(missing_scorers)
        violations.append(f"缺少评分记录: {scorer_list}")

    missing_sources = _check_source_complete(bundle)
    if missing_sources:
        source_list = "、".join(missing_sources)
        violations.append(f"缺少来源材料: {source_list}")

    violations.extend(_check_prior_params(bundle.case))

    if not bundle.case.description.strip():
        violations.append("边界样例描述为空")

    if raise_on_fail and violations:
        raise ConstraintViolationError(bundle.case.case_id, violations)

    return violations


def compute_sensitivity(bundle: CaseBundle) -> SensitivityResult:
    """计算先验敏感性

    方法：
    1. 收集评分数据作为似然
    2. 使用 Beta 先验计算后验
    3. 扰动先验参数（±20%），计算后验均值变化幅度
    4. 变化幅度低于阈值判定为鲁棒
    """
    case = bundle.case
    violations = check_constraints(bundle)
    if violations:
        missing_scorers = _check_scoring_complete(bundle)
        if missing_scorers:
            raise MissingScoringRecordError(case.case_id, missing_scorers)
        missing_sources = _check_source_complete(bundle)
        if missing_sources:
            raise MissingSourceMaterialError(case.case_id, "、".join(missing_sources))
        prior_issues = _check_prior_params(case)
        if prior_issues:
            raise PriorSensitivityError(case.case_id, "; ".join(prior_issues))

    try:
        scores = [r.score for r in bundle.scoring_records]
        if not scores:
            raise PriorSensitivityError(case.case_id, "无评分记录可用")

        alpha = case.prior_params.alpha
        beta_param = case.prior_params.beta

        n = len(scores)
        success = int(sum(scores))
        trials = n

        post_alpha = alpha + success
        post_beta = beta_param + (trials - success)
        posterior_mean = post_alpha / (post_alpha + post_beta)
        posterior_std = np.sqrt(post_alpha * post_beta / ((post_alpha + post_beta) ** 2 * (post_alpha + post_beta + 1)))

        perturbations = [0.8, 1.0, 1.2]
        perturbed_means = []
        for factor in perturbations:
            pa = alpha * factor
            pb = beta_param * factor
            ppost_alpha = pa + success
            ppost_beta = pb + (trials - success)
            perturbed_means.append(ppost_alpha / (ppost_alpha + ppost_beta))

        robustness_index = float(max(perturbed_means) - min(perturbed_means))
        is_robust = robustness_index < ROBUSTNESS_THRESHOLD

        data_availability = _judge_availability(bundle)
        committee_decision = _judge_committee(case, is_robust, data_availability)

        return SensitivityResult(
            case_id=case.case_id,
            status=case.status,
            prior_params=case.prior_params,
            posterior_mean=float(posterior_mean),
            posterior_std=float(posterior_std),
            robustness_index=robustness_index,
            is_robust=is_robust,
            data_availability=data_availability,
            committee_decision=committee_decision,
            boundary_flag=case.boundary_flag,
            notes=f"先验扰动范围: ±20%，鲁棒性阈值: {ROBUSTNESS_THRESHOLD}",
        )
    except (ValueError, ArithmeticError) as e:
        raise PriorSensitivityError(case.case_id, str(e)) from e


def _judge_availability(bundle: CaseBundle) -> DataAvailability:
    """判断数据可用状态"""
    missing_scorers = _check_scoring_complete(bundle)
    missing_sources = _check_source_complete(bundle)
    if missing_scorers or missing_sources:
        return DataAvailability.NEEDS_RECOLLECTION
    if bundle.case.status in (CaseStatus.PENDING, CaseStatus.TEMPORARY_HOLD):
        return DataAvailability.PENDING
    if bundle.case.status == CaseStatus.NEEDS_RECOLLECTION:
        return DataAvailability.NEEDS_RECOLLECTION
    return DataAvailability.USABLE


def _judge_committee(
    case: BoundaryCase,
    is_robust: bool,
    availability: DataAvailability,
) -> CommitteeDecision:
    """判断投委会视图"""
    if (
        is_robust
        and availability == DataAvailability.USABLE
        and case.status == CaseStatus.APPROVED
    ):
        return CommitteeDecision.DIRECT_USE
    return CommitteeDecision.NEEDS_REVIEW


def batch_review(bundles: dict[str, CaseBundle]) -> dict[str, Any]:
    """批量复核

    返回:
        dict: 包含结果、约束违规、错误信息
    """
    from .models import BatchReport

    report = BatchReport(total_cases=len(bundles))
    results_by_case: dict[str, SensitivityResult] = {}
    errors: dict[str, str] = {}

    for case_id, bundle in bundles.items():
        violations = check_constraints(bundle)
        if violations:
            report.constraint_fail_count += 1
            report.constraint_violations[case_id] = violations
            report.pending_count += 1
            continue

        report.constraint_pass_count += 1

        try:
            result = compute_sensitivity(bundle)
            results_by_case[case_id] = result
            report.cases.append(result)

            if result.data_availability == DataAvailability.USABLE:
                report.usable_count += 1
            elif result.data_availability == DataAvailability.PENDING:
                report.pending_count += 1
            elif result.data_availability == DataAvailability.NEEDS_RECOLLECTION:
                report.needs_recollection_count += 1
        except Exception as e:
            errors[case_id] = str(e)
            report.pending_count += 1

    return {
        "report": report,
        "results": results_by_case,
        "errors": errors,
    }


def trace_conclusion(bundle: CaseBundle) -> dict[str, Any]:
    """结论追溯 - 将结论拉回来源材料

    返回结构化的追溯信息，包含结论所依赖的评分、来源材料等。
    """
    case = bundle.case
    result = bundle.sensitivity_result

    evidence: dict[str, Any] = {
        "case_id": case.case_id,
        "conclusion": case.conclusion,
        "status": case.status.value,
        "sources": [],
        "scoring_evidence": [],
        "sensitivity_evidence": None,
        "audit_references": [],
    }

    for src in bundle.source_materials:
        evidence["sources"].append({
            "material_type": src.material_type,
            "location": src.location,
            "content_excerpt": src.content[:100] + ("..." if len(src.content) > 100 else ""),
        })

    for rec in bundle.scoring_records:
        evidence["scoring_evidence"].append({
            "scorer": rec.scorer,
            "score": rec.score,
            "notes": rec.notes,
            "timestamp": rec.timestamp.isoformat(),
        })

    if result:
        evidence["sensitivity_evidence"] = {
            "posterior_mean": result.posterior_mean,
            "posterior_std": result.posterior_std,
            "robustness_index": result.robustness_index,
            "is_robust": result.is_robust,
        }

    for entry in bundle.audit_trail:
        evidence["audit_references"].append({
            "timestamp": entry.timestamp.isoformat(),
            "operator": entry.operator,
            "action": entry.action,
            "reason": entry.reason,
        })

    return evidence
