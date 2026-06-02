import os
import json
import pandas as pd
from datetime import datetime
from typing import List, Dict, Any
from dataclasses import dataclass


@dataclass
class ComparisonResult:
    version_a: str
    version_b: str
    cost_difference: float
    assignment_differences: List[Dict]
    conflict_differences: List[Dict]
    summary: Dict


class ReportGenerator:
    def __init__(self, reports_dir: str = "reports"):
        self.reports_dir = reports_dir
        os.makedirs(reports_dir, exist_ok=True)
    
    def generate_excel_report(self, result, data_manager, filename: str = None) -> str:
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"分拨方案_{timestamp}.xlsx"
        
        filepath = os.path.join(self.reports_dir, filename)
        
        with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
            df_summary = pd.DataFrame([{
                "方案名称": filename.replace(".xlsx", ""),
                "优化状态": "成功" if result.success else "失败",
                "总成本": result.total_cost,
                "运输成本": getattr(result, 'transport_cost', result.total_cost),
                "时限惩罚成本": getattr(result, 'penalty_cost', 0),
                "求解时间(秒)": round(result.solve_time, 3),
                "分拨条数": len(result.assignments),
                "车辆配送条数": len(getattr(result, 'vehicle_assignments', [])),
                "冲突条数": len(result.conflicts),
                "数据版本": data_manager.current_version or "未知"
            }])
            df_summary.to_excel(writer, sheet_name="方案概览", index=False)
            
            if getattr(result, 'vehicle_assignments', []):
                df_vehicles = pd.DataFrame(result.vehicle_assignments)
                vehicle_cols = ["plate_number", "warehouse_name", "store_name", "trip_number",
                                "load", "max_capacity", "utilization_rate"]
                vehicle_col_names = ["车牌号", "出库仓库", "收货门店", "趟次",
                                     "装载量", "最大容量", "利用率(%)"]
                if "delivery_hours" in df_vehicles.columns:
                    vehicle_cols.append("delivery_hours")
                    vehicle_col_names.append("配送时长(h)")
                df_vehicles = df_vehicles[vehicle_cols]
                df_vehicles.columns = vehicle_col_names
                df_vehicles.to_excel(writer, sheet_name="车辆分配", index=False)
            
            if result.assignments:
                df_assignments = pd.DataFrame(result.assignments)
                base_cols = ["warehouse_name", "store_name", "sku_name", "quantity", "distance_km", "delivery_hours", "transport_cost"]
                base_names = ["出库仓库", "收货门店", "商品名称", "分拨数量", "距离(km)", "配送时长(h)", "运输成本"]
                if "penalty_cost" in df_assignments.columns:
                    base_cols.append("penalty_cost")
                    base_names.append("时限惩罚")
                if "deadline" in df_assignments.columns:
                    base_cols.append("deadline")
                    base_names.append("截止时间")
                base_cols.append("total_cost")
                base_names.append("总成本")
                df_assignments = df_assignments[base_cols]
                df_assignments.columns = base_names
                df_assignments.to_excel(writer, sheet_name="分拨明细", index=False)
            
            if result.conflicts:
                conflict_data = []
                for c in result.conflicts:
                    conflict_data.append({
                        "冲突类型": self._get_conflict_type_name(c["type"]),
                        "严重程度": self._get_severity_name(c["severity"]),
                        "描述": c["description"],
                        "影响": c["impact"]
                    })
                df_conflicts = pd.DataFrame(conflict_data)
                df_conflicts.to_excel(writer, sheet_name="冲突提示", index=False)
            
            inv_df = data_manager.get_inventory_summary()
            if not inv_df.empty:
                inv_df.to_excel(writer, sheet_name="库存数据", index=False)
            
            dem_df = data_manager.get_demand_summary()
            if not dem_df.empty:
                dem_df.to_excel(writer, sheet_name="需求数据", index=False)
        
        return filepath
    
    def _get_conflict_type_name(self, conflict_type: str) -> str:
        type_names = {
            "warehouse_capacity_violation": "仓库容量超限",
            "vehicle_capacity_insufficient": "车辆运力不足",
            "vehicle_capacity_exceeded": "路线运力不足",
            "vehicle_overload": "车辆超载",
            "no_available_vehicles": "无可用车辆",
            "excessive_trips": "趟次超限",
            "deadline_unreachable": "截止时间不可达",
            "zero_demand": "零需求",
            "zero_inventory": "零库存",
            "insufficient_inventory": "库存不足",
            "urgent_delivery": "紧急配送提醒",
            "time_constraint": "时限约束"
        }
        return type_names.get(conflict_type, conflict_type)
    
    def _get_severity_name(self, severity: str) -> str:
        severity_names = {
            "error": "严重错误",
            "warning": "警告",
            "info": "提示"
        }
        return severity_names.get(severity, severity)
    
    def compare_results(self, result_a, result_b, version_a_name: str = "方案A", version_b_name: str = "方案B") -> ComparisonResult:
        cost_diff = result_b.total_cost - result_a.total_cost
        
        assign_a_dict = {(a["warehouse_id"], a["store_id"], a["sku"]): a for a in result_a.assignments}
        assign_b_dict = {(a["warehouse_id"], a["store_id"], a["sku"]): a for a in result_b.assignments}
        
        assignment_diffs = []
        all_keys = set(assign_a_dict.keys()) | set(assign_b_dict.keys())
        
        for key in all_keys:
            a = assign_a_dict.get(key)
            b = assign_b_dict.get(key)
            
            if a and b:
                qty_diff = b["quantity"] - a["quantity"]
                if abs(qty_diff) > 0.01:
                    assignment_diffs.append({
                        "type": "quantity_change",
                        "warehouse": a["warehouse_name"],
                        "store": a["store_name"],
                        "sku": a["sku_name"],
                        f"{version_a_name}_数量": a["quantity"],
                        f"{version_b_name}_数量": b["quantity"],
                        "数量差异": qty_diff
                    })
            elif a:
                assignment_diffs.append({
                    "type": "removed",
                    "warehouse": a["warehouse_name"],
                    "store": a["store_name"],
                    "sku": a["sku_name"],
                    f"{version_a_name}_数量": a["quantity"],
                    f"{version_b_name}_数量": 0,
                    "数量差异": -a["quantity"]
                })
            elif b:
                assignment_diffs.append({
                    "type": "added",
                    "warehouse": b["warehouse_name"],
                    "store": b["store_name"],
                    "sku": b["sku_name"],
                    f"{version_a_name}_数量": 0,
                    f"{version_b_name}_数量": b["quantity"],
                    "数量差异": b["quantity"]
                })
        
        conflict_diffs = self._compare_conflicts(result_a.conflicts, result_b.conflicts)
        
        summary = {
            "cost_difference": cost_diff,
            "cost_change_percent": (cost_diff / result_a.total_cost * 100) if result_a.total_cost > 0 else 0,
            "assignment_changes": len(assignment_diffs),
            "conflict_changes": len(conflict_diffs),
            "version_a_assignment_count": len(result_a.assignments),
            "version_b_assignment_count": len(result_b.assignments)
        }
        
        return ComparisonResult(
            version_a=version_a_name,
            version_b=version_b_name,
            cost_difference=cost_diff,
            assignment_differences=assignment_diffs,
            conflict_differences=conflict_diffs,
            summary=summary
        )
    
    def _compare_conflicts(self, conflicts_a, conflicts_b) -> List[Dict]:
        diffs = []
        
        conflict_types_a = set(c["type"] for c in conflicts_a)
        conflict_types_b = set(c["type"] for c in conflicts_b)
        
        all_types = conflict_types_a | conflict_types_b
        
        for ctype in all_types:
            a_count = sum(1 for c in conflicts_a if c["type"] == ctype)
            b_count = sum(1 for c in conflicts_b if c["type"] == ctype)
            
            if a_count != b_count:
                diffs.append({
                    "conflict_type": self._get_conflict_type_name(ctype),
                    "count_a": a_count,
                    "count_b": b_count,
                    "change": b_count - a_count
                })
        
        return diffs
    
    def generate_comparison_report(self, comparison: ComparisonResult, filename: str = None) -> str:
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"方案对比_{timestamp}.xlsx"
        
        filepath = os.path.join(self.reports_dir, filename)
        
        with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
            df_summary = pd.DataFrame([{
                "对比项": f"{comparison.version_a} vs {comparison.version_b}",
                "成本差异": comparison.cost_difference,
                "成本变化率(%)": round(comparison.summary["cost_change_percent"], 2),
                "分拨变化条数": comparison.summary["assignment_changes"],
                "冲突变化条数": comparison.summary["conflict_changes"],
                f"{comparison.version_a}分拨数": comparison.summary["version_a_assignment_count"],
                f"{comparison.version_b}分拨数": comparison.summary["version_b_assignment_count"]
            }])
            df_summary.to_excel(writer, sheet_name="对比概览", index=False)
            
            if comparison.assignment_differences:
                df_assign_diff = pd.DataFrame(comparison.assignment_differences)
                df_assign_diff.to_excel(writer, sheet_name="分拨差异", index=False)
            
            if comparison.conflict_differences:
                df_conflict_diff = pd.DataFrame(comparison.conflict_differences)
                df_conflict_diff.to_excel(writer, sheet_name="冲突差异", index=False)
        
        return filepath
    
    def generate_text_summary(self, result) -> str:
        lines = []
        lines.append("=" * 60)
        lines.append("线性规划仓储分拨方案报告")
        lines.append("=" * 60)
        lines.append(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("")
        
        if result.success:
            lines.append("✓ 优化成功")
            lines.append(f"总运输成本: {result.total_cost:.2f}")
            lines.append(f"求解时间: {result.solve_time:.3f} 秒")
            lines.append(f"分拨条数: {len(result.assignments)}")
        else:
            lines.append(f"✗ 优化失败: {result.message}")
        
        lines.append("")
        
        if result.conflicts:
            lines.append("-" * 60)
            lines.append("冲突检测结果")
            lines.append("-" * 60)
            
            error_count = sum(1 for c in result.conflicts if c["severity"] == "error")
            warning_count = sum(1 for c in result.conflicts if c["severity"] == "warning")
            info_count = sum(1 for c in result.conflicts if c["severity"] == "info")
            
            lines.append(f"严重错误: {error_count} 条")
            lines.append(f"警告: {warning_count} 条")
            lines.append(f"提示: {info_count} 条")
            lines.append("")
            
            for conflict in result.conflicts:
                severity_icon = "✗" if conflict["severity"] == "error" else "⚠" if conflict["severity"] == "warning" else "ℹ"
                lines.append(f"{severity_icon} [{self._get_conflict_type_name(conflict['type'])}]")
                lines.append(f"  {conflict['description']}")
                lines.append(f"  影响: {conflict['impact']}")
                lines.append("")
        
        if result.assignments:
            lines.append("-" * 60)
            lines.append("分拨明细 (前10条)")
            lines.append("-" * 60)
            
            for i, assign in enumerate(result.assignments[:10]):
                lines.append(f"{i+1}. {assign['warehouse_name']} → {assign['store_name']}")
                lines.append(f"   商品: {assign['sku_name']}, 数量: {assign['quantity']:.2f}")
                lines.append(f"   运输成本: {assign['transport_cost']:.2f}")
            
            if len(result.assignments) > 10:
                lines.append(f"... 还有 {len(result.assignments) - 10} 条")
        
        lines.append("=" * 60)
        
        return "\n".join(lines)
