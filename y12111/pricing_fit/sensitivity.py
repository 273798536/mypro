from typing import Any, Dict, List, Optional, Union
"""Sensitivity analysis, group comparison, and outlier removal impact analysis."""

from copy import deepcopy

import numpy as np
import pandas as pd
from sklearn.metrics import r2_score, mean_squared_error

from .fitting import PricingFitter
from .anomaly_detection import AnomalyDetector


class SensitivityAnalyzer:
    """Analyze model sensitivity to parameter changes and perform group comparisons."""
    
    def __init__(self, range_pct: float = 0.2, random_seed: int = 42) -> None:
        self.range_pct = range_pct
        self.random_seed = random_seed
        self.price_points = np.arange(0.5, 2.1, 0.1)
    
    def analyze(self, data: Dict[str, pd.DataFrame],
                fit_results: Dict[str, Any],
                anomaly_report: Dict[str, Any],
                group_by: Optional[str] = None) -> Dict[str, Any]:
        """Run comprehensive sensitivity analysis."""
        results = {}
        
        results["sensitivity"] = self._parameter_sensitivity(data, fit_results)
        results["price_elasticity"] = self._price_elasticity_analysis(fit_results)
        
        if group_by and group_by in data["conversions"].columns:
            results["group_comparison"] = self._group_comparison(
                data, fit_results, anomaly_report, group_by
            )
        
        results["outlier_removal_sensitivity"] = self._outlier_removal_sensitivity(
            data, fit_results, anomaly_report
        )
        
        results["scenario_analysis"] = self._scenario_analysis(data, fit_results)
        
        return results
    
    def _parameter_sensitivity(self, data: Dict[str, pd.DataFrame],
                              fit_results: Dict[str, Any]) -> Dict[str, float]:
        """Analyze sensitivity of model parameters to input perturbations."""
        conversions = data["conversions"]
        params = fit_results.get("parameters", {})
        
        sensitivity = {}
        
        quantity = conversions["quantity"].values
        price = conversions["price"].values
        
        for param_name in [k for k in params.keys() if not k.endswith("_std")]:
            base_value = params[param_name]
            
            if abs(base_value) < 1e-10:
                continue
            
            delta = base_value * self.range_pct
            
            param_names = [k for k in params.keys() if not k.endswith("_std")]
            param_idx = param_names.index(param_name)
            
            base_predictions = np.array(fit_results["predictions"])
            base_rmse = fit_results["rmse"]
            
            perturbed_params = {k: params[k] for k in param_names}
            perturbed_params[param_name] = base_value + delta
            
            model_type = fit_results["model_type"]
            perturbed_predictions = self._predict_with_params(
                model_type, perturbed_params, quantity
            )
            
            perturbed_rmse = np.sqrt(mean_squared_error(price, perturbed_predictions))
            
            if base_rmse > 0:
                impact = abs(perturbed_rmse - base_rmse) / base_rmse
            else:
                impact = 0.0
            
            sensitivity[param_name] = float(impact)
        
        return sensitivity
    
    def _predict_with_params(self, model_type: str, params: Dict[str, float],
                            quantity: np.ndarray) -> np.ndarray:
        """Make predictions with specific parameters."""
        param_values = [params[k] for k in params.keys() if not k.endswith("_std")]
        
        models = {
            "power_law": lambda q, a, b, c: a * np.power(q, b) + c,
            "exponential": lambda q, a, b, c: a * np.exp(b * q) + c,
            "logarithmic": lambda q, a, b, c: a * np.log(q + b) + c,
            "polynomial": lambda q, a, b, c, d: a * q**3 + b * q**2 + c * q + d,
            "s_curve": lambda q, L, k, x0, b: L / (1 + np.exp(-k * (q - x0))) + b,
            "piecewise_linear": lambda q, a1, b1, bp, a2, b2: np.where(
                q < bp, a1 * q + b1, a2 * q + b2
            ),
        }
        
        if model_type not in models:
            raise ValueError(f"Unknown model type: {model_type}")
        
        return models[model_type](quantity, *param_values)
    
    def _price_elasticity_analysis(self, fit_results: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze price elasticity across the demand curve."""
        elasticity = fit_results.get("elasticity", {})
        
        model_type = fit_results["model_type"]
        params = fit_results["parameters"]
        param_names = [k for k in params.keys() if not k.endswith("_std")]
        
        quantity_points = np.logspace(0, 3, 20)
        
        elasticities = []
        for q in quantity_points:
            e = self._point_elasticity(model_type, params, param_names, q)
            if not np.isnan(e) and not np.isinf(e):
                elasticities.append({"quantity": float(q), "elasticity": float(e)})
        
        elasticity_curve = {
            "points": elasticities,
            "elastic_range": {
                "min": float(min(e["elasticity"] for e in elasticities)),
                "max": float(max(e["elasticity"] for e in elasticities)),
            },
            "unit_elastic_quantity": self._find_unit_elasticity(
                model_type, params, param_names
            ),
        }
        
        return {
            "summary": elasticity,
            "curve": elasticity_curve,
            "interpretation": self._interpret_elasticity(elasticity),
        }
    
    def _point_elasticity(self, model_type: str, params: Dict[str, float],
                         param_names: List[str], quantity: float) -> float:
        """Calculate point elasticity at a given quantity."""
        param_values = [params[k] for k in param_names]
        
        models = {
            "power_law": lambda q, a, b, c: a * np.power(q, b) + c,
            "exponential": lambda q, a, b, c: a * np.exp(b * q) + c,
            "logarithmic": lambda q, a, b, c: a * np.log(q + b) + c,
            "polynomial": lambda q, a, b, c, d: a * q**3 + b * q**2 + c * q + d,
            "s_curve": lambda q, L, k, x0, b: L / (1 + np.exp(-k * (q - x0))) + b,
            "piecewise_linear": lambda q, a1, b1, bp, a2, b2: np.where(
                q < bp, a1 * q + b1, a2 * q + b2
            ),
        }
        
        if model_type not in models:
            return 0.0
        
        model_func = models[model_type]
        
        eps = 1e-4
        p1 = model_func(quantity + eps, *param_values)
        p2 = model_func(quantity - eps, *param_values)
        dpdq = (p1 - p2) / (2 * eps)
        p = model_func(quantity, *param_values)
        
        if p == 0 or dpdq == 0:
            return 0.0
        
        return (dpdq * quantity) / p
    
    def _find_unit_elasticity(self, model_type: str, params: Dict[str, float],
                             param_names: List[str]) -> Optional[float]:
        """Find quantity where elasticity = -1 (unit elastic)."""
        param_values = [params[k] for k in param_names]
        
        models = {
            "power_law": lambda q, a, b, c: a * np.power(q, b) + c,
            "exponential": lambda q, a, b, c: a * np.exp(b * q) + c,
            "logarithmic": lambda q, a, b, c: a * np.log(q + b) + c,
            "polynomial": lambda q, a, b, c, d: a * q**3 + b * q**2 + c * q + d,
            "s_curve": lambda q, L, k, x0, b: L / (1 + np.exp(-k * (q - x0))) + b,
            "piecewise_linear": lambda q, a1, b1, bp, a2, b2: np.where(
                q < bp, a1 * q + b1, a2 * q + b2
            ),
        }
        
        if model_type not in models:
            return None
        
        model_func = models[model_type]
        
        def elasticity_minus_one(q):
            eps = 1e-4
            p1 = model_func(q + eps, *param_values)
            p2 = model_func(q - eps, *param_values)
            dpdq = (p1 - p2) / (2 * eps)
            p = model_func(q, *param_values)
            if p == 0 or dpdq == 0:
                return 1000
            e = (dpdq * q) / p
            return e + 1
        
        try:
            from scipy.optimize import brentq
            q_min, q_max = 1, 1000
            f_min = elasticity_minus_one(q_min)
            f_max = elasticity_minus_one(q_max)
            
            if f_min * f_max < 0:
                root = brentq(elasticity_minus_one, q_min, q_max)
                return float(root)
        except Exception:
            pass
        
        return None
    
    def _interpret_elasticity(self, elasticity: Dict[str, float]) -> str:
        """Provide business interpretation of elasticity."""
        e = elasticity.get("average", 0)
        
        if e >= 0:
            return "⚠️ 正弹性异常：价格随用量上升而上升，可能存在反向定价"
        elif e > -0.5:
            return "💼 高度非弹性：用量变化对单价影响很小，适合稳定定价"
        elif e > -1.0:
            return "📊 适度非弹性：单价下降速度慢于用量增长，规模效应良好"
        elif abs(e - (-1.0)) < 0.1:
            return "⚖️  单位弹性：单价与用量成比例变化"
        elif e > -2.0:
            return "📉 弹性区间：单价随用量快速下降，需关注利润率"
        else:
            return "🚨 高度弹性：单价对用量极其敏感，需谨慎定价"
    
    def _group_comparison(self, data: Dict[str, pd.DataFrame],
                         fit_results: Dict[str, Any],
                         anomaly_report: Dict[str, Any],
                         group_by: str) -> Dict[str, Any]:
        """Compare model performance and parameters across groups."""
        conversions = data["conversions"]
        
        groups = conversions[group_by].unique()
        
        group_results = {}
        all_group_fits = {}
        
        for group in groups:
            group_data = conversions[conversions[group_by] == group].copy()
            
            if len(group_data) < 10:
                group_results[str(group)] = {
                    "count": len(group_data),
                    "error": "Insufficient data for group fitting",
                }
                continue
            
            group_data_dict = {
                "conversions": group_data,
                "packages": data["packages"],
            }
            if "trials" in data:
                group_data_dict["trials"] = data["trials"]
            
            group_anomaly = {"outliers": [], "large_customers": [],
                           "discount_records": [], "sparse_groups": []}
            
            fitter = PricingFitter(random_seed=self.random_seed)
            try:
                group_fit = fitter.fit(group_data_dict, group_anomaly)
                all_group_fits[str(group)] = group_fit
                
                group_results[str(group)] = {
                    "count": len(group_data),
                    "avg_price": float(group_data["price"].mean()),
                    "avg_quantity": float(group_data["quantity"].mean()),
                    "conversion_rate": float(group_data["converted"].mean()),
                    "model_type": group_fit["model_type"],
                    "r2_score": group_fit["r2_score"],
                    "rmse": group_fit["rmse"],
                    "elasticity_avg": group_fit.get("elasticity", {}).get("average", 0),
                    "overall_r2_diff": group_fit["r2_score"] - fit_results["r2_score"],
                    "parameters": {
                        k: v for k, v in group_fit["parameters"].items()
                        if not k.endswith("_std") and isinstance(v, (int, float))
                    },
                }
            except Exception as e:
                group_results[str(group)] = {
                    "count": len(group_data),
                    "error": str(e),
                }
        
        valid_groups = {k: v for k, v in group_results.items() if "r2_score" in v}
        
        comparison = {
            "group_by": group_by,
            "groups": group_results,
            "heterogeneity": self._calculate_heterogeneity(valid_groups),
            "best_group": max(valid_groups.items(), key=lambda x: x[1]["r2_score"])[0] if valid_groups else None,
            "worst_group": min(valid_groups.items(), key=lambda x: x[1]["r2_score"])[0] if valid_groups else None,
            "recommendation": self._generate_group_recommendation(valid_groups),
        }
        
        if len(valid_groups) >= 2:
            comparison["anova_test"] = self._anova_test(conversions, group_by, fit_results)
        
        return comparison
    
    def _calculate_heterogeneity(self, groups: Dict[str, dict[str, Any]]) -> Dict[str, float]:
        """Calculate heterogeneity across groups."""
        if len(groups) < 2:
            return {"note": "Need at least 2 groups for heterogeneity calculation"}
        
        r2_scores = [g["r2_score"] for g in groups.values()]
        elasticities = [g["elasticity_avg"] for g in groups.values()]
        
        return {
            "r2_range": float(max(r2_scores) - min(r2_scores)),
            "r2_std": float(np.std(r2_scores)),
            "elasticity_range": float(max(elasticities) - min(elasticities)),
            "elasticity_std": float(np.std(elasticities)),
            "heterogeneity_score": float(
                np.std(r2_scores) * 0.5 + np.std(elasticities) * 0.5
            ),
        }
    
    def _generate_group_recommendation(self, groups: Dict[str, dict[str, Any]]) -> str:
        """Generate pricing recommendation based on group analysis."""
        if len(groups) < 2:
            return "ℹ️  分组数量不足，建议使用统一模型"
        
        het = self._calculate_heterogeneity(groups)
        
        if het.get("heterogeneity_score", 0) < 0.1:
            return "✅ 各组模型表现一致，可使用统一定价策略"
        elif het.get("heterogeneity_score", 0) < 0.3:
            return "📊 存在适度异质性，建议考虑差异化定价"
        else:
            return "🚨 各组异质性显著，强烈建议分组定价策略"
    
    def _anova_test(self, conversions: pd.DataFrame, group_by: str,
                   fit_results: Dict[str, Any]) -> Dict[str, Any]:
        """Perform ANOVA-like test for group differences."""
        predictions = np.array(fit_results["predictions"])
        residuals = conversions["price"].values - predictions
        
        groups = conversions[group_by].unique()
        group_residuals = []
        
        for group in groups:
            mask = conversions[group_by] == group
            if mask.sum() >= 5:
                group_residuals.append(residuals[mask.values])
        
        if len(group_residuals) < 2:
            return {"note": "Insufficient groups for ANOVA"}
        
        try:
            from scipy import stats
            f_stat, p_value = stats.f_oneway(*group_residuals)
            
            return {
                "f_statistic": float(f_stat),
                "p_value": float(p_value),
                "significant": p_value < 0.05,
                "interpretation": "✅ 组间差异不显著，统一模型适用" if p_value >= 0.05
                else "🚨 组间差异显著，建议分组建模",
            }
        except Exception as e:
            return {"error": str(e)}
    
    def _outlier_removal_sensitivity(self, data: Dict[str, pd.DataFrame],
                                    fit_results: Dict[str, Any],
                                    anomaly_report: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze how removing outliers affects the model."""
        if not anomaly_report["outliers"]:
            return {"note": "No outliers detected"}
        
        conversions = data["conversions"]
        outlier_ids = {o["record_id"] for o in anomaly_report["outliers"]}
        
        removal_scenarios = {
            "remove_none": [],
            "remove_zscore_only": [o for o in anomaly_report["outliers"] if o["method"] == "z-score"],
            "remove_multivariate_only": [o for o in anomaly_report["outliers"] if o["method"] == "multivariate"],
            "remove_all": anomaly_report["outliers"],
        }
        
        scenario_results = {}
        
        for scenario_name, outliers_to_remove in removal_scenarios.items():
            remove_ids = {o["record_id"] for o in outliers_to_remove}
            
            if not remove_ids:
                scenario_results[scenario_name] = {
                    "removed_count": 0,
                    "r2_score": fit_results["r2_score"],
                    "rmse": fit_results["rmse"],
                    "r2_change": 0.0,
                    "rmse_change": 0.0,
                }
                continue
            
            clean_conversions = conversions[~conversions["record_id"].isin(remove_ids)].copy()
            clean_data = {
                "conversions": clean_conversions,
                "packages": data["packages"],
            }
            if "trials" in data:
                clean_data["trials"] = data["trials"]
            
            clean_anomaly = {"outliers": [], "large_customers": [],
                           "discount_records": [], "sparse_groups": []}
            
            fitter = PricingFitter(random_seed=self.random_seed)
            try:
                clean_fit = fitter.fit(clean_data, clean_anomaly)
                scenario_results[scenario_name] = {
                    "removed_count": len(remove_ids),
                    "r2_score": clean_fit["r2_score"],
                    "rmse": clean_fit["rmse"],
                    "r2_change": clean_fit["r2_score"] - fit_results["r2_score"],
                    "rmse_change": clean_fit["rmse"] - fit_results["rmse"],
                    "model_type": clean_fit["model_type"],
                    "parameters": {
                        k: v for k, v in clean_fit["parameters"].items()
                        if not k.endswith("_std") and isinstance(v, (int, float))
                    },
                }
            except Exception as e:
                scenario_results[scenario_name] = {
                    "removed_count": len(remove_ids),
                    "error": str(e),
                }
        
        best_scenario = max(
            [(k, v) for k, v in scenario_results.items() if "r2_score" in v],
            key=lambda x: x[1]["r2_score"]
        )
        
        return {
            "scenarios": scenario_results,
            "recommended_scenario": best_scenario[0],
            "recommendation": self._generate_outlier_recommendation(scenario_results),
        }
    
    def _generate_outlier_recommendation(self, scenarios: Dict[str, dict[str, Any]]) -> str:
        """Generate recommendation on outlier handling."""
        remove_all = scenarios.get("remove_all", {})
        remove_none = scenarios.get("remove_none", {})
        
        if "r2_score" not in remove_all or "r2_score" not in remove_none:
            return "⚠️  无法评估异常剔除影响"
        
        r2_improvement = remove_all["r2_score"] - remove_none["r2_score"]
        
        if r2_improvement > 0.1:
            return "✅ 剔除全部异常值可显著提升模型拟合，建议剔除"
        elif r2_improvement > 0.05:
            return "📊 剔除异常值有一定改善，建议谨慎剔除并保留原始数据对比"
        elif r2_improvement > 0:
            return "ℹ️  剔除异常值改善有限，建议根据业务场景决定"
        else:
            return "❌ 剔除异常值反而降低拟合质量，建议保留所有数据"
    
    def _scenario_analysis(self, data: Dict[str, pd.DataFrame],
                          fit_results: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze different pricing scenarios."""
        conversions = data["conversions"]
        model_type = fit_results["model_type"]
        params = fit_results["parameters"]
        param_names = [k for k in params.keys() if not k.endswith("_std")]
        
        quantity_range = np.linspace(
            conversions["quantity"].min(),
            conversions["quantity"].max() * 2,
            10
        )
        
        scenarios = {}
        
        for quantity in quantity_range:
            predicted_price = self._predict_with_params(
                model_type, params, np.array([quantity])
            )[0]
            
            scenarios[f"q_{int(quantity)}"] = {
                "quantity": float(quantity),
                "predicted_price": float(predicted_price),
                "unit_price": float(predicted_price / quantity) if quantity > 0 else 0,
                "elasticity": self._point_elasticity(model_type, params, param_names, quantity),
            }
        
        return {
            "price_points": scenarios,
            "volume_discount": self._calculate_volume_discount(scenarios),
        }
    
    def _calculate_volume_discount(self, scenarios: Dict[str, dict[str, Any]]) -> Dict[str, Any]:
        """Calculate volume discount schedule."""
        sorted_scenarios = sorted(
            [(v["quantity"], v) for v in scenarios.values()],
            key=lambda x: x[0]
        )
        
        if len(sorted_scenarios) < 2:
            return {"note": "Insufficient data points"}
        
        base_q, base_v = sorted_scenarios[0]
        base_unit_price = base_v["unit_price"]
        
        discounts = []
        for q, v in sorted_scenarios[1:]:
            unit_price = v["unit_price"]
            discount_pct = (base_unit_price - unit_price) / base_unit_price * 100 if base_unit_price > 0 else 0
            discounts.append({
                "quantity": float(q),
                "unit_price": float(unit_price),
                "discount_vs_base": float(discount_pct),
            })
        
        return {
            "base_quantity": float(base_q),
            "base_unit_price": float(base_unit_price),
            "discount_schedule": discounts,
            "max_discount": float(max(d["discount_vs_base"] for d in discounts)) if discounts else 0,
        }
