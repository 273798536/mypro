import pandas as pd
import numpy as np
from typing import List, Dict, Optional, Tuple
from pathlib import Path

from .types import (
    CompleteAnalysis, SimulationConfig, RiskMetrics,
    ImportResult, PipelineState
)
from .data_import import import_data
from .data_checker import run_data_check
from .monte_carlo_engine import (
    generate_demand_forecast, run_monte_carlo_simulations,
    calculate_risk_metrics
)
from .result_classifier import classify_results, generate_replenishment_advice
from .export import export_all


def run_full_analysis(
    sales_file: str,
    supply_file: str,
    inventory_file: str,
    sku: str,
    output_dir: str = "./output",
    n_simulations: int = 5000,
    horizon_days: int = 90,
    service_level_target: float = 0.95,
    random_seed: int = 42,
    sales_sheet: str = 0,
    supply_sheet: str = 0,
    inventory_sheet: str = 0
) -> CompleteAnalysis:
    print("=" * 60)
    print("📊 蒙特卡洛库存风险分析系统")
    print("=" * 60)
    print(f"SKU: {sku}")
    print(f"模拟次数: {n_simulations}")
    print(f"预测周期: {horizon_days} 天")
    print(f"目标服务水平: {service_level_target:.1%}")
    print("-" * 60)
    
    config = SimulationConfig(
        n_simulations=n_simulations,
        horizon_days=horizon_days,
        service_level_target=service_level_target,
        random_seed=random_seed
    )
    
    print("\n📥 [1/7] 导入数据...")
    import_result, pipeline_states = import_data(
        sales_file, supply_file, inventory_file, sku,
        sales_sheet, supply_sheet, inventory_sheet
    )
    
    for msg in import_result.messages:
        print(f"   {msg}")
    
    if not import_result.import_success:
        print("\n❌ 数据导入失败，终止分析")
        return CompleteAnalysis(
            sku=sku,
            pipeline_states=pipeline_states,
            import_result=import_result
        )
    
    print(f"\n🔍 [2/7] 数据质量检查...")
    all_issues, recommendations, pipeline_states = run_data_check(
        import_result, pipeline_states
    )
    
    critical = [i for i in all_issues if i.severity == 'CRITICAL']
    high = [i for i in all_issues if i.severity == 'HIGH']
    medium = [i for i in all_issues if i.severity == 'MEDIUM']
    low = [i for i in all_issues if i.severity == 'LOW']
    
    print(f"   发现问题: {len(critical)} 严重, {len(high)} 高, {len(medium)} 中, {len(low)} 低")
    
    for rec in recommendations:
        print(f"\n   ⚠️  {rec['priority']}: {rec['count']} 个问题")
        print(f"      措施: {rec['action']}")
    
    print(f"\n📈 [3/7] 需求分布拟合...")
    forecast, pipeline_states = generate_demand_forecast(
        import_result.sales, config, pipeline_states
    )
    
    print(f"   最优分布: {forecast.distribution_type}")
    print(f"   日需求均值: {forecast.daily_demand_mean:.2f} ± {forecast.daily_demand_std:.2f}")
    print(f"   拟合优度: KS={forecast.goodness_of_fit['ks_statistic']:.4f}, p={forecast.goodness_of_fit['p_value']:.4f}")
    
    print(f"\n🎲 [4/7] 运行蒙特卡洛模拟 ({n_simulations} 次)...")
    trajectories, pipeline_states = run_monte_carlo_simulations(
        forecast, import_result.supply, import_result.inventory,
        config, pipeline_states
    )
    
    stockout_rate = sum(any(t.stockout_days) for t in trajectories) / len(trajectories)
    negative_rate = sum(any(t.negative_inventory_days) for t in trajectories) / len(trajectories)
    delayed_rate = sum(len(t.delayed_orders) > 0 for t in trajectories) / len(trajectories)
    
    print(f"   缺货模拟占比: {stockout_rate:.1%}")
    print(f"   负库存模拟占比: {negative_rate:.1%}")
    print(f"   延迟到货模拟占比: {delayed_rate:.1%}")
    
    if negative_rate > stockout_rate * 0.8 and stockout_rate > 0.1:
        print(f"   ⚠️  警告: 负库存概率({negative_rate:.1%})接近缺货概率({stockout_rate:.1%})")
        print(f"      请确认延迟到货和负库存是否被正确区分追踪")
    
    print(f"\n📊 [5/7] 计算风险指标...")
    risk_metrics = calculate_risk_metrics(
        trajectories, import_result.inventory, config
    )
    
    print(f"   缺货概率: {risk_metrics.stockout_probability:.1%}")
    print(f"   负库存概率: {risk_metrics.negative_inventory_probability:.1%}")
    print(f"   延迟到货概率: {risk_metrics.delayed_order_probability:.1%}")
    print(f"   预期服务水平: {risk_metrics.service_level:.1%}")
    print(f"   订单满足率: {risk_metrics.fill_rate:.1%}")
    print(f"   预期总成本: ¥{risk_metrics.total_cost:,.2f}")
    
    print(f"\n🏷️  [6/7] 结果分类...")
    classification, pipeline_states = classify_results(
        risk_metrics, all_issues, forecast, import_result.supply,
        config, pipeline_states
    )
    
    print(f"   整体评级: {classification.overall_level}")
    print(f"   ✅ 可直接使用: {len(classification.direct_usable)} 项")
    print(f"   ⚠️  需人工确认: {len(classification.needs_confirmation)} 项")
    print(f"   ❌ 无法计算: {len(classification.cannot_calculate)} 项")
    
    for item in classification.needs_confirmation:
        print(f"      - {item['item']}: {item['concern']}")
    
    for item in classification.cannot_calculate:
        print(f"      - {item['type']}: {item['description']}")
    
    print(f"\n💡 [7/7] 生成补货建议...")
    advice, pipeline_states = generate_replenishment_advice(
        risk_metrics, forecast, import_result.supply,
        import_result.inventory, config, classification,
        trajectories, pipeline_states
    )
    
    urgency_color = {
        'GREEN': '🟢',
        'YELLOW': '🟡',
        'RED': '🔴'
    }
    
    print(f"   {urgency_color[advice.urgency]} 建议行动: {advice.action}")
    print(f"   建议订货量: {advice.suggested_order_quantity:.0f} 件")
    print(f"   建议订货日期: {advice.suggested_order_date.strftime('%Y-%m-%d')}")
    print(f"   理由: {advice.rationale}")
    print(f"   预计服务水平: {advice.expected_service_level:.1%}")
    print(f"   成本影响: ¥{advice.cost_impact:,.2f}")
    
    if advice.alternative_scenarios:
        print(f"\n   备选方案:")
        for s in advice.alternative_scenarios:
            print(f"      - {s['scenario']}: 订货{s['order_quantity']:.0f}件, 服务水平{s['expected_service_level']:.1%}")
    
    print(f"\n📤 导出报告...")
    analysis = CompleteAnalysis(
        sku=sku,
        pipeline_states=pipeline_states,
        import_result=import_result,
        demand_forecast=forecast,
        simulation_config=config,
        trajectories=trajectories,
        risk_metrics=risk_metrics,
        replenishment_advice=advice,
        classification=classification
    )
    
    export_paths = export_all(analysis, output_dir)
    
    print(f"\n✅ 分析完成！导出文件:")
    for k, v in export_paths.items():
        print(f"   📄 {k}: {v}")
    
    print("\n" + "=" * 60)
    print("分析摘要")
    print("=" * 60)
    print(f"SKU: {sku}")
    print(f"整体评级: {classification.overall_level}")
    print(f"缺货概率: {risk_metrics.stockout_probability:.1%}")
    print(f"建议行动: {advice.action}")
    print(f"建议订货: {advice.suggested_order_quantity:.0f} 件 @ {advice.suggested_order_date.strftime('%Y-%m-%d')}")
    print("=" * 60)
    
    return analysis
