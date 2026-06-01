"""数据加载模块：CSV导入、数据清洗、事件关联"""

import pandas as pd
import numpy as np
from typing import List, Tuple, Optional, Dict, Any
import os
from pathlib import Path

from .models import (
    SourceInfo,
    TrajectoryPoint,
    AngleRecord,
    WindRecord,
    Event,
    BoundsConfig,
    ProjectileParams,
    FittingResult,
    AnalysisReport,
)
from .physics import (
    compute_trajectory_angles,
    fit_trajectory_polynomial,
    estimate_drag_coefficient,
    simulate_projectile,
    FORMULAS,
)
from .anomaly_detector import AnomalyDetector
from datetime import datetime


class DataLoader:
    """数据加载器"""

    def __init__(self, bounds: Optional[BoundsConfig] = None):
        self.bounds = bounds or BoundsConfig()
        self._point_counter = 0
        self._event_counter = 0

    def _next_point_id(self) -> str:
        self._point_counter += 1
        return f"pt_{self._point_counter:04d}"

    def _next_event_id(self) -> str:
        self._event_counter += 1
        return f"evt_{self._event_counter:04d}"

    def load_trajectory_csv(
        self,
        file_path: str,
        material_id: Optional[str] = None,
        material_name: Optional[str] = None,
    ) -> List[TrajectoryPoint]:
        """
        加载轨迹点CSV文件

        CSV格式要求:
            必须包含列: t, x, y
            可选列: vx, vy
            单位: t(s), x(m), y(m), vx(m/s), vy(m/s)
        """
        df = pd.read_csv(file_path)
        required_cols = ["t", "x", "y"]
        for col in required_cols:
            if col not in df.columns:
                raise ValueError(f"轨迹CSV缺少必要列: {col} (需要: t, x, y)")

        source = SourceInfo(
            material_id=material_id or f"traj_{os.path.basename(file_path)}",
            material_name=material_name or f"轨迹文件: {os.path.basename(file_path)}",
            source_type="trajectory",
            file_path=os.path.abspath(file_path),
        )

        points: List[TrajectoryPoint] = []
        for _, row in df.iterrows():
            point = TrajectoryPoint(
                t=float(row["t"]),
                x=float(row["x"]),
                y=float(row["y"]),
                source=source,
                point_id=self._next_point_id(),
                vx=float(row["vx"]) if "vx" in df.columns and pd.notna(row["vx"]) else None,
                vy=float(row["vy"]) if "vy" in df.columns and pd.notna(row["vy"]) else None,
            )
            points.append(point)

        return points

    def load_angle_csv(
        self,
        file_path: str,
        material_id: Optional[str] = None,
        material_name: Optional[str] = None,
    ) -> List[AngleRecord]:
        """
        加载角度记录CSV文件

        CSV格式要求:
            必须包含列: t, angle_deg
            单位: t(s), angle_deg(度)
        """
        df = pd.read_csv(file_path)
        required_cols = ["t", "angle_deg"]
        for col in required_cols:
            if col not in df.columns:
                raise ValueError(f"角度CSV缺少必要列: {col} (需要: t, angle_deg)")

        source = SourceInfo(
            material_id=material_id or f"angle_{os.path.basename(file_path)}",
            material_name=material_name or f"角度文件: {os.path.basename(file_path)}",
            source_type="angle",
            file_path=os.path.abspath(file_path),
        )

        records: List[AngleRecord] = []
        for _, row in df.iterrows():
            record = AngleRecord(
                t=float(row["t"]),
                angle_deg=float(row["angle_deg"]),
                source=source,
                record_id=self._next_point_id(),
            )
            records.append(record)

        return records

    def load_wind_csv(
        self,
        file_path: str,
        material_id: Optional[str] = None,
        material_name: Optional[str] = None,
    ) -> List[WindRecord]:
        """
        加载风速记录CSV文件

        CSV格式要求:
            必须包含列: t, wind_speed, wind_direction_deg
            单位: t(s), wind_speed(m/s), wind_direction_deg(度)
        """
        df = pd.read_csv(file_path)
        required_cols = ["t", "wind_speed", "wind_direction_deg"]
        for col in required_cols:
            if col not in df.columns:
                raise ValueError(f"风速CSV缺少必要列: {col} (需要: t, wind_speed, wind_direction_deg)")

        source = SourceInfo(
            material_id=material_id or f"wind_{os.path.basename(file_path)}",
            material_name=material_name or f"风速文件: {os.path.basename(file_path)}",
            source_type="wind",
            file_path=os.path.abspath(file_path),
        )

        records: List[WindRecord] = []
        for _, row in df.iterrows():
            wind_speed = row["wind_speed"]
            wind_direction = row["wind_direction_deg"]
            record = WindRecord(
                t=float(row["t"]),
                wind_speed=float(wind_speed) if pd.notna(wind_speed) else np.nan,
                wind_direction_deg=float(wind_direction) if pd.notna(wind_direction) else np.nan,
                source=source,
                record_id=self._next_point_id(),
            )
            records.append(record)

        return records

    def load_config_json(self, file_path: str) -> Tuple[BoundsConfig, ProjectileParams]:
        """加载配置JSON文件"""
        import json
        with open(file_path, 'r') as f:
            config = json.load(f)

        bounds_config = BoundsConfig(
            angle_min_deg=config.get("bounds", {}).get("angle_min_deg", -10.0),
            angle_max_deg=config.get("bounds", {}).get("angle_max_deg", 90.0),
            wind_speed_min=config.get("bounds", {}).get("wind_speed_min", 0.0),
            wind_speed_max=config.get("bounds", {}).get("wind_speed_max", 30.0),
            coordinate_x_min=config.get("bounds", {}).get("coordinate_x_min", 0.0),
            coordinate_x_max=config.get("bounds", {}).get("coordinate_x_max", 1000.0),
            coordinate_y_min=config.get("bounds", {}).get("coordinate_y_min", -50.0),
            coordinate_y_max=config.get("bounds", {}).get("coordinate_y_max", 500.0),
            time_min=config.get("bounds", {}).get("time_min", 0.0),
            time_max=config.get("bounds", {}).get("time_max", 60.0),
        )

        params = ProjectileParams(
            mass=config.get("projectile", {}).get("mass", 0.1),
            cross_section_area=config.get("projectile", {}).get("cross_section_area", 0.001),
            drag_coeff=config.get("projectile", {}).get("drag_coeff", 0.47),
        )

        self.bounds = bounds_config
        return bounds_config, params


