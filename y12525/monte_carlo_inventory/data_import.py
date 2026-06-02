import pandas as pd
import numpy as np
from typing import List, Dict, Optional, Tuple
from pathlib import Path
import hashlib
import json
from datetime import datetime

from .types import (
    ImportResult, SalesHistory, SupplyCycle, InventoryStatus,
    DataIssue, DataIssueType, IssueSeverity, PipelineState
)


def _compute_hash(data: Dict) -> str:
    return hashlib.sha256(json.dumps(data, sort_keys=True, default=str).encode()).hexdigest()[:16]


def _create_pipeline_state(stage: str, data: Dict, metadata: Dict = None) -> PipelineState:
    return PipelineState(
        stage=stage,
        input_hash=_compute_hash(data),
        timestamp=pd.Timestamp.now(),
        data=data.copy(),
        metadata=metadata or {}
    )


def read_excel_safe(file_path: str, sheet_name: str = 0) -> Tuple[Optional[pd.DataFrame], List[DataIssue]]:
    issues: List[DataIssue] = []
    try:
        df = pd.read_excel(file_path, sheet_name=sheet_name)
        if df.empty:
            issues.append(DataIssue(
                issue_type=DataIssueType.MISSING_VALUE,
                severity=IssueSeverity.CRITICAL,
                location=f"{sheet_name}",
                description="工作表为空",
                suggested_fix="请检查数据文件，确保包含有效数据"
            ))
            return None, issues
        return df, issues
    except FileNotFoundError:
        issues.append(DataIssue(
            issue_type=DataIssueType.MISSING_VALUE,
            severity=IssueSeverity.CRITICAL,
            location=file_path,
            description=f"文件不存在: {file_path}",
            suggested_fix="请确认文件路径是否正确"
        ))
        return None, issues
    except Exception as e:
        issues.append(DataIssue(
            issue_type=DataIssueType.INCONSISTENT,
            severity=IssueSeverity.CRITICAL,
            location=file_path,
            description=f"读取文件失败: {str(e)}",
            suggested_fix="请检查文件格式是否为有效的Excel文件"
        ))
        return None, issues


def parse_sales_history(df: pd.DataFrame, sku: str) -> Tuple[Optional[SalesHistory], List[DataIssue]]:
    issues: List[DataIssue] = []
    
    date_col = None
    qty_col = None
    
    for col in df.columns:
        col_lower = str(col).lower()
        if 'date' in col_lower or '日期' in col_lower or '时间' in col_lower:
            date_col = col
        if 'quantity' in col_lower or 'qty' in col_lower or '销量' in col_lower or '数量' in col_lower:
            qty_col = col
    
    if date_col is None:
        issues.append(DataIssue(
            issue_type=DataIssueType.INCONSISTENT,
            severity=IssueSeverity.CRITICAL,
            location="销售历史",
            description="未找到日期列，期望列名包含 'date' 或 '日期'",
            suggested_fix="请重命名日期列为 'date' 或包含 '日期' 关键词"
        ))
        return None, issues
    
    if qty_col is None:
        issues.append(DataIssue(
            issue_type=DataIssueType.INCONSISTENT,
            severity=IssueSeverity.CRITICAL,
            location="销售历史",
            description="未找到销量列，期望列名包含 'quantity', 'qty' 或 '销量'",
            suggested_fix="请重命名销量列为 'quantity' 或包含 '销量' 关键词"
        ))
        return None, issues
    
    df_clean = df.copy()
    df_clean[date_col] = pd.to_datetime(df_clean[date_col], errors='coerce')
    df_clean[qty_col] = pd.to_numeric(df_clean[qty_col], errors='coerce')
    
    for idx, (date_val, qty_val) in enumerate(zip(df_clean[date_col], df_clean[qty_col])):
        if pd.isna(date_val):
            issues.append(DataIssue(
                issue_type=DataIssueType.MISSING_VALUE,
                severity=IssueSeverity.HIGH,
                location=f"销售历史[{idx}]",
                description=f"第 {idx+2} 行日期格式无效",
                suggested_fix="请修正日期格式，建议使用 YYYY-MM-DD",
                original_value=None,
                row_index=idx
            ))
        if pd.isna(qty_val):
            issues.append(DataIssue(
                issue_type=DataIssueType.MISSING_VALUE,
                severity=IssueSeverity.HIGH,
                location=f"销售历史[{idx}]",
                description=f"第 {idx+2} 行销量数据无效",
                suggested_fix="请确保销量为有效数字",
                original_value=None,
                row_index=idx
            ))
    
    valid_mask = df_clean[date_col].notna() & df_clean[qty_col].notna()
    df_valid = df_clean[valid_mask].copy()
    df_valid = df_valid.sort_values(date_col)
    
    if len(df_valid) < 30:
        issues.append(DataIssue(
            issue_type=DataIssueType.INCONSISTENT,
            severity=IssueSeverity.HIGH,
            location="销售历史",
            description=f"有效数据点不足，仅 {len(df_valid)} 条，建议至少 30 条历史数据",
            suggested_fix="请补充更多历史销售数据"
        ))
    
    daily_data = df_valid.groupby(df_valid[date_col].dt.date)[qty_col].sum().reset_index()
    daily_data.columns = ['date', 'quantity']
    daily_data['date'] = pd.to_datetime(daily_data['date'])
    
    date_range = pd.date_range(start=daily_data['date'].min(), end=daily_data['date'].max(), freq='D')
    daily_data = daily_data.set_index('date').reindex(date_range).fillna(0).reset_index()
    daily_data.columns = ['date', 'quantity']
    
    sales = SalesHistory(
        sku=sku,
        dates=list(daily_data['date']),
        quantities=list(daily_data['quantity']),
        raw_data=df
    )
    
    return sales, issues


