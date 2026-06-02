import pandas as pd
import numpy as np
from scipy import stats
from typing import List, Dict, Optional, Tuple
from collections import defaultdict

from .types import (
    ImportResult, DataIssue, DataIssueType, IssueSeverity,
    SalesHistory, SupplyCycle, InventoryStatus, PipelineState,
    DemandForecast
)
from .data_import import _create_pipeline_state


def detect_outliers_iqr(data: List[float], threshold: float = 3.0) -> Tuple[List[int], List[float], float, float]:
    arr = np.array(data)
    q1 = np.percentile(arr, 25)
    q3 = np.percentile(arr, 75)
    iqr = q3 - q1
    lower_bound = q1 - threshold * iqr
    upper_bound = q3 + threshold * iqr
    
    outliers = []
    outlier_values = []
    for i, val in enumerate(arr):
        if val < lower_bound or val > upper_bound:
            outliers.append(i)
            outlier_values.append(val)
    
    return outliers, outlier_values, lower_bound, upper_bound


def detect_outliers_zscore(data: List[float], threshold: float = 3.0) -> Tuple[List[int], List[float]]:
    arr = np.array(data)
    if len(arr) < 3:
        return [], []
    z_scores = np.abs(stats.zscore(arr, nan_policy='omit'))
    outliers = np.where(z_scores > threshold)[0]
    return list(outliers), [arr[i] for i in outliers]


def detect_extreme_values(data: List[float], context: str) -> List[DataIssue]:
    issues: List[DataIssue] = []
    if len(data) < 5:
        return issues
    
    arr = np.array(data)
    mean = np.mean(arr)
    std = np.std(arr)
    max_val = np.max(arr)
    min_val = np.min(arr)
    
    if std > 0:
        cv = std / mean if mean != 0 else float('inf')
        if cv > 2.0:
            issues.append(DataIssue(
                issue_type=DataIssueType.EXTREME_VALUE,
                severity=IssueSeverity.HIGH,
                location=context,
                description=f"数据离散度过高，变异系数 CV={cv:.2f}（建议<2.0），均值={mean:.2f}，标准差={std:.2f}",
                suggested_fix="请检查数据是否包含异常值或特殊事件，可能需要剔除或单独标注"
            ))
    
    if max_val > mean * 10 and max_val > 0:
        issues.append(DataIssue(
            issue_type=DataIssueType.EXTREME_VALUE,
            severity=IssueSeverity.HIGH,
            location=context,
            description=f"存在极端大值: {max_val:.2f}，是均值的 {max_val/mean:.1f} 倍",
            suggested_fix="请确认该值是否为真实数据（如促销、大订单），如果是异常值请修正",
            original_value=max_val
        ))
    
    if min_val < 0:
        issues.append(DataIssue(
            issue_type=DataIssueType.NEGATIVE_VALUE,
            severity=IssueSeverity.HIGH,
            location=context,
            description=f"存在负值: {min_val:.2f}",
            suggested_fix="销量/需求数据不应为负，请检查数据",
            original_value=min_val
        ))
    
    iqr_outliers, iqr_values, lb, ub = detect_outliers_iqr(data, threshold=3.0)
    if iqr_outliers:
        for idx, val in zip(iqr_outliers, iqr_values):
            issues.append(DataIssue(
                issue_type=DataIssueType.OUTLIER,
                severity=IssueSeverity.MEDIUM,
                location=f"{context}[{idx}]",
                description=f"IQR方法检测到异常值: {val:.2f}（边界: [{lb:.2f}, {ub:.2f}]）",
                suggested_fix="请确认该值是否为真实数据，如需保留建议标注为特殊事件",
                original_value=val,
                row_index=idx
            ))
    
    z_outliers, z_values = detect_outliers_zscore(data, threshold=3.0)
    if z_outliers:
        for idx, val in zip(z_outliers, z_values):
            if idx not in iqr_outliers:
                issues.append(DataIssue(
                    issue_type=DataIssueType.OUTLIER,
                    severity=IssueSeverity.MEDIUM,
                    location=f"{context}[{idx}]",
                    description=f"Z-score方法检测到异常值: {val:.2f}",
                    suggested_fix="请确认该值是否为真实数据",
                    original_value=val,
                    row_index=idx
                ))
    
    return issues


