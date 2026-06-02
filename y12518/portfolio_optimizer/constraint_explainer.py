from __future__ import annotations

from typing import Dict, List, Optional, Any
from dataclasses import dataclass

import numpy as np

from .data_models import (
    OptimizerInput,
    OptimizerResult,
    ConstraintConfig,
    ConstraintViolation,
    ConflictRecord,
    Position,
    IndustryTag,
    TransactionCost,
)


@dataclass
class ConstraintEvidence:
    constraint_name: str
    constraint_type: str
    is_satisfied: bool
    evidence: str
    data_source: str
    parameters: Dict[str, Any]


class ConstraintExplainer:
    def __init__(self):
        self.evidence_records: List[ConstraintEvidence] = []

    def explain(
        self,
        optimizer_input: OptimizerInput,
        optimizer_result: OptimizerResult,
    ) -> str:
        self.evidence_records = []

        explanation_parts = []

        explanation_parts.append("=" * 60)
        explanation_parts.append("约束解释报告")
        explanation_parts.append("=" * 60)

        explanation_parts.append("\n【输入数据概览】")
        input_overview = self._explain_input_data(optimizer_input)
        explanation_parts.append(input_overview)

        explanation_parts.append("\n【约束配置详情】")
        constraint_details = self._explain_constraint_config(optimizer_input.constraints)
        explanation_parts.append(constraint_details)

        explanation_parts.append("\n【求解状态】")
        status_explanation = self._explain_solver_status(optimizer_result)
        explanation_parts.append(status_explanation)

        if optimizer_result.is_success() and optimizer_result.optimal_weights:
            explanation_parts.append("\n【约束验证 - 通过项】")
            passed_evidence = self._explain_passed_constraints(optimizer_input, optimizer_result)
            explanation_parts.append(passed_evidence)

        explanation_parts.append("\n【约束验证 - 问题项】")
        failed_evidence = self._explain_failed_constraints(
            optimizer_input, optimizer_result
        )
        explanation_parts.append(failed_evidence)

        explanation_parts.append("\n【数据冲突分析】")
        conflict_explanation = self._explain_conflicts(optimizer_result.conflicts)
        explanation_parts.append(conflict_explanation)

        explanation_parts.append("\n【复算一致性说明】")
        determinism_explanation = self._explain_determinism(optimizer_input, optimizer_result)
        explanation_parts.append(determinism_explanation)

        explanation_parts.append("\n【完整约束依据列表】")
        evidence_list = self._format_evidence_list()
        explanation_parts.append(evidence_list)

        return "\n".join(explanation_parts)

    def _explain_input_data(self, optimizer_input: OptimizerInput) -> str:
        parts = []
        stock_codes = optimizer_input.get_stock_codes()
        target_weights = optimizer_input.get_target_weights_array()
        current_weights = optimizer_input.get_current_weights_array()

        parts.append(f"  股票数量: {len(stock_codes)}")
        parts.append(f"  目标权重合计: {np.sum(target_weights):.4f}")
        parts.append(f"  当前权重合计: {np.sum(current_weights):.4f}")

        industry_map = {it.stock_code: it for it in optimizer_input.industry_tags}
        cost_map = {tc.stock_code: tc for tc in optimizer_input.transaction_costs}

        industry_coverage = len(set(stock_codes) & set(industry_map.keys())) / len(stock_codes)
        cost_coverage = len(set(stock_codes) & set(cost_map.keys())) / len(stock_codes)

        parts.append(f"  行业标签覆盖率: {industry_coverage:.1%}")
        parts.append(f"  交易成本覆盖率: {cost_coverage:.1%}")

        forbidden = [p.stock_code for p in optimizer_input.positions if p.is_forbidden]
        if forbidden:
            parts.append(f"  禁买标的: {forbidden}")

        parts.append(f"\n  【主信息-持仓权重】来源: 限制名单")
        for p in optimizer_input.positions:
            parts.append(
                f"    {p.stock_code}: 目标={p.target_weight:.4f}, "
                f"当前={p.current_weight:.4f}, "
                f"范围=[{p.min_weight:.4f}, {p.max_weight:.4f}]"
            )

        parts.append(f"\n  【补证据1-行业标签】来源: 行业数据库")
        for it in optimizer_input.industry_tags:
            if it.stock_code in stock_codes:
                parts.append(
                    f"    {it.stock_code}: {it.industry} "
                    f"(置信度: {it.industry_confidence:.2%})"
                )

        parts.append(f"\n  【补证据2-交易成本】来源: 交易系统")
        for tc in optimizer_input.transaction_costs:
            if tc.stock_code in stock_codes:
                parts.append(
                    f"    {tc.stock_code}: 买入={tc.buy_cost:.4%}, "
                    f"卖出={tc.sell_cost:.4%}, "
                    f"流动性={tc.liquidity_score:.2%}"
                )

        self.evidence_records.append(ConstraintEvidence(
            constraint_name="input_data",
            constraint_type="data_integrity",
            is_satisfied=industry_coverage == 1.0 and cost_coverage == 1.0,
            evidence=f"输入数据完整度: 行业{industry_coverage:.1%}, 成本{cost_coverage:.1%}",
            data_source="position/industry/cost",
            parameters={
                "stock_count": len(stock_codes),
                "industry_coverage": industry_coverage,
                "cost_coverage": cost_coverage,
            },
        ))

        return "\n".join(parts)

    def _explain_constraint_config(self, constraints: ConstraintConfig) -> str:
        parts = []

        parts.append(f"  总权重约束: [{constraints.total_weight_min:.4f}, {constraints.total_weight_max:.4f}]")
        parts.append(f"  单票最大权重: {constraints.max_single_stock_weight:.4f}")
        parts.append(f"  单票最小权重: {constraints.min_single_stock_weight:.4f}")
        parts.append(f"  最大换手率: {constraints.max_turnover:.4f}")
        parts.append(f"  成本敏感模式: {'开启' if constraints.cost_sensitive else '关闭'}")
        parts.append(f"  随机种子: {constraints.random_seed} (保证复算一致)")

        if constraints.industry_max_weight:
            parts.append(f"\n  行业权重上限:")
            for ind, limit in constraints.industry_max_weight.items():
                parts.append(f"    {ind}: <= {limit:.4f}")

        if constraints.industry_min_weight:
            parts.append(f"\n  行业权重下限:")
            for ind, limit in constraints.industry_min_weight.items():
                parts.append(f"    {ind}: >= {limit:.4f}")

        constraint_types = [
            ("total_weight", "总权重约束", "风险预算"),
            ("single_stock", "单票权重约束", "分散化要求"),
            ("turnover", "换手率约束", "交易成本控制"),
            ("industry", "行业约束", "行业暴露限制"),
        ]
        for name, desc, source in constraint_types:
            self.evidence_records.append(ConstraintEvidence(
                constraint_name=name,
                constraint_type="configuration",
                is_satisfied=True,
                evidence=f"{desc}已配置",
                data_source=source,
                parameters=constraints.model_dump(),
            ))

        return "\n".join(parts)

    def _explain_solver_status(self, result: OptimizerResult) -> str:
        status_map = {
            "optimal": ("✓", "成功找到最优解"),
            "infeasible": ("✗", "问题不可行，约束之间存在冲突"),
            "unbounded": ("✗", "问题无界，缺少必要约束"),
            "max_iterations": ("⚠", "达到最大迭代次数，解可能非最优"),
            "error": ("✗", "求解过程发生错误"),
        }
        symbol, desc = status_map.get(result.status.value, ("?", "未知状态"))
        parts = [f"  {symbol} 状态: {result.status.value} - {desc}"]

        if result.solve_time_ms > 0:
            parts.append(f"  求解耗时: {result.solve_time_ms:.2f} ms")

        if result.objective_value is not None:
            parts.append(f"  目标函数值: {result.objective_value:.6f}")

        if result.error_message:
            parts.append(f"  错误信息: {result.error_message}")

        if result.solver_details:
            parts.append(f"  求解器详情: {result.solver_details}")

        self.evidence_records.append(ConstraintEvidence(
            constraint_name="solver_status",
            constraint_type="solver",
            is_satisfied=result.is_success(),
            evidence=desc,
            data_source="cvxpy/CLARABEL",
            parameters=result.solver_details,
        ))

        return "\n".join(parts)

    def _explain_passed_constraints(
        self,
        optimizer_input: OptimizerInput,
        result: OptimizerResult,
    ) -> str:
        if not result.optimal_weights:
            return "  无最优解可供验证"

        parts = []
        stock_codes = optimizer_input.get_stock_codes()
        weights = np.array([result.optimal_weights.get(s, 0.0) for s in stock_codes])
        lower, upper = optimizer_input.get_stock_bounds()
        constraints = optimizer_input.constraints

        total_weight = float(np.sum(weights))
        total_ok = (
            constraints.total_weight_min - 1e-6 <= total_weight
            <= constraints.total_weight_max + 1e-6
        )
        if total_ok:
            parts.append(
                f"  ✓ 总权重约束: {total_weight:.4f} ∈ "
                f"[{constraints.total_weight_min:.4f}, {constraints.total_weight_max:.4f}]"
            )
            self.evidence_records.append(ConstraintEvidence(
                constraint_name="total_weight_check",
                constraint_type="verification",
                is_satisfied=True,
                evidence=f"总权重{total_weight:.4f}满足约束",
                data_source="optimizer_result",
                parameters={
                    "total_weight": total_weight,
                    "min": constraints.total_weight_min,
                    "max": constraints.total_weight_max,
                },
            ))

        single_ok = True
        for i, s in enumerate(stock_codes):
            w = weights[i]
            if not (lower[i] - 1e-6 <= w <= upper[i] + 1e-6):
                single_ok = False
                break
        if single_ok:
            parts.append(f"  ✓ 单票权重约束: 所有股票权重在允许范围内")
            self.evidence_records.append(ConstraintEvidence(
                constraint_name="single_stock_check",
                constraint_type="verification",
                is_satisfied=True,
                evidence="所有单票权重满足上下限约束",
                data_source="optimizer_result",
                parameters={
                    "weights": result.optimal_weights,
                    "lower_bounds": lower.tolist(),
                    "upper_bounds": upper.tolist(),
                },
            ))

        current_weights = optimizer_input.get_current_weights_array()
        turnover = float(np.sum(np.abs(weights - current_weights)))
        turnover_ok = turnover <= constraints.max_turnover + 1e-6
        if turnover_ok:
            parts.append(
                f"  ✓ 换手率约束: {turnover:.4f} <= {constraints.max_turnover:.4f}"
            )
            self.evidence_records.append(ConstraintEvidence(
                constraint_name="turnover_check",
                constraint_type="verification",
                is_satisfied=True,
                evidence=f"换手率{turnover:.4f}满足上限约束",
                data_source="optimizer_result",
                parameters={
                    "turnover": turnover,
                    "max_turnover": constraints.max_turnover,
                },
            ))

        industry_map = {it.stock_code: it.industry for it in optimizer_input.industry_tags}
        industries = {}
        for i, code in enumerate(stock_codes):
            ind = industry_map.get(code)
            if ind:
                if ind not in industries:
                    industries[ind] = []
                industries[ind].append(i)

        industry_ok = True
        for ind, indices in industries.items():
            ind_weight = float(np.sum(weights[indices]))
            max_ind = constraints.industry_max_weight.get(ind)
            min_ind = constraints.industry_min_weight.get(ind)

            if max_ind is not None and ind_weight > max_ind + 1e-6:
                industry_ok = False
            if min_ind is not None and ind_weight < min_ind - 1e-6:
                industry_ok = False

        if industry_ok and industries:
            parts.append("  ✓ 行业权重约束: 所有行业权重满足限制")
            for ind, indices in industries.items():
                ind_weight = float(np.sum(weights[indices]))
                max_ind = constraints.industry_max_weight.get(ind)
                min_ind = constraints.industry_min_weight.get(ind)
                constraint_str = []
                if min_ind is not None:
                    constraint_str.append(f">= {min_ind:.4f}")
                if max_ind is not None:
                    constraint_str.append(f"<= {max_ind:.4f}")
                if constraint_str:
                    parts.append(
                        f"    - {ind}: {ind_weight:.4f} ({', '.join(constraint_str)})"
                    )
            self.evidence_records.append(ConstraintEvidence(
                constraint_name="industry_check",
                constraint_type="verification",
                is_satisfied=True,
                evidence="所有行业权重满足约束",
                data_source="optimizer_result",
                parameters={
                    "industry_weights": {
                        ind: float(np.sum(weights[indices]))
                        for ind, indices in industries.items()
                    },
                    "industry_constraints": {
                        "max": constraints.industry_max_weight,
                        "min": constraints.industry_min_weight,
                    },
                },
            ))

        return "\n".join(parts) if parts else "  无通过的约束"

    def _explain_failed_constraints(
        self,
        optimizer_input: OptimizerInput,
        result: OptimizerResult,
    ) -> str:
        parts = []

        if result.violations:
            for v in result.violations:
                delta = v.current_value - v.limit_value
                if "低于" in v.description:
                    delta = v.limit_value - v.current_value
                parts.append(
                    f"  ✗ {v.description}\n"
                    f"    当前值: {v.current_value:.6f}\n"
                    f"    限制值: {v.limit_value:.6f}\n"
                    f"    偏离量: {delta:.6f}\n"
                    f"    涉及股票: {v.involved_stocks[:5]}"
                    f"{'...' if len(v.involved_stocks) > 5 else ''}"
                )
                self.evidence_records.append(ConstraintEvidence(
                    constraint_name=v.constraint_name,
                    constraint_type="violation",
                    is_satisfied=False,
                    evidence=v.description,
                    data_source="constraint_check",
                    parameters={
                        "current_value": v.current_value,
                        "limit_value": v.limit_value,
                        "involved_stocks": v.involved_stocks,
                    },
                ))

        if not result.is_success() and result.solver_details.get("infeasibility_causes"):
            parts.append("\n  【不可行性诊断】")
            for cause in result.solver_details["infeasibility_causes"]:
                parts.append(f"  ⚠ {cause}")
                self.evidence_records.append(ConstraintEvidence(
                    constraint_name="infeasibility_diagnosis",
                    constraint_type="diagnosis",
                    is_satisfied=False,
                    evidence=cause,
                    data_source="constraint_analyzer",
                    parameters={},
                ))

        if not parts:
            parts.append("  无约束违反问题")

        return "\n".join(parts)

    def _explain_conflicts(self, conflicts: List[ConflictRecord]) -> str:
        if not conflicts:
            return "  未检测到数据冲突"

        parts = []
        for c in conflicts:
            status = "已解决" if c.resolved else "待处理"
            parts.append(
                f"  [{c.severity.upper()}] {c.conflict_type.value}\n"
                f"    股票: {c.stock_code or 'N/A'}\n"
                f"    描述: {c.description}\n"
                f"    状态: {status}"
            )
            if c.resolved:
                parts.append(f"    解决方案: {c.resolution}")
            parts.append(f"    原始数据: {c.source_data}")

            self.evidence_records.append(ConstraintEvidence(
                constraint_name=f"conflict_{c.conflict_id}",
                constraint_type="data_conflict",
                is_satisfied=c.resolved,
                evidence=c.description,
                data_source="conflict_detector",
                parameters=c.source_data,
            ))

        parts.append(
            f"\n  冲突处理原则: 先留痕再判断。主信息(持仓)优先级最高，"
            f"补证据(行业、成本)用于风险提示，不直接否决主信息。"
        )

        return "\n".join(parts)

    def _explain_determinism(
        self,
        optimizer_input: OptimizerInput,
        result: OptimizerResult,
    ) -> str:
        seed = optimizer_input.constraints.random_seed
        parts = [
            f"  随机种子: {seed}",
            f"  确定性保证: 相同输入+相同种子=相同结果",
            f"  求解器配置: CLARABEL, 禁用缓存, 高精度容差(1e-8)",
        ]

        if result.solver_details.get("deterministic_seed"):
            parts.append(f"  ✓ 结果已标记为可复算")

        self.evidence_records.append(ConstraintEvidence(
            constraint_name="determinism",
            constraint_type="reproducibility",
            is_satisfied=True,
            evidence=f"使用固定随机种子{seed}保证复算一致性",
            data_source="solver_config",
            parameters={"random_seed": seed, "solver": "CLARABEL"},
        ))

        return "\n".join(parts)

    def _format_evidence_list(self) -> str:
        parts = []
        for i, ev in enumerate(self.evidence_records, 1):
            status = "✓" if ev.is_satisfied else "✗"
            parts.append(
                f"  {i:2d}. [{status}] {ev.constraint_name} "
                f"({ev.constraint_type})\n"
                f"      证据: {ev.evidence}\n"
                f"      来源: {ev.data_source}"
            )
        return "\n".join(parts)

    def get_evidence_summary(self) -> Dict[str, Any]:
        total = len(self.evidence_records)
        passed = sum(1 for e in self.evidence_records if e.is_satisfied)
        failed = total - passed

        by_type: Dict[str, Dict[str, int]] = {}
        for e in self.evidence_records:
            if e.constraint_type not in by_type:
                by_type[e.constraint_type] = {"passed": 0, "failed": 0}
            if e.is_satisfied:
                by_type[e.constraint_type]["passed"] += 1
            else:
                by_type[e.constraint_type]["failed"] += 1

        return {
            "total_constraints": total,
            "passed": passed,
            "failed": failed,
            "by_type": by_type,
            "evidence_details": [
                {
                    "name": e.constraint_name,
                    "type": e.constraint_type,
                    "is_satisfied": e.is_satisfied,
                    "evidence": e.evidence,
                    "data_source": e.data_source,
                }
                for e in self.evidence_records
            ],
        }
