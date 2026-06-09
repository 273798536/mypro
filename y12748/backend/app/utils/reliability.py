import numpy as np
from scipy import stats
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass


@dataclass
class WeibullParams:
    shape: float
    scale: float
    location: float = 0.0


@dataclass
class ReliabilityResult:
    weibull_shape: float
    weibull_scale: float
    mean_lifetime: float
    median_lifetime: float
    b10_lifetime: float
    curve_points: Dict[str, List[float]]
    r_squared: float


class ReliabilityCalculator:

    @staticmethod
    def weibull_cdf(x: np.ndarray, shape: float, scale: float, location: float = 0) -> np.ndarray:
        x_shifted = np.maximum(x - location, 0)
        return 1 - np.exp(-((x_shifted / scale) ** shape))

    @staticmethod
    def weibull_pdf(x: np.ndarray, shape: float, scale: float, location: float = 0) -> np.ndarray:
        x_shifted = np.maximum(x - location, 0)
        with np.errstate(divide='ignore', invalid='ignore'):
            result = np.where(
                x_shifted > 0,
                (shape / scale) * ((x_shifted / scale) ** (shape - 1)) * np.exp(-((x_shifted / scale) ** shape)),
                0
            )
        return result

    @staticmethod
    def weibull_survival(x: np.ndarray, shape: float, scale: float, location: float = 0) -> np.ndarray:
        return 1 - ReliabilityCalculator.weibull_cdf(x, shape, scale, location)

    @staticmethod
    def fit_weibull(lifetime_data: List[float]) -> Optional[WeibullParams]:
        if len(lifetime_data) < 2:
            return None

        data = np.array([x for x in lifetime_data if x is not None and x > 0])
        if len(data) < 2:
            return None

        try:
            sorted_data = np.sort(data)
            n = len(sorted_data)
            ranks = np.arange(1, n + 1)
            median_ranks = (ranks - 0.3) / (n + 0.4)
            y = np.log(-np.log(1 - median_ranks))
            x = np.log(sorted_data)

            slope, intercept, r_value, _, _ = stats.linregress(x, y)
            shape = slope
            scale = np.exp(-intercept / slope)

            return WeibullParams(shape=float(shape), scale=float(scale))
        except Exception:
            try:
                shape, loc, scale = stats.weibull_min.fit(data, floc=0)
                return WeibullParams(shape=float(shape), scale=float(scale), location=float(loc))
            except Exception:
                mean_val = float(np.mean(data))
                return WeibullParams(shape=1.0, scale=mean_val)

    @staticmethod
    def calculate_reliability(lifetime_data: List[float], num_points: int = 100) -> Optional[ReliabilityResult]:
        if len(lifetime_data) < 2:
            return None

        data = np.array([x for x in lifetime_data if x is not None and x > 0])
        if len(data) < 2:
            return None

        params = ReliabilityCalculator.fit_weibull(lifetime_data)
        if params is None:
            return None

        max_time = float(np.max(data)) * 1.5
        time_points = np.linspace(0, max_time, num_points)

        survival = ReliabilityCalculator.weibull_survival(time_points, params.shape, params.scale)
        cdf = ReliabilityCalculator.weibull_cdf(time_points, params.shape, params.scale)
        pdf = ReliabilityCalculator.weibull_pdf(time_points, params.shape, params.scale)

        mean_lifetime = params.scale * np.exp(np.log(1) / params.shape) * np.exp(
            0.5772 / params.shape
        ) if params.shape > 0 else float(np.mean(data))

        from scipy.special import gamma
        mean_lifetime = params.scale * gamma(1 + 1 / params.shape)

        median_lifetime = params.scale * (np.log(2)) ** (1 / params.shape)
        b10_lifetime = params.scale * (np.log(1 / 0.9)) ** (1 / params.shape)

        sorted_data = np.sort(data)
        n = len(sorted_data)
        ranks = np.arange(1, n + 1)
        median_ranks = (ranks - 0.3) / (n + 0.4)
        predicted = 1 - np.exp(-((sorted_data / params.scale) ** params.shape))
        ss_res = np.sum((median_ranks - predicted) ** 2)
        ss_tot = np.sum((median_ranks - np.mean(median_ranks)) ** 2)
        r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0.0

        curve_points = {
            "time": time_points.tolist(),
            "reliability": survival.tolist(),
            "cdf": cdf.tolist(),
            "pdf": pdf.tolist(),
            "data_points": sorted_data.tolist(),
            "data_ranks": median_ranks.tolist()
        }

        return ReliabilityResult(
            weibull_shape=float(params.shape),
            weibull_scale=float(params.scale),
            mean_lifetime=float(mean_lifetime),
            median_lifetime=float(median_lifetime),
            b10_lifetime=float(b10_lifetime),
            curve_points=curve_points,
            r_squared=float(r_squared)
        )


class FormulaCalculator:

    @staticmethod
    def arrhenius_lifetime(lifetime_ref: float, activation_energy: float,
                           temp_ref: float, temp_actual: float, boltzmann: float = 8.617e-5) -> float:
        temp_ref_k = temp_ref + 273.15
        temp_actual_k = temp_actual + 273.15
        return lifetime_ref * np.exp(
            (activation_energy / boltzmann) * (1 / temp_actual_k - 1 / temp_ref_k)
        )

    @staticmethod
    def inverse_power_law(lifetime_ref: float, stress_ref: float,
                          stress_actual: float, exponent: float) -> float:
        if stress_ref == 0:
            return lifetime_ref
        return lifetime_ref * (stress_ref / stress_actual) ** exponent

    @staticmethod
    def eyring_model(lifetime_ref: float, temp_ref: float, temp_actual: float,
                     stress_ref: float, stress_actual: float,
                     activation_energy: float, exponent: float) -> float:
        temp_ref_k = temp_ref + 273.15
        temp_actual_k = temp_actual + 273.15
        boltzmann = 8.617e-5
        return lifetime_ref * (temp_ref_k / temp_actual_k) * np.exp(
            (activation_energy / boltzmann) * (1 / temp_actual_k - 1 / temp_ref_k)
        ) * (stress_ref / stress_actual) ** exponent if stress_actual != 0 else lifetime_ref
