from __future__ import annotations

from dataclasses import dataclass
from typing import List, Dict, Optional, Tuple

from .models import NoisePoint, NoiseScheme, PointStatus, FeedbackRecord


@dataclass
class ComparisonResult:
    scheme_id: str
    scheme_name: str
    total_points: int
    over_limit_points: int
    max_noise_level: float
    avg_noise_level: float
    total_impact_range: float
    cost_efficiency: float
    covered_points: List[NoisePoint]
    unresolved_anomalies: List[NoisePoint]
    needs_evidence: List[NoisePoint]
    done_count: int
    pending_count: int


class SchemeComparator:
    def compare(
        self,
        schemes: List[NoiseScheme],
        points: List[NoisePoint],
        feedbacks: Optional[List[FeedbackRecord]] = None,
    ) -> List[ComparisonResult]:
        active_points = [p for p in points if p.status != PointStatus.SUPERSEDED]
        feedbacks = feedbacks or []
        point_feedbacks: Dict[str, List[FeedbackRecord]] = {}
        for fb in feedbacks:
            if fb.point_id not in point_feedbacks:
                point_feedbacks[fb.point_id] = []
            point_feedbacks[fb.point_id].append(fb)

        results: List[ComparisonResult] = []
        for scheme in schemes:
            covered = [p for p in active_points if p.scheme_id == scheme.scheme_id]
            over_limit = [p for p in covered if p.is_over_limit()]
            anomalies = [p for p in covered if p.anomalies and p.status != PointStatus.DONE]
            needs_evidence = [p for p in covered if p.status == PointStatus.NEEDS_EVIDENCE]
            done = [p for p in covered if p.status == PointStatus.DONE]
            pending = [p for p in covered if p.status in (PointStatus.PENDING, PointStatus.IN_PROGRESS)]

            max_noise = max((p.noise_level for p in covered), default=0.0)
            avg_noise = sum(p.noise_level for p in covered) / len(covered) if covered else 0.0
            total_impact = sum(p.impact_range for p in covered)
            cost_eff = scheme.noise_reduction_db / scheme.estimated_cost * 10000 if scheme.estimated_cost > 0 else 0

            result = ComparisonResult(
                scheme_id=scheme.scheme_id,
                scheme_name=scheme.name,
                total_points=len(covered),
                over_limit_points=len(over_limit),
                max_noise_level=round(max_noise, 1),
                avg_noise_level=round(avg_noise, 1),
                total_impact_range=round(total_impact, 1),
                cost_efficiency=round(cost_eff, 3),
                covered_points=covered,
                unresolved_anomalies=anomalies,
                needs_evidence=needs_evidence,
                done_count=len(done),
                pending_count=len(pending),
            )
            results.append(result)

        return sorted(results, key=lambda r: (r.over_limit_points, -r.cost_efficiency))

    def get_feedback_for_point(
        self, point_id: str, feedbacks: List[FeedbackRecord]
    ) -> List[FeedbackRecord]:
        return sorted(
            [fb for fb in feedbacks if fb.point_id == point_id],
            key=lambda x: x.version,
        )

    def format_feedback_trace(self, feedbacks: List[FeedbackRecord]) -> str:
        if not feedbacks:
            return "(无反馈记录)"
        lines = []
        for fb in feedbacks:
            lines.append(f"  v{fb.version} [{fb.source}] {fb.feedback_time}")
            lines.append(f"    原始说法: {fb.original_text}")
            if fb.merged_text and fb.merged_text != fb.original_text:
                lines.append(f"    合并后: {fb.merged_text}")
        return "\n".join(lines)

    def get_status_summary(self, points: List[NoisePoint]) -> Dict[str, int]:
        active_points = [p for p in points if p.status != PointStatus.SUPERSEDED]
        summary: Dict[str, int] = {}
        for p in active_points:
            key = p.status.value
            summary[key] = summary.get(key, 0) + 1
        return summary

    def rank_schemes(self, results: List[ComparisonResult]) -> List[Tuple[int, ComparisonResult]]:
        ranked = sorted(
            results,
            key=lambda r: (
                r.over_limit_points,
                -r.cost_efficiency,
                r.max_noise_level,
                -len([p for p in r.covered_points if p.status == PointStatus.DONE]),
            ),
        )
        return [(i + 1, r) for i, r in enumerate(ranked)]
