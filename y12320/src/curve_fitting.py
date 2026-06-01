import pandas as pd
import numpy as np
from scipy.optimize import curve_fit
from scipy.stats import norm
from dataclasses import dataclass, field
from typing import Dict, List, Callable, Tuple, Optional
from enum import Enum


class CurveType(Enum):
    LOGISTIC = "logistic"
    EXPONENTIAL = "exponential"
    POWER = "power"
    POLYNOMIAL = "polynomial"
    SIGMOID = "sigmoid"


@dataclass
class FitResult:
    curve_type: CurveType
    parameters: Dict[str, float]
    fitted_values: np.ndarray
    residuals: np.ndarray
    r_squared: float
    rmse: float
    aic: float
    price_range: Tuple[float, float]


@dataclass
class PricePointData:
    price: float
    conversion_rate: float
    sample_size: int
    std_error: float
    ci_lower: float
    ci_upper: float


class NonlinearPricingFitter:
    def __init__(self):
        self.price_points: Optional[List[PricePointData]] = None
        self.fit_results: Dict[CurveType, FitResult] = {}
        self.best_fit: Optional[CurveType] = None

    @staticmethod
    def logistic_curve(x: np.ndarray, L: float, k: float, x0: float) -> np.ndarray:
        return L / (1 + np.exp(-k * (x - x0)))

    @staticmethod
    def exponential_curve(x: np.ndarray, a: float, b: float, c: float) -> np.ndarray:
        return a * np.exp(-b * x) + c

    @staticmethod
    def power_curve(x: np.ndarray, a: float, b: float, c: float) -> np.ndarray:
        return a * np.power(x, -b) + c

    @staticmethod
    def polynomial_curve(x: np.ndarray, a: float, b: float, c: float, d: float) -> np.ndarray:
        return a * x**3 + b * x**2 + c * x + d

    @staticmethod
    def sigmoid_curve(x: np.ndarray, L: float, k: float, x0: float, b: float) -> np.ndarray:
        return L / (1 + np.exp(-k * (x - x0))) + b

    def _get_curve_function(self, curve_type: CurveType) -> Callable:
        curve_functions = {
            CurveType.LOGISTIC: self.logistic_curve,
            CurveType.EXPONENTIAL: self.exponential_curve,
            CurveType.POWER: self.power_curve,
            CurveType.POLYNOMIAL: self.polynomial_curve,
            CurveType.SIGMOID: self.sigmoid_curve,
        }
        return curve_functions[curve_type]

    def _get_initial_guess(self, curve_type: CurveType, x: np.ndarray, y: np.ndarray) -> List[float]:
        y_max, y_min = y.max(), y.min()
        x_mid = (x.max() + x.min()) / 2
        
        initial_guesses = {
            CurveType.LOGISTIC: [y_max, 0.01, x_mid],
            CurveType.EXPONENTIAL: [y_max - y_min, 0.01, y_min],
            CurveType.POWER: [y_max, 0.5, y_min],
            CurveType.POLYNOMIAL: [0, 0, -0.01, y_max],
            CurveType.SIGMOID: [y_max - y_min, 0.01, x_mid, y_min],
        }
        return initial_guesses[curve_type]

    def _get_parameter_names(self, curve_type: CurveType) -> List[str]:
        param_names = {
            CurveType.LOGISTIC: ['L', 'k', 'x0'],
            CurveType.EXPONENTIAL: ['a', 'b', 'c'],
            CurveType.POWER: ['a', 'b', 'c'],
            CurveType.POLYNOMIAL: ['a', 'b', 'c', 'd'],
            CurveType.SIGMOID: ['L', 'k', 'x0', 'b'],
        }
        return param_names[curve_type]

    def aggregate_price_points(self, df: pd.DataFrame, confidence_level: float = 0.95) -> List[PricePointData]:
        z_score = norm.ppf((1 + confidence_level) / 2)
        
        grouped = df.groupby('price').agg(
            conversion_rate=('converted', 'mean'),
            sample_size=('converted', 'count'),
            std_dev=('converted', 'std')
        ).reset_index()
        
        grouped['std_error'] = grouped['std_dev'] / np.sqrt(grouped['sample_size'])
        grouped['ci_lower'] = grouped['conversion_rate'] - z_score * grouped['std_error']
        grouped['ci_upper'] = grouped['conversion_rate'] + z_score * grouped['std_error']
        
        grouped['ci_lower'] = grouped['ci_lower'].clip(0, 1)
        grouped['ci_upper'] = grouped['ci_upper'].clip(0, 1)
        
        price_points = []
        for _, row in grouped.iterrows():
            price_points.append(PricePointData(
                price=row['price'],
                conversion_rate=row['conversion_rate'],
                sample_size=row['sample_size'],
                std_error=row['std_error'] if pd.notna(row['std_error']) else 0,
                ci_lower=row['ci_lower'],
                ci_upper=row['ci_upper']
            ))
        
        self.price_points = sorted(price_points, key=lambda p: p.price)
        return self.price_points

    def fit_curve(self, curve_type: CurveType, price_points: Optional[List[PricePointData]] = None) -> FitResult:
        pp = price_points if price_points is not None else self.price_points
        if pp is None:
            raise ValueError("需要先调用 aggregate_price_points 或提供 price_points")
        
        x = np.array([p.price for p in pp])
        y = np.array([p.conversion_rate for p in pp])
        weights = np.array([np.sqrt(p.sample_size) for p in pp])
        
        curve_func = self._get_curve_function(curve_type)
        initial_guess = self._get_initial_guess(curve_type, x, y)
        param_names = self._get_parameter_names(curve_type)
        
        try:
            popt, pcov = curve_fit(
                curve_func, x, y, p0=initial_guess, sigma=1/weights,
                absolute_sigma=True, maxfev=10000
            )
        except RuntimeError:
            popt, pcov = curve_fit(
                curve_func, x, y, p0=initial_guess, maxfev=10000
            )
        
        fitted_values = curve_func(x, *popt)
        residuals = y - fitted_values
        
        ss_res = np.sum(residuals**2)
        ss_tot = np.sum((y - np.mean(y))**2)
        r_squared = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0
        
        rmse = np.sqrt(np.mean(residuals**2))
        
        n = len(y)
        k = len(popt)
        aic = 2 * k + n * np.log(ss_res / n) if ss_res > 0 else np.inf
        
        parameters = dict(zip(param_names, popt))
        
        fit_result = FitResult(
            curve_type=curve_type,
            parameters=parameters,
            fitted_values=fitted_values,
            residuals=residuals,
            r_squared=r_squared,
            rmse=rmse,
            aic=aic,
            price_range=(x.min(), x.max())
        )
        
        self.fit_results[curve_type] = fit_result
        return fit_result

    def fit_all_curves(self, price_points: Optional[List[PricePointData]] = None) -> Dict[CurveType, FitResult]:
        for curve_type in CurveType:
            try:
                self.fit_curve(curve_type, price_points)
            except Exception:
                continue
        
        valid_results = {k: v for k, v in self.fit_results.items() if not np.isnan(v.r_squared)}
        if valid_results:
            self.best_fit = min(valid_results.keys(), key=lambda k: valid_results[k].aic)
        
        return self.fit_results

    def predict(self, prices: np.ndarray, curve_type: Optional[CurveType] = None) -> np.ndarray:
        ct = curve_type if curve_type is not None else self.best_fit
        if ct is None or ct not in self.fit_results:
            raise ValueError("需要先拟合曲线或指定有效的曲线类型")
        
        curve_func = self._get_curve_function(ct)
        params = list(self.fit_results[ct].parameters.values())
        return curve_func(prices, *params)

    def get_fit_summary(self) -> pd.DataFrame:
        summary = []
        for curve_type, result in self.fit_results.items():
            summary.append({
                '曲线类型': curve_type.value,
                'R²': f"{result.r_squared:.4f}",
                'RMSE': f"{result.rmse:.4f}",
                'AIC': f"{result.aic:.2f}",
                '最优': '✓' if curve_type == self.best_fit else ''
            })
        return pd.DataFrame(summary)

    def get_optimal_price_range(self, target_conversion: Optional[float] = None,
                                curve_type: Optional[CurveType] = None) -> Dict:
        ct = curve_type if curve_type is not None else self.best_fit
        if ct is None or ct not in self.fit_results:
            raise ValueError("需要先拟合曲线")
        
        result = self.fit_results[ct]
        price_min, price_max = result.price_range
        
        test_prices = np.linspace(price_min, price_max, 1000)
        predicted_conv = self.predict(test_prices, ct)
        
        if target_conversion is not None:
            idx = np.argmin(np.abs(predicted_conv - target_conversion))
            target_price = test_prices[idx]
        else:
            target_conversion = predicted_conv.max()
            target_price = test_prices[np.argmax(predicted_conv)]
        
        return {
            'target_conversion_rate': target_conversion,
            'corresponding_price': target_price,
            'price_range': (price_min, price_max),
            'max_conversion': predicted_conv.max(),
            'min_conversion': predicted_conv.min()
        }