def parse_supply_cycle(df: pd.DataFrame, sku: str) -> Tuple[Optional[SupplyCycle], List[DataIssue]]:
    issues: List[DataIssue] = []
    
    lt_col = None
    for col in df.columns:
        col_lower = str(col).lower()
        if 'lead' in col_lower or '提前' in col_lower or 'lead_time' in col_lower or '交期' in col_lower:
            lt_col = col
    
    if lt_col is None:
        mean_lt = None
        std_lt = None
        min_lt = None
        max_lt = None
        historical_lts = None
        
        for col in df.columns:
            col_lower = str(col).lower()
            if 'mean' in col_lower or '平均' in col_lower:
                mean_lt = df[col].iloc[0]
            if 'std' in col_lower or '标准' in col_lower:
                std_lt = df[col].iloc[0]
            if 'min' in col_lower or '最小' in col_lower:
                min_lt = df[col].iloc[0]
            if 'max' in col_lower or '最大' in col_lower:
                max_lt = df[col].iloc[0]
        
        if mean_lt is None:
            issues.append(DataIssue(
                issue_type=DataIssueType.INCONSISTENT,
                severity=IssueSeverity.CRITICAL,
                location="供应周期",
                description="未找到提前期数据或平均交期",
                suggested_fix="请提供历史提前期数据列或平均交期参数"
            ))
            return None, issues
        
        if std_lt is None:
            std_lt = mean_lt * 0.2
            issues.append(DataIssue(
                issue_type=DataIssueType.MISSING_VALUE,
                severity=IssueSeverity.MEDIUM,
                location="供应周期",
                description=f"未提供提前期标准差，使用默认值 mean*0.2 = {std_lt:.2f}",
                suggested_fix="如果有标准差数据，请补充以提高准确度",
                original_value=None
            ))
        if min_lt is None:
            min_lt = max(1, mean_lt - 2 * std_lt)
        if max_lt is None:
            max_lt = mean_lt + 3 * std_lt
    else:
        df[lt_col] = pd.to_numeric(df[lt_col], errors='coerce')
        valid_lts = df[lt_col].dropna()
        
        if len(valid_lts) == 0:
            issues.append(DataIssue(
                issue_type=DataIssueType.MISSING_VALUE,
                severity=IssueSeverity.CRITICAL,
                location="供应周期",
                description="提前期列无有效数据",
                suggested_fix="请检查提前期数据列"
            ))
            return None, issues
        
        for idx, val in enumerate(df[lt_col]):
            if pd.isna(val):
                issues.append(DataIssue(
                    issue_type=DataIssueType.MISSING_VALUE,
                    severity=IssueSeverity.MEDIUM,
                    location=f"供应周期[{idx}]",
                    description=f"第 {idx+2} 行提前期数据缺失",
                    suggested_fix="请补充该数据或确认是否可以忽略",
                    row_index=idx
                ))
            elif val < 0:
                issues.append(DataIssue(
                    issue_type=DataIssueType.NEGATIVE_VALUE,
                    severity=IssueSeverity.HIGH,
                    location=f"供应周期[{idx}]",
                    description=f"第 {idx+2} 行提前期为负数: {val}",
                    suggested_fix="请修正提前期，不能为负数",
                    original_value=val,
                    row_index=idx
                ))
        
        historical_lts = list(valid_lts)
        mean_lt = valid_lts.mean()
        std_lt = valid_lts.std() if len(valid_lts) > 1 else mean_lt * 0.2
        min_lt = valid_lts.min()
        max_lt = valid_lts.max()
    
    reliability = 0.85
    for col in df.columns:
        col_lower = str(col).lower()
        if 'reliability' in col_lower or '可靠' in col_lower or '按时' in col_lower:
            reliability = df[col].iloc[0]
            if isinstance(reliability, str):
                reliability = float(reliability.replace('%', '')) / 100
            if reliability > 1:
                reliability = reliability / 100
            break
    
    if reliability < 0.5:
        issues.append(DataIssue(
            issue_type=DataIssueType.EXTREME_VALUE,
            severity=IssueSeverity.HIGH,
            location="供应周期",
            description=f"供应商可靠度过低: {reliability:.2%}",
            suggested_fix="请确认供应商可靠度是否正确，过低会导致风险评估偏高",
            original_value=reliability
        ))
    
    supply = SupplyCycle(
        sku=sku,
        lead_time_mean=float(mean_lt),
        lead_time_std=float(std_lt),
        lead_time_min=float(min_lt),
        lead_time_max=float(max_lt),
        supplier_reliability=float(reliability),
        raw_data=df,
        historical_lead_times=historical_lts
    )
    
    return supply, issues


