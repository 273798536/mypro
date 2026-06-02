import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')
from matplotlib import rcParams
rcParams['font.sans-serif'] = ['Arial Unicode MS', 'SimHei', 'DejaVu Sans']
rcParams['axes.unicode_minus'] = False
from typing import List, Dict, Optional, Tuple
from pathlib import Path
import json
import base64
from io import BytesIO

from .types import (
    CompleteAnalysis, DemandForecast, SimulationTrajectory,
    RiskMetrics, ReplenishmentAdvice, ResultClassification,
    RiskLevel, DataIssue, IssueSeverity, PipelineState,
    SalesHistory, SupplyCycle, InventoryStatus, SimulationConfig
)


def _figure_to_base64(fig) -> str:
    buf = BytesIO()
    fig.savefig(buf, format='png', dpi=150, bbox_inches='tight')
    buf.seek(0)
    img_base64 = base64.b64encode(buf.read()).decode('utf-8')
    plt.close(fig)
    return img_base64


def plot_demand_distribution(forecast: DemandForecast, save_path: Optional[str] = None) -> Tuple[plt.Figure, str]:
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    
    historical = np.array(forecast.historical_demand)
    axes[0].hist(historical, bins=30, alpha=0.7, density=True, label='历史需求', color='#3498db')
    
    x = np.linspace(0, max(historical) * 1.2, 200)
    from scipy import stats
    if forecast.distribution_type == 'poisson':
        x_pmf = np.arange(0, max(historical) * 1.2)
        pmf = stats.poisson.pmf(x_pmf, forecast.parameters['mu'])
        axes[0].step(x_pmf, pmf, 'r-', linewidth=2, label=f'Poisson(λ={forecast.parameters["mu"]:.2f})')
    elif forecast.distribution_type == 'negative_binomial':
        x_pmf = np.arange(0, max(historical) * 1.2)
        pmf = stats.nbinom.pmf(x_pmf, forecast.parameters['n'], forecast.parameters['p'])
        axes[0].step(x_pmf, pmf, 'r-', linewidth=2, label=f'NB(n={forecast.parameters["n"]:.2f}, p={forecast.parameters["p"]:.3f})')
    elif forecast.distribution_type == 'gamma':
        pdf = stats.gamma.pdf(x, forecast.parameters['a'], loc=forecast.parameters.get('loc', 0), scale=forecast.parameters['scale'])
        axes[0].plot(x, pdf, 'r-', linewidth=2, label=f'Gamma(shape={forecast.parameters["a"]:.2f}, scale={forecast.parameters["scale"]:.2f})')
    elif forecast.distribution_type == 'lognormal':
        pdf = stats.lognorm.pdf(x, forecast.parameters['s'], loc=forecast.parameters.get('loc', 0), scale=forecast.parameters['scale'])
        axes[0].plot(x, pdf, 'r-', linewidth=2, label=f'Lognorm(s={forecast.parameters["s"]:.2f})')
    else:
        pdf = stats.norm.pdf(x, forecast.parameters['loc'], forecast.parameters['scale'])
        axes[0].plot(x, pdf, 'r-', linewidth=2, label=f'Normal(μ={forecast.parameters["loc"]:.2f}, σ={forecast.parameters["scale"]:.2f})')
    
    axes[0].set_xlabel('日需求量（件）')
    axes[0].set_ylabel('概率密度')
    axes[0].set_title(f'需求分布拟合 - {forecast.sku}')
    axes[0].legend()
    axes[0].grid(alpha=0.3)
    
    dates = forecast.forecast_dates
    quantiles = forecast.forecast_quantiles
    axes[1].fill_between(dates, quantiles[0.05], quantiles[0.95], alpha=0.2, color='#e74c3c', label='90%区间')
    axes[1].fill_between(dates, quantiles[0.25], quantiles[0.75], alpha=0.4, color='#f39c12', label='50%区间')
    axes[1].plot(dates, quantiles[0.5], 'r-', linewidth=2, label='中位数预测')
    axes[1].set_xlabel('日期')
    axes[1].set_ylabel('预测需求量（件）')
    axes[1].set_title(f'未来{len(dates)}天需求预测区间')
    axes[1].legend()
    axes[1].grid(alpha=0.3)
    plt.setp(axes[1].xaxis.get_majorticklabels(), rotation=45)
    
    fig.tight_layout()
    
    if save_path:
        fig.savefig(save_path, dpi=150, bbox_inches='tight')
    
    img_base64 = _figure_to_base64(fig)
    return fig, img_base64


