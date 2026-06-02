from __future__ import annotations

import math
from collections import defaultdict
from datetime import datetime
from typing import Optional

from models import (
    CurveType,
    EquipmentInfo,
    MaintenanceRecord,
    PredictionDetail,
    VibrationSample,
)

CONFIDENCE_LEVEL = 0.95
Z_SCORE_95 = 1.96
MIN_SAMPLES_FOR_PREDICTION = 3
DEGRADATION_THRESHOLD = 0.01


class CurveFitter:
    def __init__(self, x: list[float], y: list[float]):
        self.x = x
        self.y = y
        self.n = len(x)

    def fit_exponential(self) -> tuple[float, float, float]:
        if self.n < MIN_SAMPLES_FOR_PREDICTION:
            return 0.0, 0.0, 0.0
        log_y = []
        x_valid = []
        for xi, yi in zip(self.x, self.y):
            if yi > 0:
                log_y.append(math.log(yi))
                x_valid.append(xi)
        n = len(x_valid)
        if n < MIN_SAMPLES_FOR_PREDICTION:
            return 0.0, 0.0, 0.0
        sx = sum(x_valid)
        sy = sum(log_y)
        sxx = sum(x * x for x in x_valid)
        sxy = sum(x * y for x, y in zip(x_valid, log_y))
        denom = n * sxx - sx * sx
        if denom == 0:
            return 0.0, 0.0, 0.0
        b = (n * sxy - sx * sy) / denom
        a = (sy - b * sx) / n
        A = math.exp(a)
        B = b
        ss_res = sum(
            (yi - A * math.exp(B * xi)) ** 2
            for xi, yi in zip(x_valid, [math.exp(ly) for ly in log_y])
        )
        mean_y = sum(math.exp(ly) for ly in log_y) / n
        ss_tot = sum((math.exp(ly) - mean_y) ** 2 for ly in log_y)
        r2 = 1 - ss_res / ss_tot if ss_tot != 0 else 0.0
        return A, B, r2

    def fit_linear(self) -> tuple[float, float, float]:
        if self.n < MIN_SAMPLES_FOR_PREDICTION:
            return 0.0, 0.0, 0.0
        sx = sum(self.x)
        sy = sum(self.y)
        sxx = sum(x * x for x in self.x)
        sxy = sum(x * y for x, y in zip(self.x, self.y))
        n = self.n
        denom = n * sxx - sx * sx
        if denom == 0:
            return 0.0, 0.0, 0.0
        b = (n * sxy - sx * sy) / denom
        a = (sy - b * sx) / n
        ss_res = sum((yi - (a + b * xi)) ** 2 for xi, yi in zip(self.x, self.y))
        mean_y = sum(self.y) / n
        ss_tot = sum((yi - mean_y) ** 2 for yi in self.y)
        r2 = 1 - ss_res / ss_tot if ss_tot != 0 else 0.0
        return a, b, r2

    def predict_exponential(self, A: float, B: float, x: float) -> float:
        return A * math.exp(B * x)

    def predict_linear(self, a: float, b: float, x: float) -> float:
        return a + b * x


