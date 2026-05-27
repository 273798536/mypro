from typing import List
from .models import (
    InputData, Anomaly, AnomalySeverity, DataSource,
    Status, DataPoint
)


class AnomalyDetector:
    STANDARD_FRAME_RATES = {24, 25, 30, 50, 60, 120}
    FRAME_RATE_TOLERANCE = 0.1

    @staticmethod
    def detect_all(input_data: InputData) -> List[Anomaly]:
        anomalies = []
        anomalies.extend(AnomalyDetector.detect_frame_rate_issues(input_data))
        anomalies.extend(AnomalyDetector.detect_scale_issues(input_data))
        anomalies.extend(AnomalyDetector.detect_trajectory_issues(input_data))
        anomalies.extend(AnomalyDetector.detect_air_resistance_warning(input_data))
        anomalies.extend(AnomalyDetector.detect_landing_point_issues(input_data))
        return anomalies

    @staticmethod
    def detect_frame_rate_issues(input_data: InputData) -> List[Anomaly]:
        anomalies = []
        fr = input_data.frame_rate
        fr_value = fr.value

        if fr_value <= 0:
            anomalies.append(Anomaly(
                severity=AnomalySeverity.CRITICAL,
                category="frame_rate",
                message=f"帧率无效: {fr_value} fps",
                details={"raw_value": fr_value, "source": fr.source},
                affected_fields=["frame_rate"],
                suggestion="请检查视频文件或手动输入正确的帧率"
            ))
            return anomalies

        if fr.source != DataSource.FRAME_RATE:
            anomalies.append(Anomaly(
                severity=AnomalySeverity.WARNING,
                category="frame_rate",
                message=f"帧率来源非标准: {fr.source}",
                details={"source": fr.source, "value": fr_value},
                affected_fields=["frame_rate"],
                suggestion="建议从视频元数据中读取帧率"
            ))

        is_standard = any(
            abs(fr_value - std) / std < AnomalyDetector.FRAME_RATE_TOLERANCE
            for std in AnomalyDetector.STANDARD_FRAME_RATES
        )

        if not is_standard:
            anomalies.append(Anomaly(
                severity=AnomalySeverity.WARNING,
                category="frame_rate",
                message=f"帧率 {fr_value} fps 不是标准值",
                details={
                    "value": fr_value,
                    "standard_values": sorted(AnomalyDetector.STANDARD_FRAME_RATES),
                    "confidence": fr.confidence
                },
                affected_fields=["frame_rate"],
                suggestion="请确认帧率是否正确。常见帧率: 24, 25, 30, 50, 60, 120 fps"
            ))

        if fr.confidence < 0.7:
            anomalies.append(Anomaly(
                severity=AnomalySeverity.WARNING,
                category="frame_rate",
                message=f"帧率置信度较低: {fr.confidence:.2f}",
                details={"confidence": fr.confidence},
                affected_fields=["frame_rate"]
            ))

        if fr.correction_history:
            last_corr = fr.correction_history[-1]
            anomalies.append(Anomaly(
                severity=AnomalySeverity.INFO,
                category="frame_rate",
                message=f"帧率已修正: {last_corr.old_value} → {last_corr.new_value}",
                details={
                    "correction_type": last_corr.correction_type,
                    "reason": last_corr.reason,
                    "source": last_corr.source
                },
                affected_fields=["frame_rate"]
            ))

        return anomalies

    @staticmethod
    def detect_scale_issues(input_data: InputData) -> List[Anomaly]:
        anomalies = []
        scale = input_data.scale

        if scale.value is None or (isinstance(scale.value, (int, float)) and scale.value <= 0):
            anomalies.append(Anomaly(
                severity=AnomalySeverity.CRITICAL,
                category="scale",
                message="比例尺缺失或无效",
                details={"raw_value": scale.value, "source": scale.source},
                affected_fields=["scale"],
                suggestion="必须提供有效的比例尺（例如: 1米=100像素）"
            ))
            return anomalies

        if scale.source not in [DataSource.SCALE_REFERENCE, DataSource.MANUAL_CORRECTION]:
            anomalies.append(Anomaly(
                severity=AnomalySeverity.WARNING,
                category="scale",
                message=f"比例尺来源非标准: {scale.source}",
                details={"source": scale.source, "value": scale.value},
                affected_fields=["scale"]
            ))

        if scale.confidence < 0.7:
            anomalies.append(Anomaly(
                severity=AnomalySeverity.WARNING,
                message=f"比例尺置信度较低: {scale.confidence:.2f}",
                details={"confidence": scale.confidence},
                affected_fields=["scale"]
            ))

        if scale.correction_history:
            last_corr = scale.correction_history[-1]
            anomalies.append(Anomaly(
                severity=AnomalySeverity.INFO,
                category="scale",
                message=f"比例尺已修正: {last_corr.old_value} → {last_corr.new_value}",
                details={
                    "correction_type": last_corr.correction_type,
                    "reason": last_corr.reason,
                    "source": last_corr.source
                },
                affected_fields=["scale"]
            ))

        return anomalies

    @staticmethod
    def detect_trajectory_issues(input_data: InputData) -> List[Anomaly]:
        anomalies = []
        trajectory = input_data.trajectory

        if not trajectory:
            anomalies.append(Anomaly(
                severity=AnomalySeverity.CRITICAL,
                category="trajectory",
                message="没有轨迹数据",
                affected_fields=["trajectory"],
                suggestion="请提供视频标记的轨迹点"
            ))
            return anomalies

        if len(trajectory) < 5:
            anomalies.append(Anomaly(
                severity=AnomalySeverity.WARNING,
                category="trajectory",
                message=f"轨迹点数量较少: {len(trajectory)} 个",
                details={"point_count": len(trajectory)},
                affected_fields=["trajectory"],
                suggestion="建议至少标记5个点以获得可靠的拟合结果"
            ))

        outlier_count = sum(1 for p in trajectory if p.is_outlier)
        if outlier_count > 0:
            anomalies.append(Anomaly(
                severity=AnomalySeverity.WARNING,
                category="trajectory",
                message=f"检测到 {outlier_count} 个离群点",
                details={"outlier_count": outlier_count, "total_count": len(trajectory)},
                affected_fields=["trajectory"]
            ))

        time_intervals = [trajectory[i + 1].t - trajectory[i].t
                        for i in range(len(trajectory) - 1)]
        if time_intervals:
            avg_interval = sum(time_intervals) / len(time_intervals)
            fr = input_data.frame_rate.value
            expected_interval = 1.0 / fr if fr > 0 else 0
            if expected_interval > 0 and abs(avg_interval - expected_interval) / expected_interval > 0.2:
                anomalies.append(Anomaly(
                    severity=AnomalySeverity.WARNING,
                    category="trajectory",
                    message=f"时间间隔与帧率不一致: 平均{avg_interval:.4f}s, 预期{expected_interval:.4f}s",
                    details={
                        "avg_interval": avg_interval,
                        "expected_interval": expected_interval,
                        "frame_rate": fr
                    },
                    affected_fields=["trajectory", "frame_rate"],
                    suggestion="可能存在丢帧或帧率错误"
                ))

        return anomalies

    @staticmethod
    def detect_air_resistance_warning(input_data: InputData) -> List[Anomaly]:
        anomalies = []

        training_report = input_data.training_report or {}
        air_resistance_enabled = training_report.get("air_resistance_enabled", False)

        if not air_resistance_enabled:
            anomalies.append(Anomaly(
                severity=AnomalySeverity.WARNING,
                category="air_resistance",
                message="空气阻力已被忽略",
                details={"air_resistance_enabled": False},
                affected_fields=["params"],
                suggestion="对于高速运动（如铅球），建议考虑空气阻力以获得更精确的结果"
            ))

            if training_report.get("estimated_speed", 0) > 10:
                anomalies[-1].severity = AnomalySeverity.ERROR
                anomalies[-1].message = "警告: 高速运动下忽略空气阻力可能导致显著误差"

        return anomalies

    @staticmethod
    def detect_landing_point_issues(input_data: InputData) -> List[Anomaly]:
        anomalies = []
        lp = input_data.landing_point

        if lp is None:
            anomalies.append(Anomaly(
                severity=AnomalySeverity.INFO,
                category="landing_point",
                message="未提供落点数据",
                details={"provided": False},
                affected_fields=["landing_point"],
                suggestion="将根据轨迹拟合估计落点"
            ))
            return anomalies

        if lp.source == DataSource.ESTIMATED:
            anomalies.append(Anomaly(
                severity=AnomalySeverity.INFO,
                category="landing_point",
                message="落点为估计值",
                details={"value": lp.value},
                affected_fields=["landing_point"]
            ))

        return anomalies

    @staticmethod
    def check_data_quality(input_data: InputData) -> float:
        anomalies = AnomalyDetector.detect_all(input_data)
        critical = sum(1 for a in anomalies if a.severity == AnomalySeverity.CRITICAL)
        errors = sum(1 for a in anomalies if a.severity == AnomalySeverity.ERROR)
        warnings = sum(1 for a in anomalies if a.severity == AnomalySeverity.WARNING)

        score = 1.0
        score -= critical * 0.3
        score -= errors * 0.1
        score -= warnings * 0.05

        return max(0.0, min(1.0, score))