class EventAssociator:
    """事件关联器：将同一时刻的轨迹点、角度记录、风速记录关联到同一事件"""

    def __init__(self, time_tolerance: float = 0.05):
        self.time_tolerance = time_tolerance
        self._event_counter = 0

    def _next_event_id(self) -> str:
        self._event_counter += 1
        return f"evt_{self._event_counter:04d}"

    def associate(
        self,
        trajectory_points: List[TrajectoryPoint],
        angle_records: List[AngleRecord],
        wind_records: List[WindRecord],
    ) -> List[Event]:
        """
        按时间关联数据到事件

        算法:
        1. 收集所有时间点
        2. 对每个时间点，寻找容差范围内的所有记录
        3. 创建事件，关联所有匹配的记录
        """
        all_times = set()
        for p in trajectory_points:
            all_times.add(p.t)
        for r in angle_records:
            all_times.add(r.t)
        for r in wind_records:
            all_times.add(r.t)

        sorted_times = sorted(all_times)

        events: List[Event] = []
        used_traj = set()
        used_angle = set()
        used_wind = set()

        for t in sorted_times:
            event = Event(event_id=self._next_event_id(), t=t)

            for i, p in enumerate(trajectory_points):
                if i in used_traj:
                    continue
                if abs(p.t - t) <= self.time_tolerance:
                    event.trajectory_point = p
                    used_traj.add(i)
                    break

            for i, r in enumerate(angle_records):
                if i in used_angle:
                    continue
                if abs(r.t - t) <= self.time_tolerance:
                    event.angle_record = r
                    used_angle.add(i)
                    break

            for i, r in enumerate(wind_records):
                if i in used_wind:
                    continue
                if abs(r.t - t) <= self.time_tolerance:
                    event.wind_record = r
                    used_wind.add(i)
                    break

            events.append(event)

        return events


