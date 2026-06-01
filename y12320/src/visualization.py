import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import numpy as np
import pandas as pd
from scipy.stats import norm
from typing import List, Optional, Dict, Tuple

from .curve_fitting import NonlinearPricingFitter, CurveType, PricePointData
from .sensitivity_analysis import PriceSensitivityAnalyzer, SensitivityResult
from .group_analysis import GroupComparisonResult


class PricingVisualizer:
    def __init__(self, color_palette: Optional[List[str]] = None):
        self.color_palette = color_palette or ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd']

    def plot_price_conversion_scatter(self, price_points: List[PricePointData],
                                      title: str = "价格-转化率散点图") -> go.Figure:
        prices = [p.price for p in price_points]
        conv_rates = [p.conversion_rate for p in price_points]
        sample_sizes = [p.sample_size for p in price_points]
        ci_lower = [p.ci_lower for p in price_points]
        ci_upper = [p.ci_upper for p in price_points]

        fig = go.Figure()

        fig.add_trace(go.Scatter(
            x=prices,
            y=conv_rates,
            mode='markers',
            marker=dict(
                size=[max(10, min(s / 5, 40)) for s in sample_sizes],
                color=self.color_palette[0],
                opacity=0.7,
                line=dict(width=1, color='white')
            ),
            text=[f"价格: {p}<br>转化率: {cr:.2%}<br>样本量: {n}"
                  for p, cr, n in zip(prices, conv_rates, sample_sizes)],
            hoverinfo='text',
            name='观测值'
        ))

        for i, p in enumerate(price_points):
            fig.add_trace(go.Scatter(
                x=[p.price, p.price],
                y=[p.ci_lower, p.ci_upper],
                mode='lines',
                line=dict(color='gray', width=1),
                showlegend=False,
                hoverinfo='skip'
            ))

        fig.update_layout(
            title=title,
            xaxis_title='价格',
            yaxis_title='转化率',
            yaxis_tickformat='.1%',
            showlegend=True,
            template='plotly_white'
        )

        return fig

    def plot_fitted_curves(self, fitter: NonlinearPricingFitter,
                           show_all_curves: bool = False,
                           n_points: int = 200) -> go.Figure:
        if not fitter.fit_results:
            raise ValueError("需要先进行曲线拟合")

        price_min, price_max = fitter.fit_results[list(fitter.fit_results.keys())[0]].price_range
        test_prices = np.linspace(price_min, price_max, n_points)

        fig = go.Figure()

        if fitter.price_points:
            prices = [p.price for p in fitter.price_points]
            conv_rates = [p.conversion_rate for p in fitter.price_points]
            sample_sizes = [p.sample_size for p in fitter.price_points]

            fig.add_trace(go.Scatter(
                x=prices,
                y=conv_rates,
                mode='markers',
                marker=dict(
                    size=[max(8, min(s / 10, 30)) for s in sample_sizes],
                    color='black',
                    symbol='circle',
                    opacity=0.6
                ),
                name='观测数据',
                hovertemplate='价格: %{x}<br>转化率: %{y:.2%}<extra></extra>'
            ))

        curves_to_plot = list(fitter.fit_results.keys()) if show_all_curves else [fitter.best_fit]
        
        for i, curve_type in enumerate(curves_to_plot):
            if curve_type is None:
                continue
            result = fitter.fit_results[curve_type]
            predicted_conv = fitter.predict(test_prices, curve_type)
            
            color = self.color_palette[i % len(self.color_palette)]
            name = f"{curve_type.value} (R²={result.r_squared:.3f})"
            if curve_type == fitter.best_fit:
                name = "最优" + name
            
            fig.add_trace(go.Scatter(
                x=test_prices,
                y=predicted_conv,
                mode='lines',
                line=dict(color=color, width=3 if curve_type == fitter.best_fit else 2),
                name=name
            ))

        fig.update_layout(
            title='非线性曲线拟合结果',
            xaxis_title='价格',
            yaxis_title='转化率',
            yaxis_tickformat='.1%',
            legend=dict(orientation='h', yanchor='bottom', y=1.02, xanchor='right', x=1),
            template='plotly_white'
        )

        return fig

    def plot_sensitivity_analysis(self, sensitivity_result: SensitivityResult) -> go.Figure:
        prices = [sp.price for sp in sensitivity_result.sensitivity_points]
        elasticities = [sp.elasticity for sp in sensitivity_result.sensitivity_points]
        ci_lower = [sp.confidence_interval[0] for sp in sensitivity_result.sensitivity_points]
        ci_upper = [sp.confidence_interval[1] for sp in sensitivity_result.sensitivity_points]
        sensitivity_levels = [sp.sensitivity_level for sp in sensitivity_result.sensitivity_points]

        level_colors = {'高敏感': '#d62728', '中敏感': '#ff7f0e', '低敏感': '#2ca02c'}

        fig = make_subplots(rows=2, cols=1,
                            subplot_titles=('价格弹性系数', '敏感度等级分布'),
                            vertical_spacing=0.12)

        fig.add_trace(go.Scatter(
            x=prices,
            y=elasticities,
            mode='lines',
            line=dict(color=self.color_palette[0], width=2),
            name='弹性系数'
        ), row=1, col=1)

        fig.add_trace(go.Scatter(
            x=prices + prices[::-1],
            y=ci_upper + ci_lower[::-1],
            fill='toself',
            fillcolor=self.color_palette[0],
            opacity=0.2,
            line=dict(color='rgba(255,255,255,0)'),
            name='95%置信区间'
        ), row=1, col=1)

        fig.add_shape(type='line', x0=prices[0], y0=0, x1=prices[-1], y1=0,
                      line=dict(dash='dash', color='gray'), row=1, col=1)

        for level in ['高敏感', '中敏感', '低敏感']:
            mask = [s == level for s in sensitivity_levels]
            if any(mask):
                level_prices = [p for p, m in zip(prices, mask) if m]
                level_elast = [e for e, m in zip(elasticities, mask) if m]
                fig.add_trace(go.Scatter(
                    x=level_prices,
                    y=level_elast,
                    mode='markers',
                    marker=dict(color=level_colors[level], size=6),
                    name=level,
                    legendgroup='sensitivity'
                ), row=1, col=1)

        level_counts = {level: sensitivity_levels.count(level) for level in ['高敏感', '中敏感', '低敏感']}
        fig.add_trace(go.Bar(
            x=list(level_counts.keys()),
            y=list(level_counts.values()),
            marker_color=[level_colors[level] for level in level_counts.keys()],
            name='价格点数量',
            showlegend=False
        ), row=2, col=1)

        fig.update_layout(
            title='价格敏感度分析',
            height=700,
            template='plotly_white',
            showlegend=True
        )

        fig.update_yaxes(title_text='弹性系数', row=1, col=1)
        fig.update_yaxes(title_text='价格点数量', row=2, col=1)
        fig.update_xaxes(title_text='价格', row=1, col=1)
        fig.update_xaxes(title_text='敏感度等级', row=2, col=1)

        return fig

    def plot_group_comparison(self, group_result: GroupComparisonResult,
                              n_points: int = 200) -> go.Figure:
        fig = make_subplots(rows=1, cols=2,
                            subplot_titles=('分组拟合曲线对比', '分组转化率对比'),
                            horizontal_spacing=0.15)

        price_min = float('inf')
        price_max = float('-inf')
        for result in group_result.group_results.values():
            if result.fitter.best_fit:
                pr = result.fitter.fit_results[result.fitter.best_fit].price_range
                price_min = min(price_min, pr[0])
                price_max = max(price_max, pr[1])

        if price_min == float('inf'):
            price_min, price_max = 0, 100

        test_prices = np.linspace(price_min, price_max, n_points)

        for i, (group_name, result) in enumerate(group_result.group_results.items()):
            color = self.color_palette[i % len(self.color_palette)]
            
            if result.fitter.best_fit and result.fitter.price_points:
                predicted_conv = result.fitter.predict(test_prices, result.fitter.best_fit)
                
                fig.add_trace(go.Scatter(
                    x=test_prices,
                    y=predicted_conv,
                    mode='lines',
                    line=dict(color=color, width=2),
                    name=group_name,
                    legendgroup='curves'
                ), row=1, col=1)

                obs_prices = [p.price for p in result.fitter.price_points]
                obs_conv = [p.conversion_rate for p in result.fitter.price_points]
                
                fig.add_trace(go.Scatter(
                    x=obs_prices,
                    y=obs_conv,
                    mode='markers',
                    marker=dict(color=color, size=8, opacity=0.7),
                    showlegend=False,
                    legendgroup='curves'
                ), row=1, col=1)

        group_names = list(group_result.group_results.keys())
        conv_rates = [r.stats.conversion_rate for r in group_result.group_results.values()]
        sample_sizes = [r.stats.size for r in group_result.group_results.values()]

        fig.add_trace(go.Bar(
            x=group_names,
            y=conv_rates,
            marker_color=[self.color_palette[i % len(self.color_palette)] for i in range(len(group_names))],
            text=[f"{cr:.2%}<br>(n={n})" for cr, n in zip(conv_rates, sample_sizes)],
            textposition='auto',
            showlegend=False
        ), row=1, col=2)

        fig.update_layout(
            title='分组对比分析',
            height=500,
            template='plotly_white'
        )

        fig.update_yaxes(title_text='转化率', tickformat='.1%', row=1, col=1)
        fig.update_yaxes(title_text='转化率', tickformat='.1%', row=1, col=2)
        fig.update_xaxes(title_text='价格', row=1, col=1)
        fig.update_xaxes(title_text='分组', row=1, col=2)

        return fig

    def plot_residual_analysis(self, fitter: NonlinearPricingFitter) -> go.Figure:
        if not fitter.fit_results or fitter.best_fit is None:
            raise ValueError("需要先进行曲线拟合")

        result = fitter.fit_results[fitter.best_fit]
        residuals = result.residuals
        fitted_values = result.fitted_values
        
        if fitter.price_points:
            prices = [p.price for p in fitter.price_points]
        else:
            prices = np.arange(len(residuals))

        fig = make_subplots(rows=2, cols=2,
                            subplot_titles=('残差 vs 拟合值', '残差直方图',
                                            '残差 vs 价格', '残差Q-Q图'),
                            vertical_spacing=0.15,
                            horizontal_spacing=0.12)

        fig.add_trace(go.Scatter(
            x=fitted_values,
            y=residuals,
            mode='markers',
            marker=dict(color=self.color_palette[0], size=8),
            showlegend=False
        ), row=1, col=1)

        fig.add_shape(type='line', x0=fitted_values.min(), y0=0,
                      x1=fitted_values.max(), y1=0,
                      line=dict(dash='dash', color='red'), row=1, col=1)

        fig.add_trace(go.Histogram(
            x=residuals,
            nbinsx=20,
            marker_color=self.color_palette[1],
            showlegend=False
        ), row=1, col=2)

        fig.add_trace(go.Scatter(
            x=prices,
            y=residuals,
            mode='markers',
            marker=dict(color=self.color_palette[2], size=8),
            showlegend=False
        ), row=2, col=1)

        fig.add_shape(type='line', x0=prices[0], y0=0, x1=prices[-1], y1=0,
                      line=dict(dash='dash', color='red'), row=2, col=1)

        sorted_residuals = np.sort(residuals)
        theoretical_quantiles = norm.ppf(np.linspace(0.01, 0.99, len(sorted_residuals)))
        
        fig.add_trace(go.Scatter(
            x=theoretical_quantiles,
            y=sorted_residuals,
            mode='markers',
            marker=dict(color=self.color_palette[3], size=8),
            showlegend=False
        ), row=2, col=2)

        slope, intercept = np.polyfit(theoretical_quantiles, sorted_residuals, 1)
        fig.add_trace(go.Scatter(
            x=theoretical_quantiles,
            y=slope * theoretical_quantiles + intercept,
            mode='lines',
            line=dict(color='red', dash='dash'),
            showlegend=False
        ), row=2, col=2)

        fig.update_layout(
            title='残差分析 - ' + fitter.best_fit.value,
            height=600,
            template='plotly_white'
        )

        fig.update_xaxes(title_text='拟合值', row=1, col=1)
        fig.update_xaxes(title_text='残差', row=1, col=2)
        fig.update_xaxes(title_text='价格', row=2, col=1)
        fig.update_xaxes(title_text='理论分位数', row=2, col=2)

        fig.update_yaxes(title_text='残差', row=1, col=1)
        fig.update_yaxes(title_text='频数', row=1, col=2)
        fig.update_yaxes(title_text='残差', row=2, col=1)
        fig.update_yaxes(title_text='观测残差', row=2, col=2)

        return fig

    def plot_elasticity_heatmap(self, df: pd.DataFrame, 
                                  price_bins: int = 10,
                                  size_bins: int = 5) -> go.Figure:
        df_binned = df.copy()
        df_binned['price_bin'] = pd.qcut(df_binned['price'], q=price_bins, duplicates='drop')
        df_binned['size_bin'] = pd.qcut(df_binned['customer_size'], q=size_bins, duplicates='drop')

        pivot = df_binned.groupby(['price_bin', 'size_bin'])['converted'].mean().reset_index()
        pivot_table = pivot.pivot(index='size_bin', columns='price_bin', values='converted')

        pivot_table.index = pivot_table.index.astype(str)
        pivot_table.columns = pivot_table.columns.astype(str)

        fig = go.Figure(data=go.Heatmap(
            z=pivot_table.values,
            x=pivot_table.columns.tolist(),
            y=pivot_table.index.tolist(),
            colorscale='RdYlGn_r',
            text=np.round(pivot_table.values * 100, 1),
            texttemplate='%{text}%',
            textfont={"size": 10},
            hovertemplate='价格区间: %{x}<br>客户规模区间: %{y}<br>转化率: %{z:.2%}<extra></extra>'
        ))

        fig.update_layout(
            title='价格-客户规模转化率热力图',
            xaxis_title='价格区间',
            yaxis_title='客户规模区间',
            template='plotly_white'
        )

        return fig
