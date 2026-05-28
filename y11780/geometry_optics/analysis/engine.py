"""核心处理引擎 - 协调整个计算流程"""

from __future__ import annotations
import time
from typing import List, Optional
from ..core.models import (
    ProblemInput, ProblemResult, SingleRayResult,
    ResultStatus, IntersectionResult, ReflectionResult,
    AngleUnit
)
from ..core.geometry import find_closest_intersection, compute_reflection
from ..core.boundary import (
    classify_intersection_quality, check_reflection_validity,
    get_intersection_explanation, get_reflection_explanation
)
from ..io.validator import InputValidator


class OpticsProcessor:
    """光学计算处理器"""

    def __init__(self, strict_validation: bool = False):
        self.validator = InputValidator(strict=strict_validation)

    def process(self, problem_input: ProblemInput) -> ProblemResult:
        """处理单个题目，计算所有光线的交点和反射"""
        start_time = time.time()

        validate_status, validate_errors, validate_warnings = self.validator.validate(problem_input)

        if validate_status == ResultStatus.ERROR:
            processing_time = time.time() - start_time
            return ProblemResult(
                problem_id=problem_input.problem_id,
                source=problem_input.source,
                status=ResultStatus.ERROR,
                ray_results=[],
                total_score=0.0,
                max_score=0.0,
                summary=[f"输入验证失败: {e}" for e in validate_errors],
                processing_time=processing_time,
                input_corrections=problem_input.corrections
            )

        ray_results = []
        total_score = 0.0
        max_score = 0.0

        for ray in problem_input.incident_rays:
            ray_result = self._process_single_ray(
                ray,
                problem_input.mirror_segments,
                problem_input.bounding_box,
                problem_input.angle_unit
            )
            ray_results.append(ray_result)

            max_score += 1.0
            ray_deductions = sum(d[1] for d in ray_result.score_deductions)
            total_score += max(0.0, 1.0 - ray_deductions)

        processing_time = time.time() - start_time

        summary = self._generate_summary(ray_results, validate_warnings)

        overall_status = self._determine_overall_status(ray_results, validate_status)

        return ProblemResult(
            problem_id=problem_input.problem_id,
            source=problem_input.source,
            status=overall_status,
            ray_results=ray_results,
            total_score=round(total_score, 2),
            max_score=max_score,
            summary=summary,
            processing_time=round(processing_time, 4),
            input_corrections=problem_input.corrections
        )

    def _process_single_ray(
        self,
        ray,
        segments,
        bbox,
        angle_unit: AngleUnit
    ) -> SingleRayResult:
        """处理单条光线"""
        ray_result = SingleRayResult(
            ray_label=ray.label,
            status=ResultStatus.SUCCESS
        )

        intersection = find_closest_intersection(ray, segments, bbox)

        if intersection is None:
            ray_result.status = ResultStatus.ERROR
            ray_result.errors.append(f"光线{ray.label}未找到任何交点")
            ray_result.explanations.append(f"光线{ray.label}未与任何镜面相交")
            ray_result.score_deductions.append(("no_intersection", 1.0, "未找到任何交点"))
            return ray_result

        ray_result.intersection = intersection

        status, warnings, deductions = classify_intersection_quality(intersection, bbox)
        ray_result.status = status
        ray_result.warnings.extend(warnings)
        ray_result.score_deductions.extend(deductions)

        ray_result.explanations.extend(get_intersection_explanation(intersection))

        if intersection.is_valid():
            reflection = compute_reflection(ray, intersection, angle_unit)
            if reflection:
                ray_result.reflection = reflection

                if reflection.incident_angle is not None and reflection.reflection_angle is not None:
                    valid, issues = check_reflection_validity(
                        reflection.incident_angle,
                        reflection.reflection_angle,
                        angle_unit
                    )
                    if not valid:
                        if ray_result.status == ResultStatus.SUCCESS:
                            ray_result.status = ResultStatus.WARNING
                        ray_result.warnings.extend(issues)
                    else:
                        ray_result.explanations.extend(issues)

                ray_result.explanations.extend(get_reflection_explanation(reflection))
        else:
            ray_result.explanations.append("ℹ️  由于交点无效，跳过反射计算")

        if ray_result.score_deductions:
            total_deduct = sum(d[1] for d in ray_result.score_deductions)
            ray_result.explanations.append(
                f"📊 本光线得分: {max(0.0, 1.0 - total_deduct):.2f}/1.0 "
                f"(扣分: {total_deduct:.2f})"
            )

        return ray_result

    def _generate_summary(self, ray_results: List[SingleRayResult], validate_warnings: List[str]) -> List[str]:
        """生成处理摘要"""
        summary = []

        if validate_warnings:
            summary.append("⚠️  输入验证警告:")
            for w in validate_warnings:
                summary.append(f"   - {w}")

        success_count = sum(1 for r in ray_results if r.status == ResultStatus.SUCCESS)
        warning_count = sum(1 for r in ray_results if r.status == ResultStatus.WARNING)
        error_count = sum(1 for r in ray_results if r.status == ResultStatus.ERROR)
        total = len(ray_results)

        summary.append(f"📈 处理统计: 共{total}条光线")
        summary.append(f"   ✅ 成功: {success_count} ({success_count/total*100:.1f}%)")
        if warning_count > 0:
            summary.append(f"   ⚠️  警告: {warning_count} ({warning_count/total*100:.1f}%)")
        if error_count > 0:
            summary.append(f"   ❌ 错误: {error_count} ({error_count/total*100:.1f}%)")

        all_deductions = []
        for r in ray_results:
            all_deductions.extend(r.score_deductions)

        if all_deductions:
            deduction_types = {}
            for code, points, reason in all_deductions:
                if points > 0:
                    if code not in deduction_types:
                        deduction_types[code] = {'count': 0, 'total_points': 0, 'reason': reason}
                    deduction_types[code]['count'] += 1
                    deduction_types[code]['total_points'] += points

            if deduction_types:
                summary.append("📋 扣分明细汇总:")
                for code, info in deduction_types.items():
                    summary.append(
                        f"   - {code}: {info['count']}次, "
                        f"共扣{info['total_points']:.2f}分 - {info['reason']}"
                    )

        return summary

    def _determine_overall_status(
        self,
        ray_results: List[SingleRayResult],
        validate_status: ResultStatus
    ) -> ResultStatus:
        """确定整体处理状态"""
        if validate_status == ResultStatus.ERROR:
            return ResultStatus.ERROR

        has_error = any(r.status == ResultStatus.ERROR for r in ray_results)
        has_warning = any(r.status == ResultStatus.WARNING for r in ray_results)

        if has_error:
            return ResultStatus.ERROR
        elif has_warning:
            return ResultStatus.WARNING
        else:
            return ResultStatus.SUCCESS