def plot_inventory_trajectories(
    trajectories: List[SimulationTrajectory],
    inventory: InventoryStatus,
    config: SimulationConfig,
    save_path: Optional[str] = None,
    max_plot: int = 100
) -> Tuple[plt.Figure, str]:
    fig, axes = plt.subplots(2, 2, figsize=(16, 10))
    
    dates = trajectories[0].dates
    n_traj = min(max_plot, len(trajectories))
    
    sample_traj = np.random.choice(trajectories, n_traj, replace=False)
    
    for traj in sample_traj:
        color = '#e74c3c' if any(traj.negative_inventory_days) else '#3498db'
        alpha = 0.3 if any(traj.negative_inventory_days) else 0.15
        axes[0, 0].plot(dates, traj.inventory_level, color=color, alpha=alpha, linewidth=1)
    
    axes[0, 0].axhline(y=0, color='black', linestyle='--', linewidth=1, label='零库存线')
    axes[0, 0].axhline(y=inventory.safety_stock, color='#e67e22', linestyle='--', linewidth=1.5, label=f'安全库存={inventory.safety_stock:.0f}')
    axes[0, 0].axhline(y=inventory.reorder_point, color='#9b59b6', linestyle=':', linewidth=1.5, label=f'订货点={inventory.reorder_point:.0f}')
    axes[0, 0].axhline(y=inventory.current_stock, color='#27ae60', linestyle='-', linewidth=2, label=f'期初库存={inventory.current_stock:.0f}')
    axes[0, 0].set_xlabel('日期')
    axes[0, 0].set_ylabel('库存水平（件）')
    axes[0, 0].set_title(f'库存水平模拟轨迹（{n_traj}条样本，红色表示出现负库存）')
    axes[0, 0].legend(loc='upper right')
    axes[0, 0].grid(alpha=0.3)
    plt.setp(axes[0, 0].xaxis.get_majorticklabels(), rotation=45)
    
    all_inv_levels = np.array([traj.inventory_level for traj in trajectories])
    inv_mean = np.mean(all_inv_levels, axis=0)
    inv_p5 = np.percentile(all_inv_levels, 5, axis=0)
    inv_p25 = np.percentile(all_inv_levels, 25, axis=0)
    inv_p75 = np.percentile(all_inv_levels, 75, axis=0)
    inv_p95 = np.percentile(all_inv_levels, 95, axis=0)
    
    axes[0, 1].fill_between(dates, inv_p5, inv_p95, alpha=0.2, color='#e74c3c', label='90%区间')
    axes[0, 1].fill_between(dates, inv_p25, inv_p75, alpha=0.4, color='#f39c12', label='50%区间')
    axes[0, 1].plot(dates, inv_mean, 'b-', linewidth=2, label='均值')
    axes[0, 1].axhline(y=0, color='black', linestyle='--', linewidth=1)
    axes[0, 1].axhline(y=inventory.safety_stock, color='#e67e22', linestyle='--', linewidth=1.5)
    axes[0, 1].set_xlabel('日期')
    axes[0, 1].set_ylabel('库存水平（件）')
    axes[0, 1].set_title('库存水平分位数轨迹')
    axes[0, 1].legend()
    axes[0, 1].grid(alpha=0.3)
    plt.setp(axes[0, 1].xaxis.get_majorticklabels(), rotation=45)
    
    stockout_by_day = np.mean([[1 if s else 0 for s in traj.stockout_days] for traj in trajectories], axis=0)
    negative_by_day = np.mean([[1 if n else 0 for n in traj.negative_inventory_days] for traj in trajectories], axis=0)
    
    axes[1, 0].plot(dates, stockout_by_day * 100, 'b-', linewidth=2, label='缺货概率')
    axes[1, 0].plot(dates, negative_by_day * 100, 'r-', linewidth=2, label='负库存概率')
    axes[1, 0].fill_between(dates, stockout_by_day * 100, alpha=0.3, color='#3498db')
    axes[1, 0].fill_between(dates, negative_by_day * 100, alpha=0.3, color='#e74c3c')
    axes[1, 0].axhline(y=5, color='#e67e22', linestyle='--', label='5%风险阈值')
    axes[1, 0].set_xlabel('日期')
    axes[1, 0].set_ylabel('概率（%）')
    axes[1, 0].set_title('逐日缺货/负库存概率')
    axes[1, 0].legend()
    axes[1, 0].grid(alpha=0.3)
    plt.setp(axes[1, 0].xaxis.get_majorticklabels(), rotation=45)
    
    total_stockout_days = [sum(t.stockout_days) for t in trajectories]
    total_negative_days = [sum(t.negative_inventory_days) for t in trajectories]
    bins = range(0, max(total_stockout_days) + 2, 1)
    
    axes[1, 1].hist(total_stockout_days, bins=bins, alpha=0.6, label='缺货天数', color='#3498db', density=True)
    axes[1, 1].hist(total_negative_days, bins=bins, alpha=0.6, label='负库存天数', color='#e74c3c', density=True)
    axes[1, 1].axvline(np.mean(total_stockout_days), color='#3498db', linestyle='--', linewidth=2, label=f'平均缺货={np.mean(total_stockout_days):.1f}天')
    axes[1, 1].axvline(np.mean(total_negative_days), color='#e74c3c', linestyle='--', linewidth=2, label=f'平均负库存={np.mean(total_negative_days):.1f}天')
    axes[1, 1].set_xlabel('天数')
    axes[1, 1].set_ylabel('概率密度')
    axes[1, 1].set_title('{config.horizon_days}天内缺货/负库存天数分布'.format(config=config))
    axes[1, 1].legend()
    axes[1, 1].grid(alpha=0.3)
    
    fig.tight_layout()
    
    if save_path:
        fig.savefig(save_path, dpi=150, bbox_inches='tight')
    
    img_base64 = _figure_to_base64(fig)
    return fig, img_base64