def check_sales_quality(sales: SalesHistory) -> List[DataIssue]:
    issues: List[DataIssue] = []
    
    quantities = sales.quantities
    issues.extend(detect_extreme_values(quantities, f"销售历史[{sales.sku}]"))
    
    zero_ratio = sum(1 for q in quantities if q == 0) / len(quantities)
    if zero_ratio > 0.5:
        issues.append(DataIssue(
            issue_type=DataIssueType.INCONSISTENT,
            severity=IssueSeverity.MEDIUM,
            location=f"销售历史[{sales.sku}]",
            description=f"零销量天数占比过高: {zero_ratio:.1%}",
            suggested_fix="请确认是否为间歇性需求产品，可能需要特殊的需求预测方法"
        ))
    
    nonzero_quantities = [q for q in quantities if q > 0]
    if nonzero_quantities:
        q25, q75 = np.percentile(nonzero_quantities, [25, 75])
        if q75 > q25 * 5:
            issues.append(DataIssue(
                issue_type=DataIssueType.EXTREME_VALUE,
                severity=IssueSeverity.HIGH,
                location=f"销售历史[{sales.sku}]",
                description=f"非零销量波动大，75分位={q75:.0f} 是 25分位={q25:.0f} 的 {q75/q25:.1f} 倍",
                suggested_fix="建议检查是否存在批量订单与零售混合的情况，可能需要分开建模"
            ))
    
    trend = stats.linregress(range(len(quantities)), quantities)
    if trend.pvalue < 0.05 and abs(trend.slope) > np.mean(quantities) * 0.01:
        direction = "上升" if trend.slope > 0 else "下降"
        issues.append(DataIssue(
            issue_type=DataIssueType.INCONSISTENT,
            severity=IssueSeverity.MEDIUM,
            location=f"销售历史[{sales.sku}]",
            description=f"检测到显著{direction}趋势 (p={trend.pvalue:.3f}, slope={trend.slope:.2f}/天)",
            suggested_fix="蒙特卡洛模拟假设需求平稳，如有趋势建议先做去趋势处理，或缩短历史数据窗口"
        ))
    
    if len(quantities) >= 14:
        weekly_avg = [np.mean(quantities[i*7:(i+1)*7]) for i in range(len(quantities)//7)]
        if len(weekly_avg) >= 4:
            cv_weekly = np.std(weekly_avg) / np.mean(weekly_avg) if np.mean(weekly_avg) > 0 else 0
            if cv_weekly > 1.5:
                issues.append(DataIssue(
                    issue_type=DataIssueType.EXTREME_VALUE,
                    severity=IssueSeverity.HIGH,
                    location=f"销售历史[{sales.sku}]",
                    description=f"周均需求波动大，周度CV={cv_weekly:.2f}",
                    suggested_fix="建议检查是否存在周度/季节性模式，或是否有异常周数据"
                ))
    
    return issues


def check_supply_quality(supply: SupplyCycle) -> List[DataIssue]:
    issues: List[DataIssue] = []
    
    if supply.historical_lead_times is not None and len(supply.historical_lead_times) > 0:
        lts = supply.historical_lead_times
        
        if supply.lead_time_std > supply.lead_time_mean * 0.5:
            issues.append(DataIssue(
                issue_type=DataIssueType.EXTREME_VALUE,
                severity=IssueSeverity.HIGH,
                location=f"供应周期[{supply.sku}]",
                description=f"提前期波动过大，标准差={supply.lead_time_std:.1f} 是均值={supply.lead_time_mean:.1f} 的 {supply.lead_time_std/supply.lead_time_mean:.1%}",
                suggested_fix="提前期波动大意味着供应不稳定，建议加强供应商管理或增加安全库存缓冲"
            ))
        
        if supply.lead_time_max > supply.lead_time_mean * 3:
            issues.append(DataIssue(
                issue_type=DataIssueType.EXTREME_VALUE,
                severity=IssueSeverity.HIGH,
                location=f"供应周期[{supply.sku}]",
                description=f"最大提前期={supply.lead_time_max:.1f} 是均值的 {supply.lead_time_max/supply.lead_time_mean:.1f} 倍",
                suggested_fix="请确认最长提前期是否为异常情况，可能需要与供应商确认是否为偶发事件",
                original_value=supply.lead_time_max
            ))
        
        if len(lts) >= 5:
            issues.extend(detect_extreme_values(lts, f"供应周期[{supply.sku}].提前期"))
    
    if supply.supplier_reliability < 0.7:
        issues.append(DataIssue(
            issue_type=DataIssueType.EXTREME_VALUE,
            severity=IssueSeverity.HIGH,
            location=f"供应周期[{supply.sku}]",
            description=f"供应商按时交付率过低: {supply.supplier_reliability:.1%}",
            suggested_fix="建议寻找备选供应商，或增加安全库存以应对供应中断风险"
        ))
    
    if supply.lead_time_min < 1:
        issues.append(DataIssue(
            issue_type=DataIssueType.NEGATIVE_VALUE,
            severity=IssueSeverity.MEDIUM,
            location=f"供应周期[{supply.sku}]",
            description=f"最小提前期={supply.lead_time_min:.1f} 天，小于1天",
            suggested_fix="请确认是否为数据录入错误，或是否为本地库存补货"
        ))
    
    return issues


def check_inventory_consistency(
    inventory: InventoryStatus,
    sales: SalesHistory,
    supply: SupplyCycle
) -> List[DataIssue]:
    issues: List[DataIssue] = []
    sku = inventory.sku
    
    avg_daily_demand = np.mean(sales.quantities)
    if avg_daily_demand > 0:
        coverage_days = inventory.current_stock / avg_daily_demand
        
        if coverage_days < 0:
            issues.append(DataIssue(
                issue_type=DataIssueType.NEGATIVE_VALUE,
                severity=IssueSeverity.CRITICAL,
                location=f"库存状态[{sku}]",
                description=f"库存为负，可覆盖 {coverage_days:.1f} 天需求",
                suggested_fix="请立即核查延迟到货情况，库存为负意味着已经缺货",
                original_value=inventory.current_stock
            ))
        elif coverage_days < supply.lead_time_mean * 0.5:
            issues.append(DataIssue(
                issue_type=DataIssueType.INCONSISTENT,
                severity=IssueSeverity.HIGH,
                location=f"库存状态[{sku}]",
                description=f"库存水平过低，仅可覆盖 {coverage_days:.1f} 天需求（平均提前期 {supply.lead_time_mean:.1f} 天）",
                suggested_fix="建议立即安排补货，否则将面临缺货风险",
                original_value=inventory.current_stock
            ))
        elif coverage_days > supply.lead_time_mean * 5:
            issues.append(DataIssue(
                issue_type=DataIssueType.INCONSISTENT,
                severity=IssueSeverity.MEDIUM,
                location=f"库存状态[{sku}]",
                description=f"库存水平过高，可覆盖 {coverage_days:.1f} 天需求（平均提前期 {supply.lead_time_mean:.1f} 天）",
                suggested_fix="建议检查是否补货过量，考虑促销或调整订货策略",
                original_value=inventory.current_stock
            ))
        
        if inventory.safety_stock > 0:
            safety_days = inventory.safety_stock / avg_daily_demand
            if safety_days < supply.lead_time_std * 2:
                issues.append(DataIssue(
                    issue_type=DataIssueType.INCONSISTENT,
                    severity=IssueSeverity.MEDIUM,
                    location=f"库存状态[{sku}]",
                    description=f"安全库存可能不足，可覆盖 {safety_days:.1f} 天（建议: {supply.lead_time_std * 2:.1f} 天）",
                    suggested_fix="建议根据需求和提前期波动重新计算安全库存水平"
                ))
    
    for idx, po in enumerate(inventory.pending_orders):
        if po['is_delayed']:
            delay_days = (pd.Timestamp.now() - po['eta']).days
            if delay_days > supply.lead_time_std * 2:
                issues.append(DataIssue(
                    issue_type=DataIssueType.EXTREME_VALUE,
                    severity=IssueSeverity.HIGH,
                    location=f"库存状态[{sku}].在途订单[{idx}]",
                    description=f"在途订单严重延迟 {delay_days:.0f} 天，数量 {po['quantity']:.0f} 件",
                    suggested_fix="请立即与供应商确认到货时间，考虑紧急补货",
                    original_value=delay_days
                ))
            else:
                issues.append(DataIssue(
                    issue_type=DataIssueType.INCONSISTENT,
                    severity=IssueSeverity.MEDIUM,
                    location=f"库存状态[{sku}].在途订单[{idx}]",
                    description=f"在途订单延迟 {delay_days:.0f} 天，数量 {po['quantity']:.0f} 件",
                    suggested_fix="请与供应商确认最新到货时间，评估对库存的影响",
                    original_value=delay_days
                ))
    
    if inventory.reorder_point > 0 and avg_daily_demand > 0:
        rop_days = inventory.reorder_point / avg_daily_demand
        expected_rop = supply.lead_time_mean * avg_daily_demand + inventory.safety_stock
        if abs(inventory.reorder_point - expected_rop) / expected_rop > 0.5:
            issues.append(DataIssue(
                issue_type=DataIssueType.INCONSISTENT,
                severity=IssueSeverity.MEDIUM,
                location=f"库存状态[{sku}]",
                description=f"订货点设置可能不合理，当前={inventory.reorder_point:.0f}，建议={expected_rop:.0f}",
                suggested_fix="建议重新评估订货点: 提前期需求 + 安全库存"
            ))
    
    return issues


def check_data_integrity(
    sales: SalesHistory,
    supply: SupplyCycle,
    inventory: InventoryStatus
) -> Tuple[List[DataIssue], Dict]:
    issues: List[DataIssue] = []
    
    issues.extend(check_sales_quality(sales))
    issues.extend(check_supply_quality(supply))
    issues.extend(check_inventory_consistency(inventory, sales, supply))
    
    summary = defaultdict(int)
    for issue in issues:
        summary[issue.severity] += 1
        summary[issue.issue_type] += 1
    
    return issues, dict(summary)


def generate_fix_recommendations(issues: List[DataIssue]) -> List[Dict]:
    recommendations = []
    
    critical = [i for i in issues if i.severity == IssueSeverity.CRITICAL]
    high = [i for i in issues if i.severity == IssueSeverity.HIGH]
    medium = [i for i in issues if i.severity == IssueSeverity.MEDIUM]
    
    if critical:
        recommendations.append({
            'priority': '立即处理',
            'severity': 'CRITICAL',
            'count': len(critical),
            'issues': critical,
            'action': '这些问题会导致分析结果完全不可信，必须先修复'
        })
    
    if high:
        recommendations.append({
            'priority': '优先处理',
            'severity': 'HIGH',
            'count': len(high),
            'issues': high,
            'action': '这些问题会严重影响分析准确度，建议修复后再进行模拟'
        })
    
    if medium:
        recommendations.append({
            'priority': '建议处理',
            'severity': 'MEDIUM',
            'count': len(medium),
            'issues': medium,
            'action': '这些问题对分析有一定影响，可根据实际情况选择处理或标注'
        })
    
    return recommendations


def run_data_check(
    import_result: ImportResult,
    pipeline_states: List[PipelineState]
) -> Tuple[List[DataIssue], List[Dict], List[PipelineState]]:
    new_states = pipeline_states.copy()
    
    if not import_result.import_success:
        return import_result.issues, [], new_states
    
    sku = import_result.sales.sku
    
    new_states.append(_create_pipeline_state(
        "data_check_start",
        {'sku': sku, 'stage': 'quality_check'},
        {'timestamp': pd.Timestamp.now().isoformat()}
    ))
    
    all_issues = import_result.issues.copy()
    quality_issues, quality_summary = check_data_integrity(
        import_result.sales,
        import_result.supply,
        import_result.inventory
    )
    all_issues.extend(quality_issues)
    
    new_states.append(_create_pipeline_state(
        "data_check_complete",
        {
            'total_issues': len(all_issues),
            'quality_summary': quality_summary
        },
        {
            'issues_by_severity': {
                'CRITICAL': len([i for i in all_issues if i.severity == IssueSeverity.CRITICAL]),
                'HIGH': len([i for i in all_issues if i.severity == IssueSeverity.HIGH]),
                'MEDIUM': len([i for i in all_issues if i.severity == IssueSeverity.MEDIUM]),
                'LOW': len([i for i in all_issues if i.severity == IssueSeverity.LOW])
            }
        }
    ))
    
    recommendations = generate_fix_recommendations(all_issues)
    
    return all_issues, recommendations, new_states
