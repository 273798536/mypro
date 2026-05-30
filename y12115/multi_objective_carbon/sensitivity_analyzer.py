"""敏感性分析模块 - 约束变化后自动更新方案排序和分析"""
import numpy as np
import pandas as pd
from typing import List, Dict, Optional, Any, Tuple, Callable
from dataclasses import dataclass, field
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm
import os
from datetime import datetime

from .models import (
    DepartmentEmission, BudgetLimit, ReductionProject,
    BusinessIndicator, OptimizationConstraint, OptimizationResult,
    ObjectiveType, ProjectStatus
)
from .optimizer import MultiObjectiveOptimizer


@dataclass
class SensitivityResult:
    """敏感性分析结果"""
    parameter_name: str
    parameter_values: List[float]
    result_metrics: List[Dict[str, float]]
    sensitivity_score: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "parameter_name": self.parameter_name,
            "parameter_values": self.parameter_values,
            "result_metrics": self.result_metrics,
            "sensitivity_score": self.sensitivity_score
        }


class SensitivityAnalyzer:
    """敏感性分析器 - 支持约束变化后动态更新"""

    def __init__(self,
                 emissions: List[DepartmentEmission],
                 budgets: List[BudgetLimit],
                 projects: List[ReductionProject],
                 indicators: Optional[List[BusinessIndicator]] = None):
        self.emissions = emissions
        self.budgets = budgets
        self.projects = projects
        self.indicators = indicators or []
        self.project_map = {p.project_id: p for p in projects}

        self.base_optimizer = MultiObjectiveOptimizer(emissions, budgets, projects, indicators)
        self.last_constraint: Optional[OptimizationConstraint] = None
        self.last_results: Optional[Dict[str, Any]] = None
        self.history: List[Dict[str, Any]] = []

    def _get_chinese_font(self):
        """获取中文字体"""
        font_names = ['PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'SimHei', 'Arial Unicode MS']
        for name in font_names:
            try:
                return fm.FontProperties(family=name)
            except Exception:
                continue
        return fm.FontProperties()

    def analyze_budget_sensitivity(self,
                                   base_constraint: OptimizationConstraint,
                                   objective_type: ObjectiveType = ObjectiveType.BALANCE,
                                   budget_range: Tuple[float, float] = (0.5, 1.5),
                                   num_points: int = 11) -> SensitivityResult:
        """分析预算上限变化的敏感性"""
        param_name = "budget_utilization_limit"
        param_values = np.linspace(budget_range[0], budget_range[1], num_points).tolist()
        result_metrics = []

        for budget_limit in param_values:
            constraint = OptimizationConstraint(
                max_budget_utilization=budget_limit,
                min_reduction_ratio=base_constraint.min_reduction_ratio,
                max_project_count=base_constraint.max_project_count,
                allow_over_budget=base_constraint.allow_over_budget,
                required_departments=base_constraint.required_departments.copy(),
                excluded_departments=base_constraint.excluded_departments.copy()
            )

            result = self.base_optimizer._solve_with_pulp(constraint, objective_type)
            if result:
                result.rank = 0
                result_metrics.append({
                    "total_cost": result.total_cost,
                    "total_reduction": result.total_reduction,
                    "net_emission": result.net_emission,
                    "budget_utilization": result.budget_utilization,
                    "project_count": len(result.selected_projects),
                    "is_feasible": 1.0 if result.is_feasible else 0.0,
                    "balance_score": result.objective_scores.get(ObjectiveType.BALANCE, 0.0)
                })
            else:
                result_metrics.append({
                    "total_cost": 0,
                    "total_reduction": 0,
                    "net_emission": sum(e.emission for e in self.emissions),
                    "budget_utilization": 0,
                    "project_count": 0,
                    "is_feasible": 0.0,
                    "balance_score": 1.0
                })

        sensitivity_score = self._calculate_sensitivity_score(result_metrics, "total_reduction")

        return SensitivityResult(
            parameter_name=param_name,
            parameter_values=param_values,
            result_metrics=result_metrics,
            sensitivity_score=sensitivity_score
        )

    def analyze_reduction_ratio_sensitivity(self,
                                            base_constraint: OptimizationConstraint,
                                            objective_type: ObjectiveType = ObjectiveType.BALANCE,
                                            ratio_range: Tuple[float, float] = (0.05, 0.4),
                                            num_points: int = 11) -> SensitivityResult:
        """分析最低减排比例要求变化的敏感性"""
        param_name = "min_reduction_ratio"
        param_values = np.linspace(ratio_range[0], ratio_range[1], num_points).tolist()
        result_metrics = []

        for reduction_ratio in param_values:
            constraint = OptimizationConstraint(
                max_budget_utilization=base_constraint.max_budget_utilization,
                min_reduction_ratio=reduction_ratio,
                max_project_count=base_constraint.max_project_count,
                allow_over_budget=base_constraint.allow_over_budget,
                required_departments=base_constraint.required_departments.copy(),
                excluded_departments=base_constraint.excluded_departments.copy()
            )

            result = self.base_optimizer._solve_with_pulp(constraint, objective_type)
            if result:
                result.rank = 0
                result_metrics.append({
                    "total_cost": result.total_cost,
                    "total_reduction": result.total_reduction,
                    "net_emission": result.net_emission,
                    "budget_utilization": result.budget_utilization,
                    "project_count": len(result.selected_projects),
                    "is_feasible": 1.0 if result.is_feasible else 0.0,
                    "balance_score": result.objective_scores.get(ObjectiveType.BALANCE, 0.0),
                    "over_budget": result.over_budget_amount
                })
            else:
                result_metrics.append({
                    "total_cost": 0,
                    "total_reduction": 0,
                    "net_emission": sum(e.emission for e in self.emissions),
                    "budget_utilization": 0,
                    "project_count": 0,
                    "is_feasible": 0.0,
                    "balance_score": 1.0,
                    "over_budget": 0
                })

        sensitivity_score = self._calculate_sensitivity_score(result_metrics, "total_cost")

        return SensitivityResult(
            parameter_name=param_name,
            parameter_values=param_values,
            result_metrics=result_metrics,
            sensitivity_score=sensitivity_score
        )

    def analyze_project_cost_sensitivity(self,
                                         base_constraint: OptimizationConstraint,
                                         objective_type: ObjectiveType = ObjectiveType.BALANCE,
                                         cost_range: Tuple[float, float] = (0.8, 1.2),
                                         num_points: int = 5) -> Dict[str, SensitivityResult]:
        """分析各项目成本变化的敏感性"""
        results = {}
        total_emission = sum(e.emission for e in self.emissions)

        for proj in self.projects:
            if proj.status == ProjectStatus.COMPLETED:
                continue

            param_name = f"project_{proj.project_id}_cost"
            param_values = np.linspace(cost_range[0], cost_range[1], num_points).tolist()
            result_metrics = []

            for cost_factor in param_values:
                adjusted_projects = []
                for p in self.projects:
                    if p.project_id == proj.project_id:
                        new_cost = p.cost * cost_factor
                        adjusted_projects.append(ReductionProject(
                            project_id=p.project_id,
                            project_name=p.project_name,
                            department_id=p.department_id,
                            cost=new_cost,
                            reduction_potential=p.reduction_potential,
                            duration_months=p.duration_months,
                            status=p.status,
                            priority=p.priority,
                            dependencies=p.dependencies.copy(),
                            mutually_exclusive=p.mutually_exclusive.copy(),
                            remark=p.remark
                        ))
                    else:
                        adjusted_projects.append(p)

                temp_optimizer = MultiObjectiveOptimizer(
                    self.emissions, self.budgets, adjusted_projects, self.indicators
                )
                result = temp_optimizer._solve_with_pulp(base_constraint, objective_type)
                if result:
                    result.rank = 0
                    result_metrics.append({
                        "total_cost": result.total_cost,
                        "total_reduction": result.total_reduction,
                        "net_emission": result.net_emission,
                        "budget_utilization": result.budget_utilization,
                        "project_count": len(result.selected_projects),
                        "is_selected": 1.0 if proj.project_id in result.selected_projects else 0.0,
                        "is_feasible": 1.0 if result.is_feasible else 0.0
                    })
                else:
                    result_metrics.append({
                        "total_cost": 0,
                        "total_reduction": 0,
                        "net_emission": total_emission,
                        "budget_utilization": 0,
                        "project_count": 0,
                        "is_selected": 0.0,
                        "is_feasible": 0.0
                    })

            sensitivity_score = self._calculate_sensitivity_score(result_metrics, "is_selected")
            results[proj.project_id] = SensitivityResult(
                parameter_name=param_name,
                parameter_values=param_values,
                result_metrics=result_metrics,
                sensitivity_score=sensitivity_score
            )

        return results

    def analyze_objective_weight_sensitivity(self,
                                             base_constraint: OptimizationConstraint,
                                             num_points: int = 7) -> List[Dict[str, Any]]:
        """分析目标权重变化对方案排序的影响"""
        weight_combinations = []
        results = []

        for alpha in np.linspace(0.1, 0.8, num_points):
            for beta in np.linspace(0.1, 0.9 - alpha, num_points):
                gamma = 1 - alpha - beta
                if gamma >= 0.1:
                    weight_combinations.append({
                        ObjectiveType.MINIMIZE_COST: alpha,
                        ObjectiveType.MINIMIZE_EMISSION: beta,
                        ObjectiveType.MAXIMIZE_REDUCTION: gamma
                    })

        for weights in weight_combinations:
            result = self.base_optimizer._solve_with_pulp(
                base_constraint, ObjectiveType.BALANCE, weights
            )
            if result:
                result.rank = 0
                results.append({
                    "weights": {k.value: v for k, v in weights.items()},
                    "selected_projects": sorted(result.selected_projects),
                    "total_cost": result.total_cost,
                    "total_reduction": result.total_reduction,
                    "net_emission": result.net_emission,
                    "balance_score": result.objective_scores.get(ObjectiveType.BALANCE, 0.0)
                })

        unique_solutions = {}
        for r in results:
            key = tuple(r["selected_projects"])
            if key not in unique_solutions:
                unique_solutions[key] = {
                    "selected_projects": r["selected_projects"],
                    "count": 0,
                    "weight_ranges": {
                        "minimize_cost": [1.0, 0.0],
                        "minimize_emission": [1.0, 0.0],
                        "maximize_reduction": [1.0, 0.0]
                    }
                }
            unique_solutions[key]["count"] += 1
            for obj_type in weights.keys():
                w = r["weights"][obj_type.value]
                unique_solutions[key]["weight_ranges"][obj_type.value][0] = min(
                    unique_solutions[key]["weight_ranges"][obj_type.value][0], w
                )
                unique_solutions[key]["weight_ranges"][obj_type.value][1] = max(
                    unique_solutions[key]["weight_ranges"][obj_type.value][1], w
                )

        return list(unique_solutions.values())

    def _calculate_sensitivity_score(self, metrics: List[Dict[str, float]], key: str) -> float:
        """计算敏感性得分（变异系数）"""
        values = [m[key] for m in metrics]
        if not values:
            return 0.0

        mean_val = np.mean(values)
        if mean_val == 0:
            return 0.0

        std_val = np.std(values)
        return abs(std_val / mean_val)

    def run_full_analysis(self,
                          base_constraint: Optional[OptimizationConstraint] = None,
                          objective_type: ObjectiveType = ObjectiveType.BALANCE) -> Dict[str, Any]:
        """
        执行完整的敏感性分析
        当约束变化时，自动重新计算
        """
        if base_constraint is None:
            base_constraint = OptimizationConstraint()

        self.last_constraint = base_constraint

        budget_sens = self.analyze_budget_sensitivity(base_constraint, objective_type)
        reduction_sens = self.analyze_reduction_ratio_sensitivity(base_constraint, objective_type)
        project_sens = self.analyze_project_cost_sensitivity(base_constraint, objective_type)
        weight_sens = self.analyze_objective_weight_sensitivity(base_constraint)

        sensitive_projects = sorted(
            project_sens.items(),
            key=lambda x: x[1].sensitivity_score,
            reverse=True
        )[:5]

        result = {
            "base_constraint": base_constraint.to_dict(),
            "budget_sensitivity": budget_sens.to_dict(),
            "reduction_ratio_sensitivity": reduction_sens.to_dict(),
            "project_cost_sensitivity": {k: v.to_dict() for k, v in project_sens.items()},
            "objective_weight_sensitivity": weight_sens,
            "summary": {
                "most_sensitive_parameter": "budget_utilization" if budget_sens.sensitivity_score > reduction_sens.sensitivity_score else "min_reduction_ratio",
                "budget_sensitivity_score": budget_sens.sensitivity_score,
                "reduction_sensitivity_score": reduction_sens.sensitivity_score,
                "most_sensitive_projects": [
                    {
                        "project_id": pid,
                        "project_name": self.project_map.get(pid, type('obj', (), {'project_name': pid})()).project_name,
                        "sensitivity_score": ps.sensitivity_score
                    }
                    for pid, ps in sensitive_projects
                ]
            }
        }

        self.last_results = result
        self.history.append({
            "timestamp": datetime.now().isoformat(),
            "constraint": base_constraint.to_dict(),
            "result_summary": result["summary"]
        })

        return result

    def update_constraint(self,
                          new_constraint: OptimizationConstraint,
                          objective_type: ObjectiveType = ObjectiveType.BALANCE) -> Dict[str, Any]:
        """
        更新约束条件并重新运行分析
        确保方案排序和敏感性分析跟着约束变化
        """
        return self.run_full_analysis(new_constraint, objective_type)

    def generate_sensitivity_charts(self,
                                     sensitivity_result: Dict[str, Any],
                                     output_dir: str) -> Dict[str, str]:
        """生成敏感性分析图表"""
        os.makedirs(output_dir, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        charts = {}

        charts["budget"] = self._plot_budget_sensitivity(
            sensitivity_result["budget_sensitivity"],
            os.path.join(output_dir, f"budget_sensitivity_{timestamp}.png")
        )

        charts["reduction"] = self._plot_reduction_sensitivity(
            sensitivity_result["reduction_ratio_sensitivity"],
            os.path.join(output_dir, f"reduction_sensitivity_{timestamp}.png")
        )

        charts["project"] = self._plot_project_sensitivity(
            sensitivity_result["project_cost_sensitivity"],
            os.path.join(output_dir, f"project_sensitivity_{timestamp}.png")
        )

        charts["weight"] = self._plot_weight_sensitivity(
            sensitivity_result["objective_weight_sensitivity"],
            os.path.join(output_dir, f"weight_sensitivity_{timestamp}.png")
        )

        return charts

    def _plot_budget_sensitivity(self, sens: Dict[str, Any], output_path: str) -> str:
        """绘制预算敏感性图表"""
        fig, ax1 = plt.subplots(figsize=(10, 6))
        font = self._get_chinese_font()

        param_values = sens["parameter_values"]
        metrics = sens["result_metrics"]

        costs = [m["total_cost"] for m in metrics]
        reductions = [m["total_reduction"] for m in metrics]
        feasible = [m["is_feasible"] for m in metrics]

        ax1.plot(param_values, costs, 'b-o', label='总成本', markersize=6)
        ax1.set_xlabel('预算使用率上限', fontproperties=font, fontsize=12)
        ax1.set_ylabel('总成本 (元)', fontproperties=font, color='b', fontsize=12)
        ax1.tick_params(axis='y', labelcolor='b')

        ax2 = ax1.twinx()
        ax2.plot(param_values, reductions, 'r-s', label='总减排量', markersize=6)
        ax2.set_ylabel('总减排量 (吨CO₂e)', fontproperties=font, color='r', fontsize=12)
        ax2.tick_params(axis='y', labelcolor='r')

        for i, (x, f) in enumerate(zip(param_values, feasible)):
            if not f:
                ax1.axvspan(x - 0.02, x + 0.02, alpha=0.3, color='gray')
                ax1.annotate('不可行', (x, costs[i]), textcoords="offset points",
                            xytext=(0, 10), ha='center', color='red', fontproperties=font)

        lines1, labels1 = ax1.get_legend_handles_labels()
        lines2, labels2 = ax2.get_legend_handles_labels()
        ax1.legend(lines1 + lines2, labels1 + labels2, loc='upper left', prop=font)

        ax1.set_title('预算上限敏感性分析', fontproperties=font, fontsize=14)
        ax1.grid(True, alpha=0.3)

        plt.tight_layout()
        plt.savefig(output_path, dpi=150, bbox_inches='tight')
        plt.close()

        return output_path

    def _plot_reduction_sensitivity(self, sens: Dict[str, Any], output_path: str) -> str:
        """绘制减排比例敏感性图表"""
        fig, ax1 = plt.subplots(figsize=(10, 6))
        font = self._get_chinese_font()

        param_values = sens["parameter_values"]
        metrics = sens["result_metrics"]

        costs = [m["total_cost"] for m in metrics]
        reductions = [m["total_reduction"] for m in metrics]
        feasible = [m["is_feasible"] for m in metrics]
        over_budget = [m.get("over_budget", 0) for m in metrics]

        ax1.plot(param_values, costs, 'b-o', label='总成本', markersize=6)
        ax1.set_xlabel('最低减排比例要求', fontproperties=font, fontsize=12)
        ax1.set_ylabel('总成本 (元)', fontproperties=font, color='b', fontsize=12)
        ax1.tick_params(axis='y', labelcolor='b')

        ax2 = ax1.twinx()
        ax2.plot(param_values, reductions, 'r-s', label='实际减排量', markersize=6)
        ax2.plot(param_values, [r * sum(e.emission for e in self.emissions) for r in param_values],
                'r--', alpha=0.5, label='最低要求线')
        ax2.set_ylabel('减排量 (吨CO₂e)', fontproperties=font, color='r', fontsize=12)
        ax2.tick_params(axis='y', labelcolor='r')

        for i, (x, ob) in enumerate(zip(param_values, over_budget)):
            if ob > 0:
                ax1.annotate(f'超{ob:.0f}', (x, costs[i]), textcoords="offset points",
                            xytext=(0, 10), ha='center', color='red', fontproperties=font, fontsize=8)

        lines1, labels1 = ax1.get_legend_handles_labels()
        lines2, labels2 = ax2.get_legend_handles_labels()
        ax1.legend(lines1 + lines2, labels1 + labels2, loc='upper left', prop=font)

        ax1.set_title('最低减排比例要求敏感性分析', fontproperties=font, fontsize=14)
        ax1.grid(True, alpha=0.3)

        plt.tight_layout()
        plt.savefig(output_path, dpi=150, bbox_inches='tight')
        plt.close()

        return output_path

    def _plot_project_sensitivity(self, project_sens: Dict[str, Any], output_path: str) -> str:
        """绘制项目成本敏感性图表"""
        fig, ax = plt.subplots(figsize=(10, 6))
        font = self._get_chinese_font()

        sens_scores = []
        proj_names = []

        for pid, sens in sorted(project_sens.items(),
                                key=lambda x: x[1]["sensitivity_score"],
                                reverse=True)[:10]:
            proj = self.project_map.get(pid)
            if proj:
                proj_names.append(proj.project_name)
                sens_scores.append(sens["sensitivity_score"])

        y_pos = np.arange(len(proj_names))
        bars = ax.barh(y_pos, sens_scores, color='#45b7d1')

        ax.set_yticks(y_pos)
        ax.set_yticklabels(proj_names, fontproperties=font)
        ax.set_xlabel('敏感性得分（变异系数）', fontproperties=font)
        ax.set_title('项目成本敏感性排名（前10）', fontproperties=font, fontsize=14)
        ax.invert_yaxis()

        for bar, score in zip(bars, sens_scores):
            ax.text(bar.get_width(), bar.get_y() + bar.get_height()/2,
                   f'{score:.3f}', ha='left', va='center', fontproperties=font)

        plt.tight_layout()
        plt.savefig(output_path, dpi=150, bbox_inches='tight')
        plt.close()

        return output_path

    def _plot_weight_sensitivity(self, weight_sens: List[Dict[str, Any]], output_path: str) -> str:
        """绘制目标权重敏感性图表"""
        if len(weight_sens) <= 1:
            fig, ax = plt.subplots(figsize=(10, 6))
            font = self._get_chinese_font()
            ax.text(0.5, 0.5, '权重变化不影响最优方案\n当前方案在所有测试权重下均为最优',
                   ha='center', va='center', fontproperties=font, fontsize=14)
            ax.set_title('目标权重稳定性分析', fontproperties=font, fontsize=14)
            ax.axis('off')
            plt.tight_layout()
            plt.savefig(output_path, dpi=150, bbox_inches='tight')
            plt.close()
            return output_path

        fig = plt.figure(figsize=(12, 8))
        ax = fig.add_subplot(111, projection='3d')
        font = self._get_chinese_font()

        for i, sol in enumerate(weight_sens):
            wr = sol["weight_ranges"]
            cost_center = (wr["minimize_cost"][0] + wr["minimize_cost"][1]) / 2
            emission_center = (wr["minimize_emission"][0] + wr["minimize_emission"][1]) / 2
            reduction_center = (wr["maximize_reduction"][0] + wr["maximize_reduction"][1]) / 2

            ax.scatter(cost_center, emission_center, reduction_center,
                      s=sol["count"] * 50, alpha=0.7, label=f'方案{i+1}: {len(sol["selected_projects"])}个项目')

        ax.set_xlabel('成本权重', fontproperties=font)
        ax.set_ylabel('排放权重', fontproperties=font)
        ax.set_zlabel('减排权重', fontproperties=font)
        ax.set_title('目标权重对方案选择的影响', fontproperties=font, fontsize=14)
        ax.legend(prop=font, bbox_to_anchor=(1.05, 1), loc='upper left')

        plt.tight_layout()
        plt.savefig(output_path, dpi=150, bbox_inches='tight')
        plt.close()

        return output_path

    def export_sensitivity_report(self,
                                   sensitivity_result: Dict[str, Any],
                                   output_path: str) -> str:
        """导出敏感性分析报告"""
        summary = sensitivity_result["summary"]

        with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
            summary_data = {
                "指标": [
                    "最敏感参数",
                    "预算敏感性得分",
                    "减排比例敏感性得分",
                    "分析时间"
                ],
                "数值": [
                    summary["most_sensitive_parameter"],
                    f"{summary['budget_sensitivity_score']:.4f}",
                    f"{summary['reduction_sensitivity_score']:.4f}",
                    datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                ]
            }
            pd.DataFrame(summary_data).to_excel(writer, sheet_name="敏感性摘要", index=False)

            project_sens = sensitivity_result["project_cost_sensitivity"]
            proj_data = []
            for pid, sens in sorted(project_sens.items(),
                                    key=lambda x: x[1]["sensitivity_score"],
                                    reverse=True):
                proj = self.project_map.get(pid)
                if proj:
                    proj_data.append({
                        "项目ID": pid,
                        "项目名称": proj.project_name,
                        "所属部门": proj.department_id,
                        "敏感性得分": sens["sensitivity_score"],
                        "基础成本": proj.cost,
                        "基础减排": proj.reduction_potential
                    })
            if proj_data:
                pd.DataFrame(proj_data).to_excel(writer, sheet_name="项目敏感性", index=False)

            budget_sens = sensitivity_result["budget_sensitivity"]
            budget_data = []
            for val, metrics in zip(budget_sens["parameter_values"], budget_sens["result_metrics"]):
                row = {"预算使用率上限": val}
                row.update(metrics)
                budget_data.append(row)
            pd.DataFrame(budget_data).to_excel(writer, sheet_name="预算敏感性明细", index=False)

            reduction_sens = sensitivity_result["reduction_ratio_sensitivity"]
            reduction_data = []
            for val, metrics in zip(reduction_sens["parameter_values"], reduction_sens["result_metrics"]):
                row = {"最低减排比例": val}
                row.update(metrics)
                reduction_data.append(row)
            pd.DataFrame(reduction_data).to_excel(writer, sheet_name="减排比例敏感性明细", index=False)

            weight_sens = sensitivity_result["objective_weight_sensitivity"]
            weight_data = []
            for i, sol in enumerate(weight_sens, 1):
                wr = sol["weight_ranges"]
                weight_data.append({
                    "方案编号": i,
                    "选中项目数": len(sol["selected_projects"]),
                    "选中项目": ",".join(sol["selected_projects"]),
                    "出现次数": sol["count"],
                    "成本权重范围": f"{wr['minimize_cost'][0]:.2f} - {wr['minimize_cost'][1]:.2f}",
                    "排放权重范围": f"{wr['minimize_emission'][0]:.2f} - {wr['minimize_emission'][1]:.2f}",
                    "减排权重范围": f"{wr['maximize_reduction'][0]:.2f} - {wr['maximize_reduction'][1]:.2f}"
                })
            if weight_data:
                pd.DataFrame(weight_data).to_excel(writer, sheet_name="权重敏感性明细", index=False)

        return output_path
