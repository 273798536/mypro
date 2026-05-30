from typing import Any, Callable, Dict, List, Optional, Union
"""Nonlinear pricing fitting core algorithms."""


import numpy as np
import pandas as pd
from scipy.optimize import curve_fit, minimize
from scipy.stats import norm
from sklearn.metrics import r2_score, mean_squared_error
from sklearn.model_selection import KFold


class PricingFitter:
    """Fit nonlinear pricing models to conversion data."""
    
    def __init__(self, random_seed: int = 42) -> None:
        self.random_seed = random_seed
        self.fitted_models: Dict[str, Any] = {}
    
    def fit(self, data: Dict[str, pd.DataFrame], 
            anomaly_report: Dict[str, Any]) -> Dict[str, Any]:
        """Fit multiple nonlinear models and select the best one."""
        conversions = data["conversions"]
        packages = data["packages"]
        
        if len(conversions) < 10:
            raise ValueError(f"Insufficient data for fitting: {len(conversions)} records")
        
        models = {
            "power_law": self._fit_power_law,
            "exponential": self._fit_exponential,
            "logarithmic": self._fit_logarithmic,
            "polynomial": self._fit_polynomial,
            "s_curve": self._fit_s_curve,
            "piecewise_linear": self._fit_piecewise_linear,
        }
        
        has_trial_data = "trial_duration" in conversions.columns
        
        if has_trial_data:
            models["with_trial"] = lambda x, y: self._fit_with_trial_features(x, y, conversions)
        
        results = {}
        model_scores = {}
        
        for model_name, fit_func in models.items():
            try:
                model_result = fit_func(conversions, packages)
                if model_result and "r2_score" in model_result:
                    results[model_name] = model_result
                    model_scores[model_name] = model_result["r2_score"]
            except Exception as e:
                results[model_name] = {"error": str(e)}
        
        if not model_scores:
            raise ValueError("All models failed to fit")
        
        best_model = max(model_scores, key=model_scores.get)
        best_result = results[best_model]
        
        best_result["model_type"] = best_model
        best_result["all_models"] = {
            name: {
                "r2_score": r.get("r2_score"),
                "rmse": r.get("rmse"),
            }
            for name, r in results.items()
            if "r2_score" in r
        }
        best_result["model_selection"] = {
            "best_model": best_model,
            "ranking": sorted(model_scores.items(), key=lambda x: x[1], reverse=True),
        }
        
        large_customer_ids = {lc["customer_id"] for lc in anomaly_report.get("large_customers", [])}
        if large_customer_ids:
            best_result["large_customer_fit"] = self._evaluate_on_group(
                conversions, best_result, large_customer_ids, "large_customers"
            )
        
        discount_ids = {d["record_id"] for d in anomaly_report.get("discount_records", [])}
        if discount_ids:
            best_result["discount_fit"] = self._evaluate_on_group(
                conversions, best_result, discount_ids, "discount_records"
            )
        
        self.fitted_models = results
        return best_result
    
    def _fit_power_law(self, conversions: pd.DataFrame, 
                       packages: pd.DataFrame) -> Optional[Dict[str, Any]]:
        """Fit power law model: price = a * quantity^b + c"""
        def model(quantity, a, b, c):
            return a * np.power(quantity, b) + c
        
        return self._fit_curve_model(model, conversions, "power_law",
                                    param_names=["a", "b", "c"])
    
    def _fit_exponential(self, conversions: pd.DataFrame,
                         packages: pd.DataFrame) -> Optional[Dict[str, Any]]:
        """Fit exponential model: price = a * exp(b * quantity) + c"""
        def model(quantity, a, b, c):
            return a * np.exp(b * quantity) + c
        
        return self._fit_curve_model(model, conversions, "exponential",
                                    param_names=["a", "b", "c"])
    
    def _fit_logarithmic(self, conversions: pd.DataFrame,
                         packages: pd.DataFrame) -> Optional[Dict[str, Any]]:
        """Fit logarithmic model: price = a * log(quantity + b) + c"""
        def model(quantity, a, b, c):
            return a * np.log(quantity + b) + c
        
        return self._fit_curve_model(model, conversions, "logarithmic",
                                    param_names=["a", "b", "c"])
    
    def _fit_polynomial(self, conversions: pd.DataFrame,
                        packages: pd.DataFrame) -> Optional[Dict[str, Any]]:
        """Fit 3rd degree polynomial model."""
        def model(quantity, a, b, c, d):
            return a * quantity**3 + b * quantity**2 + c * quantity + d
        
        return self._fit_curve_model(model, conversions, "polynomial",
                                    param_names=["a", "b", "c", "d"],
                                    maxfev=10000)
    
    def _fit_s_curve(self, conversions: pd.DataFrame,
                     packages: pd.DataFrame) -> Optional[Dict[str, Any]]:
        """Fit S-curve (logistic) model: price = L / (1 + exp(-k*(quantity - x0))) + b"""
        def model(quantity, L, k, x0, b):
            return L / (1 + np.exp(-k * (quantity - x0))) + b
        
        return self._fit_curve_model(model, conversions, "s_curve",
                                    param_names=["L", "k", "x0", "b"],
                                    maxfev=20000)
    
    def _fit_piecewise_linear(self, conversions: pd.DataFrame,
                              packages: pd.DataFrame) -> Optional[Dict[str, Any]]:
        """Fit piecewise linear model with 2 segments."""
        def model(quantity, a1, b1, breakpoint, a2, b2):
            return np.where(
                quantity < breakpoint,
                a1 * quantity + b1,
                a2 * quantity + b2
            )
        
        quantity = conversions["quantity"].values
        price = conversions["price"].values
        
        bp_guess = np.median(quantity)
        p0 = [0.0, np.mean(price), bp_guess, 0.0, np.mean(price)]
        
        try:
            popt, _ = curve_fit(model, quantity, price, p0=p0, maxfev=20000)
        except Exception:
            return None
        
        price_pred = model(quantity, *popt)
        r2 = r2_score(price, price_pred)
        rmse = np.sqrt(mean_squared_error(price, price_pred))
        
        params = dict(zip(["a1", "b1", "breakpoint", "a2", "b2"], popt))
        
        elasticity = self._calculate_elasticity(model, popt, quantity)
        
        return {
            "parameters": params,
            "r2_score": float(r2),
            "rmse": float(rmse),
            "elasticity": elasticity,
            "predictions": price_pred.tolist(),
            "residuals": (price - price_pred).tolist(),
        }
    
    def _fit_with_trial_features(self, conversions: pd.DataFrame,
                                 packages: pd.DataFrame) -> Optional[Dict[str, Any]]:
        """Fit extended model with trial duration features."""
        def model_with_features(X, a, b, c, trial_coef, trial_int_coef):
            quantity = X[:, 0]
            trial_duration = X[:, 1]
            base = a * np.power(quantity, b) + c
            trial_effect = trial_coef * trial_duration
            interaction = trial_int_coef * quantity * trial_duration
            return base + trial_effect + interaction
        
        X = conversions[["quantity", "trial_duration"]].values
        price = conversions["price"].values
        
        p0 = [100.0, -0.5, 50.0, 0.1, 0.0]
        
        def wrapped_model(X_flat, *params):
            X_reshaped = X_flat.reshape(-1, 2)
            return model_with_features(X_reshaped, *params)
        
        try:
            popt, _ = curve_fit(wrapped_model, X.flatten(), price, p0=p0, maxfev=20000)
        except Exception:
            return None
        
        price_pred = model_with_features(X, *popt)
        r2 = r2_score(price, price_pred)
        rmse = np.sqrt(mean_squared_error(price, price_pred))
        
        params = dict(zip(["a", "b", "c", "trial_coef", "trial_int_coef"], popt))
        
        def predict_func(q, td=0):
            X_pred = np.array([[q, td]])
            return model_with_features(X_pred, *popt)[0]
        
        quantity_mean = conversions["quantity"].mean()
        elasticity = self._calculate_elasticity(
            lambda q, *p: predict_func(q, td=conversions["trial_duration"].mean()),
            popt[:3],
            X[:, 0]
        )
        
        return {
            "parameters": params,
            "r2_score": float(r2),
            "rmse": float(rmse),
            "elasticity": elasticity,
            "predictions": price_pred.tolist(),
            "residuals": (price - price_pred).tolist(),
            "trial_impact": {
                "coefficient": float(popt[3]),
                "interaction_coefficient": float(popt[4]),
                "avg_trial_duration": float(conversions["trial_duration"].mean()),
            },
        }
    
    def _fit_curve_model(self, model_func: Callable, conversions: pd.DataFrame,
                        model_name: str, param_names: List[str],
                        maxfev: int = 10000) -> Optional[Dict[str, Any]]:
        """Generic curve fitting with cross-validation."""
        quantity = conversions["quantity"].values
        price = conversions["price"].values
        
        q_range = quantity.max() - quantity.min()
        p_range = price.max() - price.min()
        
        if model_name == "power_law":
            p0 = [p_range / 2, -0.3, price.min()]
        elif model_name == "exponential":
            p0 = [p_range / 2, -0.01, price.min()]
        elif model_name == "logarithmic":
            p0 = [p_range / 2, 1.0, price.min()]
        elif model_name == "polynomial":
            p0 = [0.0, 0.0, -p_range / q_range, price.mean()]
        elif model_name == "s_curve":
            p0 = [p_range, 0.01, np.median(quantity), price.min()]
        else:
            p0 = None
        
        try:
            popt, pcov = curve_fit(model_func, quantity, price, p0=p0, maxfev=maxfev)
        except Exception:
            return None
        
        price_pred = model_func(quantity, *popt)
        r2 = r2_score(price, price_pred)
        rmse = np.sqrt(mean_squared_error(price, price_pred))
        
        cv_scores = self._cross_validate(model_func, quantity, price, p0)
        
        params = dict(zip(param_names, popt))
        
        if pcov is not None:
            param_errors = np.sqrt(np.diag(pcov))
            for i, name in enumerate(param_names):
                params[f"{name}_std"] = float(param_errors[i])
        
        elasticity = self._calculate_elasticity(model_func, popt, quantity)
        
        return {
            "parameters": params,
            "r2_score": float(r2),
            "rmse": float(rmse),
            "cv_r2_mean": float(np.mean(cv_scores)) if cv_scores else None,
            "cv_r2_std": float(np.std(cv_scores)) if cv_scores else None,
            "elasticity": elasticity,
            "predictions": price_pred.tolist(),
            "residuals": (price - price_pred).tolist(),
        }
    
    def _cross_validate(self, model_func: Callable, quantity: np.ndarray,
                       price: np.ndarray, p0: Optional[List]) -> List[float]:
        """Perform 5-fold cross-validation."""
        if len(quantity) < 20:
            return []
        
        kf = KFold(n_splits=5, shuffle=True, random_state=self.random_seed)
        scores = []
        
        for train_idx, test_idx in kf.split(quantity):
            try:
                popt, _ = curve_fit(
                    model_func, quantity[train_idx], price[train_idx],
                    p0=p0, maxfev=10000
                )
                pred = model_func(quantity[test_idx], *popt)
                r2 = r2_score(price[test_idx], pred)
                if not np.isnan(r2):
                    scores.append(r2)
            except Exception:
                continue
        
        return scores
    
    def _calculate_elasticity(self, model_func: Callable, params: tuple,
                             quantity: np.ndarray) -> Dict[str, float]:
        """Calculate price elasticity of quantity."""
        q_mean = np.mean(quantity)
        q_median = np.median(quantity)
        
        def price_derivative(q, eps=1e-4):
            p1 = model_func(q + eps, *params)
            p2 = model_func(q - eps, *params)
            return (p1 - p2) / (2 * eps)
        
        def elasticity_at_q(q):
            p = model_func(q, *params)
            dpdq = price_derivative(q)
            if p == 0 or dpdq == 0:
                return 0.0
            return (dpdq * q) / p
        
        e_mean = elasticity_at_q(q_mean)
        e_median = elasticity_at_q(q_median)
        
        elasticities = [elasticity_at_q(q) for q in quantity if q > 0]
        e_avg = np.mean(elasticities) if elasticities else 0.0
        
        return {
            "at_mean": float(e_mean),
            "at_median": float(e_median),
            "average": float(e_avg),
        }
    
    def _evaluate_on_group(self, conversions: pd.DataFrame, fit_result: Dict[str, Any],
                          record_ids: set[str], group_name: str) -> Dict[str, Any]:
        """Evaluate model performance on a specific group."""
        group_mask = conversions["record_id"].isin(record_ids)
        if not group_mask.any():
            return None
        
        group_data = conversions[group_mask]
        actual = group_data["price"].values
        
        predictions = np.array(fit_result["predictions"])
        predicted = predictions[group_mask.values]
        
        if len(actual) < 2:
            return {
                "count": int(len(actual)),
                "mean_actual": float(np.mean(actual)),
                "mean_predicted": float(np.mean(predicted)),
                "mean_error": float(np.mean(predicted - actual)),
            }
        
        r2 = r2_score(actual, predicted)
        rmse = np.sqrt(mean_squared_error(actual, predicted))
        
        overall_r2 = fit_result["r2_score"]
        
        return {
            "count": int(len(actual)),
            "r2_score": float(r2),
            "rmse": float(rmse),
            "r2_vs_overall": float(r2 - overall_r2),
            "mean_actual": float(np.mean(actual)),
            "mean_predicted": float(np.mean(predicted)),
            "mean_error_pct": float(np.mean((predicted - actual) / actual) * 100),
        }
    
    def predict(self, quantities: Union[np.ndarray, List], model_type: Optional[str] = None) -> np.ndarray:
        """Make predictions using the fitted model."""
        if model_type is None:
            model_type = max(
                ((name, r.get("r2_score", 0)) for name, r in self.fitted_models.items()
                 if "r2_score" in r),
                key=lambda x: x[1]
            )[0]
        
        model_result = self.fitted_models.get(model_type)
        if not model_result or "parameters" not in model_result:
            raise ValueError(f"Model '{model_type}' not fitted")
        
        params = model_result["parameters"]
        
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
        
        model_func = models[model_type]
        param_values = [params[k] for k in params if not k.endswith("_std")]
        
        q_array = np.array(quantities)
        return model_func(q_array, *param_values)
