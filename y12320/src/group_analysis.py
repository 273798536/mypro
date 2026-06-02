import pandas as pd
import numpy as np
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
from scipy import stats

from .curve_fitting import NonlinearPricingFitter, CurveType
from .sensitivity_analysis import PriceSensitivityAnalyzer, SensitivityResult


@dataclass
class GroupStats:
    group_name: str
    size: int
    avg_price: float
    conversion_rate: float
    avg_customer_size: float


@dataclass
class GroupFitResult:
    group_name: str
    fitter: NonlinearPricingFitter
    sensitivity_analyzer: PriceSensitivityAnalyzer
    stats: GroupStats


@dataclass
class GroupComparisonResult:
    group_results: Dict[str, GroupFitResult]
    statistical_tests: pd.DataFrame
    key_differences: List[Dict]


class GroupAnalyzer:
    def __init__(self, df: pd.DataFrame):
        self.df = df
        self.comparison_result: Optional[GroupComparisonResult] = None

    def define_size_groups(self, n_groups: int = 3, 
                           group_names: Optional[List[str]] = None) -> pd.DataFrame:
        df = self.df.copy()
        
        quantiles = np.linspace(0, 1, n_groups + 1)
        thresholds = df['customer_size'].quantile(quantiles).values
        
        if group_names is None:
            _all_names = ['小型客户', '中小型客户', '中型客户', '中大型客户', '大型客户']
            group_names = _all_names[:n_groups]
        
        def assign_group(size):
            for i in range(n_groups):
                if i == n_groups - 1:
                    return group_names[i]
                if size <= thresholds[i + 1]:
                    return group_names[i]
            return group_names[-1]
        
        df['size_group'] = df['customer_size'].apply(assign_group)
        return df

    def define_custom_groups(self, group_column: str) -> pd.DataFrame:
        if group_column not in self.df.columns:
            raise ValueError(f"列 {group_column} 不存在于数据中")
        
        df = self.df.copy()
        df['custom_group'] = df[group_column]
        return df

    def analyze_group(self, group_data: pd.DataFrame, 
                      group_name: str) -> Optional[GroupFitResult]:
        if len(group_data) < 10:
            return None
        
        fitter = NonlinearPricingFitter()
        fitter.aggregate_price_points(group_data)
        
        try:
            fitter.fit_all_curves()
        except Exception:
            return None
        
        sensitivity_analyzer = PriceSensitivityAnalyzer(fitter)
        try:
            sensitivity_analyzer.analyze_sensitivity(include_ci=False)
        except Exception:
            pass
        
        stats = GroupStats(
            group_name=group_name,
            size=len(group_data),
            avg_price=group_data['price'].mean(),
            conversion_rate=group_data['converted'].mean(),
            avg_customer_size=group_data['customer_size'].mean()
        )
        
        return GroupFitResult(
            group_name=group_name,
            fitter=fitter,
            sensitivity_analyzer=sensitivity_analyzer,
            stats=stats
        )

    def compare_by_size(self, n_groups: int = 3) -> GroupComparisonResult:
        df_with_groups = self.define_size_groups(n_groups)
        
        group_results = {}
        group_data_dict = {}
        
        for group_name in df_with_groups['size_group'].unique():
            group_data = df_with_groups[df_with_groups['size_group'] == group_name]
            result = self.analyze_group(group_data, group_name)
            if result is not None:
                group_results[group_name] = result
                group_data_dict[group_name] = group_data
        
        stat_tests = self._perform_statistical_tests(group_data_dict)
        key_differences = self._extract_key_differences(group_results)
        
        self.comparison_result = GroupComparisonResult(
            group_results=group_results,
            statistical_tests=stat_tests,
            key_differences=key_differences
        )
        
        return self.comparison_result

    def compare_by_custom_group(self, group_column: str) -> GroupComparisonResult:
        df_with_groups = self.define_custom_groups(group_column)
        
        group_results = {}
        group_data_dict = {}
        
        for group_name in df_with_groups['custom_group'].unique():
            group_data = df_with_groups[df_with_groups['custom_group'] == group_name]
            result = self.analyze_group(group_data, group_name)
            if result is not None:
                group_results[group_name] = result
                group_data_dict[group_name] = group_data
        
        stat_tests = self._perform_statistical_tests(group_data_dict)
        key_differences = self._extract_key_differences(group_results)
        
        self.comparison_result = GroupComparisonResult(
            group_results=group_results,
            statistical_tests=stat_tests,
            key_differences=key_differences
        )
        
        return self.comparison_result

    def _perform_statistical_tests(self, group_data_dict: Dict[str, pd.DataFrame]) -> pd.DataFrame:
        groups = list(group_data_dict.keys())
        if len(groups) < 2:
            return pd.DataFrame()
        
        test_results = []
        
        for i in range(len(groups)):
            for j in range(i + 1, len(groups)):
                g1, g2 = groups[i], groups[j]
                data1 = group_data_dict[g1]
                data2 = group_data_dict[g2]
                
                conv1 = data1['converted'].values
                conv2 = data2['converted'].values
                
                stat, p_value = stats.ttest_ind(conv1, conv2, equal_var=False)
                
                chi2, p_chi2, _, _ = stats.chi2_contingency([
                    [conv1.sum(), len(conv1) - conv1.sum()],
                    [conv2.sum(), len(conv2) - conv2.sum()]
                ])
                
                test_results.append({
                    '分组1': g1,
                    '分组2': g2,
                    'T检验统计量': round(stat, 4),
                    'T检验p值': round(p_value, 4),
                    '卡方检验统计量': round(chi2, 4),
                    '卡方检验p值': round(p_chi2, 4),
                    '显著性': '✓' if p_value < 0.05 else ''
                })
        
        return pd.DataFrame(test_results)

    def _extract_key_differences(self, group_results: Dict[str, GroupFitResult]) -> List[Dict]:
        if len(group_results) < 2:
            return []
        
        differences = []
        groups = list(group_results.keys())
        
        conv_rates = {g: r.stats.conversion_rate for g, r in group_results.items()}
        best_conv_group = max(conv_rates, key=conv_rates.get)
        worst_conv_group = min(conv_rates, key=conv_rates.get)
        
        diff_conv = conv_rates[best_conv_group] - conv_rates[worst_conv_group]
        differences.append({
            '指标': '转化率差异',
            '描述': f"{best_conv_group} 转化率最高 ({conv_rates[best_conv_group]:.2%}), "
                    f"{worst_conv_group} 最低 ({conv_rates[worst_conv_group]:.2%}), "
                    f"相差 {diff_conv:.2%}"
        })
        
        price_sensitivity = {}
        for g, r in group_results.items():
            try:
                if r.sensitivity_analyzer.sensitivity_result is not None:
                    elast = r.sensitivity_analyzer.sensitivity_result.elasticity_range
                    price_sensitivity[g] = abs(elast[0])
            except Exception:
                pass
        
        if price_sensitivity:
            most_sensitive = max(price_sensitivity, key=price_sensitivity.get)
            least_sensitive = min(price_sensitivity, key=price_sensitivity.get)
            
            differences.append({
                '指标': '价格敏感度差异',
                '描述': f"{most_sensitive} 对价格最敏感, {least_sensitive} 对价格最不敏感"
            })
        
        optimal_prices = {}
        for g, r in group_results.items():
            try:
                if r.fitter.best_fit is not None:
                    optimal = r.fitter.get_optimal_price_range()
                    optimal_prices[g] = optimal['corresponding_price']
            except Exception:
                pass
        
        if optimal_prices:
            high_price_group = max(optimal_prices, key=optimal_prices.get)
            low_price_group = min(optimal_prices, key=optimal_prices.get)
            
            differences.append({
                '指标': '最优价格差异',
                '描述': f"{high_price_group} 最优价格最高 ({optimal_prices[high_price_group]:.2f}), "
                        f"{low_price_group} 最低 ({optimal_prices[low_price_group]:.2f})"
            })
        
        return differences

    def get_groups_summary(self) -> pd.DataFrame:
        if self.comparison_result is None:
            raise ValueError("需要先进行分组分析")
        
        summary = []
        for group_name, result in self.comparison_result.group_results.items():
            s = result.stats
            summary.append({
                '分组': s.group_name,
                '样本量': s.size,
                '平均价格': round(s.avg_price, 2),
                '转化率': f"{s.conversion_rate:.2%}",
                '平均客户规模': round(s.avg_customer_size, 1)
            })
        
        return pd.DataFrame(summary)

    def get_group_curve_parameters(self) -> pd.DataFrame:
        if self.comparison_result is None:
            raise ValueError("需要先进行分组分析")
        
        params_list = []
        for group_name, result in self.comparison_result.group_results.items():
            if result.fitter.best_fit and result.fitter.best_fit in result.fitter.fit_results:
                fit = result.fitter.fit_results[result.fitter.best_fit]
                params = {'分组': group_name, '曲线类型': fit.curve_type.value}
                params.update({k: round(v, 4) for k, v in fit.parameters.items()})
                params['R²'] = round(fit.r_squared, 4)
                params_list.append(params)
        
        return pd.DataFrame(params_list)
