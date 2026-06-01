from typing import Dict, List, Any, Tuple
from datetime import datetime
from ..models import (
    CampusGraph,
    Edge,
    EdgeDirection,
    Barrier,
    BarrierStatus,
    AccessibilityIssue,
)


class DataValidator:
    def __init__(self, graph: CampusGraph):
        self.graph = graph

    def validate_all(self) -> Dict[str, Any]:
        return {
            "direction_errors": self.validate_edge_directions(),
            "expired_barriers": self.validate_expired_barriers(),
            "accessibility_breakpoints": self.validate_accessibility_breakpoints(),
            "data_inconsistencies": self.validate_data_consistency(),
            "summary": None,
        }

    def validate_edge_directions(self) -> List[Dict[str, Any]]:
        errors = []
        node_ids = self.graph.get_all_node_ids()

        for edge_id, edge in self.graph.edges.items():
            if edge.from_node not in node_ids:
                errors.append({
                    "type": "edge_direction_error",
                    "error_type": "invalid_from_node",
                    "edge_id": edge_id,
                    "from_node": edge.from_node,
                    "to_node": edge.to_node,
                    "direction": edge.direction.value,
                    "message": f"边 {edge_id} 的起点节点 {edge.from_node} 不存在",
                    "source_file": edge.source_file,
                    "source_line": edge.source_line,
                    "severity": "high",
                })
                continue

            if edge.to_node not in node_ids:
                errors.append({
                    "type": "edge_direction_error",
                    "error_type": "invalid_to_node",
                    "edge_id": edge_id,
                    "from_node": edge.from_node,
                    "to_node": edge.to_node,
                    "direction": edge.direction.value,
                    "message": f"边 {edge_id} 的终点节点 {edge.to_node} 不存在",
                    "source_file": edge.source_file,
                    "source_line": edge.source_line,
                    "severity": "high",
                })
                continue

            if edge.direction == EdgeDirection.FORWARD:
                if not self._has_reverse_edge(edge):
                    errors.append({
                        "type": "edge_direction_error",
                        "error_type": "unidirectional_warning",
                        "edge_id": edge_id,
                        "from_node": edge.from_node,
                        "to_node": edge.to_node,
                        "direction": edge.direction.value,
                        "message": f"边 {edge_id} 是单向边(forward)，可能存在方向错误",
                        "source_file": edge.source_file,
                        "source_line": edge.source_line,
                        "severity": "medium",
                    })

            if edge.direction == EdgeDirection.BACKWARD:
                errors.append({
                    "type": "edge_direction_error",
                    "error_type": "backward_direction",
                    "edge_id": edge_id,
                    "from_node": edge.from_node,
                    "to_node": edge.to_node,
                    "direction": edge.direction.value,
                    "message": f"边 {edge_id} 使用了不常见的backward方向，请确认是否正确",
                    "source_file": edge.source_file,
                    "source_line": edge.source_line,
                    "severity": "medium",
                })

            if edge.length <= 0:
                errors.append({
                    "type": "edge_direction_error",
                    "error_type": "invalid_length",
                    "edge_id": edge_id,
                    "from_node": edge.from_node,
                    "to_node": edge.to_node,
                    "length": edge.length,
                    "message": f"边 {edge_id} 的长度 {edge.length} 无效（必须>0）",
                    "source_file": edge.source_file,
                    "source_line": edge.source_line,
                    "severity": "high",
                })

        return errors

    def _has_reverse_edge(self, edge: Edge) -> bool:
        for other_edge in self.graph.edges.values():
            if (other_edge.from_node == edge.to_node and
                other_edge.to_node == edge.from_node and
                other_edge.direction in (EdgeDirection.BIDIRECTIONAL, EdgeDirection.FORWARD)):
                return True
        return False

    def validate_expired_barriers(self) -> List[Dict[str, Any]]:
        errors = []
        now = datetime.now()

        for barrier_id, barrier in self.graph.barriers.items():
            calculated_status = barrier.get_current_status(now)

            if calculated_status == BarrierStatus.EXPIRED and barrier.status != BarrierStatus.EXPIRED:
                days_expired = (now - barrier.end_date).days
                errors.append({
                    "type": "barrier_expired_error",
                    "barrier_id": barrier_id,
                    "edge_id": barrier.edge_id,
                    "reason": barrier.reason,
                    "start_date": barrier.start_date.isoformat(),
                    "end_date": barrier.end_date.isoformat(),
                    "current_status": barrier.status.value,
                    "calculated_status": calculated_status.value,
                    "days_expired": days_expired,
                    "message": f"围挡 {barrier_id} 已过期 {days_expired} 天，但状态仍标记为 {barrier.status.value}，应标记为 expired",
                    "source_file": barrier.source_file,
                    "source_line": barrier.source_line,
                    "severity": "high",
                })
            elif calculated_status == BarrierStatus.ACTIVE and barrier.status != BarrierStatus.ACTIVE:
                errors.append({
                    "type": "barrier_status_mismatch",
                    "barrier_id": barrier_id,
                    "edge_id": barrier.edge_id,
                    "reason": barrier.reason,
                    "start_date": barrier.start_date.isoformat(),
                    "end_date": barrier.end_date.isoformat(),
                    "current_status": barrier.status.value,
                    "calculated_status": calculated_status.value,
                    "message": f"围挡 {barrier_id} 当前应为active状态，但标记为 {barrier.status.value}",
                    "source_file": barrier.source_file,
                    "source_line": barrier.source_line,
                    "severity": "medium",
                })
            elif calculated_status == BarrierStatus.SCHEDULED and barrier.status != BarrierStatus.SCHEDULED:
                days_until_start = (barrier.start_date - now).days
                errors.append({
                    "type": "barrier_status_mismatch",
                    "barrier_id": barrier_id,
                    "edge_id": barrier.edge_id,
                    "reason": barrier.reason,
                    "start_date": barrier.start_date.isoformat(),
                    "end_date": barrier.end_date.isoformat(),
                    "current_status": barrier.status.value,
                    "calculated_status": calculated_status.value,
                    "days_until_start": days_until_start,
                    "message": f"围挡 {barrier_id} 应在 {days_until_start} 天后开始，当前应为scheduled状态，但标记为 {barrier.status.value}",
                    "source_file": barrier.source_file,
                    "source_line": barrier.source_line,
                    "severity": "low",
                })

            if barrier.edge_id not in self.graph.edges:
                errors.append({
                    "type": "barrier_edge_not_found",
                    "barrier_id": barrier_id,
                    "edge_id": barrier.edge_id,
                    "message": f"围挡 {barrier_id} 引用的边 {barrier.edge_id} 不存在",
                    "source_file": barrier.source_file,
                    "source_line": barrier.source_line,
                    "severity": "high",
                })

        return errors

    def validate_accessibility_breakpoints(self) -> List[Dict[str, Any]]:
        errors = []

        for issue_id, issue in self.graph.accessibility_issues.items():
            if issue.edge_id not in self.graph.edges:
                errors.append({
                    "type": "accessibility_breakpoint",
                    "issue_type": "edge_not_found",
                    "issue_id": issue_id,
                    "edge_id": issue.edge_id,
                    "severity": issue.severity,
                    "message": f"无障碍问题 {issue_id} 引用的边 {issue.edge_id} 不存在",
                    "source_file": issue.source_file,
                    "source_line": issue.source_line,
                })
                continue

            edge = self.graph.edges[issue.edge_id]

            if not issue.resolved:
                if issue.severity >= 4:
                    errors.append({
                        "type": "accessibility_breakpoint",
                        "issue_type": "high_severity_unresolved",
                        "issue_id": issue_id,
                        "edge_id": issue.edge_id,
                        "from_node": edge.from_node,
                        "to_node": edge.to_node,
                        "issue_type_detail": issue.issue_type.value,
                        "severity": issue.severity,
                        "description": issue.description,
                        "location_detail": issue.location_detail,
                        "reported_date": issue.reported_date.isoformat() if issue.reported_date else None,
                        "message": f"边 {edge.edge_id} 存在严重无障碍问题（严重度{issue.severity}）: {issue.description}",
                        "source_file": issue.source_file,
                        "source_line": issue.source_line,
                        "edge_source_file": edge.source_file,
                        "edge_source_line": edge.source_line,
                    })
                else:
                    errors.append({
                        "type": "accessibility_breakpoint",
                        "issue_type": "moderate_unresolved",
                        "issue_id": issue_id,
                        "edge_id": issue.edge_id,
                        "from_node": edge.from_node,
                        "to_node": edge.to_node,
                        "issue_type_detail": issue.issue_type.value,
                        "severity": issue.severity,
                        "description": issue.description,
                        "location_detail": issue.location_detail,
                        "reported_date": issue.reported_date.isoformat() if issue.reported_date else None,
                        "message": f"边 {edge.edge_id} 存在无障碍问题（严重度{issue.severity}）: {issue.description}",
                        "source_file": issue.source_file,
                        "source_line": issue.source_line,
                        "edge_source_file": edge.source_file,
                        "edge_source_line": edge.source_line,
                    })

            if issue.resolved and issue.resolved_date is None:
                errors.append({
                    "type": "accessibility_breakpoint",
                    "issue_type": "resolved_missing_date",
                    "issue_id": issue_id,
                    "edge_id": issue.edge_id,
                    "message": f"无障碍问题 {issue_id} 标记为已解决，但缺少解决日期",
                    "source_file": issue.source_file,
                    "source_line": issue.source_line,
                })

            if issue.severity < 1 or issue.severity > 5:
                errors.append({
                    "type": "accessibility_breakpoint",
                    "issue_type": "invalid_severity",
                    "issue_id": issue_id,
                    "edge_id": issue.edge_id,
                    "severity": issue.severity,
                    "message": f"无障碍问题 {issue_id} 的严重度 {issue.severity} 超出范围（应为1-5）",
                    "source_file": issue.source_file,
                    "source_line": issue.source_line,
                })

        return errors

    def validate_data_consistency(self) -> List[Dict[str, Any]]:
        errors = []

        for edge_id, edge in self.graph.edges.items():
            from_node = self.graph.get_node(edge.from_node)
            to_node = self.graph.get_node(edge.to_node)

            if from_node and to_node:
                expected_length = ((to_node.x - from_node.x) ** 2 + (to_node.y - from_node.y) ** 2) ** 0.5
                if abs(edge.length - expected_length) > 5:
                    errors.append({
                        "type": "data_inconsistency",
                        "inconsistency_type": "edge_length_mismatch",
                        "edge_id": edge_id,
                        "from_node": edge.from_node,
                        "to_node": edge.to_node,
                        "declared_length": edge.length,
                        "calculated_length": round(expected_length, 2),
                        "difference": round(abs(edge.length - expected_length), 2),
                        "message": f"边 {edge_id} 的声明长度 {edge.length} 与节点距离计算值 {round(expected_length, 2)} 差异较大",
                        "source_file": edge.source_file,
                        "source_line": edge.source_line,
                        "severity": "medium",
                    })

            if edge.has_stairs and edge.has_ramp:
                errors.append({
                    "type": "data_inconsistency",
                    "inconsistency_type": "contradictory_accessibility",
                    "edge_id": edge_id,
                    "message": f"边 {edge_id} 同时标记了has_stairs和has_ramp，请确认",
                    "source_file": edge.source_file,
                    "source_line": edge.source_line,
                    "severity": "low",
                })

        node_ids = set()
        for node_id, node in self.graph.nodes.items():
            if node_id in node_ids:
                errors.append({
                    "type": "data_inconsistency",
                    "inconsistency_type": "duplicate_node_id",
                    "node_id": node_id,
                    "message": f"节点ID {node_id} 重复",
                    "source_file": node.source_file,
                    "source_line": node.source_line,
                    "severity": "high",
                })
            node_ids.add(node_id)

        edge_ids = set()
        for edge_id, edge in self.graph.edges.items():
            if edge_id in edge_ids:
                errors.append({
                    "type": "data_inconsistency",
                    "inconsistency_type": "duplicate_edge_id",
                    "edge_id": edge_id,
                    "message": f"边ID {edge_id} 重复",
                    "source_file": edge.source_file,
                    "source_line": edge.source_line,
                    "severity": "high",
                })
            edge_ids.add(edge_id)

        return errors

    def get_validation_summary(self, results: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "total_direction_errors": len(results.get("direction_errors", [])),
            "high_severity_direction_errors": sum(
                1 for e in results.get("direction_errors", []) if e.get("severity") == "high"
            ),
            "total_expired_barriers": sum(
                1 for b in results.get("expired_barriers", []) if "已过期" in b.get("message", "")
            ),
            "total_barrier_issues": len(results.get("expired_barriers", [])),
            "total_accessibility_breakpoints": len(results.get("accessibility_breakpoints", [])),
            "high_severity_accessibility_issues": sum(
                1 for a in results.get("accessibility_breakpoints", []) if a.get("severity", 0) >= 4
            ),
            "total_data_inconsistencies": len(results.get("data_inconsistencies", [])),
            "total_issues": (
                len(results.get("direction_errors", [])) +
                len(results.get("expired_barriers", [])) +
                len(results.get("accessibility_breakpoints", [])) +
                len(results.get("data_inconsistencies", []))
            ),
        }
