from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import numpy as np
from scipy.interpolate import UnivariateSpline

from .models import (
    CheckResult,
    CheckStatus,
    SampleRecord,
)


@dataclass
class SplineOvershootChecker:
    """样条插值过冲检查核心算法

    原理:
        对样本点做三次样条插值，在插值曲线上高密度采样，
        判断插值结果是否超出原始 y 值的范围（过冲）。

    阈值策略:
        - max_overshoot < 0.5  → USABLE（可用）
        - 0.5 ≤ max_overshoot ≤ 2.0  → PENDING（暂缓，边界样例）
        - max_overshoot > 2.0  → RECOLLECT（重采）
    """

    overshoot_warn: float = 0.5
    overshoot_fail: float = 2.0
    sampling_density: int = 100
    smoothing: float = 0.0
    s_range: Optional[List[float]] = field(default_factory=lambda: [0.0, 0.1, 1.0])

    def _compute_overshoot(
        self, x: np.ndarray, y: np.ndarray, s: float
    ) -> Tuple[bool, float, List[Tuple[int, float, float]], int]:
        y_min = float(np.min(y))
        y_max = float(np.max(y))

        try:
            spline = UnivariateSpline(x, y, s=s, k=3)
        except Exception:
            return True, float("inf"), [], 0

        knots = len(spline.get_knots())

        x_dense = np.linspace(float(np.min(x)), float(np.max(x)), self.sampling_density * len(x))
        y_interp = spline(x_dense)

        below = y_min - y_interp
        above = y_interp - y_max

        overshoot_vec = np.maximum(below, above, np.zeros_like(y_interp))
        max_overshoot = float(np.max(overshoot_vec))

        overshoot_points: List[Tuple[int, float, float]] = []
        if max_overshoot > 1e-9:
            bad_idx = np.where(overshoot_vec > 1e-9)[0]
            for idx in bad_idx[:10]:
                yi = float(y_interp[idx])
                bound = y_max if yi > y_max else y_min
                overshoot_points.append((int(idx), yi, bound))

        has_overshoot = max_overshoot > 1e-9
        return has_overshoot, max_overshoot, overshoot_points, knots

    def _find_best_smoothing(
        self, x: np.ndarray, y: np.ndarray
    ) -> Tuple[float, bool, float, List[Tuple[int, float, float]], int]:
        best_s = self.s_range[0]
        best_overshoot = float("inf")
        best_has = True
        best_points: List[Tuple[int, float, float]] = []
        best_knots = 0

        for s in self.s_range or [self.smoothing]:
            has_o, val, pts, knots = self._compute_overshoot(x, y, s)
            if val < best_overshoot:
                best_overshoot = val
                best_has = has_o
                best_points = pts
                best_s = s
                best_knots = knots
            if not has_o:
                break

        return best_s, best_has, best_overshoot, best_points, best_knots

    def _classify(self, has_overshoot: bool, max_overshoot: Optional[float]) -> CheckStatus:
        if not has_overshoot or max_overshoot is None:
            return CheckStatus.USABLE
        if max_overshoot < self.overshoot_warn:
            return CheckStatus.USABLE
        if max_overshoot <= self.overshoot_fail:
            return CheckStatus.PENDING
        return CheckStatus.RECOLLECT

    def check(self, sample: SampleRecord) -> CheckResult:
        x = np.asarray(sample.x_values, dtype=float)
        y = np.asarray(sample.y_values, dtype=float)

        s, has_o, val, pts, knots = self._find_best_smoothing(x, y)
        status = self._classify(has_o, val if has_o else None)

        return CheckResult(
            sample_id=sample.sample_id,
            fingerprint=sample.fingerprint,
            status=status,
            has_overshoot=has_o,
            max_overshoot=val if has_o else None,
            overshoot_points=pts,
            smoothing=s,
            knots=knots,
        )

    def check_batch(self, samples: List[SampleRecord]) -> List[CheckResult]:
        return [self.check(s) for s in samples]
