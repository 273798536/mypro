import pandas as pd
import numpy as np
from scipy import stats
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, field


@dataclass
class VaRResult:
    """VaR计算结果数据类"""
    method: str
    confidence_level: float
    window_days: int
    var_value: float
    var_percent: float
    portfolio_value: float
    expected_shortfall: float = None
    details: Dict = field(default_factory=dict)
    source_trace: List[str] = field(default_factory=list)


class VaRCalculator:
    """VaR计算器 - 支持历史模拟法和参数法"""
    
    def __init__(self, portfolio_value: float = 1_000_000):
        self.portfolio_value = portfolio_value
        self._source_trace: List[str] = []
    
    def add_source_trace(self, trace: str):
        """添加来源追踪"""
        self._source_trace.append(trace)
    
    def _normalize_weights(self, weights: Dict[str, float]) -> Dict[str, float]:
        """归一化权重"""
        total = sum(weights.values())
        if np.isclose(total, 0):
            raise ValueError("权重之和不能为零")
        return {k: v / total for k, v in weights.items()}
    
    def _calculate_portfolio_returns(self, returns: pd.DataFrame, 
                                    weights: Dict[str, float]) -> pd.Series:
        """计算投资组合收益率"""
        norm_weights = self._normalize_weights(weights)
        self.add_source_trace(f"权重归一化: {norm_weights}")
        
        aligned_returns = returns[list(norm_weights.keys())]
        portfolio_returns = aligned_returns.multiply(
            pd.Series(norm_weights), axis=1
        ).sum(axis=1)
        
        return portfolio_returns
    
    def historical_simulation(self, returns: pd.DataFrame, weights: Dict[str, float],
                             confidence_level: float, window_days: int,
                             stress_days: List[str] = None) -> VaRResult:
        """
        历史模拟法计算VaR
        
        Args:
            returns: 各资产收益率DataFrame，索引为日期
            weights: 资产权重字典
            confidence_level: 置信度 (0-1)
            window_days: 历史窗口天数
            stress_days: 压力日列表，用于压力测试
        
        Returns:
            VaRResult对象
        """
        self.add_source_trace(f"历史模拟法: 窗口={window_days}天, 置信度={confidence_level}")
        
        recent_returns = returns.tail(window_days).copy()
        self.add_source_trace(f"使用数据窗口: {recent_returns.index[0]} 至 {recent_returns.index[-1]}")
        
        portfolio_returns = self._calculate_portfolio_returns(recent_returns, weights)
        portfolio_returns = portfolio_returns.dropna()
        
        var_percentile = 1 - confidence_level
        var_index = int(len(portfolio_returns) * var_percentile)
        
        sorted_returns = portfolio_returns.sort_values()
        var_return = sorted_returns.iloc[var_index]
        
        es_returns = sorted_returns.iloc[:var_index + 1]
        expected_shortfall = es_returns.mean()
        
        worst_days = sorted_returns.head(10)
        worst_days_detail = [
            {"date": str(date), "return": float(ret)}
            for date, ret in worst_days.items()
        ]
        
        stress_impact = {}
        if stress_days:
            self.add_source_trace(f"压力测试日: {stress_days}")
            for day in stress_days:
                if day in recent_returns.index:
                    day_returns = recent_returns.loc[day]
                    stress_port_return = (
                        day_returns * pd.Series(self._normalize_weights(weights))
                    ).sum()
                    stress_impact[day] = {
                        "portfolio_return": float(stress_port_return),
                        "asset_returns": day_returns.to_dict()
                    }
        
        var_value = abs(var_return) * self.portfolio_value
        
        result = VaRResult(
            method="historical_simulation",
            confidence_level=confidence_level,
            window_days=window_days,
            var_value=var_value,
            var_percent=abs(var_return) * 100,
            portfolio_value=self.portfolio_value,
            expected_shortfall=abs(expected_shortfall) * self.portfolio_value,
            details={
                "var_return_level": float(var_return),
                "es_return_level": float(expected_shortfall),
                "worst_10_days": worst_days_detail,
                "stress_impact": stress_impact,
                "sample_size": len(portfolio_returns),
                "var_position": var_index,
                "portfolio_returns_stats": {
                    "mean": float(portfolio_returns.mean()),
                    "std": float(portfolio_returns.std()),
                    "skew": float(portfolio_returns.skew()),
                    "kurtosis": float(portfolio_returns.kurtosis())
                }
            },
            source_trace=self._source_trace.copy()
        )
        
        return result
    
    def parametric(self, returns: pd.DataFrame, weights: Dict[str, float],
                  confidence_level: float, window_days: int) -> VaRResult:
        """
        参数法（方差-协方差法）计算VaR
        
        Args:
            returns: 各资产收益率DataFrame，索引为日期
            weights: 资产权重字典
            confidence_level: 置信度 (0-1)
            window_days: 历史窗口天数
        
        Returns:
            VaRResult对象
        """
        self.add_source_trace(f"参数法: 窗口={window_days}天, 置信度={confidence_level}")
        
        recent_returns = returns.tail(window_days).copy()
        self.add_source_trace(f"使用数据窗口: {recent_returns.index[0]} 至 {recent_returns.index[-1]}")
        
        norm_weights = self._normalize_weights(weights)
        weights_array = np.array([norm_weights[col] for col in recent_returns.columns])
        
        mean_returns = recent_returns.mean().values
        cov_matrix = recent_returns.cov().values
        
        portfolio_mean = np.sum(weights_array * mean_returns)
        portfolio_variance = weights_array @ cov_matrix @ weights_array
        portfolio_std = np.sqrt(portfolio_variance)
        
        self.add_source_trace(f"组合均值: {portfolio_mean:.6f}, 组合标准差: {portfolio_std:.6f}")
        
        z_score = stats.norm.ppf(1 - confidence_level)
        var_return = portfolio_mean + z_score * portfolio_std
        
        es_z = stats.norm.pdf(z_score) / confidence_level
        es_return = portfolio_mean - es_z * portfolio_std
        
        asset_contributions = {}
        for i, asset in enumerate(recent_returns.columns):
            marginal_var = (cov_matrix[i] @ weights_array) / portfolio_std
            component_var = weights_array[i] * marginal_var * abs(z_score)
            asset_contributions[asset] = {
                "weight": float(weights_array[i]),
                "marginal_var": float(marginal_var),
                "component_var": float(component_var),
                "contribution_pct": float(component_var / (abs(z_score) * portfolio_std) * 100)
            }
        
        var_value = abs(var_return) * self.portfolio_value
        
        result = VaRResult(
            method="parametric",
            confidence_level=confidence_level,
            window_days=window_days,
            var_value=var_value,
            var_percent=abs(var_return) * 100,
            portfolio_value=self.portfolio_value,
            expected_shortfall=abs(es_return) * self.portfolio_value,
            details={
                "var_return_level": float(var_return),
                "es_return_level": float(es_return),
                "z_score": float(z_score),
                "portfolio_mean": float(portfolio_mean),
                "portfolio_std": float(portfolio_std),
                "asset_contributions": asset_contributions,
                "covariance_matrix": cov_matrix.tolist(),
                "correlation_matrix": recent_returns.corr().to_dict()
            },
            source_trace=self._source_trace.copy()
        )
        
        return result
    
    def stress_test(self, returns: pd.DataFrame, weights: Dict[str, float],
                   stress_scenarios: Dict[str, Dict[str, float]]) -> Dict:
        """
        压力测试
        
        Args:
            returns: 历史收益率数据
            weights: 资产权重
            stress_scenarios: 压力场景字典 {场景名: {资产: 收益率冲击}}
        
        Returns:
            压力测试结果
        """
        self.add_source_trace(f"执行压力测试: {list(stress_scenarios.keys())}")
        
        norm_weights = self._normalize_weights(weights)
        results = {}
        
        for scenario_name, shocks in stress_scenarios.items():
            portfolio_shock = 0.0
            for asset, shock in shocks.items():
                if asset in norm_weights:
                    portfolio_shock += norm_weights[asset] * shock
            
            results[scenario_name] = {
                "portfolio_return": portfolio_shock,
                "loss_amount": abs(min(0, portfolio_shock)) * self.portfolio_value,
                "asset_shocks": shocks
            }
        
        return results
