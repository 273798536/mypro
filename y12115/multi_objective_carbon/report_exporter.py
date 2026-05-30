"""图表生成和结果导出模块 - 确保异常说明、图表和导出结果数据一致"""
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm
from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime
import json
import os
from io import BytesIO

from .models import (
    DepartmentEmission, BudgetLimit, ReductionProject,
    BusinessIndicator, OptimizationConstraint, OptimizationResult,
    ObjectiveType, Anomaly, Conflict, ProjectStatus
)


class ResultExporter:
    """结果导出器 - 统一数据源，确保所有输出一致"""

    def __init__(self,
                 emissions: List[DepartmentEmission],
                 budgets: List[BudgetLimit],
                 projects: List[ReductionProject],
                 anomalies: List[Anomaly],
                 conflicts: List[Conflict],
                 optimization_result: Dict[str, Any],
                 indicators: Optional[List[BusinessIndicator]] = None):
        self.emissions = emissions
        self.budgets = budgets
        self.projects = projects
        self.anomalies = anomalies
        self.conflicts = conflicts
        self.optimization_result = optimization_result
        self.indicators = indicators or []
        self.project_map = {p.project_id: p for p in projects}
        self.emission_map = {e.department_id: e for e in emissions}

        self._validate_data_consistency()

    def _validate_data_consistency(self) -> None:
        """验证数据一致性，确保图表、异常说明、导出结果使用同一数据源"""
        primary_result = self.optimization_result.get("primary_result")
        if primary_result:
            selected_ids = primary_result.get("selected_projects", [])
            total_cost = primary_result.get("total_cost", 0)

            calculated_cost = sum(
                self.project_map[pid].cost for pid in selected_ids if pid in self.project_map
            )

            if abs(calculated_cost - total_cost) > 0.01:
                raise ValueError(
                    f"数据不一致: 优化结果总成本 {total_cost} != 实际计算 {calculated_cost}"
                )

    def _get_chinese_font(self):
        """获取中文字体"""
        font_names = ['PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'SimHei', 'Arial Unicode MS']
        for name in font_names:
            try:
                return fm.FontProperties(family=name)
            except Exception:
                continue
        return fm.FontProperties()

    def generate_pareto_chart(self, output_path: str) -> str:
        """生成帕累托前沿图表"""
        pareto = self.optimization_result.get("pareto_front", [])
        if not pareto:
            return ""

        costs = [r["total_cost"] for r in pareto]
        reductions = [r["total_reduction"] for r in pareto]
        ranks = [r["rank"] for r in pareto]

        fig, ax = plt.subplots(figsize=(10, 6))
        font = self._get_chinese_font()

        scatter = ax.scatter(costs, reductions, c=ranks, cmap='viridis', s=100, alpha=0.8)
        plt.colorbar(scatter, label='排名')

        for i, (c, r, rank) in enumerate(zip(costs, reductions, ranks)):
            ax.annotate(f'#{rank}', (c, r), textcoords="offset points",
                       xytext=(5, 5), ha='center')

        primary = self.optimization_result.get("primary_result")
        if primary:
            ax.scatter([primary["total_cost"]], [primary["total_reduction"]],
                      c='red', s=200, marker='*', label='推荐方案', zorder=5)

        ax.set_xlabel('总成本 (元)', fontproperties=font, fontsize=12)
        ax.set_ylabel('总减排量 (吨CO₂e)', fontproperties=font, fontsize=12)
        ax.set_title('帕累托前沿 - 成本vs减排权衡', fontproperties=font, fontsize=14)
        ax.legend(prop=font)
        ax.grid(True, alpha=0.3)

        plt.tight_layout()
        plt.savefig(output_path, dpi=150, bbox_inches='tight')
        plt.close()

        return output_path

    def generate_budget_chart(self, output_path: str) -> str:
        """生成预算使用图表"""
        primary = self.optimization_result.get("primary_result")
        if not primary:
            return ""

        total_budget = self.optimization_result.get("summary", {}).get("total_budget", 0)
        used_budget = primary.get("total_cost", 0)
        remaining = max(0, total_budget - used_budget)
        overage = max(0, used_budget - total_budget)

        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))
        font = self._get_chinese_font()

        if overage > 0:
            colors = ['#ff6b6b', '#4ecdc4']
            labels = ['已使用(含超限)', '预算上限']
            sizes = [used_budget, total_budget]
        else:
            colors = ['#4ecdc4', '#45b7d1', '#96ceb4']
            labels = ['已使用', '剩余', '预算上限']
            sizes = [used_budget, remaining, total_budget - used_budget - remaining]

        ax1.pie([used_budget, max(0, total_budget - used_budget)],
                labels=['已使用', '剩余' if overage == 0 else '超限'],
                colors=['#4ecdc4', '#ff6b6b' if overage > 0 else '#45b7d1'],
                autopct='%1.1f%%',
                textprops={'fontproperties': font})
        ax1.set_title('预算使用占比', fontproperties=font, fontsize=12)

        dept_data = self._get_department_budget_data(primary.get("selected_projects", []))
        dept_names = list(dept_data.keys())
        dept_used = [d["used"] for d in dept_data.values()]
        dept_budget = [d["budget"] for d in dept_data.values()]

        x = np.arange(len(dept_names))
        width = 0.35

        ax2.bar(x - width/2, dept_budget, width, label='预算', color='#45b7d1')
        ax2.bar(x + width/2, dept_used, width, label='已使用', color='#4ecdc4')

        for i, (u, b) in enumerate(zip(dept_used, dept_budget)):
            if u > b:
                ax2.text(i + width/2, u, f'超{b-u:.0f}',
                        ha='center', va='bottom', color='red', fontproperties=font)

        ax2.set_xlabel('部门', fontproperties=font)
        ax2.set_ylabel('金额 (元)', fontproperties=font)
        ax2.set_title('各部门预算使用情况', fontproperties=font, fontsize=12)
        ax2.set_xticks(x)
        ax2.set_xticklabels(dept_names, rotation=45, ha='right', fontproperties=font)
        ax2.legend(prop=font)

        plt.tight_layout()
        plt.savefig(output_path, dpi=150, bbox_inches='tight')
        plt.close()

        return output_path

    def generate_emission_chart(self, output_path: str) -> str:
        """生成排放对比图表"""
        primary = self.optimization_result.get("primary_result")
        if not primary:
            return ""

        total_emission = self.optimization_result.get("summary", {}).get("total_emission", 0)
        reduction = primary.get("total_reduction", 0)
        net_emission = primary.get("net_emission", 0)

        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))
        font = self._get_chinese_font()

        labels = ['基线排放', '减排量', '净排放']
        values = [total_emission, reduction, net_emission]
        colors = ['#ff6b6b', '#4ecdc4', '#45b7d1']

        bars = ax1.bar(labels, values, color=colors)
        ax1.set_ylabel('排放量 (吨CO₂e)', fontproperties=font)
        ax1.set_title('排放对比', fontproperties=font, fontsize=12)
        for bar, val in zip(bars, values):
            ax1.text(bar.get_x() + bar.get_width()/2, bar.get_height(),
                    f'{val:.1f}', ha='center', va='bottom', fontproperties=font)

        dept_emissions = []
        dept_names = []
        dept_reductions = []

        for proj_id in primary.get("selected_projects", []):
            proj = self.project_map.get(proj_id)
            if proj:
                dept_id = proj.department_id
                if dept_id not in dept_names:
                    dept_names.append(dept_id)
                    dept_emissions.append(self.emission_map.get(dept_id, type('obj', (), {'emission': 0})()).emission)
                    dept_reductions.append(0)
                idx = dept_names.index(dept_id)
                dept_reductions[idx] += proj.reduction_potential

        x = np.arange(len(dept_names))
        width = 0.35

        ax2.bar(x - width/2, dept_emissions, width, label='基线排放', color='#ff6b6b')
        ax2.bar(x + width/2, dept_reductions, width, label='减排量', color='#4ecdc4')

        ax2.set_xlabel('部门', fontproperties=font)
        ax2.set_ylabel('排放量 (吨CO₂e)', fontproperties=font)
        ax2.set_title('各部门减排情况', fontproperties=font, fontsize=12)
        ax2.set_xticks(x)
        ax2.set_xticklabels(dept_names, rotation=45, ha='right', fontproperties=font)
        ax2.legend(prop=font)

        plt.tight_layout()
        plt.savefig(output_path, dpi=150, bbox_inches='tight')
        plt.close()

        return output_path

    def generate_anomaly_chart(self, output_path: str) -> str:
        """生成异常数据统计图表"""
        if not self.anomalies:
            return ""

        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))
        font = self._get_chinese_font()

        severity_counts = {}
        for a in self.anomalies:
            severity_counts[a.severity] = severity_counts.get(a.severity, 0) + 1

        labels = list(severity_counts.keys())
        values = list(severity_counts.values())
        colors = {'error': '#ff6b6b', 'warning': '#ffa726', 'info': '#42a5f5'}
        bar_colors = [colors.get(l, '#9e9e9e') for l in labels]

        bars = ax1.bar(labels, values, color=bar_colors)
        ax1.set_ylabel('数量', fontproperties=font)
        ax1.set_title('异常严重程度分布', fontproperties=font, fontsize=12)
        for bar, val in zip(bars, values):
            ax1.text(bar.get_x() + bar.get_width()/2, bar.get_height(),
                    str(val), ha='center', va='bottom', fontproperties=font)

        type_counts = {}
        for a in self.anomalies:
            type_counts[a.anomaly_type] = type_counts.get(a.anomaly_type, 0) + 1

        types = sorted(type_counts.keys(), key=type_counts.get, reverse=True)[:8]
        counts = [type_counts[t] for t in types]

        y_pos = np.arange(len(types))
        ax2.barh(y_pos, counts, color='#45b7d1')
        ax2.set_yticks(y_pos)
        ax2.set_yticklabels(types, fontproperties=font)
        ax2.set_xlabel('数量', fontproperties=font)
        ax2.set_title('异常类型分布', fontproperties=font, fontsize=12)
        ax2.invert_yaxis()

        plt.tight_layout()
        plt.savefig(output_path, dpi=150, bbox_inches='tight')
        plt.close()

        return output_path

    def _get_department_budget_data(self, selected_projects: List[str]) -> Dict[str, Dict[str, float]]:
        """获取部门预算数据（内部方法，供图表和导出共用）"""
        dept_data = {}

        for proj_id in selected_projects:
            proj = self.project_map.get(proj_id)
            if not proj:
                continue

            dept_id = proj.department_id
            dept_name = self.emission_map.get(dept_id, type('obj', (), {'department_name': dept_id})()).department_name

            if dept_id not in dept_data:
                dept_budget = [b for b in self.budgets if b.department_id == dept_id]
                budget_amount = sum(b.budget_amount for b in dept_budget)
                dept_data[dept_name] = {
                    "used": 0,
                    "budget": budget_amount
                }

            dept_data[dept_name]["used"] += proj.cost

        return dept_data

    def generate_all_charts(self, output_dir: str) -> Dict[str, str]:
        """生成所有图表"""
        os.makedirs(output_dir, exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        charts = {}

        charts["pareto"] = self.generate_pareto_chart(
            os.path.join(output_dir, f"pareto_front_{timestamp}.png")
        )
        charts["budget"] = self.generate_budget_chart(
            os.path.join(output_dir, f"budget_usage_{timestamp}.png")
        )
        charts["emission"] = self.generate_emission_chart(
            os.path.join(output_dir, f"emission_comparison_{timestamp}.png")
        )
        charts["anomaly"] = self.generate_anomaly_chart(
            os.path.join(output_dir, f"anomaly_stats_{timestamp}.png")
        )

        return charts

    def export_to_excel(self, output_path: str, charts: Optional[Dict[str, str]] = None) -> str:
        """导出结果到Excel - 确保与图表数据一致"""
        with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
            self._export_summary_sheet(writer)
            self._export_optimization_result_sheet(writer)
            self._export_pareto_sheet(writer)
            self._export_anomalies_sheet(writer)
            self._export_conflicts_sheet(writer)
            self._export_raw_data_sheets(writer)
            self._export_budget_detail_sheet(writer)

        return output_path

    def _export_summary_sheet(self, writer: pd.ExcelWriter) -> None:
        """导出摘要页"""
        summary = self.optimization_result.get("summary", {})
        primary = self.optimization_result.get("primary_result", {})
        constraint = self.optimization_result.get("constraint", {})

        data = {
            "指标": [
                "总基线排放量(吨CO₂e)",
                "总预算(元)",
                "可用项目数",
                "帕累托最优解数量",
                "推荐方案总成本(元)",
                "推荐方案总减排量(吨CO₂e)",
                "推荐方案净排放量(吨CO₂e)",
                "预算使用率",
                "减排比例",
                "是否在预算内",
                "是否满足减排目标",
                "主要优化目标",
                "最大预算使用率限制",
                "最低减排比例要求"
            ],
            "数值": [
                summary.get("total_emission", 0),
                summary.get("total_budget", 0),
                summary.get("available_projects", 0),
                summary.get("pareto_solutions", 0),
                primary.get("total_cost", 0),
                primary.get("total_reduction", 0),
                primary.get("net_emission", 0),
                f"{primary.get('budget_utilization', 0) * 100:.2f}%",
                f"{(primary.get('total_reduction', 0) / summary.get('total_emission', 1)) * 100:.2f}%",
                "是" if primary.get("over_budget_amount", 0) <= 0 else "否",
                "是" if primary.get("is_feasible", False) else "否",
                self.optimization_result.get("primary_objective", ""),
                f"{constraint.get('max_budget_utilization', 1) * 100:.0f}%",
                f"{constraint.get('min_reduction_ratio', 0) * 100:.0f}%"
            ]
        }

        df = pd.DataFrame(data)
        df.to_excel(writer, sheet_name="优化摘要", index=False)

        if primary.get("over_budget_amount", 0) > 0:
            worksheet = writer.sheets["优化摘要"]
            from openpyxl.styles import PatternFill, Font
            red_fill = PatternFill(start_color="FFCCCC", end_color="FFCCCC", fill_type="solid")
            red_font = Font(color="FF0000", bold=True)
            for row in range(2, len(df) + 2):
                if worksheet.cell(row=row, column=1).value == "是否在预算内":
                    worksheet.cell(row=row, column=2).fill = red_fill
                    worksheet.cell(row=row, column=2).font = red_font

    def _export_optimization_result_sheet(self, writer: pd.ExcelWriter) -> None:
        """导出优化结果详情页"""
        primary = self.optimization_result.get("primary_result", {})
        selected_ids = primary.get("selected_projects", [])

        data = []
        for proj_id in selected_ids:
            proj = self.project_map.get(proj_id)
            if proj:
                dept_name = self.emission_map.get(proj.department_id,
                                                  type('obj', (), {'department_name': proj.department_id})()).department_name
                data.append({
                    "项目ID": proj.project_id,
                    "项目名称": proj.project_name,
                    "所属部门": dept_name,
                    "成本(元)": proj.cost,
                    "减排潜力(吨CO₂e)": proj.reduction_potential,
                    "性价比(吨/万元)": proj.reduction_potential / (proj.cost / 10000) if proj.cost > 0 else 0,
                    "工期(月)": proj.duration_months,
                    "优先级": proj.priority,
                    "状态": proj.status.value,
                    "备注": proj.remark or ""
                })

        if data:
            df = pd.DataFrame(data)
            df = df.sort_values("性价比(吨/万元)", ascending=False)
            df.to_excel(writer, sheet_name="推荐项目详情", index=False)

            worksheet = writer.sheets["推荐项目详情"]
            for column in worksheet.columns:
                max_length = max(len(str(cell.value)) for cell in column)
                worksheet.column_dimensions[column[0].column_letter].width = min(max_length + 2, 30)

        scores_data = []
        for obj_type, score in primary.get("objective_scores", {}).items():
            scores_data.append({
                "目标类型": obj_type,
                "得分(越低越好)": score
            })

        if scores_data:
            pd.DataFrame(scores_data).to_excel(writer, sheet_name="目标得分", index=False)

    def _export_pareto_sheet(self, writer: pd.ExcelWriter) -> None:
        """导出帕累托前沿数据"""
        pareto = self.optimization_result.get("pareto_front", [])

        data = []
        for result in pareto:
            data.append({
                "排名": result.get("rank", 0),
                "总成本(元)": result.get("total_cost", 0),
                "总减排量(吨CO₂e)": result.get("total_reduction", 0),
                "净排放(吨CO₂e)": result.get("net_emission", 0),
                "预算使用率": f"{result.get('budget_utilization', 0) * 100:.2f}%",
                "是否可行": "是" if result.get("is_feasible", True) else "否",
                "超限金额(元)": result.get("over_budget_amount", 0),
                "项目数量": len(result.get("selected_projects", [])),
                "选中项目": ",".join(result.get("selected_projects", []))
            })

        if data:
            df = pd.DataFrame(data)
            df.to_excel(writer, sheet_name="帕累托前沿", index=False)

    def _export_anomalies_sheet(self, writer: pd.ExcelWriter) -> None:
        """导出异常数据说明"""
        data = []
        for anomaly in self.anomalies:
            data.append({
                "数据类型": anomaly.data_type,
                "记录ID": anomaly.record_id,
                "异常类型": anomaly.anomaly_type,
                "严重程度": anomaly.severity,
                "异常描述": anomaly.description,
                "建议修复方式": anomaly.suggested_fix or ""
            })

        if data:
            df = pd.DataFrame(data)
            df.to_excel(writer, sheet_name="异常数据说明", index=False)

            worksheet = writer.sheets["异常数据说明"]
            from openpyxl.styles import PatternFill
            for row in range(2, len(df) + 2):
                severity = worksheet.cell(row=row, column=4).value
                if severity == "error":
                    fill = PatternFill(start_color="FFCCCC", end_color="FFCCCC", fill_type="solid")
                elif severity == "warning":
                    fill = PatternFill(start_color="FFE6CC", end_color="FFE6CC", fill_type="solid")
                else:
                    fill = PatternFill(start_color="E5F6FF", end_color="E5F6FF", fill_type="solid")
                for col in range(1, 7):
                    worksheet.cell(row=row, column=col).fill = fill

    def _export_conflicts_sheet(self, writer: pd.ExcelWriter) -> None:
        """导出冲突和修正建议"""
        data = []
        for i, conflict in enumerate(self.conflicts, 1):
            for j, suggestion in enumerate(conflict.suggestions, 1):
                data.append({
                    "冲突编号": i,
                    "冲突类型": conflict.conflict_type,
                    "涉及对象": ",".join(conflict.involved_items),
                    "冲突描述": conflict.description,
                    "建议编号": j,
                    "修正建议": suggestion
                })

        if data:
            df = pd.DataFrame(data)
            df.to_excel(writer, sheet_name="冲突与修正建议", index=False)

    def _export_raw_data_sheets(self, writer: pd.ExcelWriter) -> None:
        """导出原始数据（清洗后）"""
        emission_data = [e.to_dict() for e in self.emissions]
        if emission_data:
            pd.DataFrame(emission_data).to_excel(writer, sheet_name="部门排放数据", index=False)

        budget_data = [b.to_dict() for b in self.budgets]
        if budget_data:
            pd.DataFrame(budget_data).to_excel(writer, sheet_name="预算上限数据", index=False)

        project_data = [p.to_dict() for p in self.projects]
        if project_data:
            pd.DataFrame(project_data).to_excel(writer, sheet_name="减碳项目数据", index=False)

        if self.indicators:
            indicator_data = [i.to_dict() for i in self.indicators]
            pd.DataFrame(indicator_data).to_excel(writer, sheet_name="业务指标数据", index=False)

    def _export_budget_detail_sheet(self, writer: pd.ExcelWriter) -> None:
        """导出预算使用明细"""
        primary = self.optimization_result.get("primary_result", {})
        selected_ids = primary.get("selected_projects", [])
        dept_data = self._get_department_budget_data(selected_ids)

        total_budget = self.optimization_result.get("summary", {}).get("total_budget", 0)
        total_used = primary.get("total_cost", 0)

        data = []
        for dept_name, info in dept_data.items():
            data.append({
                "部门": dept_name,
                "部门预算(元)": info["budget"],
                "已使用(元)": info["used"],
                "剩余(元)": max(0, info["budget"] - info["used"]),
                "超限(元)": max(0, info["used"] - info["budget"]),
                "使用率": f"{(info['used'] / info['budget'] * 100):.2f}%" if info["budget"] > 0 else "N/A"
            })

        data.append({
            "部门": "合计/公司整体",
            "部门预算(元)": total_budget,
            "已使用(元)": total_used,
            "剩余(元)": max(0, total_budget - total_used),
            "超限(元)": max(0, total_used - total_budget),
            "使用率": f"{(total_used / total_budget * 100):.2f}%" if total_budget > 0 else "N/A"
        })

        df = pd.DataFrame(data)
        df.to_excel(writer, sheet_name="预算使用明细", index=False)

        worksheet = writer.sheets["预算使用明细"]
        from openpyxl.styles import PatternFill
        for row in range(2, len(df) + 2):
            overage = worksheet.cell(row=row, column=5).value
            if overage and overage > 0:
                fill = PatternFill(start_color="FFCCCC", end_color="FFCCCC", fill_type="solid")
                for col in range(1, 7):
                    worksheet.cell(row=row, column=col).fill = fill

    def export_to_json(self, output_path: str) -> str:
        """导出结果到JSON"""
        result = {
            "export_time": datetime.now().isoformat(),
            "optimization": self.optimization_result,
            "anomalies": [a.to_dict() for a in self.anomalies],
            "conflicts": [c.to_dict() for c in self.conflicts],
            "data": {
                "emissions": [e.to_dict() for e in self.emissions],
                "budgets": [b.to_dict() for b in self.budgets],
                "projects": [p.to_dict() for p in self.projects],
                "indicators": [i.to_dict() for i in self.indicators]
            },
            "data_consistency_check": "PASSED"
        }

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)

        return output_path

    def generate_text_report(self) -> str:
        """生成文本报告"""
        primary = self.optimization_result.get("primary_result", {})
        summary = self.optimization_result.get("summary", {})
        constraint = self.optimization_result.get("constraint", {})

        report = []
        report.append("=" * 60)
        report.append("多目标减碳配额优化分析报告")
        report.append("=" * 60)
        report.append(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append("")

        report.append("一、基础数据概览")
        report.append("-" * 40)
        report.append(f"总基线排放量: {summary.get('total_emission', 0):.2f} 吨CO₂e")
        report.append(f"总预算上限: {summary.get('total_budget', 0):.2f} 元")
        report.append(f"可用减碳项目数: {summary.get('available_projects', 0)} 个")
        report.append(f"部门数量: {len(self.emissions)} 个")
        report.append("")

        report.append("二、约束条件")
        report.append("-" * 40)
        report.append(f"最大预算使用率: {constraint.get('max_budget_utilization', 1) * 100:.0f}%")
        report.append(f"最低减排比例要求: {constraint.get('min_reduction_ratio', 0) * 100:.0f}%")
        report.append(f"允许超限: {'是' if constraint.get('allow_over_budget', False) else '否'}")
        if constraint.get('required_departments'):
            report.append(f"必须包含部门: {', '.join(constraint['required_departments'])}")
        if constraint.get('excluded_departments'):
            report.append(f"排除部门: {', '.join(constraint['excluded_departments'])}")
        report.append("")

        report.append("三、推荐优化方案")
        report.append("-" * 40)
        report.append(f"选中项目数: {len(primary.get('selected_projects', []))} 个")
        report.append(f"总成本: {primary.get('total_cost', 0):.2f} 元")
        report.append(f"总减排量: {primary.get('total_reduction', 0):.2f} 吨CO₂e")
        report.append(f"净排放量: {primary.get('net_emission', 0):.2f} 吨CO₂e")
        report.append(f"预算使用率: {primary.get('budget_utilization', 0) * 100:.2f}%")

        over_budget = primary.get("over_budget_amount", 0)
        if over_budget > 0:
            report.append(f"【重要】预算超限: {over_budget:.2f} 元")
            report.append(f"【结论】当前方案超出预算，必须调整或申请追加预算")
        else:
            report.append(f"预算剩余: {abs(over_budget):.2f} 元")
            report.append(f"【结论】预算使用合规")

        reduction_ratio = primary.get('total_reduction', 0) / summary.get('total_emission', 1)
        report.append(f"减排比例: {reduction_ratio * 100:.2f}%")
        if primary.get("is_feasible", True):
            report.append("【结论】满足减排目标要求")
        else:
            report.append("【结论】未满足减排目标要求，需要调整方案")
        report.append("")

        report.append("四、异常数据说明")
        report.append("-" * 40)
        if self.anomalies:
            by_severity = {}
            for a in self.anomalies:
                by_severity[a.severity] = by_severity.get(a.severity, 0) + 1
            report.append(f"共发现 {len(self.anomalies)} 个异常:")
            for sev, count in by_severity.items():
                report.append(f"  - {sev}: {count} 个")

            report.append("")
            report.append("异常详情:")
            for a in self.anomalies:
                report.append(f"  [{a.severity.upper()}] {a.data_type} - {a.anomaly_type}: {a.description}")
                if a.suggested_fix:
                    report.append(f"    建议: {a.suggested_fix}")
        else:
            report.append("未发现异常数据")
        report.append("")

        report.append("五、冲突与修正建议")
        report.append("-" * 40)
        if self.conflicts:
            report.append(f"共发现 {len(self.conflicts)} 个冲突:")
            for i, c in enumerate(self.conflicts, 1):
                report.append(f"{i}. [{c.conflict_type}] {c.description}")
                report.append(f"   涉及: {', '.join(c.involved_items)}")
                report.append(f"   修正建议:")
                for j, s in enumerate(c.suggestions, 1):
                    report.append(f"     {j}. {s}")
        else:
            report.append("未发现冲突")
        report.append("")

        report.append("六、选中项目详情")
        report.append("-" * 40)
        for proj_id in primary.get("selected_projects", []):
            proj = self.project_map.get(proj_id)
            if proj:
                dept_name = self.emission_map.get(proj.department_id,
                                                  type('obj', (), {'department_name': proj.department_id})()).department_name
                report.append(f"  - {proj.project_name} (ID: {proj.project_id})")
                report.append(f"    部门: {dept_name}")
                report.append(f"    成本: {proj.cost:.2f} 元, 减排: {proj.reduction_potential:.2f} 吨CO₂e")
                report.append(f"    性价比: {proj.reduction_potential / (proj.cost / 10000):.2f} 吨/万元")

        report.append("")
        report.append("=" * 60)
        report.append("报告结束")
        report.append("=" * 60)

        return "\n".join(report)

    def export_text_report(self, output_path: str) -> str:
        """导出文本报告"""
        report = self.generate_text_report()
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(report)
        return output_path
