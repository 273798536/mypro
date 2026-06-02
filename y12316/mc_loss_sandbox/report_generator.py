import json
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any
from collections import defaultdict

from .models import (
    SimulationResult,
    ConflictRecord,
    ExecutionTimeline,
    PolicyRecord,
    LossDistribution,
    ExpenseRate,
    DeductibleRule,
    DataSource,
)


class ReportGenerator:
    def __init__(self, output_dir: str):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def _format_currency(self, value: float) -> str:
        if value >= 1_000_000:
            return f"{value / 1_000_000:.2f}M"
        elif value >= 1_000:
            return f"{value / 1_000:.2f}K"
        else:
            return f"{value:.2f}"

    def generate_console_summary(
        self,
        result: SimulationResult,
        conflicts: List[ConflictRecord],
        timeline: List[ExecutionTimeline],
        policies: List[PolicyRecord],
        loss_distributions: List[LossDistribution],
        expense_rates: List[ExpenseRate],
        deductible_rules: List[DeductibleRule],
    ) -> str:
        lines = []
        lines.append("=" * 70)
        lines.append("  蒙特卡洛亏损沙盘 - 模拟摘要")
        lines.append("=" * 70)
        lines.append(f"  生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("")

        lines.append("【数据概览】")
        lines.append(f"  保单样本数: {len(policies)}")
        lines.append(f"  赔付分布数: {len(loss_distributions)}")
        lines.append(f"  费用率配置: {len(expense_rates)}")
        lines.append(f"  免赔规则数: {len(deductible_rules)}")
        lines.append("")

        lines.append("【核心风险指标】")
        lines.append(f"  期望损失:     {self._format_currency(result.mean_loss)}")
        lines.append(f"  标准差:       {self._format_currency(result.std_loss)}")
        lines.append(f"  VaR (95%):    {self._format_currency(result.var_95)}")
        lines.append(f"  VaR (99%):    {self._format_currency(result.var_99)}")
        lines.append(f"  CVaR (95%):   {self._format_currency(result.cvar_95)}")
        lines.append(f"  CVaR (99%):   {self._format_currency(result.cvar_99)}")
        lines.append(f"  费用部分:     {self._format_currency(result.expenses)}")
        lines.append("")

        lines.append("【分位数损失】")
        for cl, pct in sorted(result.percentiles.items()):
            lines.append(f"  P{int(cl * 100):<3}:       {self._format_currency(pct)}")
        lines.append("")

        lines.append(f"【冲突检测】 共发现 {len(conflicts)} 个问题")
        conflict_summary = defaultdict(int)
        for c in conflicts:
            conflict_summary[c.conflict_type.value] += 1
        for ctype, count in conflict_summary.items():
            lines.append(f"  - {ctype}: {count} 个")
        lines.append("")

        lines.append("【执行时间线】")
        for event in timeline:
            ts = event.timestamp.strftime("%H:%M:%S")
            lines.append(f"  [{event.order_index:2}] {ts} - {event.event}: {event.description}")
        lines.append("")

        lines.append("【数据源对应关系】")
        source_mapping = self._build_source_mapping(
            policies, loss_distributions, expense_rates, deductible_rules
        )
        for source, files in source_mapping.items():
            lines.append(f"  {source}: {', '.join(files)}")
        lines.append("")

        lines.append("=" * 70)

        return "\n".join(lines)

    def _build_source_mapping(
        self,
        policies: List[PolicyRecord],
        loss_distributions: List[LossDistribution],
        expense_rates: List[ExpenseRate],
        deductible_rules: List[DeductibleRule],
    ) -> Dict[str, List[str]]:
        mapping = {}

        policy_files = list({p.source_file for p in policies})
        if policy_files:
            mapping["保单样本"] = policy_files

        dist_files = list({d.source_file for d in loss_distributions})
        if dist_files:
            mapping["赔付分布"] = dist_files

        expense_files = list({e.source_file for e in expense_rates})
        if expense_files:
            mapping["费用率"] = expense_files

        deductible_files = list({r.source_file for r in deductible_rules})
        if deductible_files:
            mapping["免赔规则"] = deductible_files

        return mapping

    def generate_full_report(
        self,
        result: SimulationResult,
        conflicts: List[ConflictRecord],
        timeline: List[ExecutionTimeline],
        policies: List[PolicyRecord],
        loss_distributions: List[LossDistribution],
        expense_rates: List[ExpenseRate],
        deductible_rules: List[DeductibleRule],
        sensitivity: Dict[str, Any],
        chart_files: List[str],
    ) -> Dict[str, Any]:
        report = {
            "metadata": {
                "generated_at": datetime.now().isoformat(),
                "version": "0.1.0",
            },
            "data_summary": {
                "policy_count": len(policies),
                "policy_types": list({p.policy_type for p in policies}),
                "policy_files": list({p.source_file for p in policies}),
                "loss_distribution_count": len(loss_distributions),
                "loss_distribution_files": list({d.source_file for d in loss_distributions}),
                "expense_rate_count": len(expense_rates),
                "expense_rate_files": list({e.source_file for e in expense_rates}),
                "deductible_rule_count": len(deductible_rules),
                "deductible_rule_files": list({r.source_file for r in deductible_rules}),
            },
            "risk_metrics": {
                "mean_loss": result.mean_loss,
                "std_loss": result.std_loss,
                "var_95": result.var_95,
                "var_99": result.var_99,
                "cvar_95": result.cvar_95,
                "cvar_99": result.cvar_99,
                "expenses": result.expenses,
                "net_loss": result.net_loss,
                "percentiles": result.percentiles,
            },
            "conflicts": [
                {
                    "conflict_id": c.conflict_id,
                    "conflict_type": c.conflict_type.value,
                    "description": c.description,
                    "sources": [s.value for s in c.sources],
                    "policy_id": c.policy_id,
                    "policy_type": c.policy_type,
                    "values": c.values,
                    "resolution": c.resolution,
                    "timestamp": c.timestamp.isoformat(),
                    "order_index": c.order_index,
                }
                for c in conflicts
            ],
            "timeline": [
                {
                    "event": t.event,
                    "timestamp": t.timestamp.isoformat(),
                    "description": t.description,
                    "order_index": t.order_index,
                }
                for t in timeline
            ],
            "source_mapping": self._build_source_mapping(
                policies, loss_distributions, expense_rates, deductible_rules
            ),
            "sensitivity_analysis": sensitivity,
            "risk_explanation": self._generate_risk_explanation(result, conflicts),
            "charts": chart_files,
            "data_relationships": self._build_data_relationships(
                policies, loss_distributions, expense_rates, deductible_rules
            ),
        }

        report_path = self.output_dir / "simulation_report.json"
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=2)

        return report

    def _generate_risk_explanation(
        self, result: SimulationResult, conflicts: List[ConflictRecord]
    ) -> List[str]:
        explanations = []

        cv_ratio = result.std_loss / result.mean_loss if result.mean_loss > 0 else 0
        if cv_ratio > 2.0:
            explanations.append(
                f"变异系数为 {cv_ratio:.2f}，表明损失波动较大，需关注尾部风险。"
            )

        cvar_var_ratio = result.cvar_99 / result.var_99 if result.var_99 > 0 else 1
        if cvar_var_ratio > 1.5:
            explanations.append(
                f"CVaR(99%)/VaR(99%) = {cvar_var_ratio:.2f}，说明极端情况下损失可能远超VaR水平。"
            )

        has_extreme = any(c.conflict_type.value == "extreme_value" for c in conflicts)
        if has_extreme:
            explanations.append("赔付分布存在极端值特征，建议采用更保守的准备金计提策略。")

        has_sample_issue = any(c.conflict_type.value == "sample_insufficient" for c in conflicts)
        if has_sample_issue:
            explanations.append("部分险种样本量不足，模拟结果不确定性较高，建议收集更多历史数据后重新验证。")

        has_late_deductible = any(c.conflict_type.value == "timing_issue" for c in conflicts)
        if has_late_deductible:
            explanations.append("存在免赔规则晚到情况，本次模拟采用最新规则，需注意规则变更对前后结果可比性的影响。")

        if not explanations:
            explanations.append("风险指标表现平稳，无重大异常信号。")

        return explanations

    def _build_data_relationships(
        self,
        policies: List[PolicyRecord],
        loss_distributions: List[LossDistribution],
        expense_rates: List[ExpenseRate],
        deductible_rules: List[DeductibleRule],
    ) -> List[Dict]:
        relationships = []

        policy_types = list({p.policy_type for p in policies})
        for pt in policy_types:
            policy_files = list({p.source_file for p in policies if p.policy_type == pt})
            dist = next((d for d in loss_distributions if d.policy_type == pt), None)
            expense = next((e for e in expense_rates if e.policy_type == pt), None)
            deductible = next((r for r in deductible_rules if r.policy_type == pt), None)

            rel = {
                "policy_type": pt,
                "policy_count": sum(1 for p in policies if p.policy_type == pt),
                "policy_sources": policy_files,
                "loss_distribution": {
                    "source": dist.source_file if dist else None,
                    "type": dist.distribution_type if dist else None,
                },
                "expense_rate": {
                    "source": expense.source_file if expense else None,
                    "rate": expense.expense_rate if expense else None,
                },
                "deductible_rule": {
                    "source": deductible.source_file if deductible else None,
                    "amount": deductible.deductible_amount if deductible else None,
                    "late_arrival": deductible.is_late_arrival if deductible else None,
                },
                "charts": {
                    "loss_histogram": "charts/loss_histogram.png",
                    "loss_cdf": "charts/loss_cdf.png",
                    "risk_metrics": "charts/risk_metrics.png",
                    "sensitivity_analysis": "charts/sensitivity_analysis.png",
                    "policy_distribution": "charts/policy_distribution.png",
                },
            }
            relationships.append(rel)

        return relationships