class LifePredictor:
    def __init__(
        self,
        vibration: list[VibrationSample],
        maintenance: list[MaintenanceRecord],
        equipment: list[EquipmentInfo],
    ):
        self.vibration = vibration
        self.maintenance = maintenance
        self.equipment = equipment
        self._equip_map: dict[str, EquipmentInfo] = {
            e.equipment_id: e for e in equipment
        }
        self._maint_map: dict[str, list[MaintenanceRecord]] = defaultdict(list)
        for m in maintenance:
            self._maint_map[m.equipment_id].append(m)

    def predict_all(
        self,
        affected_by_backfill: Optional[dict[str, bool]] = None,
    ) -> list[PredictionDetail]:
        affected_map = affected_by_backfill or {}
        by_equip: dict[str, list[VibrationSample]] = defaultdict(list)
        for s in self.vibration:
            by_equip[s.equipment_id].append(s)

        results: list[PredictionDetail] = []
        for eid, samples in by_equip.items():
            detail = self._predict_single(eid, samples, affected_map.get(eid, False))
            if detail is not None:
                results.append(detail)
        return results

    def _predict_single(
        self,
        equipment_id: str,
        samples: list[VibrationSample],
        affected_by_model_backfill: bool,
    ) -> Optional[PredictionDetail]:
        valid_samples = sorted(
            [s for s in samples if not s.is_missing_sample],
            key=lambda s: s.timestamp,
        )
        missing_count = sum(1 for s in samples if s.is_missing_sample)

        if len(valid_samples) < MIN_SAMPLES_FOR_PREDICTION:
            return PredictionDetail(
                equipment_id=equipment_id,
                predicted_remaining_life_hours=0.0,
                confidence_lower=0.0,
                confidence_upper=0.0,
                curve_type=CurveType.LINEAR,
                sample_count=len(samples),
                missing_sample_count=missing_count,
                affected_by_model_backfill=affected_by_model_backfill,
                r_squared=0.0,
            )

        first_ts = valid_samples[0].timestamp
        x: list[float] = []
        y: list[float] = []
        for s in valid_samples:
            hours = (s.timestamp - first_ts).total_seconds() / 3600.0
            x.append(hours)
            y.append(s.value)

        fitter = CurveFitter(x, y)
        exp_A, exp_B, exp_r2 = fitter.fit_exponential()
        lin_a, lin_b, lin_r2 = fitter.fit_linear()

        best_curve = CurveType.LINEAR
        best_r2 = lin_r2
        best_params: tuple = (lin_a, lin_b)

        if exp_r2 > lin_r2:
            best_curve = CurveType.EXPONENTIAL
            best_r2 = exp_r2
            best_params = (exp_A, exp_B)

        last_hours = x[-1]
        last_value = y[-1]

        if best_curve == CurveType.EXPONENTIAL:
            A, B = best_params
            predicted_life = self._estimate_remaining_life_exp(
                A, B, last_hours, last_value, valid_samples,
            )
        else:
            a, b = best_params
            predicted_life = self._estimate_remaining_life_lin(
                a, b, last_hours, last_value, valid_samples,
            )

        ci_lower, ci_upper = self._compute_confidence_interval(
            x, y, best_r2, predicted_life,
        )

        return PredictionDetail(
            equipment_id=equipment_id,
            predicted_remaining_life_hours=max(0.0, predicted_life),
            confidence_lower=max(0.0, ci_lower),
            confidence_upper=max(0.0, ci_upper),
            curve_type=best_curve,
            sample_count=len(samples),
            missing_sample_count=missing_count,
            affected_by_model_backfill=affected_by_model_backfill,
            r_squared=best_r2,
        )

    @staticmethod
    def _estimate_remaining_life_exp(
        A: float,
        B: float,
        last_hours: float,
        last_value: float,
        samples: list[VibrationSample],
    ) -> float:
        if B <= 0:
            return 99999.0
        maint_records = [
            s for s in samples if s.value < last_value * 0.5
        ]
        if maint_records:
            failure_value = last_value * 2.0
        else:
            failure_value = last_value * 3.0
        if A <= 0:
            return 99999.0
        hours_to_failure = (math.log(failure_value / A) / B) - last_hours
        return max(0.0, hours_to_failure)

    @staticmethod
    def _estimate_remaining_life_lin(
        a: float,
        b: float,
        last_hours: float,
        last_value: float,
        samples: list[VibrationSample],
    ) -> float:
        if b <= 0:
            return 99999.0
        failure_value = last_value * 2.5
        hours_to_failure = (failure_value - a) / b - last_hours
        return max(0.0, hours_to_failure)

    @staticmethod
    def _compute_confidence_interval(
        x: list[float],
        y: list[float],
        r2: float,
        predicted: float,
    ) -> tuple[float, float]:
        n = len(x)
        if n < 3 or predicted <= 0:
            return predicted * 0.5, predicted * 1.5
        residuals = []
        mean_x = sum(x) / n
        sx2 = sum((xi - mean_x) ** 2 for xi in x)
        if sx2 == 0:
            return predicted * 0.5, predicted * 1.5
        y_pred = []
        if r2 > 0:
            sx = sum(x)
            sy = sum(y)
            sxx = sum(xi * xi for xi in x)
            sxy = sum(xi * yi for xi, yi in zip(x, y))
            denom = n * sxx - sx * sx
            if denom != 0:
                b_hat = (n * sxy - sx * sy) / denom
                a_hat = (sy - b_hat * sx) / n
                y_pred = [a_hat + b_hat * xi for xi in x]

        if not y_pred:
            return predicted * 0.5, predicted * 1.5

        se = math.sqrt(
            sum((yi - yp) ** 2 for yi, yp in zip(y, y_pred)) / max(1, n - 2),
        )
        margin = Z_SCORE_95 * se * math.sqrt(1.0 / n + (predicted - mean_x) ** 2 / sx2)
        return predicted - margin, predicted + margin
