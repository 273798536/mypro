import numpy as np
from typing import List, Dict, Any, Tuple
from dataclasses import dataclass


@dataclass
class ValidationIssue:
    check_type: str
    passed: bool
    message: str
    affected_points: List[int]
    severity: str


class DataValidator:
    VALID_DISPLACEMENT_UNITS = {"m", "cm", "mm", "meter", "centimeter", "millimeter"}
    VALID_TIME_UNITS = {"s", "sec", "second", "seconds", "ms", "millisecond"}
    VALID_MASS_UNITS = {"kg", "g", "gram", "kilogram"}

    def __init__(self, tolerance_factor: float = 2.0):
        self.tolerance_factor = tolerance_factor

    def validate_all(self, data_points: List[Dict[str, Any]], mass_unit: str) -> List[ValidationIssue]:
        issues = []
        issues.append(self.check_unit_consistency(data_points, mass_unit))
        issues.append(self.check_sampling_gaps(data_points))
        issues.append(self.check_damping_anomaly(data_points))
        issues.append(self.check_outliers(data_points))
        return [issue for issue in issues if issue is not None]

    def check_unit_consistency(self, data_points: List[Dict[str, Any]], mass_unit: str) -> ValidationIssue:
        displacement_units = set()
        time_units = set()
        mixed_points = []

        for i, point in enumerate(data_points):
            disp_unit = point.get("displacement_unit", "m").lower().strip()
            time_unit = point.get("timestamp_unit", "s").lower().strip()
            displacement_units.add(disp_unit)
            time_units.add(time_unit)

            if len(displacement_units) > 1 or len(time_units) > 1:
                mixed_points.append(i)

        mass_unit_clean = mass_unit.lower().strip()
        is_mass_valid = mass_unit_clean in self.VALID_MASS_UNITS

        has_mixed_units = len(displacement_units) > 1 or len(time_units) > 1 or not is_mass_valid

        if has_mixed_units:
            message_parts = []
            if len(displacement_units) > 1:
                message_parts.append(f"位移单位混用: {', '.join(displacement_units)}")
            if len(time_units) > 1:
                message_parts.append(f"时间单位混用: {', '.join(time_units)}")
            if not is_mass_valid:
                message_parts.append(f"质量单位 '{mass_unit}' 不规范")

            message = "；".join(message_parts)
            human_message = self._translate_unit_issue(message)

            return ValidationIssue(
                check_type="unit_consistency",
                passed=False,
                message=human_message,
                affected_points=mixed_points if mixed_points else list(range(len(data_points))),
                severity="error"
            )

        return ValidationIssue(
            check_type="unit_consistency",
            passed=True,
            message="单位规范一致",
            affected_points=[],
            severity="info"
        )

    def _translate_unit_issue(self, tech_message: str) -> str:
        translations = {
            "位移单位混用": "📏 位移用了好几种单位混着记",
            "时间单位混用": "⏱️ 时间用了好几种单位混着记",
            "不规范": "不是标准单位",
        }
        for tech, human in translations.items():
            tech_message = tech_message.replace(tech, human)
        return tech_message

    def check_sampling_gaps(self, data_points: List[Dict[str, Any]]) -> ValidationIssue:
        if len(data_points) < 3:
            return None

        timestamps = sorted([p["timestamp"] for p in data_points])
        intervals = np.diff(timestamps)

        if len(intervals) == 0:
            return None

        median_interval = np.median(intervals)
        threshold = median_interval * self.tolerance_factor

        gap_points = []
        for i, interval in enumerate(intervals):
            if interval > threshold:
                gap_points.extend([i, i + 1])

        gap_points = sorted(list(set(gap_points)))

        if gap_points:
            gap_count = len([i for i in range(len(intervals)) if intervals[i] > threshold])
            message = (f"⚠️ 发现 {gap_count} 处采样间隔异常，影响了第 {min(gap_points)+1} 到第 {max(gap_points)+1} 个数据点。"
                      f"正常间隔约 {median_interval:.3f}秒，这些地方间隔超过了 {threshold:.3f}秒，"
                      f"可能是记录时漏掉了或者仪器暂停了，会影响曲线拟合的准确性。")

            return ValidationIssue(
                check_type="sampling_gaps",
                passed=False,
                message=message,
                affected_points=gap_points,
                severity="warning"
            )

        return ValidationIssue(
            check_type="sampling_gaps",
            passed=True,
            message="采样间隔均匀",
            affected_points=[],
            severity="info"
        )

    def check_damping_anomaly(self, data_points: List[Dict[str, Any]]) -> ValidationIssue:
        if len(data_points) < 5:
            return None

        displacements = [abs(p["displacement"]) for p in data_points]
        timestamps = [p["timestamp"] for p in data_points]

        sorted_pairs = sorted(zip(timestamps, displacements), key=lambda x: x[0])
        _, sorted_disp = zip(*sorted_pairs)

        peak_indices = self._find_peaks(list(sorted_disp))

        if len(peak_indices) < 3:
            return None

        peak_amplitudes = [sorted_disp[i] for i in peak_indices]

        ratios = []
        for i in range(len(peak_amplitudes) - 1):
            if peak_amplitudes[i] > 0:
                ratios.append(peak_amplitudes[i + 1] / peak_amplitudes[i])

        if not ratios:
            return None

        avg_ratio = np.mean(ratios)

        if avg_ratio < 0.3:
            message = (f"🔧 阻尼过大！振动衰减太快了，"
                      f"振幅平均每次只剩下 {avg_ratio*100:.1f}%。"
                      f"正常实验一般应该在 30%-90% 之间。"
                      f"这样的话弹簧常数可能测不准，建议增加质量或者减小阻尼重试。")

            return ValidationIssue(
                check_type="damping_anomaly",
                passed=False,
                message=message,
                affected_points=peak_indices,
                severity="warning"
            )
        elif avg_ratio > 0.95:
            message = (f"🔧 阻尼太小！振动几乎不衰减，"
                      f"振幅每次还有 {avg_ratio*100:.1f}%。"
                      f"是不是阻尼器没装好？这样测不出阻尼系数的准确值。")

            return ValidationIssue(
                check_type="damping_anomaly",
                passed=False,
                message=message,
                affected_points=peak_indices,
                severity="warning"
            )

        return ValidationIssue(
            check_type="damping_anomaly",
            passed=True,
            message=f"阻尼正常，振幅衰减比约 {avg_ratio*100:.1f}%",
            affected_points=[],
            severity="info"
        )

    def _find_peaks(self, data: List[float], min_distance: int = 2) -> List[int]:
        peaks = []
        n = len(data)

        for i in range(1, n - 1):
            if data[i] > data[i - 1] and data[i] > data[i + 1]:
                if not peaks or i - peaks[-1] >= min_distance:
                    peaks.append(i)

        return peaks

    def check_outliers(self, data_points: List[Dict[str, Any]]) -> ValidationIssue:
        if len(data_points) < 5:
            return None

        displacements = [p["displacement"] for p in data_points]
        timestamps = [p["timestamp"] for p in data_points]

        sorted_pairs = sorted(zip(timestamps, displacements), key=lambda x: x[0])
        _, sorted_disp = zip(*sorted_pairs)

        Q1 = np.percentile(sorted_disp, 25)
        Q3 = np.percentile(sorted_disp, 75)
        IQR = Q3 - Q1

        lower_bound = Q1 - 1.5 * IQR
        upper_bound = Q3 + 1.5 * IQR

        outlier_indices = []
        for i, disp in enumerate(sorted_disp):
            if disp < lower_bound or disp > upper_bound:
                outlier_indices.append(i)

        if outlier_indices:
            message = (f"❗ 发现 {len(outlier_indices)} 个异常点（第 {', '.join([str(i+1) for i in outlier_indices])} 个）"
                      f"数值偏离正常范围太多。可能是手抖了、仪器跳数了或者录入错了，建议核对一下。")

            return ValidationIssue(
                check_type="outliers",
                passed=False,
                message=message,
                affected_points=outlier_indices,
                severity="warning"
            )

        return ValidationIssue(
            check_type="outliers",
            passed=True,
            message="无明显异常点",
            affected_points=[],
            severity="info"
        )
