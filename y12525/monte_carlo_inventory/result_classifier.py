import pandas as pd
import numpy as np
from typing import List, Dict, Optional, Tuple

from .types import (
    RiskMetrics, RiskLevel, ResultClassification,
    ReplenishmentAdvice, DataIssue, IssueSeverity,
    DemandForecast, SupplyCycle, InventoryStatus,
    SimulationConfig, SimulationTrajectory, PipelineState
)
from .data_import import _create_pipeline_state


def classify_results(
    risk_metrics: RiskMetrics,
    issues: List[DataIssue],
    forecast: DemandForecast,
    supply: SupplyCycle,
    config: SimulationConfig,
    pipeline_states: List[PipelineState]
) -> Tuple[ResultClassification, List[PipelineState]]:
    new_states = pipeline_states.copy()
    sku = risk_metrics.sku
    
    new_states.append(_create_pipeline_state(
        "classification_start",
        {'sku': sku, 'stage': 'result_classification'},
        {'timestamp': pd.Timestamp.now().isoformat()}
    ))
    
    critical_issues = [i for i in issues if i.severity == IssueSeverity.CRITICAL]
    high_issues = [i for i in issues if i.severity == IssueSeverity.HIGH]
    medium_issues = [i for i in issues if i.severity == IssueSeverity.MEDIUM]
    
    cannot_calculate = []
    needs_confirmation = []
    direct_usable = []
    
    if critical_issues:
        for issue in critical_issues:
            cannot_calculate.append({
                'type': issue.issue_type,
                'severity': issue.severity,
                'location': issue.location,
                'description': issue.description,
                'suggested_fix': issue.suggested_fix,
                'impact': '导致分析结果完全不可信，必须修复'
            })
    
    if len(cannot_calculate) > 0:
        overall_level = RiskLevel.RED
    elif risk_metrics.stockout_probability > 0.3:
        overall_level = RiskLevel.RED
    elif risk_metrics.stockout_probability > 0.1 or len(high_issues) > 2:
        overall_level = RiskLevel.YELLOW
    else:
        overall_level = RiskLevel.GREEN
    
    if forecast.goodness_of_fit.get('p_value', 0) < 0.05 and forecast.goodness_of_fit.get('ks_statistic', 0) > 0.2:
        needs_confirmation.append({
            'item': '需求分布拟合',
            'current_value': f"{forecast.distribution_type}, KS={forecast.goodness_of_fit['ks_statistic']:.3f}, p={forecast.goodness_of_fit['p_value']:.3f}",
            'concern': '分布拟合效果不佳，可能影响需求预测准确度',
            'suggested_action': '检查历史数据是否存在异常值或结构性变化，考虑使用混合分布或专家判断调整',
            'risk_level': 'MEDIUM'
        })
    
    if supply.lead_time_std > supply.lead_time_mean * 0.5:
        needs_confirmation.append({
            'item': '提前期波动',
            'current_value': f"均值={supply.lead_time_mean:.1f}天, 标准差={supply.lead_time_std:.1f}天 (CV={supply.lead_time_std/supply.lead_time_mean:.2f})",
            'concern': '提前期波动过大，供应不稳定',
            'suggested_action': '与供应商沟通改善交期稳定性，或考虑备选供应商，增加安全库存缓冲',
            'risk_level': 'HIGH'
        })
    
    if supply.supplier_reliability < 0.8:
        needs_confirmation.append({
            'item': '供应商可靠度',
            'current_value': f"{supply.supplier_reliability:.1%}",
            'concern': '供应商按时交付率低于80%',
            'suggested_action': '评估供应商绩效，考虑开发备选供应商，或建立安全库存应对交付风险',
            'risk_level': 'HIGH'
        })
    
    if risk_metrics.negative_inventory_probability > risk_metrics.stockout_probability * 0.8 and risk_metrics.stockout_probability > 0.1:
        needs_confirmation.append({
            'item': '负库存与缺货一致性',
            'current_value': f"负库存概率={risk_metrics.negative_inventory_probability:.1%}, 缺货概率={risk_metrics.stockout_probability:.1%}",
            'concern': '负库存概率接近缺货概率，可能存在延迟到货未被正确追踪的情况',
            'suggested_action': '检查在途订单录入是否完整，确认延迟到货流程是否规范',
            'risk_level': 'MEDIUM'
        })
    
    if risk_metrics.delayed_order_probability > 0.2:
        needs_confirmation.append({
            'item': '延迟到货风险',
            'current_value': f"{risk_metrics.delayed_order_probability:.1%}",
            'concern': '模拟中出现延迟到货的概率较高',
            'suggested_action': '与供应商确认交付承诺，考虑设置更保守的提前期参数',
            'risk_level': 'MEDIUM'
        })
    
    if risk_metrics.fill_rate < config.service_level_target - 0.05:
        needs_confirmation.append({
            'item': '服务水平达标情况',
            'current_value': f"预期服务水平={risk_metrics.service_level:.1%}, 目标={config.service_level_target:.1%}",
            'concern': '预期服务水平低于目标值',
            'suggested_action': '考虑增加安全库存、调整订货点或缩短提前期',
            'risk_level': 'HIGH'
        })
    
    has_extreme_demand = any(i.issue_type == 'EXTREME_VALUE' and '销售历史' in i.location for i in issues)
    if has_extreme_demand:
        needs_confirmation.append({
            'item': '极端需求值',
            'current_value': '历史销售中存在极端值',
            'concern': '极端需求值可能扭曲需求分布拟合，影响模拟结果',
            'suggested_action': '确认极端值是否为真实需求（如大订单、促销），如是异常值建议剔除；如是特殊事件建议建立单独模型',
            'risk_level': 'MEDIUM'
        })
    
    has_negative_stock = any(i.issue_type == 'NEGATIVE_VALUE' and '库存' in i.location for i in issues)
    if has_negative_stock:
        needs_confirmation.append({
            'item': '期初负库存',
            'current_value': '当前库存为负数',
            'concern': '期初负库存表示已经处于缺货状态，模拟结果需结合实际延迟到货情况解读',
            'suggested_action': '立即核查延迟到货订单，确认实际库存状态',
            'risk_level': 'HIGH'
        })
    
    if forecast.daily_demand_std > forecast.daily_demand_mean * 1.5:
        needs_confirmation.append({
            'item': '需求波动性',
            'current_value': f"日需求均值={forecast.daily_demand_mean:.2f}, 标准差={forecast.daily_demand_std:.2f} (CV={forecast.daily_demand_std/forecast.daily_demand_mean:.2f})",
            'concern': '需求波动性很高，传统库存策略可能不适用',
            'suggested_action': '考虑使用动态安全库存或按单生产模式，定期复核需求预测',
            'risk_level': 'MEDIUM'
        })
    
    direct_usable.append(f"需求分布类型: {forecast.distribution_type}")
    direct_usable.append(f"日需求均值: {forecast.daily_demand_mean:.2f} 件")
    direct_usable.append(f"平均提前期: {supply.lead_time_mean:.1f} 天")
    direct_usable.append(f"缺货概率: {risk_metrics.stockout_probability:.1%}")
    direct_usable.append(f"预期服务水平: {risk_metrics.service_level:.1%}")
    direct_usable.append(f"订单满足率: {risk_metrics.fill_rate:.1%}")
    direct_usable.append(f"平均库存水平: {risk_metrics.avg_inventory:.0f} 件")
    direct_usable.append(f"预期总缺货天数: {risk_metrics.expected_stockout_days:.1f} 天")
    direct_usable.append(f"预期缺货数量: {risk_metrics.expected_shortage_units:.0f} 件")
    direct_usable.append(f"预期库存持有成本: ¥{risk_metrics.holding_cost:,.2f}")
    direct_usable.append(f"预期缺货成本: ¥{risk_metrics.stockout_cost:,.2f}")
    direct_usable.append(f"预期总成本: ¥{risk_metrics.total_cost:,.2f}")
    
    confirmation_details = []
    for item in needs_confirmation:
        confirmation_details.append({
            **item,
            'requires_human_input': True,
            'deadline_days': 3 if item['risk_level'] == 'HIGH' else 7
        })
    
    classification = ResultClassification(
        overall_level=overall_level,
        direct_usable=direct_usable,
        needs_confirmation=needs_confirmation,
        cannot_calculate=cannot_calculate,
        confirmation_required_details=confirmation_details
    )
    
    new_states.append(_create_pipeline_state(
        "classification_complete",
        {
            'overall_level': overall_level,
            'n_direct_usable': len(direct_usable),
            'n_needs_confirmation': len(needs_confirmation),
            'n_cannot_calculate': len(cannot_calculate)
        },
        {
            'risk_metrics_summary': {
                'stockout_probability': risk_metrics.stockout_probability,
                'service_level': risk_metrics.service_level,
                'fill_rate': risk_metrics.fill_rate
            }
        }
    ))
    
    return classification, new_states


