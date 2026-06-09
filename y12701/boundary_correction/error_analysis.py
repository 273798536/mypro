from dataclasses import dataclass, field
from typing import Dict, List, Optional
import json
import os

from .core import CorrectionResult, CorrectionStatus, BoundaryCorrectionEngine, _eval_poly


@dataclass
class ErrorMetrics:
    x: float
    y_before: Optional[float]
    y_after: Optional[float]
    y_measured: Optional[float]
    abs_error_before: Optional[float]
    abs_error_after: Optional[float]
    rel_error_before: Optional[float]
    rel_error_after: Optional[float]
    improvement: Optional[float]


@dataclass
class AnalysisReport:
    metrics: List[ErrorMetrics] = field(default_factory=list)
    summary: Dict = field(default_factory=dict)
    conflicts: List[Dict] = field(default_factory=list)
    missing: List[float] = field(default_factory=list)
    review_items: List[Dict] = field(default_factory=list)

    def to_dict(self) -> Dict:
        return {
            "summary": self.summary,
            "metrics": [m.__dict__ for m in self.metrics],
            "conflicts": self.conflicts,
            "missing": self.missing,
            "review_items": self.review_items,
        }

    def to_json(self, path: str):
        os.makedirs(os.path.dirname(os.path.abspath(path)) if os.path.dirname(path) else ".", exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(self.to_dict(), f, ensure_ascii=False, indent=2)


class ErrorAnalyzer:
    def __init__(self, engine: BoundaryCorrectionEngine):
        self.engine = engine
        self._before_results: Optional[List[CorrectionResult]] = None
        self._after_results: Optional[List[CorrectionResult]] = None

    def snapshot_before(self) -> List[CorrectionResult]:
        self._before_results = self.engine.correct_all(conflict_strategy="raw")
        return self._before_results

    def snapshot_after(self, conflict_strategy: str = "weighted") -> List[CorrectionResult]:
        self._after_results = self.engine.correct_all(conflict_strategy=conflict_strategy)
        return self._after_results

    def _metric(self, r: CorrectionResult) -> ErrorMetrics:
        y_before = r.y_pred_before
        y_after = r.y_corrected
        y_meas = r.y_measured
        abs_before = abs(y_meas - y_before) if (y_meas is not None and y_before is not None) else None
        abs_after = abs(y_meas - y_after) if (y_meas is not None and y_after is not None) else None
        rel_before = abs_before / abs(y_meas) if (abs_before is not None and y_meas and abs(y_meas) > 1e-12) else None
        rel_after = abs_after / abs(y_meas) if (abs_after is not None and y_meas and abs(y_meas) > 1e-12) else None
        improvement = None
        if abs_before is not None and abs_after is not None:
            improvement = abs_before - abs_after
        return ErrorMetrics(
            x=r.x,
            y_before=y_before,
            y_after=y_after,
            y_measured=y_meas,
            abs_error_before=abs_before,
            abs_error_after=abs_after,
            rel_error_before=rel_before,
            rel_error_after=rel_after,
            improvement=improvement,
        )

    def analyze(self, conflict_strategy: str = "weighted") -> AnalysisReport:
        if self._before_results is None:
            self.snapshot_before()
        if self._after_results is None:
            self.snapshot_after(conflict_strategy)

        metrics = [self._metric(r) for r in self._after_results]

        total_improvement = sum(m.improvement for m in metrics if m.improvement is not None)
        count_with_meas = sum(1 for m in metrics if m.y_measured is not None)
        avg_improvement = total_improvement / count_with_meas if count_with_meas else 0.0
        improved = sum(1 for m in metrics if m.improvement is not None and m.improvement > 1e-9)
        worsened = sum(1 for m in metrics if m.improvement is not None and m.improvement < -1e-9)

        conflicts = []
        review_items = []
        for r in self._after_results:
            if r.status == CorrectionStatus.CONFLICT or r.status == CorrectionStatus.REVIEW:
                conflicts.append({
                    "x": r.x,
                    "violations": [
                        {"name": v.name, "value": v.value, "allowed": list(v.allowed), "side": v.side}
                        for v in r.violations
                    ],
                    "samples": r.samples_used,
                    "note": r.review_note,
                })
            if r.status in (CorrectionStatus.REVIEW, CorrectionStatus.OUTLIER, CorrectionStatus.NOISY, CorrectionStatus.CONFLICT):
                review_items.append({
                    "x": r.x,
                    "status": r.status.value,
                    "samples": r.samples_used,
                    "note": r.review_note,
                })

        missing = self.engine.missing_boundary_report()

        report = AnalysisReport(
            metrics=metrics,
            summary={
                "total_boundaries": len(metrics),
                "with_measurements": count_with_meas,
                "missing_boundaries": len(missing),
                "conflict_count": len(conflicts),
                "review_count": len(review_items),
                "total_improvement": round(total_improvement, 6),
                "avg_improvement_per_boundary": round(avg_improvement, 6),
                "boundaries_improved": improved,
                "boundaries_worsened": worsened,
                "conflict_strategy": conflict_strategy,
            },
            conflicts=conflicts,
            missing=missing,
            review_items=review_items,
        )
        return report

    def export_chart_data(self, path: str, conflict_strategy: str = "weighted"):
        report = self.analyze(conflict_strategy)
        pt = self.engine.param_table

        curve_before = []
        curve_after = []
        xs = [i * 0.1 for i in range(0, 101)]
        for x in xs:
            seg = pt.get_segment_at(x)
            y_b = _eval_poly(seg, x) if seg else None
            y_a = y_b
            boundaries = sorted({r.x for r in self._after_results or []})
            for bx in boundaries:
                if abs(x - bx) < 1e-9:
                    r = next((rr for rr in (self._after_results or []) if abs(rr.x - bx) < 1e-9), None)
                    if r and r.y_corrected is not None:
                        y_a = r.y_corrected
            curve_before.append({"x": round(x, 2), "y": y_b})
            curve_after.append({"x": round(x, 2), "y": y_a})

        chart_data = {
            "title": f"分段函数边界批改对比 - {pt.material}",
            "x_label": "自变量 x",
            "y_label": "响应值 y",
            "curve_before": curve_before,
            "curve_after": curve_after,
            "boundary_points": [
                {
                    "x": m.x,
                    "y_before": m.y_before,
                    "y_after": m.y_after,
                    "y_measured": m.y_measured,
                    "abs_error_before": m.abs_error_before,
                    "abs_error_after": m.abs_error_after,
                    "improvement": m.improvement,
                }
                for m in report.metrics
            ],
            "summary": report.summary,
        }
        os.makedirs(os.path.dirname(os.path.abspath(path)) if os.path.dirname(path) else ".", exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(chart_data, f, ensure_ascii=False, indent=2)
        return chart_data
