import numpy as np
from scipy.optimize import minimize, curve_fit
from dataclasses import dataclass, field
from typing import Optional, Tuple, List, Dict
import math
from .physics_model import PhysicsModel, PhysicsParameters, TrajectoryResult
from .data_loader import FlightData


@dataclass
class FitResult:
    initial_velocity: float
    drag_coefficient: float
    launch_angle: float
    rmse: float
    r_squared: float
    max_height_error: float
    landing_time_error: float
    fitted_trajectory: Optional[TrajectoryResult] = None
    params: Dict = field(default_factory=dict)
    confidence_interval: Dict = field(default_factory=dict)


@dataclass
class FitConfig:
    fit_initial_velocity: bool = True
    fit_drag_coefficient: bool = True
    fit_launch_angle: bool = False
    fixed_initial_velocity: Optional[float] = None
    fixed_drag_coefficient: float = 0.4
    fixed_launch_angle: float = 90.0
    bounds_velocity: Tuple[float, float] = (1.0, 100.0)
    bounds_drag: Tuple[float, float] = (0.05, 1.0)
    bounds_angle: Tuple[float, float] = (45.0, 90.0)
    method: str = "least_squares"
    max_iterations: int = 1000


class TrajectoryFitter:
    def __init__(self, physics_model: Optional[PhysicsModel] = None):
        self.physics_model = physics_model or PhysicsModel()

    def fit(
        self,
        flight_data: FlightData,
        config: Optional[FitConfig] = None
    ) -> FitResult:
        config = config or FitConfig()

        times, altitudes = flight_data.get_valid_data()

        if len(times) < 5:
            raise ValueError("Insufficient valid data points for fitting")

        initial_guess = self._get_initial_guess(times, altitudes, config)
        bounds = self._get_bounds(config)

        def objective(params):
            v0, Cd, angle = self._unpack_params(params, config)
            self.physics_model.params.Cd = Cd
            trajectory = self.physics_model.simulate_trajectory(v0, angle)
            fitted_heights = self.physics_model.get_altitude_at_times(trajectory, times)
            residuals = altitudes - fitted_heights
            return np.sum(residuals ** 2)

        result = minimize(
            objective,
            initial_guess,
            bounds=bounds,
            method='L-BFGS-B',
            options={'maxiter': config.max_iterations}
        )

        v0_opt, Cd_opt, angle_opt = self._unpack_params(result.x, config)

        self.physics_model.params.Cd = Cd_opt
        fitted_trajectory = self.physics_model.simulate_trajectory(v0_opt, angle_opt)
        fitted_heights = self.physics_model.get_altitude_at_times(fitted_trajectory, times)

        rmse = np.sqrt(np.mean((altitudes - fitted_heights) ** 2))
        ss_res = np.sum((altitudes - fitted_heights) ** 2)
        ss_tot = np.sum((altitudes - np.mean(altitudes)) ** 2)
        r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0

        actual_max_height = np.max(altitudes)
        max_height_error = abs(fitted_trajectory.max_height - actual_max_height)

        actual_landing_time = self._estimate_landing_time(times, altitudes)
        landing_time_error = abs(fitted_trajectory.landing_time - actual_landing_time)

        ci = self._calculate_confidence_interval(
            times, altitudes, v0_opt, Cd_opt, angle_opt, config
        )

        return FitResult(
            initial_velocity=v0_opt,
            drag_coefficient=Cd_opt,
            launch_angle=angle_opt,
            rmse=rmse,
            r_squared=r_squared,
            max_height_error=max_height_error,
            landing_time_error=landing_time_error,
            fitted_trajectory=fitted_trajectory,
            params={
                'iterations': result.nit,
                'fun': result.fun,
                'success': result.success
            },
            confidence_interval=ci
        )

    def _get_initial_guess(
        self,
        times: np.ndarray,
        altitudes: np.ndarray,
        config: FitConfig
    ) -> List[float]:
        max_h = np.max(altitudes)
        g = self.physics_model.params.g

        guess = []

        if config.fit_initial_velocity:
            angle_rad = math.radians(config.fixed_launch_angle)
            v_guess = math.sqrt(2 * g * max_h) / math.sin(angle_rad)
            guess.append(v_guess * 1.1)
        else:
            guess.append(config.fixed_initial_velocity or 30.0)

        if config.fit_drag_coefficient:
            guess.append(config.fixed_drag_coefficient)
        else:
            guess.append(config.fixed_drag_coefficient)

        if config.fit_launch_angle:
            guess.append(config.fixed_launch_angle)
        else:
            guess.append(config.fixed_launch_angle)

        return guess

    def _get_bounds(self, config: FitConfig) -> List[Tuple[float, float]]:
        bounds = []

        if config.fit_initial_velocity:
            bounds.append(config.bounds_velocity)
        else:
            bounds.append((config.fixed_initial_velocity or 30, config.fixed_initial_velocity or 30))

        if config.fit_drag_coefficient:
            bounds.append(config.bounds_drag)
        else:
            bounds.append((config.fixed_drag_coefficient, config.fixed_drag_coefficient))

        if config.fit_launch_angle:
            bounds.append(config.bounds_angle)
        else:
            bounds.append((config.fixed_launch_angle, config.fixed_launch_angle))

        return bounds

    def _unpack_params(
        self,
        params: np.ndarray,
        config: FitConfig
    ) -> Tuple[float, float, float]:
        v0 = params[0] if config.fit_initial_velocity else (config.fixed_initial_velocity or 30.0)
        Cd = params[1] if config.fit_drag_coefficient else config.fixed_drag_coefficient
        angle = params[2] if config.fit_launch_angle else config.fixed_launch_angle
        return v0, Cd, angle

    def _estimate_landing_time(self, times: np.ndarray, altitudes: np.ndarray) -> float:
        below_threshold = altitudes < 0.5
        if np.any(below_threshold):
            first_below_idx = np.argmax(below_threshold)
            if first_below_idx > 0:
                return times[first_below_idx - 1]
        return times[-1]

    def _calculate_confidence_interval(
        self,
        times: np.ndarray,
        altitudes: np.ndarray,
        v0: float,
        Cd: float,
        angle: float,
        config: FitConfig,
        n_bootstraps: int = 20
    ) -> Dict:
        v0_values = []
        Cd_values = []
        angle_values = []

        rng = np.random.default_rng(42)

        n_points = len(times)
        if n_points < 10:
            n_bootstraps = 10

        for _ in range(n_bootstraps):
            indices = rng.choice(n_points, size=n_points, replace=True)
            t_sample = times[indices]
            h_sample = altitudes[indices]

            sort_idx = np.argsort(t_sample)
            t_sample = t_sample[sort_idx]
            h_sample = h_sample[sort_idx]

            def objective(params):
                v0_i, Cd_i, angle_i = self._unpack_params(params, config)
                self.physics_model.params.Cd = Cd_i
                traj = self.physics_model.simulate_trajectory(v0_i, angle_i)
                fitted = self.physics_model.get_altitude_at_times(traj, t_sample)
                return np.sum((h_sample - fitted) ** 2)

            initial_guess = [v0, Cd, angle]
            bounds = self._get_bounds(config)

            try:
                result = minimize(
                    objective,
                    initial_guess,
                    bounds=bounds,
                    method='L-BFGS-B',
                    options={'maxiter': 200}
                )
                if result.success:
                    v0_i, Cd_i, angle_i = self._unpack_params(result.x, config)
                    v0_values.append(v0_i)
                    Cd_values.append(Cd_i)
                    angle_values.append(angle_i)
            except Exception:
                continue

        if len(v0_values) < 5:
            return {
                'v0': (v0 * 0.9, v0 * 1.1),
                'Cd': (Cd * 0.8, Cd * 1.2),
                'angle': (angle - 5, angle + 5),
                'n_samples': len(v0_values)
            }

        return {
            'v0': (np.percentile(v0_values, 5), np.percentile(v0_values, 95)),
            'Cd': (np.percentile(Cd_values, 5), np.percentile(Cd_values, 95)),
            'angle': (np.percentile(angle_values, 5), np.percentile(angle_values, 95)),
            'n_samples': len(v0_values)
        }

    def multi_phase_fit(
        self,
        flight_data: FlightData,
        config: Optional[FitConfig] = None
    ) -> Dict[str, FitResult]:
        times, altitudes = flight_data.get_valid_data()

        max_h_idx = np.argmax(altitudes)
        ascent_times = times[:max_h_idx + 1]
        ascent_heights = altitudes[:max_h_idx + 1]
        descent_times = times[max_h_idx:]
        descent_heights = altitudes[max_h_idx:]

        ascent_flight_data = self._create_subset_flightdata(flight_data, ascent_times, ascent_heights)
        descent_flight_data = self._create_subset_flightdata(flight_data, descent_times, descent_heights)

        return {
            'full': self.fit(flight_data, config),
            'ascent': self.fit(ascent_flight_data, config),
            'descent': self.fit(descent_flight_data, config)
        }

    def _create_subset_flightdata(
        self,
        original: FlightData,
        times: np.ndarray,
        altitudes: np.ndarray
    ) -> FlightData:
        from .data_loader import DataPoint
        subset_points = [
            DataPoint(time=t, altitude=h, original_altitude=h)
            for t, h in zip(times, altitudes)
        ]
        return FlightData(
            metadata=original.metadata,
            data_points=subset_points
        )

    def sensitivity_analysis(
        self,
        flight_data: FlightData,
        config: Optional[FitConfig] = None,
        param_range: float = 0.2
    ) -> Dict:
        base_result = self.fit(flight_data, config)

        analysis = {
            'base_rmse': base_result.rmse,
            'velocity_sensitivity': [],
            'drag_sensitivity': [],
            'angle_sensitivity': []
        }

        v0_base = base_result.initial_velocity
        Cd_base = base_result.drag_coefficient
        angle_base = base_result.launch_angle

        for delta_pct in [-0.2, -0.1, -0.05, 0.05, 0.1, 0.2]:
            v0_test = v0_base * (1 + delta_pct)
            self.physics_model.params.Cd = Cd_base
            traj = self.physics_model.simulate_trajectory(v0_test, angle_base)
            times, altitudes = flight_data.get_valid_data()
            fitted = self.physics_model.get_altitude_at_times(traj, times)
            rmse = np.sqrt(np.mean((altitudes - fitted) ** 2))
            analysis['velocity_sensitivity'].append({
                'delta_pct': delta_pct,
                'value': v0_test,
                'rmse': rmse,
                'rmse_change': rmse - base_result.rmse
            })

        for delta_pct in [-0.2, -0.1, -0.05, 0.05, 0.1, 0.2]:
            Cd_test = Cd_base * (1 + delta_pct)
            self.physics_model.params.Cd = Cd_test
            traj = self.physics_model.simulate_trajectory(v0_base, angle_base)
            times, altitudes = flight_data.get_valid_data()
            fitted = self.physics_model.get_altitude_at_times(traj, times)
            rmse = np.sqrt(np.mean((altitudes - fitted) ** 2))
            analysis['drag_sensitivity'].append({
                'delta_pct': delta_pct,
                'value': Cd_test,
                'rmse': rmse,
                'rmse_change': rmse - base_result.rmse
            })

        self.physics_model.params.Cd = Cd_base

        return analysis