def generate_replenishment_advice(
    risk_metrics: RiskMetrics,
    forecast: DemandForecast,
    supply: SupplyCycle,
    inventory: InventoryStatus,
    config: SimulationConfig,
    classification: ResultClassification,
    trajectories: List[SimulationTrajectory],
    pipeline_states: List[PipelineState]
) -> Tuple[ReplenishmentAdvice, List[PipelineState]]:
    new_states = pipeline_states.copy()
    sku = risk_metrics.sku
    
    new_states.append(_create_pipeline_state(
        "replenishment_advice_start",
        {'sku': sku, 'stage': 'advice_generation'},
        {'timestamp': pd.Timestamp.now().isoformat()}
    ))
    
    avg_daily_demand = forecast.daily_demand_mean
    lead_time_mean = supply.lead_time_mean
    lead_time_std = supply.lead_time_std
    
    current_coverage = inventory.current_stock / avg_daily_demand if avg_daily_demand > 0 else float('inf')
    
    days_until_rop = 0
    if inventory.current_stock > inventory.reorder_point and avg_daily_demand > 0:
        days_until_rop = (inventory.current_stock - inventory.reorder_point) / avg_daily_demand
    
    target_service_level = config.service_level_target
    z_score = {
        0.90: 1.28,
        0.95: 1.645,
        0.97: 1.88,
        0.99: 2.33
    }.get(target_service_level, 1.645)
    
    demand_variance = forecast.daily_demand_std ** 2
    lead_time_variance = (lead_time_std * avg_daily_demand) ** 2
    safety_stock_new = z_score * np.sqrt(lead_time_mean * demand_variance + lead_time_variance)
    
    reorder_point_new = lead_time_mean * avg_daily_demand + safety_stock_new
    
    eoq = np.sqrt(2 * avg_daily_demand * 365 * 100 / (inventory.unit_cost * inventory.holding_cost_rate)) if inventory.unit_cost > 0 else inventory.reorder_quantity
    
    current_service_level = risk_metrics.service_level
    service_gap = target_service_level - current_service_level
    
    if len(inventory.pending_orders) > 0:
        pending_total = sum(po['quantity'] for po in inventory.pending_orders)
        delayed_total = sum(po['quantity'] for po in inventory.pending_orders if po['is_delayed'])
    else:
        pending_total = 0
        delayed_total = 0
    
    effective_stock = inventory.current_stock + pending_total
    effective_coverage = effective_stock / avg_daily_demand if avg_daily_demand > 0 else float('inf')
    
    if current_service_level >= target_service_level * 0.98:
        action = "维持现状"
        urgency = RiskLevel.GREEN
        order_quantity = 0
        order_date = pd.Timestamp.now() + pd.Timedelta(days=max(7, days_until_rop))
        rationale = f"当前服务水平 {current_service_level:.1%} 接近目标 {target_service_level:.1%}，建议维持现有库存策略"
    elif delayed_total > 0 and inventory.current_stock < 0:
        action = "紧急补货"
        urgency = RiskLevel.RED
        order_quantity = max(inventory.reorder_quantity, safety_stock_new * 1.5)
        order_date = pd.Timestamp.now()
        rationale = f"库存为负且有延迟到货订单 {delayed_total:.0f} 件，需立即紧急补货以避免断货"
    elif current_coverage < lead_time_mean * 0.5:
        action = "立即补货"
        urgency = RiskLevel.RED
        order_quantity = max(inventory.reorder_quantity, eoq)
        order_date = pd.Timestamp.now()
        rationale = f"当前库存仅可覆盖 {current_coverage:.1f} 天需求（平均提前期 {lead_time_mean:.1f} 天），需立即补货"
    elif current_service_level < target_service_level * 0.8:
        action = "增加安全库存并补货"
        urgency = RiskLevel.YELLOW
        order_quantity = max(inventory.reorder_quantity, reorder_point_new - inventory.current_stock + eoq * 0.5)
        order_date = pd.Timestamp.now()
        rationale = f"服务水平缺口较大（目标 {target_service_level:.1%}，实际 {current_service_level:.1%}），建议增加安全库存至 {safety_stock_new:.0f} 件"
    elif inventory.current_stock <= inventory.reorder_point:
        action = "按计划补货"
        urgency = RiskLevel.YELLOW
        order_quantity = inventory.reorder_quantity
        order_date = pd.Timestamp.now()
        rationale = f"当前库存 {inventory.current_stock:.0f} 件已低于订货点 {inventory.reorder_point:.0f} 件，按计划补货"
    elif days_until_rop <= 7:
        action = "准备补货"
        urgency = RiskLevel.YELLOW
        order_quantity = inventory.reorder_quantity
        order_date = pd.Timestamp.now() + pd.Timedelta(days=3)
        rationale = f"预计 {days_until_rop:.1f} 天后达到订货点，建议提前准备补货"
    else:
        action = "继续监控"
        urgency = RiskLevel.GREEN
        order_quantity = 0
        order_date = pd.Timestamp.now() + pd.Timedelta(days=7)
        rationale = f"当前库存充足（可覆盖 {current_coverage:.1f} 天），建议继续监控"
    
    if order_quantity > 0:
        if order_quantity / (avg_daily_demand * lead_time_mean) > 3:
            order_quantity = avg_daily_demand * lead_time_mean * 2
            rationale += "（已调整为合理批量）"
    
    risk_reduction = 0
    if action in ["紧急补货", "立即补货", "增加安全库存并补货"]:
        risk_reduction = min(0.8, service_gap * 2) if service_gap > 0 else 0.3
    
    cost_impact = order_quantity * inventory.unit_cost if order_quantity > 0 else 0
    
    alternative_scenarios = []
    
    scenario_2_service = min(1.0, current_service_level + 0.05)
    scenario_2_ss = z_score * 1.28 * np.sqrt(lead_time_mean * demand_variance + lead_time_variance)
    alternative_scenarios.append({
        'scenario': '保守策略（增加10%安全库存）',
        'order_quantity': max(0, reorder_point_new * 1.1 - inventory.current_stock),
        'expected_service_level': min(1.0, current_service_level + 0.08),
        'risk_reduction': risk_reduction * 1.2,
        'cost_impact': cost_impact * 1.1,
        'description': f"安全库存 {scenario_2_ss:.0f} 件，服务水平提升至 {min(1.0, current_service_level + 0.08):.1%}"
    })
    
    scenario_3_qty = eoq
    alternative_scenarios.append({
        'scenario': '经济订货批量（EOQ）',
        'order_quantity': scenario_3_qty,
        'expected_service_level': current_service_level,
        'risk_reduction': 0,
        'cost_impact': scenario_3_qty * inventory.unit_cost,
        'description': f"经济订货量 {scenario_3_qty:.0f} 件，最小化订货+持有成本"
    })
    
    if current_service_level >= target_service_level:
        alternative_scenarios.append({
            'scenario': '降低库存策略',
            'order_quantity': max(0, inventory.reorder_quantity * 0.7),
            'expected_service_level': max(0.8, current_service_level - 0.05),
            'risk_reduction': -0.05,
            'cost_impact': cost_impact * 0.7,
            'description': '降低订货量以减少库存持有成本，服务水平可能略有下降'
        })
    
    advice = ReplenishmentAdvice(
        sku=sku,
        action=action,
        suggested_order_quantity=float(order_quantity),
        suggested_order_date=order_date,
        urgency=urgency,
        rationale=rationale,
        expected_service_level=float(min(1.0, current_service_level + risk_reduction)),
        risk_reduction=float(risk_reduction),
        cost_impact=float(cost_impact),
        alternative_scenarios=alternative_scenarios
    )
    
    new_states.append(_create_pipeline_state(
        "replenishment_advice_complete",
        {
            'action': action,
            'urgency': urgency,
            'order_quantity': order_quantity,
            'order_date': order_date.isoformat(),
            'expected_service_level': min(1.0, current_service_level + risk_reduction)
        },
        {
            'alternatives_count': len(alternative_scenarios),
            'current_coverage_days': current_coverage,
            'pending_orders_total': pending_total,
            'delayed_orders_total': delayed_total
        }
    ))
    
    return advice, new_states
