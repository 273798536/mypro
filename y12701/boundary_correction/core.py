from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from enum import Enum

from .param_table import ParameterTable, SegmentParams
from .boundary_samples import BoundarySampleSet, BoundarySample, SampleQuality


class CorrectionStatus(str, Enum):
    OK = "ok"
    CONFLICT = "conflict"
    MISSING = "missing"
    OUTLIER = "outlier"
    NOISY = "noisy"
    REVIEW = "review"


@dataclass
class ConstraintViolation:
    name: str
    value: float
    allowed: Tuple[float, float]
    side: str


@dataclass
class CorrectionResult:
    x: float
    seg_before: Optional[str]
    seg_after: Optional[str]
    y_pred_before: Optional[float]
    y_pred_after: Optional[float]
    y_measured: Optional[float]
    y_corrected: Optional[float]
    status: CorrectionStatus
    violations: List[ConstraintViolation] = field(default_factory=list)
    samples_used: List[str] = field(default_factory=list)
    review_note: str = ""
    delta: Optional[float] = None


def _eval_poly(seg: SegmentParams, x: float) -> float:
    a = seg.coeffs.get("a", 0.0)
    b = seg.coeffs.get("b", 0.0)
    c = seg.coeffs.get("c", 0.0)
    return a * x * x + b * x + c


def _check_constraints(
    seg: SegmentParams, stress: Optional[float], strain: Optional[float]
) -> List[ConstraintViolation]:
    viols = []
    for name, (lo, hi) in seg.constraints.items():
        val = {"stress": stress, "strain": strain}.get(name)
        if val is None:
            continue
        if val < lo:
            viols.append(ConstraintViolation(name=name, value=val, allowed=(lo, hi), side="low"))
        elif val > hi:
            viols.append(ConstraintViolation(name=name, value=val, allowed=(lo, hi), side="high"))
    return viols


