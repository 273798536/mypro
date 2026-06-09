from __future__ import annotations

import math
from typing import Optional

from .diff import ChartDiff
from .models import (
    ConflictEntry,
    ErrorEntry,
    MaterialBundle,
    ProjectionParams,
    Severity,
    ValidationResult,
)


def _distance(a: tuple[float, float], b: tuple[float, float]) -> float:
    return math.hypot(a[0] - b[0], a[1] - b[1])


def _apply_perspective(
    pt: tuple[float, float],
    params: ProjectionParams,
) -> tuple[float, float]:
    x, y = pt
    x = (x - params.origin_x) * params.scale_factor
    y = (y - params.origin_y) * params.scale_factor
    if params.projection_type.value == "perspective" and params.focal_length and params.focal_length > 0:
        z = 1.0
        denom = params.focal_length / (params.focal_length + z)
        x = x * denom
        y = y * denom
    if params.view_angle_deg:
        rad = math.radians(params.view_angle_deg)
        cos_a, sin_a = math.cos(rad), math.sin(rad)
        x, y = x * cos_a - y * sin_a, x * sin_a + y * cos_a
    return (x, y)


def _severity_from_distance(distance: float, tolerance: float) -> Severity:
    if distance <= tolerance:
        return Severity.INFO
    if distance <= tolerance * 1.5:
        return Severity.WARNING
    if distance <= tolerance * 3:
        return Severity.ERROR
    return Severity.CRITICAL


class ConflictDetector:
    @staticmethod
    def detect(bundle: MaterialBundle) -> list[ConflictEntry]:
        conflicts: list[ConflictEntry] = []
        q_by_id = {q.item_id: q for q in bundle.questions}

        for score in bundle.scores:
            q = q_by_id.get(score.item_id)
            if not q:
                continue
            if q.expected_projection and score.projected_point:
                if score.score < 0.5 and _distance(q.expected_projection, score.projected_point) < 0.5:
                    conflicts.append(
                        ConflictEntry(
                            constraint_a=f"题目基准期望({q.expected_projection})",
                            constraint_b=f"评分低分({score.score})",
                            item_ids=[score.item_id],
                            material_sources=[s for s in [q.source_file, score.source_file] if s],
                            description=f"题目 {score.item_id} 投影接近基准但评分异常低，基准与评分材料存在冲突",
                            severity=Severity.WARNING,
                        )
                    )

        scored = {}
        for s in bundle.scores:
            scored.setdefault(s.item_id, []).append(s)
        for item_id, records in scored.items():
            if len(records) < 2:
                continue
            pts = [r.projected_point for r in records]
            for i in range(len(pts)):
                for j in range(i + 1, len(pts)):
                    if _distance(pts[i], pts[j]) > 10:
                        sources = list({r.source_file for r in [records[i], records[j]] if r.source_file})
                        conflicts.append(
                            ConflictEntry(
                                constraint_a=f"{records[i].scorer} 评分投影 {pts[i]}",
                                constraint_b=f"{records[j].scorer} 评分投影 {pts[j]}",
                                item_ids=[item_id],
                                material_sources=sources,
                                description=f"题目 {item_id} 多份评分材料的投影点相距超过10px，评分人判断不一致",
                                severity=Severity.ERROR,
                            )
                        )
                        break
                else:
                    continue
                break

        if bundle.params:
            for prob in bundle.params.validate():
                conflicts.append(
                    ConflictEntry(
                        constraint_a="参数完整性约束",
                        constraint_b=prob,
                        item_ids=[],
                        material_sources=[bundle.params.source_file] if bundle.params.source_file else [],
                        description=f"参数表存在问题: {prob}",
                        severity=Severity.ERROR,
                    )
                )

        return conflicts


class ProjectionChecker:
    def __init__(self, partial_success: bool = True) -> None:
        self.partial_success = partial_success

    def run(self, bundle: MaterialBundle) -> ValidationResult:
        result = ValidationResult(bundle=bundle)

        params = bundle.params or ProjectionParams()
        chart_comparison = ChartDiff.compare(bundle.chart_before, bundle.chart_after)
        result.chart_comparison = chart_comparison

        q_by_id = {q.item_id: q for q in bundle.questions}

        scores_by_item: dict[str, list] = {}
        for s in bundle.scores:
            scores_by_item.setdefault(s.item_id, []).append(s)

        all_item_ids = set(q_by_id.keys()) | set(scores_by_item.keys())

        boundary_gaps: list[str] = []
        skipped: list[str] = []

        for item_id in sorted(all_item_ids):
            q = q_by_id.get(item_id)
            scores = scores_by_item.get(item_id, [])

            if q and not scores:
                is_boundary = "边界" in (q.legacy_note or "") or any("boundary" in t.lower() for t in q.tags)
                if is_boundary or not q.is_placeholder:
                    boundary_gaps.append(item_id)
                    if not self.partial_success:
                        skipped.append(item_id)
                        result.skipped_items.append(item_id)
                        continue
                    result.skipped_items.append(item_id)
                    continue

            if not scores:
                skipped.append(item_id)
                result.skipped_items.append(item_id)
                continue

            expected = None
            if q and q.expected_projection:
                expected = _apply_perspective(q.expected_projection, params)

            for s in scores:
                actual = s.projected_point
                if expected is None:
                    dist = 0.0
                    within = True
                    msg = f"题目 {item_id} 无基准期望，跳过误差距离判定"
                    sev = Severity.INFO
                else:
                    dist = _distance(expected, actual)
                    within = dist <= params.tolerance_px
                    sev = _severity_from_distance(dist, params.tolerance_px)
                    msg = (
                        f"题目 {item_id} 投影误差 {dist:.2f}px "
                        f"(容差 {params.tolerance_px}px) {'合格' if within else '超差'}"
                    )

                delta = ChartDiff.delta_for_item(chart_comparison, item_id)
                result.errors.append(
                    ErrorEntry(
                        item_id=item_id,
                        expected=expected,
                        actual=actual,
                        distance_px=round(dist, 4),
                        within_tolerance=within,
                        severity=sev,
                        message=msg,
                        source_material=s.source_file,
                        chart_diff_delta=delta,
                    )
                )

        result.conflicts = ConflictDetector.detect(bundle)
        result.boundary_gaps = boundary_gaps
        return result
