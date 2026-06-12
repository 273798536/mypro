import numpy as np
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass

from .models import MaterialRecord, ValidationResult, ValidationStats, RecordStatus, ValidationStatus
from .exceptions import DivisionByZeroError


@dataclass
class SegmentConfig:
    segment_key: str
    x_field: str
    y_field: str
    min_points: int = 3
    r_squared_threshold: float = 0.95
    slope_tolerance: float = 0.1


class SegmentRegressionValidator:
    def __init__(self, segment_configs: List[SegmentConfig] = None, auto_suspend_divzero: bool = True):
        if segment_configs is None:
            segment_configs = [
                SegmentConfig("低温段", "温度", "电阻", min_points=3, r_squared_threshold=0.90, slope_tolerance=0.15),
                SegmentConfig("中温段", "温度", "电阻", min_points=3, r_squared_threshold=0.95, slope_tolerance=0.10),
                SegmentConfig("高温段", "温度", "电阻", min_points=3, r_squared_threshold=0.92, slope_tolerance=0.12),
            ]
        self.segment_configs = segment_configs
        self.auto_suspend_divzero = auto_suspend_divzero

    def validate_record(self, record: MaterialRecord) -> ValidationResult:
        result = ValidationResult(
            record_id=record.record_id,
            material_name=record.material_name,
            status=ValidationStatus.PENDING,
        )

        if record.status == RecordStatus.BAD:
            result.status = ValidationStatus.FAIL
            result.errors.append(f"数据质量问题: {record.error_message}")
            return result

        if record.status == RecordStatus.SKIPPED:
            result.status = ValidationStatus.FAIL
            result.errors.append(f"跳过原因: {record.error_message}")
            return result

        data = record.parsed_data
        if data is None:
            result.status = ValidationStatus.FAIL
            result.errors.append("无解析数据")
            return result

        try:
            all_pass = True
            for config in self.segment_configs:
                segment_result = self._validate_segment(data, config)
                result.segment_metrics[config.segment_key] = segment_result["metrics"]
                result.boundary_checks[config.segment_key] = segment_result["passed"]

                if not segment_result["passed"]:
                    all_pass = False
                    if segment_result.get("suspended"):
                        result.status = ValidationStatus.SUSPENDED
                        result.suspension_reason = segment_result.get("suspension_reason")
                        result.warnings.append(f"{config.segment_key}: {segment_result.get('suspension_reason')}")
                    else:
                        result.warnings.append(
                            f"{config.segment_key}: 未通过校验 (R²={segment_result['metrics'].get('r_squared', 'N/A'):.4f})"
                        )

            if result.status == ValidationStatus.PENDING:
                result.status = ValidationStatus.PASS if all_pass else ValidationStatus.WARNING

        except DivisionByZeroError as e:
            if self.auto_suspend_divzero:
                result.status = ValidationStatus.SUSPENDED
                result.suspension_reason = f"除零边界异常: {str(e)}"
                result.warnings.append(result.suspension_reason)
            else:
                result.status = ValidationStatus.FAIL
                result.errors.append(f"除零错误: {str(e)}")

        except Exception as e:
            result.status = ValidationStatus.FAIL
            result.errors.append(f"校验异常: {str(e)}")

        return result

    def _validate_segment(self, data: Dict, config: SegmentConfig) -> Dict:
        points = data.get(config.segment_key, [])
        if not points or len(points) < config.min_points:
            return {
                "passed": False,
                "metrics": {"point_count": len(points)},
                "suspended": False,
                "suspension_reason": None,
            }

        x_vals = []
        y_vals = []
        for p in points:
            x = p.get(config.x_field)
            y = p.get(config.y_field)
            if x is not None and y is not None:
                x_vals.append(float(x))
                y_vals.append(float(y))

        if len(x_vals) < config.min_points:
            return {
                "passed": False,
                "metrics": {"point_count": len(x_vals), "valid_points": len(x_vals)},
                "suspended": False,
                "suspension_reason": None,
            }

        x_arr = np.array(x_vals)
        y_arr = np.array(y_vals)

        try:
            slope, intercept, r_squared = self._linear_regression(x_arr, y_arr)
        except DivisionByZeroError as e:
            return {
                "passed": False,
                "metrics": {"point_count": len(x_vals)},
                "suspended": True,
                "suspension_reason": f"{config.segment_key} {str(e)}",
            }

        x_range = np.max(x_arr) - np.min(x_arr)
        if x_range == 0:
            return {
                "passed": False,
                "metrics": {"point_count": len(x_vals), "x_range": 0},
                "suspended": True,
                "suspension_reason": f"{config.segment_key} X轴数据范围为零，无法进行有效回归",
            }

        passed = r_squared >= config.r_squared_threshold

        return {
            "passed": passed,
            "metrics": {
                "slope": slope,
                "intercept": intercept,
                "r_squared": r_squared,
                "point_count": len(x_vals),
                "x_min": float(np.min(x_arr)),
                "x_max": float(np.max(x_arr)),
                "y_min": float(np.min(y_arr)),
                "y_max": float(np.max(y_arr)),
            },
            "suspended": False,
            "suspension_reason": None,
        }

    def _linear_regression(self, x: np.ndarray, y: np.ndarray) -> Tuple[float, float, float]:
        n = len(x)
        if n < 2:
            raise DivisionByZeroError("数据点不足，无法计算回归")

        sum_x = np.sum(x)
        sum_y = np.sum(y)
        sum_xy = np.sum(x * y)
        sum_x2 = np.sum(x ** 2)
        sum_y2 = np.sum(y ** 2)

        denominator = n * sum_x2 - sum_x ** 2
        if denominator == 0:
            raise DivisionByZeroError("X轴方差为零，所有X值相同", segment="regression")

        slope = (n * sum_xy - sum_x * sum_y) / denominator
        intercept = (sum_y - slope * sum_x) / n

        y_pred = slope * x + intercept
        ss_res = np.sum((y - y_pred) ** 2)
        ss_tot = np.sum((y - np.mean(y)) ** 2)

        if ss_tot == 0:
            raise DivisionByZeroError("Y轴方差为零，所有Y值相同", segment="r_squared")

        r_squared = 1 - (ss_res / ss_tot)

        return float(slope), float(intercept), float(r_squared)

    def batch_validate(self, records: List[MaterialRecord]) -> Tuple[List[ValidationResult], ValidationStats]:
        results = []
        stats = ValidationStats()

        for record in records:
            stats.total += 1

            if record.status == RecordStatus.BAD:
                stats.bad_rows += 1
            elif record.status == RecordStatus.SKIPPED:
                stats.skipped_rows += 1
            else:
                stats.processed += 1

            result = self.validate_record(record)
            results.append(result)

            if result.status == ValidationStatus.PASS:
                stats.passed += 1
            elif result.status == ValidationStatus.FAIL:
                stats.failed += 1
            elif result.status == ValidationStatus.WARNING:
                stats.warnings += 1
            elif result.status == ValidationStatus.SUSPENDED:
                stats.suspended += 1
            elif result.status == ValidationStatus.PENDING:
                stats.pending += 1

        return results, stats