def plot_risk_analysis(
    risk_metrics: RiskMetrics,
    classification: ResultClassification,
    save_path: Optional[str] = None
) -> Tuple[plt.Figure, str]:
    fig, axes = plt.subplots(2, 2, figsize=(14, 10))
    
    risk_items = ['缺货概率', '负库存概率', '延迟到货概率']
    risk_values = [
        risk_metrics.stockout_probability * 100,
        risk_metrics.negative_inventory_probability * 100,
        risk_metrics.delayed_order_probability * 100
    ]
    colors = ['#e74c3c' if v > 20 else '#f39c12' if v > 10 else '#27ae60' for v in risk_values]
    
    bars = axes[0, 0].bar(risk_items, risk_values, color=colors, alpha=0.8)
    axes[0, 0].set_ylabel('概率（%）')
    axes[0, 0].set_title('风险概率指标')
    axes[0, 0].axhline(y=10, color='orange', linestyle='--', label='10%警戒')
    axes[0, 0].axhline(y=20, color='red', linestyle='--', label='20%高危')
    axes[0, 0].legend()
    axes[0, 0].grid(alpha=0.3, axis='y')
    
    for bar, val in zip(bars, risk_values):
        axes[0, 0].text(bar.get_x() + bar.get_width()/2, bar.get_height() + 1,
                       f'{val:.1f}%', ha='center', va='bottom', fontweight='bold')
    
    service_items = ['服务水平', '订单满足率', '目标服务水平']
    service_values = [
        risk_metrics.service_level * 100,
        risk_metrics.fill_rate * 100,
        95
    ]
    service_colors = ['#27ae60' if v >= 95 else '#f39c12' if v >= 90 else '#e74c3c' for v in service_values[:2]]
    service_colors.append('#95a5a6')
    
    bars = axes[0, 1].bar(service_items, service_values, color=service_colors, alpha=0.8)
    axes[0, 1].set_ylabel('百分比（%）')
    axes[0, 1].set_title('服务水平指标')
    axes[0, 1].axhline(y=95, color='green', linestyle='--', label='95%目标')
    axes[0, 1].set_ylim([0, 110])
    axes[0, 1].legend()
    axes[0, 1].grid(alpha=0.3, axis='y')
    
    for bar, val in zip(bars, service_values):
        axes[0, 1].text(bar.get_x() + bar.get_width()/2, bar.get_height() + 1,
                       f'{val:.1f}%', ha='center', va='bottom', fontweight='bold')
    
    cost_items = ['持有成本', '缺货成本', '总成本']
    cost_values = [risk_metrics.holding_cost, risk_metrics.stockout_cost, risk_metrics.total_cost]
    cost_colors = ['#3498db', '#e74c3c', '#2c3e50']
    
    bars = axes[1, 0].bar(cost_items, cost_values, color=cost_colors, alpha=0.8)
    axes[1, 0].set_ylabel('金额（元）')
    axes[1, 0].set_title('预期成本分析')
    axes[1, 0].grid(alpha=0.3, axis='y')
    
    for bar, val in zip(bars, cost_values):
        axes[1, 0].text(bar.get_x() + bar.get_width()/2, bar.get_height() + max(cost_values)*0.01,
                       f'¥{val:,.0f}', ha='center', va='bottom', fontweight='bold')
    
    level_colors = {
        'GREEN': '#27ae60',
        'YELLOW': '#f39c12',
        'RED': '#e74c3c'
    }
    level_text = {
        'GREEN': '绿色：结果可信\n可直接使用',
        'YELLOW': '黄色：需人工确认\n部分指标存疑',
        'RED': '红色：数据问题\n结果暂不可用'
    }
    
    overall_level = classification.overall_level
    axes[1, 1].add_patch(plt.Rectangle((0, 0), 10, 10, color=level_colors[overall_level], alpha=0.3))
    axes[1, 1].text(5, 7, level_text[overall_level], ha='center', va='center',
                   fontsize=12, fontweight='bold')
    axes[1, 1].text(5, 3,
                   f'可直接使用: {len(classification.direct_usable)}项\n'
                   f'需人工确认: {len(classification.needs_confirmation)}项\n'
                   f'无法计算: {len(classification.cannot_calculate)}项',
                   ha='center', va='center', fontsize=11)
    axes[1, 1].set_xlim([0, 10])
    axes[1, 1].set_ylim([0, 10])
    axes[1, 1].set_title('结果可靠性评估')
    axes[1, 1].axis('off')
    
    fig.tight_layout()
    
    if save_path:
        fig.savefig(save_path, dpi=150, bbox_inches='tight')
    
    img_base64 = _figure_to_base64(fig)
    return fig, img_base64


def plot_replenishment_sensitivity(
    advice: ReplenishmentAdvice,
    config: SimulationConfig,
    save_path: Optional[str] = None
) -> Tuple[plt.Figure, str]:
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    
    scenarios = [advice.action] + [s['scenario'] for s in advice.alternative_scenarios]
    service_levels = [advice.expected_service_level * 100] + [s['expected_service_level'] * 100 for s in advice.alternative_scenarios]
    costs = [advice.cost_impact] + [s['cost_impact'] for s in advice.alternative_scenarios]
    risk_reductions = [advice.risk_reduction * 100] + [s['risk_reduction'] * 100 for s in advice.alternative_scenarios]
    
    colors = ['#27ae60'] + ['#3498db'] * (len(scenarios) - 1)
    colors[0] = '#e67e22'
    
    x = np.arange(len(scenarios))
    width = 0.35
    
    bars1 = axes[0].bar(x - width/2, service_levels, width, label='预期服务水平', color=colors, alpha=0.8)
    axes[0].axhline(y=config.service_level_target * 100, color='red', linestyle='--', linewidth=2, label=f'目标{config.service_level_target*100:.0f}%')
    axes[0].set_ylabel('服务水平（%）')
    axes[0].set_title('各情景预期服务水平')
    axes[0].set_xticks(x)
    axes[0].set_xticklabels(scenarios, rotation=30, ha='right')
    axes[0].set_ylim([80, 105])
    axes[0].legend()
    axes[0].grid(alpha=0.3, axis='y')
    
    for bar, val in zip(bars1, service_levels):
        axes[0].text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.5,
                    f'{val:.1f}%', ha='center', va='bottom', fontsize=9)
    
    bars2 = axes[1].bar(x - width/2, [c/1000 for c in costs], width, label='成本影响(千元)', color='#3498db', alpha=0.7)
    ax2_twin = axes[1].twinx()
    bars3 = ax2_twin.bar(x + width/2, risk_reductions, width, label='风险降低(%)', color='#e74c3c', alpha=0.7)
    
    axes[1].set_ylabel('成本影响（千元）', color='#3498db')
    ax2_twin.set_ylabel('风险降低（%）', color='#e74c3c')
    axes[1].set_title('各情景成本与风险权衡')
    axes[1].set_xticks(x)
    axes[1].set_xticklabels(scenarios, rotation=30, ha='right')
    axes[1].grid(alpha=0.3, axis='y')
    
    lines1, labels1 = axes[1].get_legend_handles_labels()
    lines2, labels2 = ax2_twin.get_legend_handles_labels()
    axes[1].legend(lines1 + lines2, labels1 + labels2, loc='upper left')
    
    fig.tight_layout()
    
    if save_path:
        fig.savefig(save_path, dpi=150, bbox_inches='tight')
    
    img_base64 = _figure_to_base64(fig)
    return fig, img_base64


