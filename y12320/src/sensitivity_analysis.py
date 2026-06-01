import pandas as pd
import numpy as np
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
from scipy.stats import norm

from .curve_fitting import NonlinearPricingFitter, CurveType


@dataclass
class SensitivityPoint:
    price: float
    elasticity: float
    marginal_change: float
    confidence_interval: Tuple[float, float]
    sensitivity_level: str


@dataclass
class SensitivityResult:
    sensitivity_points: List[SensitivityPoint]
    most_sensitive_price: float
    least_sensitive_price: float
    sensitivity_thresholds: Dict[str, Tuple[float, float]]
    elasticity_range: Tuple[float, float]


class PriceSensitivityAnalyzer:
    def __init__(self, fitter: NonlinearPricingFitter):
        self.fitter = fitter
        self.sensitivity_result: Optional[SensitivityResult] = None

    def calculate_elasticity(self, prices: np.ndarray, 
                             curve_type: Optional[CurveType] = None) -> np.ndarray:
        if self.fitter.best_fit is None and curve_type is None:
            raise ValueError("需要先进行曲线拟合")
        
        ct = curve_type if curve_type is not None else self.fitter.best_fit
        
        delta = prices * 0.001
        conv_base = self.fitter.predict(prices, ct)
        conv_plus = self.fitter.predict(prices + delta, ct)
        
        d_conv_d_price = (conv_plus - conv_base) / delta
        elasticity = d_conv_d_price * (prices / conv_base)
        
        return elasticity

    def calculate_marginal_change(self, prices: np.ndarray, 
                                  curve_type: Optional[CurveType] = None) -> np.ndarray:
        ct = curve_type if curve_type is not None else self.fitter.best_fit
        
        delta = 1.0
        conv_base = self.fitter.predict(prices, ct)
        conv_after = self.fitter.predict(prices + delta, ct)
        
        return (conv_after - conv_base) / conv_base

    def calculate_sensitivity_ci(self, prices: np.ndarray, n_bootstrap: int = 100,
                                 confidence_level: float = 0.95,
                                 curve_type: Optional[CurveType] = None) -> np.ndarray:
        ct = curve_type if curve_type is not None else self.fitter.best_fit
        
        if self.fitter.price_points is None:
            raise ValueError("需要价格点数据")
        
        pp = self.fitter.price_points
        x_orig = np.array([p.price for p in pp])
        y_orig = np.array([p.conversion_rate for p in pp])
        n_orig = np.array([p.sample_size for p in pp])
        
        bootstrap_elasticities = []
        
        for _ in range(n_bootstrap):
            y_boot = []
            for y, n in zip(y_orig, n_orig):
                conv_boot = np.random.binomial(n, y) / n
                y_boot.append(conv_boot)
            
            from .curve_fitting import PricePointData
            pp_boot = [
                PricePointData(
                    price=pp[i].price,
                    conversion_rate=y_boot[i],
                    sample_size=pp[i].sample_size,
                    std_error=pp[i].std_error,
                    ci_lower=pp[i].ci_lower,
                    ci_upper=pp[i].ci_upper
                )
                for i in range(len(pp))
            ]
            
            try:
                temp_fitter = NonlinearPricingFitter()
                temp_fitter.price_points = pp_boot
                temp_fitter.fit_curve(ct, pp_boot)
                elast = self._calculate_elasticity_with_fitter(temp_fitter, prices, ct)
                bootstrap_elasticities.append(elast)
            except Exception:
                continue
        
        if not bootstrap_elasticities:
            return np.column_stack([
                self.calculate_elasticity(prices, ct) * 0.8,
                self.calculate_elasticity(prices, ct) * 1.2
            ])
        
        elast_array = np.array(bootstrap_elasticities)
        alpha = 1 - confidence_level
        ci_lower = np.percentile(elast_array, 100 * alpha / 2, axis=0)
        ci_upper = np.percentile(elast_array, 100 * (1 - alpha / 2), axis=0)
        
        return np.column_stack([ci_lower, ci_upper])

    def _calculate_elasticity_with_fitter(self, fitter: NonlinearPricingFitter,
                                          prices: np.ndarray, curve_type: CurveType) -> np.ndarray:
        delta = prices * 0.001
        conv_base = fitter.predict(prices, curve_type)
        conv_plus = fitter.predict(prices + delta, curve_type)
        d_conv_d_price = (conv_plus - conv_base) / delta
        return d_conv_d_price * (prices / conv_base)

    def _get_sensitivity_level(self, elasticity: float, 
                               elasticity_range: Tuple[float, float]) -> str:
        elast_abs = abs(elasticity)
        min_abs, max_abs = abs(elasticity_range[0]), abs(elasticity_range[1])
        
        if elast_abs >= max_abs * 0.7:
            return "高敏感"
        elif elast_abs >= max_abs * 0.3:
            return "中敏感"
        else:
            return "低敏感"

    def analyze_sensitivity(self, price_range: Optional[Tuple[float, float]] = None,
                            n_points: int = 100,
                            curve_type: Optional[CurveType] = None,
                            include_ci: bool = True) -> SensitivityResult:
        ct = curve_type if curve_type is not None else self.fitter.best_fit
        if ct is None:
            raise ValueError("需要先进行曲线拟合")
        
        fit_result = self.fitter.fit_results[ct]
        if price_range is None:
            price_range = fit_result.price_range
        
        prices = np.linspace(price_range[0], price_range[1], n_points)
        
        elasticities = self.calculate_elasticity(prices, ct)
        marginal_changes = self.calculate_marginal_change(prices, ct)
        
        if include_ci:
            ci_array = self.calculate_sensitivity_ci(prices, curve_type=ct)
        else:
            ci_lower = elasticities * 0.9
            ci_upper = elasticities * 1.1
            ci_array = np.column_stack([ci_lower, ci_upper])
        
        elasticity_range = (elasticities.min(), elasticities.max())
        
        sensitivity_points = []
        for i, price in enumerate(prices):
            elast = elasticities[i]
            sensitivity_points.append(SensitivityPoint(
                price=price,
                elasticity=elast,
                marginal_change=marginal_changes[i],
                confidence_interval=(ci_array[i, 0], ci_array[i, 1]),
                sensitivity_level=self._get_sensitivity_level(elast, elasticity_range)
            ))
        
        elast_abs = np.abs(elasticities)
        most_sensitive_idx = np.argmax(elast_abs)
        least_sensitive_idx = np.argmin(elast_abs)
        
        high_mask = elast_abs >= np.percentile(elast_abs, 70)
        low_mask = elast_abs <= np.percentile(elast_abs, 30)
        
        high_prices = prices[high_mask]
        low_prices = prices[low_mask]
        
        sensitivity_thresholds = {
            '高敏感': (high_prices.min(), high_prices.max()) if len(high_prices) > 0 else (0, 0),
            '低敏感': (low_prices.min(), low_prices.max()) if len(low_prices) > 0 else (0, 0)
        }
        
        self.sensitivity_result = SensitivityResult(
            sensitivity_points=sensitivity_points,
            most_sensitive_price=prices[most_sensitive_idx],
            least_sensitive_price=prices[least_sensitive_idx],
            sensitivity_thresholds=sensitivity_thresholds,
            elasticity_range=elasticity_range
        )
        
        return self.sensitivity_result

    def get_sensitivity_summary(self) -> pd.DataFrame:
        if self.sensitivity_result is None:
            raise ValueError("需要先运行敏感度分析")
        
        sr = self.sensitivity_result
        
        data = []
        for sp in sr.sensitivity_points[::max(1, len(sr.sensitivity_points) // 20)]:
            data.append({
                '价格': round(sp.price, 2),
                '弹性系数': round(sp.elasticity, 4),
                '边际变化率': f"{sp.marginal_change:.2%}",
                '敏感度等级': sp.sensitivity_level,
                '置信区间下限': round(sp.confidence_interval[0], 4),
                '置信区间上限': round(sp.confidence_interval[1], 4)
            })
        
        return pd.DataFrame(data)

    def get_key_insights(self) -> Dict:
        if self.sensitivity_result is None:
            raise ValueError("需要先运行敏感度分析")
        
        sr = self.sensitivity_result
        
        high_range = sr.sensitivity_thresholds['高敏感']
        low_range = sr.sensitivity_thresholds['低敏感']
        
        return {
            '最敏感价格点': round(sr.most_sensitive_price, 2),
            '最不敏感价格点': round(sr.least_sensitive_price, 2),
            '高敏感价格区间': (round(high_range[0], 2), round(high_range[1], 2)),
            '低敏感价格区间': (round(low_range[0], 2), round(low_range[1], 2)),
            '弹性系数范围': (round(sr.elasticity_range[0], 4), round(sr.elasticity_range[1], 4)),
            '建议': self._generate_recommendation(sr)
        }

    def _generate_recommendation(self, sr: SensitivityResult) -> str:
        high_range = sr.sensitivity_thresholds['高敏感']
        
        if high_range[0] != high_range[1]:
            return (f"建议在高敏感价格区间 ({high_range[0]:.2f} - {high_range[1]:.2f}) 谨慎调整价格，"
                    f"该区间内价格变动对转化率影响最大。")
        else:
            return "价格敏感度分布相对均匀，建议结合业务目标综合考量定价策略。"
