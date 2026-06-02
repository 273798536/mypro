from __future__ import annotations

import time
from typing import Dict, List, Optional, Tuple
import warnings

import numpy as np
import cvxpy as cp

from .data_models import (
    OptimizerInput,
    OptimizerResult,
    SolverStatus,
    ConflictRecord,
    ConflictType,
    ConstraintViolation,
    Position,
    IndustryTag,
    TransactionCost,
)


class ConvexOptimizer:
    def __init__(self, enable_deterministic: bool = True):
        self.enable_deterministic = enable_deterministic
        self._solve_count = 0

    def solve(self, optimizer_input: OptimizerInput) -> OptimizerResult:
        if self.enable_deterministic:
            np.random.seed(optimizer_input.constraints.random_seed)
            cp.settings.ENABLE_CACHE = False

        start_time = time.time()
        conflicts = self._detect_data_conflicts(optimizer_input)

        validation_result = self._validate_input(optimizer_input)
        if validation_result is not None:
            solve_time = (time.time() - start_time) * 1000
            return OptimizerResult(
                input_id=optimizer_input.input_id,
                status=SolverStatus.ERROR,
                conflicts=conflicts,
                explanation=validation_result,
                error_message=validation_result,
                solve_time_ms=solve_time,
            )

        try:
            result = self._build_and_solve(optimizer_input, conflicts)
            result.solve_time_ms = (time.time() - start_time) * 1000
            return result
        except Exception as e:
            solve_time = (time.time() - start_time) * 1000
            return OptimizerResult(
                input_id=optimizer_input.input_id,
                status=SolverStatus.ERROR,
                conflicts=conflicts,
                explanation=f"求解过程发生异常: {str(e)}",
                error_message=str(e),
                solve_time_ms=solve_time,
            )

    def _validate_input(self, optimizer_input: OptimizerInput) -> Optional[str]:
        stock_codes = optimizer_input.get_stock_codes()

        if len(stock_codes) == 0:
            return "输入错误：持仓列表为空"

        if len(set(stock_codes)) != len(stock_codes):
            return "输入错误：存在重复的股票代码"

        industry_stocks = {it.stock_code for it in optimizer_input.industry_tags}
        cost_stocks = {tc.stock_code for tc in optimizer_input.transaction_costs}
        position_stocks = set(stock_codes)

        missing_industry = position_stocks - industry_stocks
        missing_cost = position_stocks - cost_stocks

        errors = []
        if missing_industry:
            errors.append(f"缺失行业标签的股票: {sorted(missing_industry)}")
        if missing_cost:
            errors.append(f"缺失交易成本的股票: {sorted(missing_cost)}")

        if errors:
            return "输入错误：" + "; ".join(errors)

        target_sum = sum(p.target_weight for p in optimizer_input.positions)
        if target_sum <= 0:
            return "输入错误：目标权重之和必须大于0"

        all_forbidden = all(p.is_forbidden for p in optimizer_input.positions)
        if all_forbidden:
            return "输入错误：所有股票均被禁止买入"

        return None

    def _detect_data_conflicts(self, optimizer_input: OptimizerInput) -> List[ConflictRecord]:
        conflicts: List[ConflictRecord] = []

        industry_map = {it.stock_code: it for it in optimizer_input.industry_tags}
        cost_map = {tc.stock_code: tc for tc in optimizer_input.transaction_costs}

        for pos in optimizer_input.positions:
            industry = industry_map.get(pos.stock_code)
            cost = cost_map.get(pos.stock_code)

            if industry and pos.target_weight > 0.05 and industry.industry_confidence < 0.5:
                conflicts.append(ConflictRecord(
                    conflict_type=ConflictType.WEIGHT_INDUSTRY,
                    stock_code=pos.stock_code,
                    description=f"股票{pos.stock_code}目标权重({pos.target_weight:.2%})较高，"
                                f"但行业置信度({industry.industry_confidence:.2%})较低",
                    source_data={
                        "target_weight": pos.target_weight,
                        "industry_confidence": industry.industry_confidence,
                        "industry": industry.industry,
                    },
                    severity="warning",
                ))

            if cost and pos.target_weight > 0.03 and cost.liquidity_score < 0.3:
                conflicts.append(ConflictRecord(
                    conflict_type=ConflictType.WEIGHT_COST,
                    stock_code=pos.stock_code,
                    description=f"股票{pos.stock_code}目标权重({pos.target_weight:.2%})较高，"
                                f"但流动性评分({cost.liquidity_score:.2%})较低",
                    source_data={
                        "target_weight": pos.target_weight,
                        "liquidity_score": cost.liquidity_score,
                        "buy_cost": cost.buy_cost,
                        "sell_cost": cost.sell_cost,
                    },
                    severity="warning",
                ))

            if industry and cost and industry.industry_confidence > 0.8 and cost.liquidity_score < 0.2:
                conflicts.append(ConflictRecord(
                    conflict_type=ConflictType.INDUSTRY_COST,
                    stock_code=pos.stock_code,
                    description=f"股票{pos.stock_code}行业分类置信度高({industry.industry_confidence:.2%})，"
                                f"但流动性极差({cost.liquidity_score:.2%})",
                    source_data={
                        "industry_confidence": industry.industry_confidence,
                        "liquidity_score": cost.liquidity_score,
                    },
                    severity="info",
                ))

        return conflicts

    def _build_and_solve(
        self,
        optimizer_input: OptimizerInput,
        conflicts: List[ConflictRecord],
    ) -> OptimizerResult:
        stock_codes = optimizer_input.get_stock_codes()
        n = len(stock_codes)

        target_weights = optimizer_input.get_target_weights_array()
        current_weights = optimizer_input.get_current_weights_array()
        lower_bounds, upper_bounds = optimizer_input.get_stock_bounds()

        industry_map = {it.stock_code: it.industry for it in optimizer_input.industry_tags}
        cost_map = {tc.stock_code: tc for tc in optimizer_input.transaction_costs}

        buy_costs = np.array([cost_map[s].buy_cost for s in stock_codes])
        sell_costs = np.array([cost_map[s].sell_cost for s in stock_codes])
        liquidity = np.array([cost_map[s].liquidity_score for s in stock_codes])

        w = cp.Variable(n, name="weights")

        tracking_error = cp.sum_squares(w - target_weights)

        if optimizer_input.constraints.cost_sensitive:
            buy_amount = cp.pos(w - current_weights)
            sell_amount = cp.pos(current_weights - w)
            transaction_cost = buy_costs @ buy_amount + sell_costs @ sell_amount
            liquidity_penalty = cp.sum(cp.multiply(1 - liquidity, cp.abs(w)))
            objective = cp.Minimize(tracking_error + 0.1 * transaction_cost + 0.01 * liquidity_penalty)
        else:
            objective = cp.Minimize(tracking_error)

        constraints = [
            w >= lower_bounds,
            w <= upper_bounds,
            cp.sum(w) >= optimizer_input.constraints.total_weight_min,
            cp.sum(w) <= optimizer_input.constraints.total_weight_max,
        ]

        turnover = cp.sum(cp.abs(w - current_weights))
        constraints.append(turnover <= optimizer_input.constraints.max_turnover)

        industries = {}
        for i, code in enumerate(stock_codes):
            ind = industry_map.get(code)
            if ind:
                if ind not in industries:
                    industries[ind] = []
                industries[ind].append(i)

        industry_violations = []
        for ind, indices in industries.items():
            ind_weight = cp.sum(w[indices])
            max_ind = optimizer_input.constraints.industry_max_weight.get(ind)
            min_ind = optimizer_input.constraints.industry_min_weight.get(ind)

            if max_ind is not None:
                max_sum_lower = sum(lower_bounds[i] for i in indices)
                if max_sum_lower > max_ind:
                    industry_violations.append(
                        f"行业{ind}最小可能权重({max_sum_lower:.4f})超过上限({max_ind:.4f})"
                    )
                constraints.append(ind_weight <= max_ind)

            if min_ind is not None:
                min_sum_upper = sum(upper_bounds[i] for i in indices)
                if min_sum_upper < min_ind:
                    industry_violations.append(
                        f"行业{ind}最大可能权重({min_sum_upper:.4f})低于下限({min_ind:.4f})"
                    )
                constraints.append(ind_weight >= min_ind)

        if industry_violations:
            explanation = "约束冲突检测：" + "; ".join(industry_violations)
            return OptimizerResult(
                input_id=optimizer_input.input_id,
                status=SolverStatus.INFEASIBLE,
                conflicts=conflicts,
                explanation=explanation,
                error_message=explanation,
                solver_details={"industry_conflicts": industry_violations},
            )

        problem = cp.Problem(objective, constraints)

        try:
            with warnings.catch_warnings(record=True) as w_list:
                problem.solve(
                    solver=cp.CLARABEL,
                    max_iter=10000,
                    tol_gap_abs=1e-8,
                    tol_gap_rel=1e-8,
                    tol_feas=1e-8,
                )
                warnings_caught = [str(w.message) for w in w_list]
        except Exception as e:
            return self._handle_solver_error(optimizer_input, conflicts, str(e), constraints)

        status_map = {
            "optimal": SolverStatus.OPTIMAL,
            "optimal_inaccurate": SolverStatus.OPTIMAL,
            "infeasible": SolverStatus.INFEASIBLE,
            "infeasible_inaccurate": SolverStatus.INFEASIBLE,
            "unbounded": SolverStatus.UNBOUNDED,
            "unbounded_inaccurate": SolverStatus.UNBOUNDED,
            "max_iter": SolverStatus.MAX_ITERATIONS,
        }

        solver_status = status_map.get(problem.status, SolverStatus.ERROR)

        if solver_status == SolverStatus.OPTIMAL and w.value is not None:
            optimal_weights = np.clip(w.value, lower_bounds, upper_bounds)
            total_weight = float(np.sum(optimal_weights))

            weight_dict = {code: float(optimal_weights[i]) for i, code in enumerate(stock_codes)}

            violations = self._check_constraint_violations(
                optimal_weights, optimizer_input, stock_codes, industry_map
            )

            explanation = self._generate_explanation(
                optimal_weights, target_weights, current_weights,
                optimizer_input, violations, conflicts
            )

            solver_stats = getattr(problem, "solver_stats", None)
            iterations = -1
            if solver_stats is not None:
                iterations = getattr(solver_stats, "num_iters", -1)

            solver_details = {
                "solver_name": "CLARABEL",
                "iterations": iterations,
                "status": problem.status,
                "warnings": warnings_caught if 'warnings_caught' in locals() else [],
                "deterministic_seed": optimizer_input.constraints.random_seed,
            }

            return OptimizerResult(
                input_id=optimizer_input.input_id,
                status=solver_status,
                optimal_weights=weight_dict,
                objective_value=float(problem.value),
                conflicts=conflicts,
                violations=violations,
                explanation=explanation,
                solver_details=solver_details,
            )

        else:
            return self._handle_solver_failure(
                optimizer_input, conflicts, problem.status, solver_status, constraints
            )

    def _handle_solver_error(
        self,
        optimizer_input: OptimizerInput,
        conflicts: List[ConflictRecord],
        error_msg: str,
        constraints: list,
    ) -> OptimizerResult:
        constraint_details = self._analyze_constraints(constraints, optimizer_input)
        explanation = f"求解器异常: {error_msg}\n约束分析: {constraint_details}"
        return OptimizerResult(
            input_id=optimizer_input.input_id,
            status=SolverStatus.ERROR,
            conflicts=conflicts,
            explanation=explanation,
            error_message=error_msg,
            solver_details={"constraint_analysis": constraint_details},
        )

    def _handle_solver_failure(
        self,
        optimizer_input: OptimizerInput,
        conflicts: List[ConflictRecord],
        problem_status: str,
        solver_status: SolverStatus,
        constraints: list,
    ) -> OptimizerResult:
        constraint_analysis = self._analyze_constraints(constraints, optimizer_input)
        infeasibility_causes = self._diagnose_infeasibility(optimizer_input)

        explanation_parts = []
        if solver_status == SolverStatus.INFEASIBLE:
            explanation_parts.append("优化问题不可行，存在约束冲突。")
            explanation_parts.extend(infeasibility_causes)
        elif solver_status == SolverStatus.UNBOUNDED:
            explanation_parts.append("优化问题无界，可能缺少必要的约束。")
        elif solver_status == SolverStatus.MAX_ITERATIONS:
            explanation_parts.append("求解达到最大迭代次数，未能收敛到最优解。")
        else:
            explanation_parts.append(f"求解失败，状态: {problem_status}")

        explanation_parts.append(f"约束详情: {constraint_analysis}")
        explanation = "\n".join(explanation_parts)

        return OptimizerResult(
            input_id=optimizer_input.input_id,
            status=solver_status,
            conflicts=conflicts,
            explanation=explanation,
            error_message=explanation,
            solver_details={
                "problem_status": problem_status,
                "constraint_analysis": constraint_analysis,
                "infeasibility_causes": infeasibility_causes,
            },
        )

    def _analyze_constraints(self, constraints: list, optimizer_input: OptimizerInput) -> str:
        stock_codes = optimizer_input.get_stock_codes()
        lower, upper = optimizer_input.get_stock_bounds()

        analysis = [
            f"变量数量: {len(stock_codes)}",
            f"单票约束: 下限[{lower.min():.4f}, {lower.max():.4f}], "
            f"上限[{upper.min():.4f}, {upper.max():.4f}]",
            f"总权重约束: [{optimizer_input.constraints.total_weight_min:.4f}, "
            f"{optimizer_input.constraints.total_weight_max:.4f}]",
            f"换手率约束: <= {optimizer_input.constraints.max_turnover:.4f}",
        ]

        if optimizer_input.constraints.industry_max_weight:
            analysis.append(
                f"行业上限: {optimizer_input.constraints.industry_max_weight}"
            )
        if optimizer_input.constraints.industry_min_weight:
            analysis.append(
                f"行业下限: {optimizer_input.constraints.industry_min_weight}"
            )

        forbidden = [s for s, p in zip(stock_codes, optimizer_input.positions) if p.is_forbidden]
        if forbidden:
            analysis.append(f"禁买标的: {forbidden}")

        return "; ".join(analysis)

    def _diagnose_infeasibility(self, optimizer_input: OptimizerInput) -> List[str]:
        causes = []
        stock_codes = optimizer_input.get_stock_codes()
        lower, upper = optimizer_input.get_stock_bounds()

        sum_lower = float(np.sum(lower))
        sum_upper = float(np.sum(upper))
        total_min = optimizer_input.constraints.total_weight_min
        total_max = optimizer_input.constraints.total_weight_max

        if sum_lower > total_max:
            causes.append(
                f"总权重下限冲突: 各股最小权重之和({sum_lower:.4f}) > 总权重上限({total_max:.4f})"
            )
        if sum_upper < total_min:
            causes.append(
                f"总权重上限冲突: 各股最大权重之和({sum_upper:.4f}) < 总权重下限({total_min:.4f})"
            )

        for i, (s, lb, ub) in enumerate(zip(stock_codes, lower, upper)):
            if lb > ub + 1e-8:
                causes.append(f"单票约束冲突: {s} 下限({lb:.4f}) > 上限({ub:.4f})")

        current_weights = optimizer_input.get_current_weights_array()
        max_turnover = optimizer_input.constraints.max_turnover
        min_needed_turnover = float(np.sum(np.abs(lower - current_weights)))

        if min_needed_turnover > max_turnover + 1e-8:
            causes.append(
                f"换手率约束过紧: 满足权重下限至少需要换手({min_needed_turnover:.4f})，"
                f"但最大允许换手({max_turnover:.4f})"
            )

        industry_map = {it.stock_code: it.industry for it in optimizer_input.industry_tags}
        industries = {}
        for i, code in enumerate(stock_codes):
            ind = industry_map.get(code)
            if ind:
                if ind not in industries:
                    industries[ind] = []
                industries[ind].append(i)

        for ind, indices in industries.items():
            sum_lower_ind = sum(lower[i] for i in indices)
            sum_upper_ind = sum(upper[i] for i in indices)

            max_ind = optimizer_input.constraints.industry_max_weight.get(ind)
            min_ind = optimizer_input.constraints.industry_min_weight.get(ind)

            if max_ind is not None and sum_lower_ind > max_ind + 1e-8:
                causes.append(
                    f"行业{ind}上限冲突: 行业内各股最小权重之和({sum_lower_ind:.4f}) > 行业上限({max_ind:.4f})"
                )
            if min_ind is not None and sum_upper_ind < min_ind - 1e-8:
                causes.append(
                    f"行业{ind}下限冲突: 行业内各股最大权重之和({sum_upper_ind:.4f}) < 行业下限({min_ind:.4f})"
                )

        if not causes:
            causes.append("无法定位具体冲突原因，可能存在多个约束的组合冲突。建议逐步放松约束进行排查。")

        return causes

    def _check_constraint_violations(
        self,
        weights: np.ndarray,
        optimizer_input: OptimizerInput,
        stock_codes: List[str],
        industry_map: Dict[str, str],
    ) -> List[ConstraintViolation]:
        violations: List[ConstraintViolation] = []
        eps = 1e-6

        lower, upper = optimizer_input.get_stock_bounds()
        for i, code in enumerate(stock_codes):
            if weights[i] < lower[i] - eps:
                violations.append(ConstraintViolation(
                    constraint_name=f"single_stock_min_{code}",
                    description=f"股票{code}权重低于下限",
                    current_value=float(weights[i]),
                    limit_value=float(lower[i]),
                    involved_stocks=[code],
                ))
            if weights[i] > upper[i] + eps:
                violations.append(ConstraintViolation(
                    constraint_name=f"single_stock_max_{code}",
                    description=f"股票{code}权重高于上限",
                    current_value=float(weights[i]),
                    limit_value=float(upper[i]),
                    involved_stocks=[code],
                ))

        total_weight = float(np.sum(weights))
        if total_weight < optimizer_input.constraints.total_weight_min - eps:
            violations.append(ConstraintViolation(
                constraint_name="total_weight_min",
                description="总权重低于下限",
                current_value=total_weight,
                limit_value=optimizer_input.constraints.total_weight_min,
                involved_stocks=stock_codes,
            ))
        if total_weight > optimizer_input.constraints.total_weight_max + eps:
            violations.append(ConstraintViolation(
                constraint_name="total_weight_max",
                description="总权重高于上限",
                current_value=total_weight,
                limit_value=optimizer_input.constraints.total_weight_max,
                involved_stocks=stock_codes,
            ))

        current_weights = optimizer_input.get_current_weights_array()
        turnover = float(np.sum(np.abs(weights - current_weights)))
        if turnover > optimizer_input.constraints.max_turnover + eps:
            violations.append(ConstraintViolation(
                constraint_name="max_turnover",
                description="换手率超过上限",
                current_value=turnover,
                limit_value=optimizer_input.constraints.max_turnover,
                involved_stocks=stock_codes,
            ))

        industries = {}
        for i, code in enumerate(stock_codes):
            ind = industry_map.get(code)
            if ind:
                if ind not in industries:
                    industries[ind] = []
                industries[ind].append(i)

        for ind, indices in industries.items():
            ind_weight = float(np.sum(weights[indices]))
            max_ind = optimizer_input.constraints.industry_max_weight.get(ind)
            min_ind = optimizer_input.constraints.industry_min_weight.get(ind)

            if max_ind is not None and ind_weight > max_ind + eps:
                violations.append(ConstraintViolation(
                    constraint_name=f"industry_max_{ind}",
                    description=f"行业{ind}权重超过上限",
                    current_value=ind_weight,
                    limit_value=max_ind,
                    involved_stocks=[stock_codes[i] for i in indices],
                ))
            if min_ind is not None and ind_weight < min_ind - eps:
                violations.append(ConstraintViolation(
                    constraint_name=f"industry_min_{ind}",
                    description=f"行业{ind}权重低于下限",
                    current_value=ind_weight,
                    limit_value=min_ind,
                    involved_stocks=[stock_codes[i] for i in indices],
                ))

        return violations

    def _generate_explanation(
        self,
        optimal_weights: np.ndarray,
        target_weights: np.ndarray,
        current_weights: np.ndarray,
        optimizer_input: OptimizerInput,
        violations: List[ConstraintViolation],
        conflicts: List[ConflictRecord],
    ) -> str:
        parts = []

        tracking_error = float(np.sum((optimal_weights - target_weights) ** 2))
        total_weight = float(np.sum(optimal_weights))
        turnover = float(np.sum(np.abs(optimal_weights - current_weights)))

        parts.append("=== 优化结果说明 ===")
        parts.append(f"求解状态: 成功")
        parts.append(f"目标函数值: {tracking_error:.6f}")
        parts.append(f"最优权重合计: {total_weight:.4f} (目标范围: "
                     f"[{optimizer_input.constraints.total_weight_min:.4f}, "
                     f"{optimizer_input.constraints.total_weight_max:.4f}])")
        parts.append(f"换手率: {turnover:.4f} (上限: {optimizer_input.constraints.max_turnover:.4f})")

        if optimizer_input.constraints.cost_sensitive:
            parts.append(f"优化目标: 跟踪误差最小化 + 交易成本惩罚 + 流动性惩罚")
        else:
            parts.append(f"优化目标: 跟踪误差最小化")

        weight_diff = optimal_weights - target_weights
        stock_codes = optimizer_input.get_stock_codes()

        parts.append("\n=== 权重调整明细 ===")
        top_adjustments = np.argsort(-np.abs(weight_diff))[:10]
        for idx in top_adjustments:
            diff = float(weight_diff[idx])
            if abs(diff) > 1e-6:
                direction = "上调" if diff > 0 else "下调"
                parts.append(
                    f"  {stock_codes[idx]}: {direction} {abs(diff):.4f} "
                    f"(目标: {target_weights[idx]:.4f} -> 最优: {optimal_weights[idx]:.4f})"
                )

        total_diff = float(np.sum(np.abs(weight_diff)))
        parts.append(f"  权重总偏离: {total_diff:.4f}")

        if violations:
            parts.append("\n=== 约束违反情况 ===")
            for v in violations:
                parts.append(f"  ! {v.description}: 当前值={v.current_value:.6f}, 限制值={v.limit_value:.6f}")
        else:
            parts.append("\n=== 约束满足情况 ===")
            parts.append("  ✓ 所有权重约束满足")
            parts.append("  ✓ 总权重约束满足")
            parts.append("  ✓ 换手率约束满足")
            if optimizer_input.constraints.industry_max_weight or optimizer_input.constraints.industry_min_weight:
                parts.append("  ✓ 行业约束满足")

        if conflicts:
            parts.append("\n=== 数据冲突提醒 ===")
            for c in conflicts:
                parts.append(f"  ⚠ [{c.severity}] {c.description}")

        parts.append("\n=== 约束依据 ===")
        parts.append(f"  随机种子: {optimizer_input.constraints.random_seed} (保证复算一致性)")
        parts.append(f"  单票最大权重: {optimizer_input.constraints.max_single_stock_weight:.4f}")
        parts.append(f"  单票最小权重: {optimizer_input.constraints.min_single_stock_weight:.4f}")

        return "\n".join(parts)

    def verify_determinism(
        self,
        optimizer_input: OptimizerInput,
        num_runs: int = 3,
    ) -> Tuple[bool, List[OptimizerResult]]:
        results = []
        for _ in range(num_runs):
            results.append(self.solve(optimizer_input))

        if len(results) < 2:
            return True, results

        first_weights = results[0].optimal_weights
        first_status = results[0].status

        all_consistent = True
        for r in results[1:]:
            if r.status != first_status:
                all_consistent = False
                break
            if r.optimal_weights is None or first_weights is None:
                if r.optimal_weights != first_weights:
                    all_consistent = False
                    break
            else:
                for k in first_weights:
                    if abs(r.optimal_weights.get(k, 0) - first_weights[k]) > 1e-10:
                        all_consistent = False
                        break
                if not all_consistent:
                    break

        return all_consistent, results