class BoundaryCorrectionEngine:
    def __init__(self, param_table: ParameterTable, samples: BoundarySampleSet):
        self.param_table = param_table
        self.samples = samples
        self._results_cache: Dict[Tuple[float, str], CorrectionResult] = {}

    def predict_at(self, x: float, side: str = "left") -> Optional[float]:
        seg = self._segment_side(x, side)
        if seg is None:
            return None
        return _eval_poly(seg, x)

    def _segment_side(self, x: float, side: str) -> Optional[SegmentParams]:
        tol = 1e-9
        for seg in self.param_table.segments:
            lo, hi = seg.x_range
            if side == "left":
                if lo - tol <= x <= hi + tol:
                    return seg
            else:
                if lo - tol <= x <= hi + tol:
                    return seg
        return None

    def _segments_at_boundary(self, x: float) -> Tuple[Optional[SegmentParams], Optional[SegmentParams]]:
        left, right = None, None
        tol = 1e-9
        for seg in self.param_table.segments:
            lo, hi = seg.x_range
            if abs(hi - x) <= tol:
                left = seg
            if abs(lo - x) <= tol:
                right = seg
        return left, right

    def correct_boundary(
        self,
        x: float,
        override_measured: Optional[float] = None,
        conflict_strategy: str = "weighted",
    ) -> CorrectionResult:
        cache_key = (x, conflict_strategy)
        if cache_key in self._results_cache and override_measured is None:
            return self._results_cache[cache_key]

        seg_left, seg_right = self._segments_at_boundary(x)
        y_pred_left = _eval_poly(seg_left, x) if seg_left else None
        y_pred_right = _eval_poly(seg_right, x) if seg_right else None

        samples_here = self.samples.at_boundary(x)
        good_samples = [s for s in samples_here if s.quality != SampleQuality.MISSING]

        if not good_samples and override_measured is None:
            result = CorrectionResult(
                x=x,
                seg_before=seg_left.seg_id if seg_left else None,
                seg_after=seg_right.seg_id if seg_right else None,
                y_pred_before=y_pred_left,
                y_pred_after=y_pred_right,
                y_measured=None,
                y_corrected=None,
                status=CorrectionStatus.MISSING,
                review_note=f"边界 x={x} 无有效样例，需数据分析员补测",
            )
            if override_measured is None:
                self._results_cache[cache_key] = result
            return result

        y_meas = override_measured
        if y_meas is None:
            y_meas = self._combine_measurements(good_samples, conflict_strategy)

        all_violations: List[ConstraintViolation] = []
        for seg in [s for s in (seg_left, seg_right) if s is not None]:
            for s in good_samples:
                all_violations.extend(_check_constraints(seg, s.stress_measured, s.strain_measured))

        y_corrected = y_meas
        status = CorrectionStatus.OK
        note = ""

        if all_violations:
            status = CorrectionStatus.CONFLICT
            viol_names = sorted({v.name for v in all_violations})
            note = (
                f"约束冲突：{', '.join(viol_names)}；"
                f"共{len(all_violations)}处违反，涉及样例{[s.sample_id for s in good_samples]}"
            )
            y_corrected = self._resolve_conflict(
                y_meas, y_pred_left, y_pred_right, all_violations, conflict_strategy
            )

        if any(s.quality == SampleQuality.OUTLIER for s in good_samples):
            status = CorrectionStatus.OUTLIER if status == CorrectionStatus.OK else status
            note += ("；" if note else "") + "含离群坏数据，建议复核"

        if any(s.quality == SampleQuality.NOISY for s in good_samples):
            status = CorrectionStatus.NOISY if status == CorrectionStatus.OK else status
            note += ("；" if note else "") + "含噪声/定位偏差数据"

        if status in (CorrectionStatus.CONFLICT, CorrectionStatus.OUTLIER):
            status = CorrectionStatus.REVIEW

        delta = None
        if y_corrected is not None:
            ref = y_pred_left if y_pred_left is not None else y_pred_right
            if ref is not None:
                delta = y_corrected - ref

        result = CorrectionResult(
            x=x,
            seg_before=seg_left.seg_id if seg_left else None,
            seg_after=seg_right.seg_id if seg_right else None,
            y_pred_before=y_pred_left,
            y_pred_after=y_pred_right,
            y_measured=y_meas,
            y_corrected=y_corrected,
            status=status,
            violations=all_violations,
            samples_used=[s.sample_id for s in good_samples],
            review_note=note,
            delta=delta,
        )
        if override_measured is None:
            self._results_cache[cache_key] = result
        return result

    def _combine_measurements(self, samples: List[BoundarySample], strategy: str) -> Optional[float]:
        vals = [s.y_measured for s in samples if s.y_measured is not None]
        if not vals:
            return None
        if strategy == "median":
            return sorted(vals)[len(vals) // 2]
        if strategy == "min":
            return min(vals)
        if strategy == "max":
            return max(vals)
        return sum(vals) / len(vals)

    def _resolve_conflict(
        self,
        measured: Optional[float],
        pred_left: Optional[float],
        pred_right: Optional[float],
        violations: List[ConstraintViolation],
        strategy: str,
    ) -> Optional[float]:
        preds = [p for p in (pred_left, pred_right) if p is not None]
        if not preds and measured is None:
            return None
        if measured is None:
            return sum(preds) / len(preds)
        if not preds:
            return measured
        if strategy == "weighted":
            return 0.4 * measured + 0.3 * pred_left + 0.3 * pred_right if pred_left and pred_right else 0.5 * measured + 0.5 * preds[0]
        if strategy == "conservative":
            return min(preds + [measured])
        return measured

    def correct_all(self, conflict_strategy: str = "weighted") -> List[CorrectionResult]:
        results = []
        boundaries = self.param_table.boundary_points()
        for x in boundaries:
            results.append(self.correct_boundary(x, conflict_strategy=conflict_strategy))
        return results

    def missing_boundary_report(self) -> List[float]:
        boundaries = self.param_table.boundary_points()
        return self.samples.missing_boundaries(boundaries)

    def update_sample_and_recheck(
        self, sample_id: str, new_y: float, conflict_strategy: str = "weighted"
    ) -> Optional[CorrectionResult]:
        for s in self.samples.samples:
            if s.sample_id == sample_id:
                s.y_measured = new_y
                s.quality = SampleQuality.GOOD
                keys_to_del = [k for k in self._results_cache if abs(k[0] - s.x) <= 1e-9]
                for k in keys_to_del:
                    del self._results_cache[k]
                return self.correct_boundary(s.x, conflict_strategy=conflict_strategy)
        return None