class AnalysisWorkflow:
    """完整分析工作流"""

    def __init__(
        self,
        bounds: Optional[BoundsConfig] = None,
        projectile_params: Optional[ProjectileParams] = None,
    ):
        self.bounds = bounds or BoundsConfig()
        self.projectile_params = projectile_params or ProjectileParams(mass=0.1, cross_section_area=0.001)
        self.data_loader = DataLoader(self.bounds)
        self.associator = EventAssociator()
        self.detector = AnomalyDetector(self.bounds)

    def run_full_analysis(
        self,
        trajectory_file: Optional[str] = None,
        angle_file: Optional[str] = None,
        wind_file: Optional[str] = None,
        config_file: Optional[str] = None,
        trajectory_points: Optional[List[TrajectoryPoint]] = None,
        angle_records: Optional[List[AngleRecord]] = None,
        wind_records: Optional[List[WindRecord]] = None,
        v0: Optional[float] = None,
        theta0_deg: Optional[float] = None,
        fit_method: str = "physics",  # physics 或 polynomial
        poly_degree: int = 2,
    ) -> AnalysisReport:
        """
        执行完整分析流程

        步骤:
        1. 加载数据 (从文件或直接传入)
        2. 关联事件
        3. 异常检测
        4. 轨迹拟合
        5. 风阻估计
        6. 误差分析
        7. 生成报告
        """
        if config_file:
            self.bounds, self.projectile_params = self.data_loader.load_config_json(config_file)
            self.detector = AnomalyDetector(self.bounds)

        if trajectory_file and trajectory_points is None:
            trajectory_points = self.data_loader.load_trajectory_csv(trajectory_file)
        if angle_file and angle_records is None:
            angle_records = self.data_loader.load_angle_csv(angle_file)
        if wind_file and wind_records is None:
            wind_records = self.data_loader.load_wind_csv(wind_file)

        trajectory_points = trajectory_points or []
        angle_records = angle_records or []
        wind_records = wind_records or []

        events = self.associator.associate(trajectory_points, angle_records, wind_records)

        anomalies = self.detector.detect_all(
            events, trajectory_points, angle_records, wind_records
        )

        fitting_result = None
        drag_estimation = None
        error_analysis = None

        if len(trajectory_points) >= 3:
            t_obs = np.array([p.t for p in trajectory_points])
            x_obs = np.array([p.x for p in trajectory_points])
            y_obs = np.array([p.y for p in trajectory_points])

            vx_obs = np.array([p.vx for p in trajectory_points if p.vx is not None])
            vy_obs = np.array([p.vy for p in trajectory_points if p.vy is not None])

            if len(vx_obs) == 0:
                vx_obs = np.gradient(x_obs, t_obs)
                vy_obs = np.gradient(y_obs, t_obs)
                for i, p in enumerate(trajectory_points):
                    p.vx = float(vx_obs[i])
                    p.vy = float(vy_obs[i])

            if v0 is None and len(trajectory_points) > 0:
                v0 = float(np.sqrt(vx_obs[0]**2 + vy_obs[0]**2))
            if theta0_deg is None and len(trajectory_points) > 0:
                theta0_deg = float(np.rad2deg(np.arctan2(vy_obs[0], vx_obs[0])))

            if fit_method == "polynomial":
                polys, r_squared, rmse, fit_intermediate = fit_trajectory_polynomial(
                    t_obs, x_obs, y_obs, poly_degree
                )
                params = {
                    "x_coeffs": fit_intermediate["coeffs_x"],
                    "y_coeffs": fit_intermediate["coeffs_y"],
                }
                params_units = {
                    "x_coeffs": f"m/s^{poly_degree}, m/s^{poly_degree-1}, ..., m",
                    "y_coeffs": f"m/s^{poly_degree}, m/s^{poly_degree-1}, ..., m",
                }
                formula = (
                    f"x(t) = a{poly_degree}·t^{poly_degree} + ... + a1·t + a0\n"
                    f"y(t) = b{poly_degree}·t^{poly_degree} + ... + b1·t + b0"
                )
                fitting_result = FittingResult(
                    method=f"polynomial_degree_{poly_degree}",
                    params=params,
                    params_units=params_units,
                    r_squared=r_squared,
                    rmse=rmse,
                    intermediate_values=fit_intermediate,
                    formula=formula,
                )
            else:
                avg_wind_speed = 0.0
                avg_wind_direction = 0.0
                if len(wind_records) > 0:
                    valid_wind = [w for w in wind_records if not np.isnan(w.wind_speed)]
                    if valid_wind:
                        avg_wind_speed = float(np.mean([w.wind_speed for w in valid_wind]))
                        avg_wind_direction = float(np.mean([w.wind_direction_deg for w in valid_wind]))

                best_cd, r_squared, rmse, drag_intermediate = estimate_drag_coefficient(
                    t_obs, x_obs, y_obs,
                    v0=v0,
                    theta0_deg=theta0_deg,
                    mass=self.projectile_params.mass,
                    cross_section_area=self.projectile_params.cross_section_area,
                    wind_speed=avg_wind_speed,
                    wind_direction_deg=avg_wind_direction,
                )

                x_sim, y_sim, vx_sim, vy_sim, step_infos = simulate_projectile(
                    t_obs, v0, theta0_deg,
                    mass=self.projectile_params.mass,
                    drag_coeff=best_cd,
                    cross_section_area=self.projectile_params.cross_section_area,
                    wind_speed=avg_wind_speed,
                    wind_direction_deg=avg_wind_direction,
                )

                theta_deg_sim, theta_rad_sim = compute_trajectory_angles(vx_sim, vy_sim)

                params = {
                    "v0": v0,
                    "theta0_deg": theta0_deg,
                    "mass": self.projectile_params.mass,
                    "cross_section_area": self.projectile_params.cross_section_area,
                    "drag_coeff": best_cd,
                    "wind_speed": avg_wind_speed,
                    "wind_direction_deg": avg_wind_direction,
                }
                params_units = {
                    "v0": "m/s",
                    "theta0_deg": "deg",
                    "mass": "kg",
                    "cross_section_area": "m^2",
                    "drag_coeff": "dimensionless",
                    "wind_speed": "m/s",
                    "wind_direction_deg": "deg",
                }

                fitting_result = FittingResult(
                    method="physics_based",
                    params=params,
                    params_units=params_units,
                    r_squared=r_squared,
                    rmse=rmse,
                    estimated_drag_coeff=best_cd,
                    intermediate_values={
                        **drag_intermediate,
                        "simulated_x": x_sim.tolist(),
                        "simulated_y": y_sim.tolist(),
                        "simulated_vx": vx_sim.tolist(),
                        "simulated_vy": vy_sim.tolist(),
                        "simulated_theta_deg": theta_deg_sim.tolist(),
                        "step_infos": step_infos,
                    },
                    formula="\n".join([
                        "物理模型拟合 (有风阻):",
                        FORMULAS["projectile_no_drag"]["equations"][0],
                        FORMULAS["projectile_no_drag"]["equations"][1],
                        FORMULAS["drag_force"]["equations"][0],
                        FORMULAS["drag_acceleration"]["equations"][0],
                    ]),
                )

                drag_estimation = {
                    "estimated_cd": best_cd,
                    "r_squared": r_squared,
                    "rmse": rmse,
                    "v0": v0,
                    "theta0_deg": theta0_deg,
                    "avg_wind_speed": avg_wind_speed,
                    "avg_wind_direction_deg": avg_wind_direction,
                    "intermediate": drag_intermediate,
                    "formulas": [
                        FORMULAS["drag_force"],
                        FORMULAS["drag_acceleration"],
                    ],
                }

                error_analysis = self._compute_error_analysis(
                    t_obs, x_obs, y_obs, x_sim, y_sim,
                    vx_obs, vy_obs, vx_sim, vy_sim,
                    trajectory_points, angle_records,
                )

        report = AnalysisReport(
            report_id=f"report_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            created_at=datetime.now(),
            bounds_config=self.bounds,
            events=events,
            anomalies=anomalies,
            fitting_result=fitting_result,
            drag_estimation=drag_estimation,
            error_analysis=error_analysis,
        )

        return report

    def _compute_error_analysis(
        self,
        t_obs: np.ndarray,
        x_obs: np.ndarray,
        y_obs: np.ndarray,
        x_sim: np.ndarray,
        y_sim: np.ndarray,
        vx_obs: np.ndarray,
        vy_obs: np.ndarray,
        vx_sim: np.ndarray,
        vy_sim: np.ndarray,
        trajectory_points: List[TrajectoryPoint],
        angle_records: List[AngleRecord],
    ) -> Dict[str, Any]:
        """计算误差分析"""
        x_error = x_obs - x_sim
        y_error = y_obs - y_sim
        pos_error = np.sqrt(x_error**2 + y_error**2)

        vx_error = vx_obs - vx_sim
        vy_error = vy_obs - vy_sim
        vel_error = np.sqrt(vx_error**2 + vy_error**2)

        theta_obs_deg, _ = compute_trajectory_angles(vx_obs, vy_obs)
        theta_sim_deg, _ = compute_trajectory_angles(vx_sim, vy_sim)
        theta_error_deg = theta_obs_deg - theta_sim_deg

        measured_theta_errors = []
        if angle_records:
            angle_dict = {r.t: r.angle_deg for r in angle_records}
            for i, t in enumerate(t_obs):
                if t in angle_dict:
                    measured_theta_errors.append({
                        "t": t,
                        "measured_angle_deg": angle_dict[t],
                        "simulated_angle_deg": theta_sim_deg[i],
                        "error_deg": angle_dict[t] - theta_sim_deg[i],
                    })

        error_stats = {
            "position": {
                "mae": float(np.mean(pos_error)),
                "rmse": float(np.sqrt(np.mean(pos_error**2))),
                "max": float(np.max(pos_error)),
                "mean_x_error": float(np.mean(x_error)),
                "mean_y_error": float(np.mean(y_error)),
                "unit": "m",
            },
            "velocity": {
                "mae": float(np.mean(vel_error)),
                "rmse": float(np.sqrt(np.mean(vel_error**2))),
                "max": float(np.max(vel_error)),
                "unit": "m/s",
            },
            "trajectory_angle": {
                "mae_deg": float(np.mean(np.abs(theta_error_deg))),
                "rmse_deg": float(np.sqrt(np.mean(theta_error_deg**2))),
                "max_deg": float(np.max(np.abs(theta_error_deg))),
                "unit": "deg",
            },
            "per_point": [
                {
                    "t": float(t_obs[i]),
                    "x_obs": float(x_obs[i]),
                    "x_sim": float(x_sim[i]),
                    "x_error": float(x_error[i]),
                    "y_obs": float(y_obs[i]),
                    "y_sim": float(y_sim[i]),
                    "y_error": float(y_error[i]),
                    "pos_error": float(pos_error[i]),
                    "vx_obs": float(vx_obs[i]),
                    "vx_sim": float(vx_sim[i]),
                    "vy_obs": float(vy_obs[i]),
                    "vy_sim": float(vy_sim[i]),
                    "theta_obs_deg": float(theta_obs_deg[i]),
                    "theta_sim_deg": float(theta_sim_deg[i]),
                    "theta_error_deg": float(theta_error_deg[i]),
                    "source": trajectory_points[i].source.material_name,
                }
                for i in range(len(t_obs))
            ],
            "measured_angle_comparison": measured_theta_errors,
        }

        return error_stats
