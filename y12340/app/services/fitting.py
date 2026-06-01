import numpy as np
from scipy.optimize import curve_fit
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass


@dataclass
class FittingResult:
    spring_constant: float
    spring_constant_unit: str
    damping_coefficient: float
    damping_coefficient_unit: str
    natural_frequency: float
    damping_ratio: float
    r_squared: float
    fitted_equation: str
    initial_amplitude: float
    phase: float


class SpringDamperFitter:
    def __init__(self):
        pass

    def _damped_oscillation(self, t: np.ndarray, A: float, zeta: float, omega_n: float, phi: float) -> np.ndarray:
        omega_d = omega_n * np.sqrt(1 - zeta**2)
        return A * np.exp(-zeta * omega_n * t) * np.cos(omega_d * t + phi)

    def _convert_to_standard_units(self, data_points: List[Dict[str, Any]], mass: float, mass_unit: str) -> Tuple[np.ndarray, np.ndarray, float]:
        timestamps = []
        displacements = []

        for point in data_points:
            t = point["timestamp"]
            t_unit = point.get("timestamp_unit", "s").lower()
            if t_unit in ["ms", "millisecond"]:
                t = t / 1000.0

            d = point["displacement"]
            d_unit = point.get("displacement_unit", "m").lower()
            if d_unit in ["cm", "centimeter"]:
                d = d / 100.0
            elif d_unit in ["mm", "millimeter"]:
                d = d / 1000.0

            timestamps.append(t)
            displacements.append(d)

        m_unit = mass_unit.lower()
        if m_unit in ["g", "gram"]:
            mass = mass / 1000.0

        return np.array(timestamps), np.array(displacements), mass

    def _estimate_initial_params(self, t: np.ndarray, y: np.ndarray) -> List[float]:
        A0 = np.max(np.abs(y))

        peak_indices = []
        for i in range(1, len(y) - 1):
            if abs(y[i]) > abs(y[i-1]) and abs(y[i]) > abs(y[i+1]):
                peak_indices.append(i)

        if len(peak_indices) >= 2:
            peak_times = t[peak_indices]
            peak_amps = np.abs(y[peak_indices])

            T_est = np.mean(np.diff(peak_times))
            omega_n_est = 2 * np.pi / T_est if T_est > 0 else 1.0

            if len(peak_amps) >= 2:
                log_decay = np.log(peak_amps[0] / peak_amps[-1]) / (len(peak_amps) - 1)
                zeta_est = log_decay / np.sqrt((2 * np.pi)**2 + log_decay**2)
            else:
                zeta_est = 0.1
        else:
            omega_n_est = 2 * np.pi
            zeta_est = 0.1

        phi0 = 0.0
        if len(y) > 0:
            phi0 = np.arccos(np.clip(y[0] / A0 if A0 != 0 else 0, -1, 1))

        return [A0, zeta_est, omega_n_est, phi0]

    def fit(self, data_points: List[Dict[str, Any]], mass: float, mass_unit: str) -> Optional[FittingResult]:
        if len(data_points) < 5:
            return None

        t, y, mass_kg = self._convert_to_standard_units(data_points, mass, mass_unit)

        sorted_indices = np.argsort(t)
        t = t[sorted_indices]
        y = y[sorted_indices]

        initial_params = self._estimate_initial_params(t, y)

        try:
            params, covariance = curve_fit(
                self._damped_oscillation,
                t, y,
                p0=initial_params,
                maxfev=10000,
                bounds=([0, 0, 0, -np.pi], [np.inf, 1, np.inf, np.pi])
            )

            A, zeta, omega_n, phi = params

            k = omega_n**2 * mass_kg
            c = 2 * zeta * np.sqrt(mass_kg * k)

            y_pred = self._damped_oscillation(t, *params)
            ss_res = np.sum((y - y_pred)**2)
            ss_tot = np.sum((y - np.mean(y))**2)
            r_squared = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0

            equation = (f"x(t) = {A:.4f}·e^(-{zeta*omega_n:.4f}·t) · "
                       f"cos({omega_n*np.sqrt(1-zeta**2):.4f}·t + {phi:.4f})")

            return FittingResult(
                spring_constant=k,
                spring_constant_unit="N/m",
                damping_coefficient=c,
                damping_coefficient_unit="Ns/m",
                natural_frequency=omega_n / (2 * np.pi),
                damping_ratio=zeta,
                r_squared=r_squared,
                fitted_equation=equation,
                initial_amplitude=A,
                phase=phi
            )

        except Exception as e:
            print(f"拟合失败: {e}")
            return None

    def get_fitted_curve(self, fitting_result: FittingResult, t: np.ndarray) -> np.ndarray:
        omega_n = fitting_result.natural_frequency * 2 * np.pi
        return self._damped_oscillation(
            t,
            fitting_result.initial_amplitude,
            fitting_result.damping_ratio,
            omega_n,
            fitting_result.phase
        )