def parse_inventory_status(df: pd.DataFrame, sku: str) -> Tuple[Optional[InventoryStatus], List[DataIssue]]:
    issues: List[DataIssue] = []
    
    def get_value(col_keywords: List[str], default=None, required=False):
        for col in df.columns:
            col_lower = str(col).lower()
            for kw in col_keywords:
                if kw in col_lower:
                    val = df[col].iloc[0]
                    if pd.isna(val):
                        if required and default is None:
                            issues.append(DataIssue(
                                issue_type=DataIssueType.MISSING_VALUE,
                                severity=IssueSeverity.HIGH,
                                location=f"库存状态[{col}]",
                                description=f"必填字段 {col} 为空",
                                suggested_fix=f"请补充 {col} 数据"
                            ))
                        return default
                    if isinstance(val, str):
                        try:
                            val = float(val.replace(',', ''))
                        except:
                            issues.append(DataIssue(
                                issue_type=DataIssueType.INCONSISTENT,
                                severity=IssueSeverity.MEDIUM,
                                location=f"库存状态[{col}]",
                                description=f"字段 {col} 格式无法解析: {val}",
                                suggested_fix=f"请确保 {col} 为有效数字"
                            ))
                            return default
                    return val
        if required and default is None:
            issues.append(DataIssue(
                issue_type=DataIssueType.INCONSISTENT,
                severity=IssueSeverity.CRITICAL,
                location="库存状态",
                description=f"未找到包含关键词 {col_keywords} 的列",
                suggested_fix="请检查列名是否正确"
            ))
        return default
    
    current_stock = get_value(['current', 'stock', '库存', '现有'], required=True)
    unit_cost = get_value(['cost', 'price', '成本', '单价'], required=True)
    
    if current_stock is None or unit_cost is None:
        return None, issues
    
    safety_stock = get_value(['safety', '安全库存'], default=current_stock * 0.2)
    reorder_point = get_value(['reorder', 'rop', '订货点'], default=safety_stock)
    reorder_quantity = get_value(['quantity', 'qty', '订货量'], default=current_stock)
    
    if current_stock < 0:
        issues.append(DataIssue(
            issue_type=DataIssueType.NEGATIVE_VALUE,
            severity=IssueSeverity.HIGH,
            location="库存状态",
            description=f"当前库存为负数: {current_stock}",
            suggested_fix="请确认是否存在延迟到货未录入，或库存数据有误",
            original_value=current_stock
        ))
    
    if safety_stock < 0:
        issues.append(DataIssue(
            issue_type=DataIssueType.NEGATIVE_VALUE,
            severity=IssueSeverity.MEDIUM,
            location="库存状态",
            description=f"安全库存为负数: {safety_stock}",
            suggested_fix="安全库存建议设为正数",
            original_value=safety_stock
        ))
    
    last_restock = None
    for col in df.columns:
        col_lower = str(col).lower()
        if 'last' in col_lower and ('date' in col_lower or '入库' in col_lower):
            last_restock = pd.to_datetime(df[col].iloc[0], errors='coerce')
            if pd.isna(last_restock):
                last_restock = None
                issues.append(DataIssue(
                    issue_type=DataIssueType.MISSING_VALUE,
                    severity=IssueSeverity.LOW,
                    location=f"库存状态[{col}]",
                    description="上次入库日期格式无效",
                    suggested_fix="请使用 YYYY-MM-DD 格式"
                ))
            break
    
    pending_orders = []
    order_cols = [c for c in df.columns if 'order' in str(c).lower() or '在途' in str(c) or '未到货' in str(c)]
    if len(order_cols) >= 3:
        for idx, row in df.iterrows():
            qty = None
            eta = None
            for col in order_cols:
                col_lower = str(col).lower()
                if 'qty' in col_lower or 'quantity' in col_lower or '数量' in col_lower:
                    qty = row[col]
                if 'eta' in col_lower or 'date' in col_lower or '到' in col_lower:
                    eta = pd.to_datetime(row[col], errors='coerce')
            if qty is not None and pd.notna(qty) and eta is not None and pd.notna(eta):
                pending_orders.append({
                    'quantity': float(qty),
                    'eta': eta,
                    'is_delayed': eta < pd.Timestamp.now()
                })
    
    if current_stock < 0 and len(pending_orders) == 0:
        issues.append(DataIssue(
            issue_type=DataIssueType.INCONSISTENT,
            severity=IssueSeverity.HIGH,
            location="库存状态",
            description="库存为负但无在途订单，请确认是否存在延迟到货未录入",
            suggested_fix="请录入延迟到货订单，或修正库存数据"
        ))
    
    inventory = InventoryStatus(
        sku=sku,
        current_stock=float(current_stock),
        safety_stock=float(safety_stock),
        reorder_point=float(reorder_point),
        reorder_quantity=float(reorder_quantity),
        unit_cost=float(unit_cost),
        last_restock_date=last_restock,
        pending_orders=pending_orders
    )
    
    return inventory, issues