def export_pipeline_trace(
    pipeline_states: List[PipelineState],
    save_path: str
) -> None:
    trace_data = []
    for state in pipeline_states:
        trace_data.append({
            'stage': state.stage,
            'timestamp': state.timestamp.isoformat(),
            'input_hash': state.input_hash,
            'data': state.data,
            'metadata': state.metadata
        })
    
    df = pd.DataFrame(trace_data)
    with pd.ExcelWriter(save_path, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='处理链路', index=False)
        
        detail_rows = []
        for state in pipeline_states:
            row = {
                '阶段': state.stage,
                '时间': state.timestamp.isoformat(),
                '数据哈希': state.input_hash
            }
            for k, v in state.data.items():
                row[f'data_{k}'] = str(v)
            for k, v in state.metadata.items():
                row[f'meta_{k}'] = str(v)
            detail_rows.append(row)
        
        pd.DataFrame(detail_rows).to_excel(writer, sheet_name='详细链路', index=False)


def export_trajectory_data(
    trajectories: List[SimulationTrajectory],
    save_path: str,
    sample_size: int = 100
) -> None:
    sampled = np.random.choice(trajectories, min(sample_size, len(trajectories)), replace=False)
    
    with pd.ExcelWriter(save_path, engine='openpyxl') as writer:
        summary_rows = []
        for traj in sampled:
            summary_rows.append({
                '模拟ID': traj.simulation_id,
                '是否缺货': any(traj.stockout_days),
                '是否负库存': any(traj.negative_inventory_days),
                '缺货天数': sum(traj.stockout_days),
                '负库存天数': sum(traj.negative_inventory_days),
                '最大库存': max(traj.inventory_level),
                '最小库存': min(traj.inventory_level),
                '平均库存': np.mean(traj.inventory_level),
                '延迟到货次数': len(traj.delayed_orders),
                '补货次数': len(traj.replenishment_arrivals),
                '总需求': sum(traj.demand_realized),
                '总缺货量': sum(max(0, -inv) for inv in traj.inventory_level if inv < 0)
            })
        pd.DataFrame(summary_rows).to_excel(writer, sheet_name='模拟汇总', index=False)
        
        for traj in sampled[:10]:
            detail_df = pd.DataFrame({
                '日期': [d.isoformat() for d in traj.dates],
                '库存水平': traj.inventory_level,
                '是否缺货': traj.stockout_days,
                '是否负库存': traj.negative_inventory_days,
                '当日需求': traj.demand_realized,
                '平均提前期': traj.lead_time_realized
            })
            detail_df.to_excel(writer, sheet_name=f'轨迹{traj.simulation_id}', index=False)
        
        worst_traj = max(trajectories, key=lambda t: sum(t.negative_inventory_days))
        worst_df = pd.DataFrame({
            '日期': [d.isoformat() for d in worst_traj.dates],
            '库存水平': worst_traj.inventory_level,
            '是否缺货': worst_traj.stockout_days,
            '是否负库存': worst_traj.negative_inventory_days,
            '当日需求': worst_traj.demand_realized
        })
        worst_df.to_excel(writer, sheet_name='最差情景轨迹', index=False)


def render_confirmation_items(classification) -> str:
    items = []
    for item in classification.needs_confirmation:
        items.append(
            f'<li class="issue-high">'
            f'<strong>{item["item"]}</strong>: {item["concern"]}<br>'
            f'<span style="color: #7f8c8d;">当前值: {item["current_value"]}</span><br>'
            f'<span style="color: #27ae60;">建议: {item["suggested_action"]}</span>'
            f'</li>'
        )
    return f'<h3>需确认事项</h3><ul class="issue-list">{"".join(items)}</ul>'


def render_cannot_calculate_items(classification) -> str:
    items = []
    for item in classification.cannot_calculate:
        items.append(
            f'<li class="issue-critical">'
            f'<strong>{item["type"]}</strong>: {item["description"]}<br>'
            f'<span style="color: #e74c3c;">影响: {item["impact"]}</span><br>'
            f'<span style="color: #27ae60;">建议: {item["suggested_fix"]}</span>'
            f'</li>'
        )
    return f'<h3>无法计算的问题</h3><ul class="issue-list">{"".join(items)}</ul>'


def render_pipeline_trace(pipeline_states) -> str:
    items = []
    for i, state in enumerate(pipeline_states):
        ts_str = state.timestamp.strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
        data_json = json.dumps(state.data, ensure_ascii=False, indent=2)
        items.append(
            f'<div class="pipeline-step">'
            f'<strong>{i+1}. {state.stage}</strong><br>'
            f'<span class="timestamp">{ts_str}</span> | <span class="hash">hash: {state.input_hash}</span><br>'
            f'<details><summary>查看数据</summary><pre>{data_json}</pre></details>'
            f'</div>'
        )
    return "".join(items)


