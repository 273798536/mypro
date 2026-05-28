import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import rcParams
import os
from typing import Dict, List, Optional
from datetime import datetime
from .calculator import VaRResult

rcParams['font.sans-serif'] = ['Arial Unicode MS', 'SimHei', 'DejaVu Sans']
rcParams['axes.unicode_minus'] = False


class ReportGenerator:
    """VaR报告生成器"""
    
    def __init__(self, output_dir: str):
        self.output_dir = output_dir
        self._ensure_output_dir()
    
    def _ensure_output_dir(self):
        """确保输出目录存在"""
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)
    
    def _get_timestamp(self) -> str:
        """生成时间戳"""
        return datetime.now().strftime("%Y%m%d_%H%M%S")
    
    def generate_text_report(self, hs_result: VaRResult, param_result: VaRResult,
                            validation_result: Dict, config: Dict) -> str:
        """生成文本报告"""
        timestamp = self._get_timestamp()
        report_path = os.path.join(self.output_dir, f"var_report_{timestamp}.txt")
        
        lines = []
        lines.append("="*70)
        lines.append("                    风险价值 (VaR) 计算报告")
        lines.append("="*70)
        lines.append(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append(f"组合市值: {config.get('portfolio_value', 1_000_000):,.2f} 元")
        lines.append("")
        
        lines.append("-"*70)
        lines.append("📋 配置参数")
        lines.append("-"*70)
        lines.append(f"  置信度: {config.get('confidence_level', 0.95):.2%}")
        lines.append(f"  历史窗口: {config.get('window_days', 252)} 天")
        lines.append(f"  资产权重: {config.get('weights', {})}")
        lines.append("")
        
        if validation_result["has_warnings"] or validation_result["errors"]:
            lines.append("-"*70)
            lines.append("⚠️  数据质量警告/错误")
            lines.append("-"*70)
            
            for err in validation_result["errors"]:
                lines.append(f"  ❌ [{err['type']}] {err['message']}")
                lines.append(f"     详情: {err['detail']}")
                lines.append(f"     建议: {err['recommendation']}")
                lines.append("")
            
            for warn in validation_result["warnings"]:
                lines.append(f"  ⚠️  [{warn['type']}] {warn['message']}")
                lines.append(f"     详情: {warn['detail']}")
                lines.append(f"     建议: {warn['recommendation']}")
                lines.append("")
        
        lines.append("-"*70)
        lines.append("📊 VaR 计算结果对比")
        lines.append("-"*70)
        lines.append("")
        
        lines.append("  【历史模拟法】")
        lines.append(f"    VaR (绝对): {hs_result.var_value:,.2f} 元")
        lines.append(f"    VaR (相对): {hs_result.var_percent:.4f}%")
        lines.append(f"    期望亏空 (ES): {hs_result.expected_shortfall:,.2f} 元")
        lines.append(f"    VaR对应收益率: {hs_result.details['var_return_level']:.6f}")
        lines.append("")
        
        lines.append("  【参数法 (方差-协方差)】")
        lines.append(f"    VaR (绝对): {param_result.var_value:,.2f} 元")
        lines.append(f"    VaR (相对): {param_result.var_percent:.4f}%")
        lines.append(f"    期望亏空 (ES): {param_result.expected_shortfall:,.2f} 元")
        lines.append(f"    Z分数: {param_result.details['z_score']:.4f}")
        lines.append(f"    组合均值: {param_result.details['portfolio_mean']:.6f}")
        lines.append(f"    组合标准差: {param_result.details['portfolio_std']:.6f}")
        lines.append("")
        
        diff_pct = abs(hs_result.var_value - param_result.var_value) / hs_result.var_value * 100
        lines.append("  【方法差异分析】")
        lines.append(f"    绝对差异: {abs(hs_result.var_value - param_result.var_value):,.2f} 元")
        lines.append(f"    相对差异: {diff_pct:.2f}%")
        if diff_pct > 5:
            lines.append(f"    ⚠️  差异较大，建议检查数据分布是否符合正态假设")
        lines.append("")
        
        lines.append("-"*70)
        lines.append("📈 最差10个交易日 (历史模拟法)")
        lines.append("-"*70)
        lines.append(f"  {'日期':<12} {'收益率':>12} {'累计损失(万元)':>15}")
        lines.append("  " + "-"*45)
        for i, day in enumerate(hs_result.details["worst_10_days"], 1):
            loss = abs(day['return']) * config.get('portfolio_value', 1_000_000) / 10000
            lines.append(f"  {day['date']:<12} {day['return']:>12.4%} {loss:>15,.2f}")
        lines.append("")
        
        if hs_result.details.get("stress_impact"):
            lines.append("-"*70)
            lines.append("🔴 压力日影响分析")
            lines.append("-"*70)
            for day, impact in hs_result.details["stress_impact"].items():
                loss = abs(min(0, impact['portfolio_return'])) * config.get('portfolio_value', 1_000_000)
                lines.append(f"  {day}:")
                lines.append(f"    组合收益率: {impact['portfolio_return']:.4%}")
                lines.append(f"    潜在损失: {loss:,.2f} 元")
                lines.append(f"    各资产表现: {impact['asset_returns']}")
                lines.append("")
        
        lines.append("-"*70)
        lines.append("🧩 资产VaR贡献分解 (参数法)")
        lines.append("-"*70)
        lines.append(f"  {'资产':<10} {'权重':>8} {'边际VaR':>12} {'成分VaR':>12} {'贡献占比':>10}")
        lines.append("  " + "-"*55)
        for asset, contrib in param_result.details["asset_contributions"].items():
            lines.append(
                f"  {asset:<10} {contrib['weight']:>8.2%} "
                f"{contrib['marginal_var']:>12.6f} {contrib['component_var']:>12.6f} "
                f"{contrib['contribution_pct']:>9.2f}%"
            )
        lines.append("")
        
        lines.append("-"*70)
        lines.append("🔍 计算来源追踪")
        lines.append("-"*70)
        for i, trace in enumerate(hs_result.source_trace, 1):
            lines.append(f"  {i}. {trace}")
        lines.append("")
        
        lines.append("="*70)
        lines.append("报告结束")
        lines.append("="*70)
        
        report_content = "\n".join(lines)
        
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(report_content)
        
        return report_path
    
    def generate_charts(self, returns: pd.DataFrame, weights: Dict[str, float],
                       hs_result: VaRResult, param_result: VaRResult,
                       config: Dict) -> Dict[str, str]:
        """生成图表"""
        timestamp = self._get_timestamp()
        chart_paths = {}
        
        norm_weights = {k: v / sum(weights.values()) for k, v in weights.items()}
        portfolio_returns = returns.tail(config.get('window_days', 252)).copy()
        portfolio_returns = portfolio_returns[list(norm_weights.keys())]
        portfolio_returns = portfolio_returns.multiply(
            pd.Series(norm_weights), axis=1
        ).sum(axis=1).dropna()
        
        chart_paths['distribution'] = self._plot_distribution(
            portfolio_returns, hs_result, param_result, timestamp
        )
        
        chart_paths['rolling_window'] = self._plot_rolling_window(
            returns, weights, config, timestamp
        )
        
        chart_paths['asset_weights'] = self._plot_asset_weights(
            norm_weights, timestamp
        )
        
        chart_paths['var_sensitivity'] = self._plot_var_sensitivity(
            returns, weights, timestamp
        )
        
        return chart_paths
    
    def _plot_distribution(self, portfolio_returns: pd.Series,
                          hs_result: VaRResult, param_result: VaRResult,
                          timestamp: str) -> str:
        """绘制收益率分布图"""
        fig, ax = plt.subplots(figsize=(12, 6))
        
        n, bins, patches = ax.hist(portfolio_returns, bins=50, density=True,
                                   alpha=0.7, color='skyblue', edgecolor='black',
                                   label='收益率分布')
        
        from scipy.stats import norm
        mu, std = norm.fit(portfolio_returns)
        x = np.linspace(bins[0], bins[-1], 100)
        p = norm.pdf(x, mu, std)
        ax.plot(x, p, 'r--', linewidth=2, label=f'正态拟合 (μ={mu:.4f}, σ={std:.4f})')
        
        hs_var_level = hs_result.details['var_return_level']
        param_var_level = param_result.details['var_return_level']
        
        ax.axvline(x=hs_var_level, color='orange', linestyle='-', linewidth=2,
                   label=f'历史模拟VaR ({hs_var_level:.4%})')
        ax.axvline(x=param_var_level, color='green', linestyle='--', linewidth=2,
                   label=f'参数法VaR ({param_var_level:.4%})')
        
        ax.set_xlabel('日收益率')
        ax.set_ylabel('概率密度')
        ax.set_title(f'投资组合收益率分布 (置信度 {hs_result.confidence_level:.0%})')
        ax.legend()
        ax.grid(True, alpha=0.3)
        
        plt.tight_layout()
        path = os.path.join(self.output_dir, f"distribution_{timestamp}.png")
        plt.savefig(path, dpi=150, bbox_inches='tight')
        plt.close()
        
        return path
    
    def _plot_rolling_window(self, returns: pd.DataFrame, weights: Dict[str, float],
                            config: Dict, timestamp: str) -> str:
        """绘制滚动窗口VaR对比"""
        fig, ax = plt.subplots(figsize=(12, 6))
        
        window_days = config.get('window_days', 252)
        confidence = config.get('confidence_level', 0.95)
        norm_weights = {k: v / sum(weights.values()) for k, v in weights.items()}
        
        portfolio_returns = returns[list(norm_weights.keys())].copy()
        portfolio_returns = portfolio_returns.multiply(
            pd.Series(norm_weights), axis=1
        ).sum(axis=1).dropna()
        
        rolling_var_hs = portfolio_returns.rolling(window=window_days).quantile(1 - confidence)
        rolling_mean = portfolio_returns.rolling(window=window_days).mean()
        rolling_std = portfolio_returns.rolling(window=window_days).std()
        
        from scipy.stats import norm
        z_score = norm.ppf(1 - confidence)
        rolling_var_param = rolling_mean + z_score * rolling_std
        
        ax.plot(portfolio_returns.index, -rolling_var_hs * 100, 
                label=f'历史模拟VaR ({window_days}天窗口)', 
                color='orange', linewidth=1.5)
        ax.plot(portfolio_returns.index, -rolling_var_param * 100, 
                label=f'参数法VaR ({window_days}天窗口)', 
                color='green', linewidth=1.5, linestyle='--')
        
        actual_losses = -portfolio_returns * 100
        violation_dates = actual_losses[actual_losses > (-rolling_var_hs * 100)]
        ax.scatter(violation_dates.index, violation_dates.values, 
                   color='red', s=30, zorder=5, label='违反观测')
        
        ax.set_xlabel('日期')
        ax.set_ylabel('VaR (%)')
        ax.set_title(f'滚动窗口VaR对比 (置信度 {confidence:.0%})')
        ax.legend()
        ax.grid(True, alpha=0.3)
        plt.xticks(rotation=45)
        
        plt.tight_layout()
        path = os.path.join(self.output_dir, f"rolling_var_{timestamp}.png")
        plt.savefig(path, dpi=150, bbox_inches='tight')
        plt.close()
        
        return path
    
    def _plot_asset_weights(self, weights: Dict[str, float], timestamp: str) -> str:
        """绘制资产权重饼图"""
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))
        
        colors = plt.cm.Set3(np.linspace(0, 1, len(weights)))
        
        wedges, texts, autotexts = ax1.pie(
            weights.values(), labels=weights.keys(), autopct='%1.1f%%',
            colors=colors, startangle=90
        )
        ax1.set_title('资产权重分布')
        
        ax2.bar(weights.keys(), [w * 100 for w in weights.values()], color=colors)
        ax2.set_xlabel('资产')
        ax2.set_ylabel('权重 (%)')
        ax2.set_title('资产权重柱状图')
        ax2.grid(True, alpha=0.3, axis='y')
        plt.xticks(rotation=45)
        
        plt.tight_layout()
        path = os.path.join(self.output_dir, f"asset_weights_{timestamp}.png")
        plt.savefig(path, dpi=150, bbox_inches='tight')
        plt.close()
        
        return path
    
    def _plot_var_sensitivity(self, returns: pd.DataFrame, weights: Dict[str, float],
                             timestamp: str) -> str:
        """绘制VaR敏感性分析（不同窗口和置信度）"""
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))
        
        norm_weights = {k: v / sum(weights.values()) for k, v in weights.items()}
        portfolio_returns = returns[list(norm_weights.keys())].copy()
        portfolio_returns = portfolio_returns.multiply(
            pd.Series(norm_weights), axis=1
        ).sum(axis=1).dropna()
        
        windows = [60, 120, 252, 504, 756]
        confidences = [0.90, 0.95, 0.99, 0.999]
        
        hs_vars_window = []
        param_vars_window = []
        
        from scipy.stats import norm
        
        for w in windows:
            if len(portfolio_returns) >= w:
                data = portfolio_returns.tail(w)
                hs_var = data.quantile(0.05)
                mu, std = data.mean(), data.std()
                param_var = mu + norm.ppf(0.05) * std
                hs_vars_window.append(-hs_var * 100)
                param_vars_window.append(-param_var * 100)
        
        ax1.plot(windows[:len(hs_vars_window)], hs_vars_window, 
                 marker='o', label='历史模拟法', linewidth=2)
        ax1.plot(windows[:len(param_vars_window)], param_vars_window, 
                 marker='s', label='参数法', linewidth=2, linestyle='--')
        ax1.set_xlabel('历史窗口 (天)')
        ax1.set_ylabel('95% VaR (%)')
        ax1.set_title('VaR vs 历史窗口大小')
        ax1.legend()
        ax1.grid(True, alpha=0.3)
        
        hs_vars_conf = []
        param_vars_conf = []
        data = portfolio_returns.tail(252)
        
        for conf in confidences:
            hs_var = data.quantile(1 - conf)
            mu, std = data.mean(), data.std()
            param_var = mu + norm.ppf(1 - conf) * std
            hs_vars_conf.append(-hs_var * 100)
            param_vars_conf.append(-param_var * 100)
        
        ax2.plot([f"{c:.0%}" for c in confidences], hs_vars_conf, 
                 marker='o', label='历史模拟法', linewidth=2)
        ax2.plot([f"{c:.0%}" for c in confidences], param_vars_conf, 
                 marker='s', label='参数法', linewidth=2, linestyle='--')
        ax2.set_xlabel('置信度')
        ax2.set_ylabel('VaR (%)')
        ax2.set_title('VaR vs 置信度 (252天窗口)')
        ax2.legend()
        ax2.grid(True, alpha=0.3)
        
        plt.tight_layout()
        path = os.path.join(self.output_dir, f"var_sensitivity_{timestamp}.png")
        plt.savefig(path, dpi=150, bbox_inches='tight')
        plt.close()
        
        return path