def import_data(
    sales_file: str,
    supply_file: str,
    inventory_file: str,
    sku: str,
    sales_sheet: str = 0,
    supply_sheet: str = 0,
    inventory_sheet: str = 0
) -> Tuple[ImportResult, List[PipelineState]]:
    pipeline_states: List[PipelineState] = []
    all_issues: List[DataIssue] = []
    messages: List[str] = []
    
    pipeline_states.append(_create_pipeline_state(
        "import_start",
        {'sales_file': sales_file, 'supply_file': supply_file, 'inventory_file': inventory_file, 'sku': sku},
        {'timestamp': datetime.now().isoformat()}
    ))
    
    sales_df, read_issues = read_excel_safe(sales_file, sales_sheet)
    all_issues.extend(read_issues)
    
    sales = None
    if sales_df is not None:
        sales, parse_issues = parse_sales_history(sales_df, sku)
        all_issues.extend(parse_issues)
        if sales is not None:
            messages.append(f"销售历史导入成功: {len(sales.dates)} 天数据")
            pipeline_states.append(_create_pipeline_state(
                "sales_imported",
                {'n_days': len(sales.dates), 'total_qty': sum(sales.quantities)},
                {'date_range': [sales.dates[0].isoformat(), sales.dates[-1].isoformat()]}
            ))
    
    supply_df, read_issues = read_excel_safe(supply_file, supply_sheet)
    all_issues.extend(read_issues)
    
    supply = None
    if supply_df is not None:
        supply, parse_issues = parse_supply_cycle(supply_df, sku)
        all_issues.extend(parse_issues)
        if supply is not None:
            messages.append(f"供应周期导入成功: 平均提前期 {supply.lead_time_mean:.1f} 天")
            pipeline_states.append(_create_pipeline_state(
                "supply_imported",
                {
                    'lead_time_mean': supply.lead_time_mean,
                    'lead_time_std': supply.lead_time_std,
                    'reliability': supply.supplier_reliability
                },
                {'has_historical': supply.historical_lead_times is not None}
            ))
    
    inventory_df, read_issues = read_excel_safe(inventory_file, inventory_sheet)
    all_issues.extend(read_issues)
    
    inventory = None
    if inventory_df is not None:
        inventory, parse_issues = parse_inventory_status(inventory_df, sku)
        all_issues.extend(parse_issues)
        if inventory is not None:
            messages.append(f"库存状态导入成功: 当前库存 {inventory.current_stock:.0f} 件")
            if inventory.pending_orders:
                messages.append(f"  在途订单: {len(inventory.pending_orders)} 笔")
                for po in inventory.pending_orders:
                    status = "【已延迟】" if po['is_delayed'] else ""
                    messages.append(f"    {status}{po['quantity']:.0f} 件，预计到货: {po['eta'].strftime('%Y-%m-%d')}")
            pipeline_states.append(_create_pipeline_state(
                "inventory_imported",
                {
                    'current_stock': inventory.current_stock,
                    'safety_stock': inventory.safety_stock,
                    'reorder_point': inventory.reorder_point,
                    'pending_orders': len(inventory.pending_orders)
                },
                {'has_negative_stock': inventory.current_stock < 0}
            ))
    
    import_success = sales is not None and supply is not None and inventory is not None
    
    if import_success:
        messages.append("=== 数据导入完成 ===")
        critical_issues = [i for i in all_issues if i.severity == IssueSeverity.CRITICAL]
        high_issues = [i for i in all_issues if i.severity == IssueSeverity.HIGH]
        if critical_issues or high_issues:
            messages.append(f"警告: 发现 {len(critical_issues)} 个严重问题，{len(high_issues)} 个高优先级问题")
    else:
        messages.append("错误: 数据导入未完成，请检查上述问题")
    
    result = ImportResult(
        sales=sales,
        supply=supply,
        inventory=inventory,
        issues=all_issues,
        import_success=import_success,
        messages=messages
    )
    
    pipeline_states.append(_create_pipeline_state(
        "import_complete",
        {'success': import_success, 'n_issues': len(all_issues)},
        {'issues_summary': {
            'CRITICAL': len([i for i in all_issues if i.severity == IssueSeverity.CRITICAL]),
            'HIGH': len([i for i in all_issues if i.severity == IssueSeverity.HIGH]),
            'MEDIUM': len([i for i in all_issues if i.severity == IssueSeverity.MEDIUM]),
            'LOW': len([i for i in all_issues if i.severity == IssueSeverity.LOW])
        }}
    ))
    
    return result, pipeline_states
