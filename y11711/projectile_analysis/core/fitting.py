import math
from typing import List, Dict, Tuple, Optional
import numpy as np
from .models import (
    TrajectoryPoint, ProjectileParams, InputData,
    AnalysisResult, Anomaly, AnomalySeverity,
    DataSource, CorrectionType
)
from .physics import ProjectilePhysics


class TrajectoryFitter:
    @staticmethod
    def fit(trajectory: List[TrajectoryPoint], release_height: float,
            g: float = 9.81, air_resistance_enabled: bool = False,
            **kwargs) -> Tuple[ProjectileParams, Dict[str, float], List[Dict[str, float]]]:
        valid_points = [p for p in trajectory if not p.is_outlier]
        if len(valid_points) < 3:
            raise ValueError("至少需要3个有效轨迹点才能进行拟合")

        t = np.array([p.t for p in valid_points])
        x = np.array([p.x for p in valid_points])
        y = np.array([p.y for p in valid_points])

        if not air_resistance_enabled:
            return TrajectoryFitter._fit_ideal(t, x, y, release_height, g)
        else:
            return TrajectoryFitter._fit_with_air_resistance(
                t, x, y, release_height, g, **kwargs)

    @staticmethod
    def _fit_ideal(t: np.ndarray, x: np.ndarray, y: np.ndarray,
                    h: float, g: float) -> Tuple[ProjectileParams, Dict[str, float], List[Dict[str, float]]]:
        vx = TrajectoryFitter._linear_fit(t, x)

        y_centered = y - h
        t_squared = t * t
        coeffs = np.polyfit(t, y_centered, 2)

        a_y = 2 * coeffs[0]
        vy0 = coeffs[1]
        g_estimated = -2 * coeffs[0]

        if abs(g_estimated - g) / g > 0.3:
            vy0 = TrajectoryFitter._estimate_vy0_with_fixed_g(t, y_centered, g)
            g_estimated = g

        v0 = math.sqrt(vx * vx + vy0 * vy0)
        angle_deg = math.degrees(math.atan2(vy0, vx))

        params = ProjectileParams(
            v0=v0,
            angle_deg=angle_deg,
            release_height=h,
            g=g,
            air_resistance_enabled=False
        )

        residuals_x = x - vx * t
        residuals_y = y_centered - (vy0 * t - 0.5 * g * t * t)
        rmse_x = np.sqrt(np.mean(residuals_x ** 2))
        rmse_y = np.sqrt(np.mean(residuals_y ** 2))
        r_squared_x = 1 - np.sum(residuals_x ** 2) / np.sum((x - np.mean(x)) ** 2)
        r_squared_y = 1 - np.sum(residuals_y ** 2) / np.sum((y_centered - np.mean(y_centered)) ** 2)

        confidence = {
            "v0": max(0.5, 1.0 - (rmse_x + rmse_y) / v0),
            "angle": max(0.5, 1.0 - abs(g_estimated - g) / (2 * g)),
            "g_fit_quality": max(0.0, 1.0 - abs(g_estimated - g) / g),
            "r_squared_x": r_squared_x,
            "r_squared_y": r_squared_y,
            "rmse_x": rmse_x,
            "rmse_y": rmse_y
        }

        trajectory = ProjectilePhysics.ideal_trajectory(params)

        return params, confidence, trajectory

    @staticmethod
    def _fit_with_air_resistance(t: np.ndarray, x: np.ndarray, y: np.ndarray,
                                  h: float, g: float, **kwargs) -> Tuple[ProjectileParams, Dict[str, float], List[Dict[str, float]]]:
        drag_coefficient = kwargs.get("drag_coefficient", 0.47)
        mass = kwargs.get("mass", 7.26)
        cross_sectional_area = kwargs.get("cross_sectional_area", 0.0113)
        air_density = kwargs.get("air_density", 1.225)

        from scipy.optimize import minimize

        def cost(params_arr):
            v0, angle_deg = params_arr
            params = ProjectileParams(
                v0=v0,
                angle_deg=angle_deg,
                release_height=h,
                g=g,
                air_resistance_enabled=True,
                drag_coefficient=drag_coefficient,
                mass=mass,
                cross_sectional_area=cross_sectional_area,
                air_density=air_density
            )
            trajectory = ProjectilePhysics.trajectory_with_air_resistance(params, dt=0.001)
            x_pred = np.interp(t, [p["t"] for p in trajectory], [p["x"] for p in trajectory])
            y_pred = np.interp(t, [p["t"] for p in trajectory], [p["y"] for p in trajectory])
            return np.sum((x - x_pred) ** 2 + (y - y_pred) ** 2)

        vx_guess = TrajectoryFitter._linear_fit(t, x)
        y_centered = y - h
        vy0_guess = TrajectoryFitter._estimate_vy0_with_fixed_g(t, y_centered, g)
        v0_guess = math.sqrt(vx_guess ** 2 + vy0_guess ** 2)
        angle_guess = math.degrees(math.atan2(vy0_guess, vx_guess))

        try:
            result = minimize(cost, [v0_guess, angle_guess], method="Nelder-Mead")
            v0, angle_deg = result.x
        except:
            v0, angle_deg = v0_guess, angle_guess

        params = ProjectileParams(
            v0=v0,
            angle_deg=angle_deg,
            release_height=h,
            g=g,
            air_resistance_enabled=True,
            drag_coefficient=drag_coefficient,
            mass=mass,
            cross_sectional_area=cross_sectional_area,
            air_density=air_density
        )

        trajectory = ProjectilePhysics.trajectory_with_air_resistance(params)
        x_pred = np.interp(t, [p["t"] for p in trajectory], [p["x"] for p in trajectory])
        y_pred = np.interp(t, [p["t"] for p in trajectory], [p["y"] for p in trajectory])
        residuals_x = x - x_pred
        residuals_y = y - y_pred
        rmse_x = np.sqrt(np.mean(residuals_x ** 2))
        rmse_y = np.sqrt(np.mean(residuals_y ** 2))

        confidence = {
            "v0": max(0.5, 1.0 - (rmse_x + rmse_y) / v0),
            "angle": 0.8,
            "rmse_x": rmse_x,
            "rmse_y": rmse_y
        }

        return params, confidence, trajectory

    @staticmethod
    def _linear_fit(x: np.ndarray, y: np.ndarray) -> float:
        n = len(x)
        sum_x = np.sum(x)
        sum_y = np.sum(y)
        sum_xy = np.sum(x * y)
        sum_x2 = np.sum(x * x)
        slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x * sum_x)
        return float(slope)

    @staticmethod
    def _estimate_vy0_with_fixed_g(t: np.ndarray, y: np.ndarray, g: float) -> float:
        y_plus_half_gt2 = y + 0.5 * g * t * t
        return TrajectoryFitter._linear_fit(t, y_plus_half_gt2)

    @staticmethod
    def detect_outliers(trajectory: List[TrajectoryPoint],
                         threshold: float = 2.0) -> List[TrajectoryPoint]:
        if len(trajectory) < 5:
            return trajectory

        t = np.array([p.t for p in trajectory])
        x = np.array([p.x for p in trajectory])
        y = np.array([p.y for p in trajectory])

        vx = TrajectoryFitter._linear_fit(t, x)
        x_pred = vx * t
        x_residuals = x - x_pred
        x_std = np.std(x_residuals)

        coeffs = np.polyfit(t, y, 2)
        y_pred = coeffs[0] * t ** 2 + coeffs[1] * t + coeffs[2]
        y_residuals = y - y_pred
        y_std = np.std(y_residuals)

        for i, point in enumerate(trajectory):
            x_score = abs(x_residuals[i]) / (x_std + 1e-6)
            y_score = abs(y_residuals[i]) / (y_std + 1e-6)
            point.is_outlier = max(x_score, y_score) > threshold

        return trajectory


