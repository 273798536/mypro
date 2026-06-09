"""约束校验和历史对比模块。"""
from __future__ import annotations

from typing import Dict, List, Optional, Tuple

from .models import (
    GraphData,
    InspectionResult,
    PathResult,
    ValidationItem,
    BatchReport,
)


class ConstraintValidator:
    """校验计算结果是否满足约束。"""

    def __init__(self, tolerance: float = 1e-6):
        self.default_tolerance = tolerance

    def validate(
        self,
        graph: GraphData,
        result: PathResult,
        draft: Optional[dict] = None,
        previous: Optional[InspectionResult] = None,
    ) -> List[ValidationItem]:
        """执行所有校验，返回校验项列表。"""
        items: List[ValidationItem] = []
        tol = graph.tolerance or self.default_tolerance

        items.append(self._validate_computation_success(graph, result, previous))

        if result.success and result.distance is not None:
            if graph.expected_distance is not None:
                items.append(
                    self._validate_expected_distance(
                        graph, result, tol, previous
                    )
                )
            if graph.expected_path is not None and result.path is not None:
                items.append(
                    self._validate_expected_path(graph, result, previous)
                )
            if draft is not None:
                items.append(
                    self._validate_against_draft(
                        graph, result, draft, tol, previous
                    )
                )
            items.append(self._validate_no_negative_cycle(graph, result))
            items.append(self._validate_path_connectivity(graph, result))
        else:
            if graph.expected_distance is not None:
                items.append(
                    ValidationItem(
                        name="期望距离校验",
                        passed=False,
                        message=f"计算失败，无法校验期望距离: {result.error}",
                    )
                )

        if previous is not None:
            items.append(self._validate_vs_history(graph, result, previous, tol))

        return items

    # ---- 具体校验方法 ----

    def _validate_computation_success(
        self, graph: GraphData, result: PathResult, previous: Optional[InspectionResult]
    ) -> ValidationItem:
        passed = result.success
        before = previous.computation.success if previous else None
        msg = "计算成功" if passed else f"计算失败: {result.error}"
        changed = before is not None and before != passed
        if changed:
            msg += f" (历史: {'成功' if before else '失败'} → {'成功' if passed else '失败'})"
        return ValidationItem(
            name="计算成功率",
            passed=passed,
            message=msg,
            before=before,
            after=passed,
        )

    def _validate_expected_distance(
        self,
        graph: GraphData,
        result: PathResult,
        tol: float,
        previous: Optional[InspectionResult],
    ) -> ValidationItem:
        expected = graph.expected_distance
        actual = result.distance
        diff = abs(actual - expected) if actual is not None else float("inf")
        passed = diff <= tol

        before = None
        if previous is not None and previous.computation.success:
            prev_dist = previous.computation.distance
            before = prev_dist
            if prev_dist is not None:
                prev_diff = abs(prev_dist - expected)
                prev_passed = prev_diff <= tol
                if prev_passed != passed:
                    msg = (
                        f"距离 {actual} 与期望 {expected} 差 {diff:.2e}"
                        f"{'≤' if passed else '>'}{tol:.0e}"
                        f" (历史: {prev_dist}, {'通过' if prev_passed else '未通过'} → {'通过' if passed else '未通过'})"
                    )
                    return ValidationItem(
                        name="期望距离校验",
                        passed=passed,
                        message=msg,
                        before=prev_dist,
                        after=actual,
                    )

        msg = (
            f"距离 {actual} 与期望 {expected} 差 {diff:.2e}"
            f"{'≤' if passed else '>'}{tol:.0e}"
        )
        return ValidationItem(
            name="期望距离校验",
            passed=passed,
            message=msg,
            before=before,
            after=actual,
        )

    def _validate_expected_path(
        self, graph: GraphData, result: PathResult, previous: Optional[InspectionResult]
    ) -> ValidationItem:
        expected = graph.expected_path
        actual = result.path or []
        passed = expected == actual
        before = None
        if previous is not None and previous.computation.success:
            before = previous.computation.path
        changed = before is not None and before != actual
        msg = f"路径一致" if passed else f"路径不一致，期望 {expected} 实际 {actual}"
        if changed:
            msg += f" (历史路径: {before})"
        return ValidationItem(
            name="期望路径校验",
            passed=passed,
            message=msg,
            before=before,
            after=actual,
        )

    def _validate_against_draft(
        self,
        graph: GraphData,
        result: PathResult,
        draft: dict,
        tol: float,
        previous: Optional[InspectionResult],
    ) -> ValidationItem:
        draft_dist = draft.get("distance")
        draft_path = draft.get("path")
        issues: List[str] = []
        passed = True
        before_dist = None
        after_dist = result.distance

        if previous is not None:
            for v in previous.validations:
                if v.name == "草稿一致性校验":
                    before_dist = v.before
                    break

        if draft_dist is not None and result.distance is not None:
            diff = abs(result.distance - float(draft_dist))
            if diff > tol:
                passed = False
                issues.append(
                    f"草稿距离 {draft_dist} 与计算值 {result.distance} 差 {diff:.2e}>{tol:.0e}"
                )

        if draft_path is not None and result.path is not None:
            if list(draft_path) != list(result.path):
                passed = False
                issues.append(
                    f"草稿路径 {draft_path} 与计算路径 {result.path} 不一致"
                )

        msg = "草稿一致" if passed else "; ".join(issues)
        changed = before_dist is not None and before_dist != after_dist
        if changed:
            msg += f" (草稿校验结果有变化)"
        return ValidationItem(
            name="草稿一致性校验",
            passed=passed,
            message=msg,
            before=before_dist,
            after=after_dist,
        )

    def _validate_no_negative_cycle(
        self, graph: GraphData, result: PathResult
    ) -> ValidationItem:
        has_neg = any(e.weight < 0 for e in graph.edges)
        passed = not has_neg
        if passed:
            return ValidationItem(
                name="负权边检查",
                passed=True,
                message="无负权边，Dijkstra 适用",
            )
        return ValidationItem(
            name="负权边检查",
            passed=False,
            message="检测到负权边，需改用 Bellman-Ford 或确认材料",
        )

    def _validate_path_connectivity(
        self, graph: GraphData, result: PathResult
    ) -> ValidationItem:
        if result.path is None:
            return ValidationItem(
                name="路径连通性",
                passed=False,
                message="未生成路径",
            )
        if len(result.path) == 1:
            return ValidationItem(
                name="路径连通性",
                passed=True,
                message=f"源目标相同: {result.path[0]}",
            )
        # 校验路径上相邻节点之间确实存在边
        edge_set = {(e.from_node, e.to_node) for e in graph.edges}
        edge_set |= {(e.to_node, e.from_node) for e in graph.edges if self._is_undirected(graph)}
        broken: List[str] = []
        for i in range(len(result.path) - 1):
            a, b = result.path[i], result.path[i + 1]
            if (a, b) not in edge_set:
                broken.append(f"{a}->{b}")
        if broken:
            return ValidationItem(
                name="路径连通性",
                passed=False,
                message=f"路径中不存在边: {', '.join(broken)}",
            )
        return ValidationItem(
            name="路径连通性",
            passed=True,
            message=f"路径连通，共 {len(result.path)} 个节点",
        )

    @staticmethod
    def _is_undirected(graph: GraphData) -> bool:
        # 简单启发：如果所有边都有反向边则视为无向图
        forward = {(e.from_node, e.to_node) for e in graph.edges}
        backward = {(e.to_node, e.from_node) for e in graph.edges}
        return forward == backward

    def _validate_vs_history(
        self,
        graph: GraphData,
        result: PathResult,
        previous: InspectionResult,
        tol: float,
    ) -> ValidationItem:
        prev_res = previous.computation
        changed = False
        details: List[str] = []

        if prev_res.success != result.success:
            changed = True
            details.append(
                f"计算状态: {'成功' if prev_res.success else '失败'} → {'成功' if result.success else '失败'}"
            )

        if (
            prev_res.success
            and result.success
            and prev_res.distance is not None
            and result.distance is not None
        ):
            d = abs(prev_res.distance - result.distance)
            if d > tol:
                changed = True
                details.append(f"距离: {prev_res.distance} → {result.distance} (差 {d:.2e})")

        if prev_res.path != result.path:
            changed = True
            details.append(f"路径: {prev_res.path} → {result.path}")

        if changed:
            return ValidationItem(
                name="历史对比",
                passed=False,
                message="结果与上次运行不同: " + "; ".join(details),
                before=prev_res.to_dict(),
                after=result.to_dict(),
            )
        return ValidationItem(
            name="历史对比",
            passed=True,
            message="结果与上次运行一致",
            before=prev_res.to_dict(),
            after=result.to_dict(),
        )
