from typing import List, Tuple, Dict
from dataclasses import dataclass
from datetime import datetime
import numpy as np

from config import SafetyBoundaries
from data_models import (
    TimeSeriesPoint,
    FlywheelDataRecord,
    ViolationType,
    DataStatus,
    validate_data_point
)


@dataclass
class BoundaryCheckResult:
    passed: bool
    is_warning: bool
    violations: List[ViolationType]
    warnings: List[str]
    details: Dict[str, any]


class BoundaryChecker:
    def __init__(self, boundaries: SafetyBoundaries = None):
        self.boundaries = boundaries or SafetyBoundaries()

    def check_speed(self, speed_rpm: float) -> Tuple[bool, bool, List[ViolationType], List[str]]:
        is_ok = True
        is_warning = False
        violations = []
        warnings = []

        if speed_rpm > self.boundaries.max_speed_rpm:
            violations.append(ViolationType.SPEED_OVER_LIMIT)
            is_ok = False
        elif speed_rpm < self.boundaries.min_speed_rpm:
            violations.append(ViolationType.SPEED_UNDER_LIMIT)
            is_ok = False

        if speed_rpm >= self.boundaries.warning_speed_rpm:
            warnings.append(f"转速接近上限: {speed_rpm:.1f} rpm (警戒值: {self.boundaries.warning_speed_rpm} rpm)")
            is_warning = True

        return is_ok, is_warning, violations, warnings

    def check_vacuum(self, vacuum_pa: float) -> Tuple[bool, bool, List[ViolationType], List[str]]:
        is_ok = True
        is_warning = False
        violations = []
        warnings = []

        if vacuum_pa > self.boundaries.max_vacuum_pa:
            violations.append(ViolationType.VACUUM_LEAK)
            is_ok = False

        if vacuum_pa >= self.boundaries.warning_vacuum_pa:
            warnings.append(f"真空度接近上限: {vacuum_pa:.4f} Pa (警戒值: {self.boundaries.warning_vacuum_pa} Pa)")
            is_warning = True

        return is_ok, is_warning, violations, warnings

    def check_temperature(self, temperature_c: float) -> Tuple[bool, bool, List[ViolationType], List[str]]:
        is_ok = True
        is_warning = False
        violations = []
        warnings = []

        if temperature_c > self.boundaries.max_temperature_c:
            violations.append(ViolationType.TEMPERATURE_OVER_LIMIT)
            is_ok = False

        if temperature_c >= self.boundaries.warning_temperature_c:
            warnings.append(f"温度接近上限: {temperature_c:.1f} °C (警戒值: {self.boundaries.warning_temperature_c} °C)")
            is_warning = True

        return is_ok, is_warning, violations, warnings

    def check_temp_rise_rate(self, temp_series: List[float], time_series: List[datetime]) -> Tuple[bool, bool, List[ViolationType], List[str]]:
        is_ok = True
        is_warning = False
        violations = []
        warnings = []

        if len(temp_series) < 2:
            return is_ok, is_warning, violations, warnings

        temp_rise_rates = []
        for i in range(1, len(temp_series)):
            delta_temp = temp_series[i] - temp_series[i-1]
            delta_time = (time_series[i] - time_series[i-1]).total_seconds() / 60.0
            if delta_time > 0:
                rise_rate = delta_temp / delta_time
                temp_rise_rates.append(rise_rate)

        if temp_rise_rates:
            max_rise_rate = max(temp_rise_rates)
            if max_rise_rate > self.boundaries.max_temp_rise_rate_c_per_min:
                violations.append(ViolationType.TEMP_RISE_LAG)
                is_ok = False

            if max_rise_rate >= self.boundaries.warning_temp_rise_rate_c_per_min:
                warnings.append(f"温升速率过高: {max_rise_rate:.2f} °C/min (警戒值: {self.boundaries.warning_temp_rise_rate_c_per_min} °C/min)")
                is_warning = True

        return is_ok, is_warning, violations, warnings

    def check_single_point(self, point: TimeSeriesPoint) -> BoundaryCheckResult:
        all_violations = []
        all_warnings = []
        all_passed = True
        any_warning = False
        details = {}

        speed_ok, speed_warn, speed_viol, speed_warns = self.check_speed(point.speed_rpm)
        all_violations.extend(speed_viol)
        all_warnings.extend(speed_warns)
        all_passed = all_passed and speed_ok
        any_warning = any_warning or speed_warn
        details["speed"] = point.speed_rpm

        vac_ok, vac_warn, vac_viol, vac_warns = self.check_vacuum(point.vacuum_pa)
        all_violations.extend(vac_viol)
        all_warnings.extend(vac_warns)
        all_passed = all_passed and vac_ok
        any_warning = any_warning or vac_warn
        details["vacuum"] = point.vacuum_pa

        temp_ok, temp_warn, temp_viol, temp_warns = self.check_temperature(point.temperature_c)
        all_violations.extend(temp_viol)
        all_warnings.extend(temp_warns)
        all_passed = all_passed and temp_ok
        any_warning = any_warning or temp_warn
        details["temperature"] = point.temperature_c

        return BoundaryCheckResult(
            passed=all_passed,
            is_warning=any_warning,
            violations=all_violations,
            warnings=all_warnings,
            details=details
        )

    def check_record(self, record: FlywheelDataRecord) -> BoundaryCheckResult:
        all_violations = []
        all_warnings = []
        all_passed = True
        any_warning = False
        details = {
            "max_speed": 0.0,
            "max_vacuum": 0.0,
            "max_temperature": 0.0,
            "max_temp_rise_rate": 0.0
        }

        if not record.time_series_data:
            return BoundaryCheckResult(
                passed=False,
                is_warning=False,
                violations=[],
                warnings=["无时间序列数据"],
                details=details
            )

        speeds = [p.speed_rpm for p in record.time_series_data]
        vacuums = [p.vacuum_pa for p in record.time_series_data]
        temps = [p.temperature_c for p in record.time_series_data]
        timestamps = [p.timestamp for p in record.time_series_data]

        details["max_speed"] = max(speeds)
        details["max_vacuum"] = max(vacuums)
        details["max_temperature"] = max(temps)

        speed_ok, speed_warn, speed_viol, speed_warns = self.check_speed(max(speeds))
        all_violations.extend(speed_viol)
        all_warnings.extend(speed_warns)
        all_passed = all_passed and speed_ok
        any_warning = any_warning or speed_warn

        vac_ok, vac_warn, vac_viol, vac_warns = self.check_vacuum(max(vacuums))
        all_violations.extend(vac_viol)
        all_warnings.extend(vac_warns)
        all_passed = all_passed and vac_ok
        any_warning = any_warning or vac_warn

        temp_ok, temp_warn, temp_viol, temp_warns = self.check_temperature(max(temps))
        all_violations.extend(temp_viol)
        all_warnings.extend(temp_warns)
        all_passed = all_passed and temp_ok
        any_warning = any_warning or temp_warn

        rise_ok, rise_warn, rise_viol, rise_warns = self.check_temp_rise_rate(temps, timestamps)
        all_violations.extend(rise_viol)
        all_warnings.extend(rise_warns)
        all_passed = all_passed and rise_ok
        any_warning = any_warning or rise_warn

        return BoundaryCheckResult(
            passed=all_passed,
            is_warning=any_warning,
            violations=list(set(all_violations)),
            warnings=all_warnings,
            details=details
        )

    def classify_record(self, record: FlywheelDataRecord) -> DataStatus:
        for point in record.time_series_data:
            errors = validate_data_point(point)
            if errors:
                return DataStatus.BAD_INPUT

        check_result = self.check_record(record)
        
        if not check_result.passed:
            if ViolationType.SPEED_OVER_LIMIT in check_result.violations:
                return DataStatus.PENDING_REVIEW
            return DataStatus.BOUNDARY
        
        if check_result.is_warning:
            return DataStatus.BOUNDARY
        
        return DataStatus.NORMAL

    def get_boundary_summary(self) -> Dict[str, float]:
        return {
            "max_speed_rpm": self.boundaries.max_speed_rpm,
            "min_speed_rpm": self.boundaries.min_speed_rpm,
            "warning_speed_rpm": self.boundaries.warning_speed_rpm,
            "max_vacuum_pa": self.boundaries.max_vacuum_pa,
            "warning_vacuum_pa": self.boundaries.warning_vacuum_pa,
            "max_temperature_c": self.boundaries.max_temperature_c,
            "warning_temperature_c": self.boundaries.warning_temperature_c,
            "max_temp_rise_rate_c_per_min": self.boundaries.max_temp_rise_rate_c_per_min
        }