class ProjectileAnalyzer:
    @staticmethod
    def analyze(input_data: InputData, air_resistance_enabled: bool = False,
                **kwargs) -> AnalysisResult:
        anomalies = []
        processing_steps = []

        trajectory = input_data.trajectory
        original_count = len(trajectory)
        trajectory = TrajectoryFitter.detect_outliers(trajectory)
        outlier_count = sum(1 for p in trajectory if p.is_outlier)

        if outlier_count > 0:
            processing_steps.append(f"检测到 {outlier_count} 个离群点（共 {original_count} 个点）")
            anomalies.append(Anomaly(
                severity=AnomalySeverity.WARNING,
                category="fitting",
                message=f"自动排除了 {outlier_count} 个离群点",
                details={"outlier_count": outlier_count, "total_count": original_count},
                affected_fields=["trajectory"]
            ))

        valid_points = [p for p in trajectory if not p.is_outlier]
        if len(valid_points) < 3:
            raise ValueError("有效轨迹点不足，无法进行拟合")

        processing_steps.append(f"使用 {len(valid_points)} 个有效点进行拟合")

        try:
            params, confidence, predicted_traj = TrajectoryFitter.fit(
                trajectory=trajectory,
                release_height=input_data.release_height.value,
                g=kwargs.get("g", 9.81),
                air_resistance_enabled=air_resistance_enabled,
                **kwargs
            )
            processing_steps.append(
                f"拟合完成: v0={params.v0:.2f}m/s, 角度={params.angle_deg:.1f}°"
            )
        except Exception as e:
            raise RuntimeError(f"轨迹拟合失败: {str(e)}")

        x_landing, t_flight = ProjectilePhysics.compute_landing(params)
        max_height = ProjectilePhysics.compute_max_height(params)

        if input_data.landing_point and input_data.landing_point.value is not None:
            measured_landing = input_data.landing_point.value
            diff = abs(x_landing - measured_landing)
            if diff / measured_landing > 0.1:
                anomalies.append(Anomaly(
                    severity=AnomalySeverity.WARNING,
                    category="validation",
                    message=f"拟合落点与实测落点差异较大: 拟合{x_landing:.2f}m vs 实测{measured_landing:.2f}m",
                    details={
                        "predicted": x_landing,
                        "measured": measured_landing,
                        "diff_meters": diff,
                        "diff_percent": diff / measured_landing * 100
                    },
                    affected_fields=["landing_position"],
                    suggestion="建议检查轨迹标记或考虑空气阻力"
                ))

        result = AnalysisResult(
            params=params,
            params_confidence=confidence,
            predicted_trajectory=predicted_traj,
            landing_position=x_landing,
            flight_time=t_flight,
            max_height=max_height,
            anomalies=anomalies,
            input_data=input_data,
            processing_steps=processing_steps
        )

        return result

    @staticmethod
    def analyze_with_air_resistance_comparison(input_data: InputData,
                                                **kwargs) -> Dict[str, AnalysisResult]:
        results = {}
        results["ideal"] = ProjectileAnalyzer.analyze(
            input_data, air_resistance_enabled=False, **kwargs)

        try:
            results["with_air_resistance"] = ProjectileAnalyzer.analyze(
                input_data, air_resistance_enabled=True, **kwargs)
        except Exception as e:
            results["with_air_resistance"] = None
            results["ideal"].anomalies.append(Anomaly(
                severity=AnomalySeverity.INFO,
                category="air_resistance",
                message=f"带空气阻力的拟合失败: {str(e)}",
                affected_fields=["params"]
            ))

        return results
