import numpy as np
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from scipy import signal
from .data_loader import FlightData


@dataclass
class AnomalyReport:
    sensor_dropouts: List[Dict] = field(default_factory=list)
    bounce_events: List[Dict] = field(default_factory=list)
    wind_anomalies: List[Dict] = field(default_factory=list)
    spikes: List[Dict] = field(default_factory=list)
    velocity_anomalies: List[Dict] = field(default_factory=list)
    total_anomalies: int = 0
    auto_fixed_count: int = 0
    needs_review_count: int = 0


class AnomalyDetector:
    def __init__(self):
        self.config = {
            'max_time_gap': 0.5,
            'spike_threshold': 3.0,
            'bounce_acceleration_threshold': 50.0,
            'bounce_height_ratio': 0.1,
            'velocity_change_threshold': 20.0,
            'min_valid_points': 5
        }

    def detect_and_fix(self, flight_data: FlightData) -> AnomalyReport:
        report = AnomalyReport()

        self._detect_sensor_dropouts(flight_data, report)
        self._detect_spikes(flight_data, report)
        self._detect_bounce_events(flight_data, report)
        self._detect_velocity_anomalies(flight_data, report)
        self._detect_wind_anomalies(flight_data, report)

        self._fix_simple_anomalies(flight_data, report)

        report.total_anomalies = (
            len(report.sensor_dropouts) +
            len(report.spikes) +
            len(report.bounce_events) +
            len(report.velocity_anomalies) +
            len(report.wind_anomalies)
        )
        report.needs_review_count = len(flight_data.get_review_required())

        return report

    def _detect_sensor_dropouts(
        self,
        flight_data: FlightData,
        report: AnomalyReport
    ):
        times = flight_data.time_series
        altitudes = flight_data.altitude_series

        time_diffs = np.diff(times)
        large_gaps = np.where(time_diffs > self.config['max_time_gap'])[0]

        for gap_idx in large_gaps:
            gap_start_idx = gap_idx
            gap_end_idx = gap_idx + 1
            gap_duration = time_diffs[gap_idx]

            dropout = {
                'index': gap_start_idx,
                'start_time': times[gap_start_idx],
                'end_time': times[gap_end_idx],
                'gap_duration': gap_duration,
                'start_altitude': altitudes[gap_start_idx],
                'end_altitude': altitudes[gap_end_idx],
                'severity': 'high' if gap_duration > 2.0 else 'medium',
                'description': f"传感器数据中断 {gap_duration:.2f}秒，影响高度插值"
            }
            report.sensor_dropouts.append(dropout)
            flight_data.mark_for_review(gap_start_idx, f"传感器数据中断: {dropout['description']}")

    def _detect_spikes(
        self,
        flight_data: FlightData,
        report: AnomalyReport
    ):
        altitudes = flight_data.altitude_series
        times = flight_data.time_series

        if len(altitudes) < 5:
            return

        median_filtered = signal.medfilt(altitudes, kernel_size=5)
        residuals = np.abs(altitudes - median_filtered)

        mad = np.median(np.abs(residuals - np.median(residuals)))
        if mad < 1e-6:
            mad = 1e-6

        z_scores = 0.6745 * residuals / mad
        spike_indices = np.where(z_scores > self.config['spike_threshold'])[0]

        for idx in spike_indices:
            if idx == 0 or idx == len(altitudes) - 1:
                continue

            spike = {
                'index': int(idx),
                'time': times[idx],
                'original_value': altitudes[idx],
                'expected_value': median_filtered[idx],
                'deviation': float(residuals[idx]),
                'z_score': float(z_scores[idx]),
                'severity': 'high' if z_scores[idx] > 5 else 'medium',
                'can_auto_fix': True,
                'description': f"检测到异常峰值: {altitudes[idx]:.2f}m，偏离期望值 {residuals[idx]:.2f}m"
            }
            report.spikes.append(spike)

    def _detect_bounce_events(
        self,
        flight_data: FlightData,
        report: AnomalyReport
    ):
        times = flight_data.time_series
        altitudes = flight_data.altitude_series

        if len(times) < 3:
            return

        max_height = np.max(altitudes)
        max_height_idx = np.argmax(altitudes)

        post_max_altitudes = altitudes[max_height_idx:]
        post_max_times = times[max_height_idx:]

        if len(post_max_altitudes) < 5:
            return

        near_ground = np.where(post_max_altitudes < 1.0)[0]

        for ground_idx in near_ground:
            absolute_idx = max_height_idx + ground_idx
            if absolute_idx + 2 >= len(altitudes):
                continue

            if absolute_idx + 1 < len(altitudes) and altitudes[absolute_idx + 1] > 0.5:
                bounce_height = altitudes[absolute_idx + 1]
                if bounce_height > self.config['bounce_height_ratio'] * max_height:
                    bounce = {
                        'index': int(absolute_idx),
                        'time': times[absolute_idx],
                        'bounce_height': float(bounce_height),
                        'max_height': float(max_height),
                        'bounce_ratio': float(bounce_height / max_height),
                        'severity': 'high',
                        'affects_landing_time': True,
                        'description': f"检测到落地反弹事件，反弹高度 {bounce_height:.2f}m (最大高度的 {bounce_height/max_height*100:.1f}%)"
                    }
                    report.bounce_events.append(bounce)
                    flight_data.mark_for_review(absolute_idx, f"落地反弹: {bounce['description']}")

        velocities = np.diff(altitudes) / np.diff(times)
        if len(velocities) >= 2:
            accelerations = np.diff(velocities) / np.diff(times[1:])
            large_accel = np.where(np.abs(accelerations) > self.config['bounce_acceleration_threshold'])[0]

            for accel_idx in large_accel:
                absolute_idx = max_height_idx + accel_idx + 2
                if absolute_idx >= len(altitudes):
                    continue
                if altitudes[absolute_idx] < 2.0:
                    bounce = {
                        'index': int(absolute_idx),
                        'time': times[absolute_idx],
                        'acceleration': float(accelerations[accel_idx]),
                        'severity': 'medium',
                        'description': f"高速撞击信号，加速度 {accelerations[accel_idx]:.1f}m/s²",
                        'from_acceleration': True
                    }
                    exists = any(b['index'] == bounce['index'] for b in report.bounce_events)
                    if not exists:
                        report.bounce_events.append(bounce)
                        flight_data.mark_for_review(absolute_idx, f"高速撞击: {bounce['description']}")

    def _detect_velocity_anomalies(
        self,
        flight_data: FlightData,
        report: AnomalyReport
    ):
        times = flight_data.time_series
        altitudes = flight_data.altitude_series

        if len(times) < 3:
            return

        velocities = np.diff(altitudes) / np.diff(times)

        for i in range(len(velocities) - 1):
            velocity_change = abs(velocities[i + 1] - velocities[i])
            if velocity_change > self.config['velocity_change_threshold']:
                anomaly = {
                    'index': i + 1,
                    'time': times[i + 1],
                    'velocity_before': float(velocities[i]),
                    'velocity_after': float(velocities[i + 1]),
                    'velocity_change': float(velocity_change),
                    'severity': 'medium',
                    'description': f"速度突变 {velocity_change:.1f}m/s，可能是传感器误差或风向突变"
                }
                report.velocity_anomalies.append(anomaly)
                flight_data.mark_for_review(i + 1, f"速度异常: {anomaly['description']}")

    def _detect_wind_anomalies(
        self,
        flight_data: FlightData,
        report: AnomalyReport
    ):
        metadata = flight_data.metadata

        if metadata.wind_speed > 10.0:
            report.wind_anomalies.append({
                'type': 'high_wind',
                'wind_speed': metadata.wind_speed,
                'severity': 'high',
                'description': f"风速过高 ({metadata.wind_speed:.1f}m/s)，可能显著影响弹道和计算精度",
                'impact': '横向位移误差增大，垂直阻力计算偏差'
            })

        times = flight_data.time_series
        altitudes = flight_data.altitude_series

        if len(times) > 10 and metadata.wind_speed > 0:
            max_h_idx = np.argmax(altitudes)
            ascent_time = times[max_h_idx]
            descent_time = times[-1] - ascent_time

            if ascent_time > 0 and descent_time > 0:
                time_ratio = descent_time / ascent_time

                if time_ratio < 1.0 or time_ratio > 2.5:
                    report.wind_anomalies.append({
                        'type': 'ascent_descent_mismatch',
                        'ascent_time': float(ascent_time),
                        'descent_time': float(descent_time),
                        'time_ratio': float(time_ratio),
                        'severity': 'medium',
                        'description': f"上升/下降时间异常 (比例 {time_ratio:.2f})，可能是风场估计不准确",
                        'impact': '阻力系数估计可能有偏差'
                    })

    def _fix_simple_anomalies(
        self,
        flight_data: FlightData,
        report: AnomalyReport
    ):
        for spike in report.spikes:
            if spike.get('can_auto_fix', False):
                idx = spike['index']
                old_value = spike['original_value']
                new_value = spike['expected_value']

                if 0 < idx < len(flight_data.data_points) - 1:
                    flight_data.add_modification(
                        idx,
                        old_value,
                        new_value,
                        f"自动修正异常峰值: {spike['description']}"
                    )
                    report.auto_fixed_count += 1

        times, altitudes = flight_data.get_valid_data()
        if len(altitudes) > 0 and np.any(altitudes < 0):
            for i, dp in enumerate(flight_data.data_points):
                if dp.altitude < 0 and dp.is_valid:
                    old_value = dp.altitude
                    flight_data.add_modification(
                        i,
                        old_value,
                        0.0,
                        "自动修正负高度值"
                    )
                    report.auto_fixed_count += 1

    def analyze_residuals(
        self,
        flight_data: FlightData,
        fitted_altitudes: np.ndarray
    ) -> Dict:
        times, actual_altitudes = flight_data.get_valid_data()

        if len(times) != len(fitted_altitudes):
            fitted_altitudes = np.interp(
                times,
                np.linspace(0, times[-1], len(fitted_altitudes)),
                fitted_altitudes
            )

        residuals = actual_altitudes - fitted_altitudes
        std_residuals = np.std(residuals)

        outliers = []
        for i, (t, res) in enumerate(zip(times, residuals)):
            if abs(res) > 2 * std_residuals:
                outliers.append({
                    'time': t,
                    'residual': res,
                    'std_deviations': res / std_residuals if std_residuals > 0 else 0,
                    'severity': 'high' if abs(res) > 3 * std_residuals else 'medium'
                })

        return {
            'rmse': np.sqrt(np.mean(residuals ** 2)),
            'mean_residual': np.mean(residuals),
            'std_residual': std_residuals,
            'max_residual': np.max(np.abs(residuals)),
            'outliers': outliers,
            'outlier_count': len(outliers),
            'residual_autocorrelation': np.corrcoef(residuals[:-1], residuals[1:])[0, 1] if len(residuals) > 1 else 0
        }

    def get_data_quality_score(self, flight_data: FlightData) -> Dict:
        n_points = len(flight_data.data_points)
        n_valid = sum(1 for dp in flight_data.data_points if dp.is_valid)
        n_modified = sum(1 for dp in flight_data.data_points if dp.is_modified)
        n_review = sum(1 for dp in flight_data.data_points if dp.needs_manual_review)

        times = flight_data.time_series
        if len(times) > 1:
            time_diffs = np.diff(times)
            sampling_consistency = 1 - np.std(time_diffs) / np.mean(time_diffs) if np.mean(time_diffs) > 0 else 0
        else:
            sampling_consistency = 1.0

        altitudes = flight_data.altitude_series
        noise_level = np.std(np.diff(altitudes)) if len(altitudes) > 1 else 0
        noise_score = max(0, 1 - noise_level / 10)

        completeness_score = n_valid / n_points if n_points > 0 else 0
        modification_penalty = n_modified / n_points * 0.2 if n_points > 0 else 0
        review_penalty = n_review / n_points * 0.3 if n_points > 0 else 0

        overall_score = (
            0.4 * completeness_score +
            0.3 * sampling_consistency +
            0.3 * noise_score -
            modification_penalty -
            review_penalty
        )
        overall_score = max(0, min(1, overall_score))

        return {
            'overall_score': overall_score,
            'completeness_score': completeness_score,
            'sampling_consistency': sampling_consistency,
            'noise_score': noise_score,
            'n_points': n_points,
            'n_valid': n_valid,
            'n_modified': n_modified,
            'n_review_required': n_review,
            'grade': self._score_to_grade(overall_score)
        }

    def _score_to_grade(self, score: float) -> str:
        if score >= 0.9:
            return 'A (优秀)'
        elif score >= 0.75:
            return 'B (良好)'
        elif score >= 0.6:
            return 'C (一般)'
        elif score >= 0.4:
            return 'D (较差)'
        else:
            return 'F (不合格)'