def generate_html_report(
    analysis: CompleteAnalysis,
    img_paths: Dict[str, str],
    save_path: str
) -> None:
    sku = analysis.sku
    risk = analysis.risk_metrics
    advice = analysis.replenishment_advice
    classification = analysis.classification
    
    level_colors = {
        'GREEN': '#27ae60',
        'YELLOW': '#f39c12',
        'RED': '#e74c3c'
    }
    level_text = {
        'GREEN': '结果可信，可直接使用',
        'YELLOW': '需人工确认部分指标',
        'RED': '数据存在严重问题，结果暂不可用'
    }
    
    css_styles = """
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f6fa; }
            .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
            h2 { color: #34495e; margin-top: 30px; border-left: 4px solid #3498db; padding-left: 15px; }
            h3 { color: #7f8c8d; }
            .status-badge { display: inline-block; padding: 8px 20px; border-radius: 20px; color: white; font-weight: bold; font-size: 16px; }
            .green { background: #27ae60; }
            .yellow { background: #f39c12; }
            .red { background: #e74c3c; }
            .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
            .metric-card { background: #ecf0f1; padding: 15px; border-radius: 8px; border-left: 4px solid #3498db; }
            .metric-card h4 { margin: 0; color: #7f8c8d; font-size: 13px; }
            .metric-card .value { font-size: 24px; font-weight: bold; color: #2c3e50; margin-top: 5px; }
            .metric-card .sub { font-size: 12px; color: #95a5a6; margin-top: 3px; }
            img { max-width: 100%; border-radius: 8px; margin: 15px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            .issue-list { list-style: none; padding: 0; }
            .issue-list li { padding: 10px; margin: 5px 0; border-radius: 5px; }
            .issue-critical { background: #ffebee; border-left: 4px solid #e74c3c; }
            .issue-high { background: #fff3e0; border-left: 4px solid #f39c12; }
            .issue-medium { background: #fffde7; border-left: 4px solid #f1c40f; }
            .issue-low { background: #e8f5e9; border-left: 4px solid #27ae60; }
            .advice-box { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; border-radius: 10px; margin: 20px 0; }
            .advice-box h3 { color: rgba(255,255,255,0.9); margin-top: 0; }
            .advice-box .action { font-size: 28px; font-weight: bold; margin: 10px 0; }
            .advice-box .rationale { font-size: 16px; opacity: 0.95; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ecf0f1; }
            th { background: #34495e; color: white; }
            tr:hover { background: #f8f9fa; }
            .pipeline-trace { background: #2c3e50; color: #ecf0f1; padding: 15px; border-radius: 8px; font-family: 'Courier New', monospace; font-size: 12px; overflow-x: auto; }
            .pipeline-step { padding: 8px; margin: 5px 0; border-left: 3px solid #3498db; background: #34495e; }
            .pipeline-step:hover { background: #3d566e; }
            .timestamp { color: #95a5a6; font-size: 11px; }
            .hash { color: #2ecc71; font-size: 11px; }
            .nav-tabs { display: flex; gap: 5px; margin: 20px 0; border-bottom: 2px solid #ecf0f1; }
            .nav-tab { padding: 10px 20px; cursor: pointer; border-radius: 5px 5px 0 0; background: #ecf0f1; }
            .nav-tab.active { background: #3498db; color: white; }
            .tab-content { display: none; }
            .tab-content.active { display: block; }
        </style>
"""
    
    javascript = """
    <script>
        function switchTab(tabId) {
            var tabs = document.querySelectorAll('.tab-content');
            for (var i = 0; i < tabs.length; i++) {
                tabs[i].classList.remove('active');
            }
            var navs = document.querySelectorAll('.nav-tab');
            for (var i = 0; i < navs.length; i++) {
                navs[i].classList.remove('active');
            }
            document.getElementById(tabId).classList.add('active');
            event.target.classList.add('active');
        }
    </script>
"""
    
    html_head = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>蒙特卡洛库存风险分析报告 - {sku}</title>
{css_styles}
</head>
<body>
"""
    
    html_body = f"""
    <div class="container">
        <h1>📊 蒙特卡洛库存风险分析报告</h1>
        <h3>SKU: {sku} | 生成时间: {pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S')}</h3>
        
        <div style="margin: 20px 0;">
            <span class="status-badge {classification.overall_level.lower()}">
                整体评级: {classification.overall_level} - {level_text[classification.overall_level]}
            </span>
        </div>
        
        <div class="nav-tabs">
            <div class="nav-tab active" onclick="switchTab('overview')">📈 概览</div>
            <div class="nav-tab" onclick="switchTab('demand')">📊 需求分析</div>
            <div class="nav-tab" onclick="switchTab('inventory')">📦 库存模拟</div>
            <div class="nav-tab" onclick="switchTab('risk')">⚠️ 风险分析</div>
            <div class="nav-tab" onclick="switchTab('advice')">💡 补货建议</div>
            <div class="nav-tab" onclick="switchTab('issues')">🔍 数据问题</div>
            <div class="nav-tab" onclick="switchTab('pipeline')">🔗 处理链路</div>
        </div>
        
        <div id="overview" class="tab-content active">
            <h2>核心指标概览</h2>
            <div class="metrics-grid">
                <div class="metric-card">
                    <h4>缺货概率</h4>
                    <div class="value">{risk.stockout_probability*100:.1f}%</div>
                    <div class="sub">未来{analysis.simulation_config.horizon_days}天内</div>
                </div>
                <div class="metric-card">
                    <h4>预期服务水平</h4>
                    <div class="value">{risk.service_level*100:.1f}%</div>
                    <div class="sub">目标: {analysis.simulation_config.service_level_target*100:.0f}%</div>
                </div>
                <div class="metric-card">
                    <h4>订单满足率</h4>
                    <div class="value">{risk.fill_rate*100:.1f}%</div>
                </div>
                <div class="metric-card">
                    <h4>负库存概率</h4>
                    <div class="value">{risk.negative_inventory_probability*100:.1f}%</div>
                </div>
                <div class="metric-card">
                    <h4>延迟到货概率</h4>
                    <div class="value">{risk.delayed_order_probability*100:.1f}%</div>
                </div>
                <div class="metric-card">
                    <h4>预期总成本</h4>
                    <div class="value">¥{risk.total_cost:,.0f}</div>
                    <div class="sub">持有+缺货成本</div>
                </div>
            </div>
            
            <h2>分析摘要</h2>
            <div class="advice-box">
                <h3>📌 建议行动</h3>
                <div class="action">{advice.action}</div>
                <div class="rationale">{advice.rationale}</div>
                <div style="margin-top: 15px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
                    <div>
                        <div style="font-size: 12px; opacity: 0.8;">建议订货量</div>
                        <div style="font-size: 22px; font-weight: bold;">{advice.suggested_order_quantity:.0f} 件</div>
                    </div>
                    <div>
                        <div style="font-size: 12px; opacity: 0.8;">建议订货日期</div>
                        <div style="font-size: 22px; font-weight: bold;">{advice.suggested_order_date.strftime('%Y-%m-%d')}</div>
                    </div>
                    <div>
                        <div style="font-size: 12px; opacity: 0.8;">预计成本影响</div>
                        <div style="font-size: 22px; font-weight: bold;">¥{advice.cost_impact:,.0f}</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div id="demand" class="tab-content">
            <h2>需求分布分析</h2>
            <p>使用 KS 检验自动选择最优分布类型: <strong>{analysis.demand_forecast.distribution_type}</strong></p>
            <p>拟合优度: KS统计量={analysis.demand_forecast.goodness_of_fit['ks_statistic']:.4f}, p值={analysis.demand_forecast.goodness_of_fit['p_value']:.4f}</p>
            <img src="data:image/png;base64,{img_paths.get('demand', '')}" alt="需求分布图">
            
            <h3>需求预测参数</h3>
            <table>
                <tr><th>参数</th><th>值</th></tr>
                <tr><td>分布类型</td><td>{analysis.demand_forecast.distribution_type}</td></tr>
                <tr><td>日需求均值</td><td>{analysis.demand_forecast.daily_demand_mean:.2f} 件</td></tr>
                <tr><td>日需求标准差</td><td>{analysis.demand_forecast.daily_demand_std:.2f} 件</td></tr>
                <tr><td>变异系数 (CV)</td><td>{analysis.demand_forecast.daily_demand_std/analysis.demand_forecast.daily_demand_mean:.2f}</td></tr>
                <tr><td>历史数据点数</td><td>{len(analysis.demand_forecast.historical_demand)} 天</td></tr>
            </table>
        </div>
        
        <div id="inventory" class="tab-content">
            <h2>库存水平模拟</h2>
            <p>共进行 <strong>{analysis.simulation_config.n_simulations}</strong> 次蒙特卡洛模拟，时间跨度 <strong>{analysis.simulation_config.horizon_days}</strong> 天</p>
            <img src="data:image/png;base64,{img_paths.get('inventory', '')}" alt="库存模拟图">
            
            <h3>库存指标分位数</h3>
            <table>
                <tr><th>分位数</th><th>平均库存(件)</th><th>缺货天数(天)</th><th>缺货量(件)</th></tr>
"""
    
    tile_rows = ''.join(
        f'<tr><td>P{q*100:.0f}</td><td>{v["avg_inventory"]:.0f}</td><td>{v["stockout_days"]:.1f}</td><td>{v["shortage_units"]:.0f}</td></tr>'
        for q, v in risk.per_tile_metrics.items()
    )
    
    html_body2 = f"""
            </table>
        </div>
        
        <div id="risk" class="tab-content">
            <h2>风险分析</h2>
            <img src="data:image/png;base64,{img_paths.get('risk', '')}" alt="风险分析图">
            
            <h3>分类结果说明</h3>
            <table>
                <tr><th>类别</th><th>数量</th><th>说明</th></tr>
                <tr><td>🟢 可直接使用</td><td>{len(classification.direct_usable)}</td><td>计算结果可信，可直接用于决策</td></tr>
                <tr><td>🟡 需人工确认</td><td>{len(classification.needs_confirmation)}</td><td>部分指标存疑，需供应链计划员核实</td></tr>
                <tr><td>🔴 无法计算</td><td>{len(classification.cannot_calculate)}</td><td>数据问题严重，结果不可信</td></tr>
            </table>
        </div>
        
        <div id="advice" class="tab-content">
            <h2>补货建议情景分析</h2>
            <img src="data:image/png;base64,{img_paths.get('advice', '')}" alt="补货建议图">
            
            <h3>多情景对比</h3>
            <table>
                <tr><th>情景</th><th>订货量(件)</th><th>预期服务水平</th><th>风险降低</th><th>成本影响</th></tr>
                <tr style="background: #fff3e0;">
                    <td><strong>推荐: {advice.action}</strong></td>
                    <td><strong>{advice.suggested_order_quantity:.0f}</strong></td>
                    <td><strong>{advice.expected_service_level*100:.1f}%</strong></td>
                    <td><strong>{advice.risk_reduction*100:+.1f}%</strong></td>
                    <td><strong>¥{advice.cost_impact:,.0f}</strong></td>
                </tr>
"""
    
    scenario_rows = ''.join(
        f'<tr><td>{s["scenario"]}</td><td>{s["order_quantity"]:.0f}</td><td>{s["expected_service_level"]*100:.1f}%</td><td>{s["risk_reduction"]*100:+.1f}%</td><td>¥{s["cost_impact"]:,.0f}</td></tr>'
        for s in advice.alternative_scenarios
    )
    
    issue_rows = ''.join(
        f'<li class="issue-{i.severity.lower()}"><strong>[{i.severity}]</strong> {i.location}: {i.description}<br><span style="color: #7f8c8d;">建议: {i.suggested_fix}</span></li>'
        for i in analysis.import_result.issues
    )
    
    export_rows = ''.join(
        f'<li><strong>{k}:</strong> {v}</li>'
        for k, v in analysis.export_paths.items()
    )
    
    confirmation_items = render_confirmation_items(classification) if classification.needs_confirmation else ''
    cannot_calculate_items = render_cannot_calculate_items(classification) if classification.cannot_calculate else ''
    pipeline_trace = render_pipeline_trace(analysis.pipeline_states)
    
    html_body3 = f"""
            </table>
        </div>
        
        <div id="issues" class="tab-content">
            <h2>数据问题与修正建议</h2>
            <ul class="issue-list">
                {issue_rows}
            </ul>
            
            {confirmation_items}
            
            {cannot_calculate_items}
        </div>
        
        <div id="pipeline" class="tab-content">
            <h2>🔗 完整处理链路（可追溯）</h2>
            <p>每个阶段的数据哈希确保可追溯性，点击查看详情</p>
            <div class="pipeline-trace">
                {pipeline_trace}
            </div>
        </div>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ecf0f1; color: #95a5a6; font-size: 12px;">
            <p>📋 导出文件清单:</p>
            <ul>
                {export_rows}
            </ul>
            <p style="margin-top: 15px;">⚠️ 本报告基于蒙特卡洛模拟生成，结果仅供参考。关键决策请结合业务实际情况判断。</p>
        </div>
    </div>
"""
    
    html_tail = """
</body>
</html>
"""
    
    html_content = html_head + html_body + tile_rows + html_body2 + scenario_rows + html_body3 + javascript + html_tail
    
    with open(save_path, 'w', encoding='utf-8') as f:
        f.write(html_content)


def export_all(
    analysis: CompleteAnalysis,
    output_dir: str
) -> Dict[str, str]:
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    sku = analysis.sku
    timestamp = pd.Timestamp.now().strftime('%Y%m%d_%H%M%S')
    
    paths = {}
    
    _, demand_img = plot_demand_distribution(
        analysis.demand_forecast,
        save_path=f'{output_dir}/{sku}_demand_distribution_{timestamp}.png'
    )
    paths['demand_plot'] = f'{output_dir}/{sku}_demand_distribution_{timestamp}.png'
    
    _, inventory_img = plot_inventory_trajectories(
        analysis.trajectories,
        analysis.import_result.inventory,
        analysis.simulation_config,
        save_path=f'{output_dir}/{sku}_inventory_trajectories_{timestamp}.png'
    )
    paths['inventory_plot'] = f'{output_dir}/{sku}_inventory_trajectories_{timestamp}.png'
    
    _, risk_img = plot_risk_analysis(
        analysis.risk_metrics,
        analysis.classification,
        save_path=f'{output_dir}/{sku}_risk_analysis_{timestamp}.png'
    )
    paths['risk_plot'] = f'{output_dir}/{sku}_risk_analysis_{timestamp}.png'
    
    _, advice_img = plot_replenishment_sensitivity(
        analysis.replenishment_advice,
        analysis.simulation_config,
        save_path=f'{output_dir}/{sku}_replenishment_advice_{timestamp}.png'
    )
    paths['advice_plot'] = f'{output_dir}/{sku}_replenishment_advice_{timestamp}.png'
    
    img_base64 = {
        'demand': demand_img,
        'inventory': inventory_img,
        'risk': risk_img,
        'advice': advice_img
    }
    
    html_path = f'{output_dir}/{sku}_risk_report_{timestamp}.html'
    generate_html_report(analysis, img_base64, html_path)
    paths['html_report'] = html_path
    
    excel_path = f'{output_dir}/{sku}_risk_metrics_{timestamp}.xlsx'
    with pd.ExcelWriter(excel_path, engine='openpyxl') as writer:
        metrics_dict = {
            '指标': [
                '缺货概率', '负库存概率', '延迟到货概率',
                '预期服务水平', '订单满足率',
                '平均库存', '最大库存', '最小库存',
                '预期缺货天数', '预期缺货数量',
                '持有成本', '缺货成本', '总成本',
                '需求分布类型', '日需求均值', '日需求标准差',
                '平均提前期', '提前期标准差', '供应商可靠度',
                '建议行动', '建议订货量', '建议订货日期', '成本影响'
            ],
            '值': [
                f'{analysis.risk_metrics.stockout_probability*100:.2f}%',
                f'{analysis.risk_metrics.negative_inventory_probability*100:.2f}%',
                f'{analysis.risk_metrics.delayed_order_probability*100:.2f}%',
                f'{analysis.risk_metrics.service_level*100:.2f}%',
                f'{analysis.risk_metrics.fill_rate*100:.2f}%',
                f'{analysis.risk_metrics.avg_inventory:.2f}',
                f'{analysis.risk_metrics.max_inventory:.2f}',
                f'{analysis.risk_metrics.min_inventory:.2f}',
                f'{analysis.risk_metrics.expected_stockout_days:.2f}',
                f'{analysis.risk_metrics.expected_shortage_units:.2f}',
                f'{analysis.risk_metrics.holding_cost:.2f}',
                f'{analysis.risk_metrics.stockout_cost:.2f}',
                f'{analysis.risk_metrics.total_cost:.2f}',
                analysis.demand_forecast.distribution_type,
                f'{analysis.demand_forecast.daily_demand_mean:.4f}',
                f'{analysis.demand_forecast.daily_demand_std:.4f}',
                f'{analysis.import_result.supply.lead_time_mean:.2f}',
                f'{analysis.import_result.supply.lead_time_std:.2f}',
                f'{analysis.import_result.supply.supplier_reliability:.4f}',
                analysis.replenishment_advice.action,
                f'{analysis.replenishment_advice.suggested_order_quantity:.2f}',
                analysis.replenishment_advice.suggested_order_date.strftime('%Y-%m-%d'),
                f'{analysis.replenishment_advice.cost_impact:.2f}'
            ]
        }
        pd.DataFrame(metrics_dict).to_excel(writer, sheet_name='核心指标', index=False)
        
        issue_rows = []
        for i, issue in enumerate(analysis.import_result.issues):
            issue_rows.append({
                '序号': i + 1,
                '类型': issue.issue_type,
                '严重程度': issue.severity,
                '位置': issue.location,
                '描述': issue.description,
                '修正建议': issue.suggested_fix,
                '原始值': issue.original_value,
                '行号': issue.row_index
            })
        if issue_rows:
            pd.DataFrame(issue_rows).to_excel(writer, sheet_name='数据问题', index=False)
        
        confirm_rows = []
        for i, item in enumerate(analysis.classification.needs_confirmation):
            confirm_rows.append({
                '序号': i + 1,
                '项目': item['item'],
                '当前值': item['current_value'],
                '关注点': item['concern'],
                '建议措施': item['suggested_action'],
                '风险等级': item['risk_level'],
                '需人工确认': item.get('requires_human_input', True),
                '截止天数': item.get('deadline_days', 7)
            })
        if confirm_rows:
            pd.DataFrame(confirm_rows).to_excel(writer, sheet_name='需确认事项', index=False)
        
        adv_rows = []
        adv_rows.append({
            '情景': '【推荐】' + analysis.replenishment_advice.action,
            '订货量': analysis.replenishment_advice.suggested_order_quantity,
            '订货日期': analysis.replenishment_advice.suggested_order_date.strftime('%Y-%m-%d'),
            '预期服务水平': analysis.replenishment_advice.expected_service_level,
            '风险降低': analysis.replenishment_advice.risk_reduction,
            '成本影响': analysis.replenishment_advice.cost_impact,
            '说明': analysis.replenishment_advice.rationale,
            '优先级': '推荐'
        })
        for i, s in enumerate(analysis.replenishment_advice.alternative_scenarios):
            adv_rows.append({
                '情景': s['scenario'],
                '订货量': s['order_quantity'],
                '订货日期': analysis.replenishment_advice.suggested_order_date.strftime('%Y-%m-%d'),
                '预期服务水平': s['expected_service_level'],
                '风险降低': s['risk_reduction'],
                '成本影响': s['cost_impact'],
                '说明': s['description'],
                '优先级': f'备选{i+1}'
            })
        pd.DataFrame(adv_rows).to_excel(writer, sheet_name='补货建议', index=False)
        
        pd.DataFrame([{
            '阶段': state.stage,
            '时间': state.timestamp.isoformat(),
            '数据哈希': state.input_hash,
            '数据摘要': json.dumps(state.data, ensure_ascii=False)[:100]
        } for state in analysis.pipeline_states]).to_excel(writer, sheet_name='处理链路', index=False)
    
    paths['excel_report'] = excel_path
    
    traj_path = f'{output_dir}/{sku}_trajectory_sample_{timestamp}.xlsx'
    export_trajectory_data(analysis.trajectories, traj_path)
    paths['trajectory_data'] = traj_path
    
    pipeline_path = f'{output_dir}/{sku}_pipeline_trace_{timestamp}.xlsx'
    export_pipeline_trace(analysis.pipeline_states, pipeline_path)
    paths['pipeline_trace'] = pipeline_path
    
    json_path = f'{output_dir}/{sku}_complete_analysis_{timestamp}.json'
    analysis_dict = {
        'sku': analysis.sku,
        'export_paths': analysis.export_paths,
        'pipeline_states': [{
            'stage': s.stage,
            'timestamp': s.timestamp.isoformat(),
            'input_hash': s.input_hash,
            'data': s.data,
            'metadata': s.metadata
        } for s in analysis.pipeline_states],
        'risk_metrics': {
            'stockout_probability': analysis.risk_metrics.stockout_probability,
            'service_level': analysis.risk_metrics.service_level,
            'fill_rate': analysis.risk_metrics.fill_rate,
            'negative_inventory_probability': analysis.risk_metrics.negative_inventory_probability,
            'delayed_order_probability': analysis.risk_metrics.delayed_order_probability,
            'total_cost': analysis.risk_metrics.total_cost
        },
        'classification': {
            'overall_level': analysis.classification.overall_level,
            'direct_usable': analysis.classification.direct_usable,
            'needs_confirmation': analysis.classification.needs_confirmation,
            'cannot_calculate': analysis.classification.cannot_calculate
        },
        'replenishment_advice': {
            'action': analysis.replenishment_advice.action,
            'suggested_order_quantity': analysis.replenishment_advice.suggested_order_quantity,
            'suggested_order_date': analysis.replenishment_advice.suggested_order_date.isoformat(),
            'urgency': analysis.replenishment_advice.urgency,
            'rationale': analysis.replenishment_advice.rationale,
            'expected_service_level': analysis.replenishment_advice.expected_service_level
        }
    }
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(analysis_dict, f, ensure_ascii=False, indent=2)
    paths['json_dump'] = json_path
    
    analysis.export_paths = paths
    return paths
