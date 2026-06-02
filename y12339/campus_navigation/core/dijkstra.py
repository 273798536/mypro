import heapq
import uuid
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime
from ..models import (
    CampusGraph,
    Edge,
    EdgeDirection,
    BarrierStatus,
    NavigationResult,
    RouteStatus,
    RouteSegment,
    AccessibilityProfile,
    ManualEdit,
    EditType,
)
from ..utils import Tracer


class DijkstraRouter:
    def __init__(self, graph: CampusGraph):
        self.graph = graph
        self.tracer = Tracer(graph)
        self._edge_weight_overrides: Dict[str, float] = {}
        self._removed_edges: set = set()
        self._apply_manual_edits()

    def _apply_manual_edits(self) -> None:
        for edit in self.graph.edit_trail.edits:
            if edit.edit_type == EditType.EDGE_WEIGHT_OVERRIDE:
                if edit.new_value is not None:
                    self._edge_weight_overrides[edit.target_id] = float(edit.new_value)
            elif edit.edit_type == EditType.EDGE_REMOVAL:
                self._removed_edges.add(edit.target_id)
            elif edit.edit_type == EditType.BARRIER_STATUS_CHANGE:
                barrier = self.graph.barriers.get(edit.target_id)
                if barrier and edit.new_value:
                    try:
                        barrier.status = BarrierStatus(edit.new_value)
                    except ValueError:
                        pass
            elif edit.edit_type == EditType.ROUTE_SEGMENT_OVERRIDE:
                for edge_id in edit.affected_edge_ids:
                    if edge_id not in self._removed_edges:
                        pass

    def _get_edge_weight(self, edge: Edge, profile: Optional[AccessibilityProfile] = None) -> float:
        if edge.edge_id in self._edge_weight_overrides:
            return self._edge_weight_overrides[edge.edge_id]

        weight = edge.length

        if profile:
            if profile.avoids_stairs and edge.has_stairs:
                weight *= 1000
            if profile.requires_ramp and not edge.has_ramp:
                weight *= 1000
            if profile.requires_elevator and not edge.has_elevator:
                weight *= 1000
            if profile.max_slope and edge.slope and edge.slope > profile.max_slope:
                weight *= 1000
            if profile.min_width and edge.width and edge.width < profile.min_width:
                weight *= 1000
            if profile.avoids_uneven_surface and edge.surface_type == "uneven":
                weight *= 1000

            if profile.preferred_tags:
                match_count = sum(1 for tag in profile.preferred_tags if tag in edge.accessibility_tags)
                if match_count == 0:
                    weight *= 1.5

        return weight

    def _is_edge_usable(self, edge: Edge, from_node: str, profile: Optional[AccessibilityProfile] = None) -> Tuple[bool, List[str]]:
        reasons = []

        if edge.edge_id in self._removed_edges:
            reasons.append("边已被人工移除")
            return False, reasons

        if not edge.can_traverse_from(from_node):
            reasons.append(f"边方向错误: {edge.direction.value}，不能从{from_node}出发")
            return False, reasons

        if self.graph.is_edge_blocked(edge.edge_id):
            barriers = self.graph.get_barriers_on_edge(edge.edge_id)
            active_barriers = [b for b in barriers if b.is_active()]
            if active_barriers:
                barrier_ids = [b.barrier_id for b in active_barriers]
                reasons.append(f"边被围挡阻断: {barrier_ids}")
                return False, reasons

        if profile:
            if not edge.is_accessible_for(profile.preferred_tags):
                missing_tags = [t for t in profile.preferred_tags if t not in edge.accessibility_tags]
                reasons.append(f"缺少无障碍标签: {missing_tags}")
                return False, reasons

            accessibility_issues = self.graph.get_accessibility_issues_on_edge(edge.edge_id)
            unresolved = [a for a in accessibility_issues if not a.resolved]
            if unresolved and profile.requires_wheelchair:
                issue_severity = max(a.severity for a in unresolved)
                if issue_severity >= 4:
                    issue_ids = [a.issue_id for a in unresolved]
                    reasons.append(f"存在严重无障碍问题: {issue_ids}")
                    return False, reasons

        return True, reasons

    def find_shortest_path(
        self,
        start_node: str,
        end_node: str,
        accessibility_profile: Optional[AccessibilityProfile] = None,
    ) -> NavigationResult:
        request_id = str(uuid.uuid4())[:8]

        result = NavigationResult(
            request_id=request_id,
            status=RouteStatus.NO_PATH,
            start_node=start_node,
            end_node=end_node,
            total_distance=0.0,
            estimated_time=0.0,
            accessibility_profile=accessibility_profile.to_dict() if accessibility_profile else None,
        )

        if start_node not in self.graph.nodes:
            result.errors.append(f"起点节点不存在: {start_node}")
            return result

        if end_node not in self.graph.nodes:
            result.errors.append(f"终点节点不存在: {end_node}")
            return result

        distances: Dict[str, float] = {node: float("inf") for node in self.graph.nodes}
        distances[start_node] = 0.0
        previous: Dict[str, Optional[Tuple[str, str]]] = {node: None for node in self.graph.nodes}
        visited: set = set()

        priority_queue: List[Tuple[float, str]] = [(0.0, start_node)]

        while priority_queue:
            current_dist, current_node = heapq.heappop(priority_queue)

            if current_node in visited:
                continue
            visited.add(current_node)

            if current_node == end_node:
                break

            for edge in self.graph.get_edges_from_node(current_node):
                usable, reasons = self._is_edge_usable(edge, current_node, accessibility_profile)

                if not usable:
                    for reason in reasons:
                        if "边方向错误" in reason:
                            result.direction_errors.append({
                                "edge_id": edge.edge_id,
                                "from_node": current_node,
                                "to_node": edge.get_other_node(current_node),
                                "direction": edge.direction.value,
                                "message": reason,
                                "source_file": edge.source_file,
                                "source_line": edge.source_line,
                            })
                        elif "围挡阻断" in reason:
                            barriers = self.graph.get_barriers_on_edge(edge.edge_id)
                            for barrier in barriers:
                                if barrier.is_active():
                                    result.barrier_issues.append({
                                        "barrier_id": barrier.barrier_id,
                                        "edge_id": edge.edge_id,
                                        "reason": barrier.reason,
                                        "start_date": barrier.start_date.isoformat(),
                                        "end_date": barrier.end_date.isoformat(),
                                        "is_expired": barrier.is_expired(),
                                        "status": barrier.status.value,
                                        "source_file": barrier.source_file,
                                        "source_line": barrier.source_line,
                                    })
                        continue

                neighbor = edge.get_other_node(current_node)
                if neighbor in visited:
                    continue

                weight = self._get_edge_weight(edge, accessibility_profile)
                new_dist = current_dist + weight

                if new_dist < distances[neighbor]:
                    distances[neighbor] = new_dist
                    previous[neighbor] = (current_node, edge.edge_id)
                    heapq.heappush(priority_queue, (new_dist, neighbor))

        if distances[end_node] == float("inf"):
            result.errors.append(f"无法找到从 {start_node} 到 {end_node} 的路径")
            return result

        path_nodes: List[str] = []
        path_edges: List[str] = []
        current = end_node

        while current is not None:
            path_nodes.append(current)
            prev_info = previous[current]
            if prev_info is None:
                break
            prev_node, edge_id = prev_info
            path_edges.append(edge_id)
            current = prev_node

        path_nodes.reverse()
        path_edges.reverse()

        result.node_sequence = path_nodes
        result.total_distance = sum(
            self.graph.get_edge(eid).length for eid in path_edges if self.graph.get_edge(eid)
        )
        result.estimated_time = result.total_distance / 1.4

        for i, edge_id in enumerate(path_edges):
            edge = self.graph.get_edge(edge_id)
            if not edge:
                continue

            from_node = path_nodes[i]
            to_node = path_nodes[i + 1]

            segment = RouteSegment(
                edge_id=edge_id,
                from_node=from_node,
                to_node=to_node,
                length=edge.length,
                direction=edge.direction.value,
                accessibility_tags=list(edge.accessibility_tags),
                edge_source_file=edge.source_file,
                edge_source_line=edge.source_line,
            )

            barriers = self.graph.get_barriers_on_edge(edge_id)
            active_barriers = [b for b in barriers if b.is_active()]
            if active_barriers:
                segment.has_barrier = True
                segment.barrier_id = active_barriers[0].barrier_id

            accessibility_issues = self.graph.get_accessibility_issues_on_edge(edge_id)
            unresolved = [a for a in accessibility_issues if not a.resolved]
            if unresolved:
                segment.has_accessibility_issue = True
                segment.accessibility_issue_ids = [a.issue_id for a in unresolved]
                for issue in unresolved:
                    result.accessibility_breakpoints.append({
                        "issue_id": issue.issue_id,
                        "edge_id": edge_id,
                        "from_node": from_node,
                        "to_node": to_node,
                        "issue_type": issue.issue_type.value,
                        "severity": issue.severity,
                        "description": issue.description,
                        "location_detail": issue.location_detail,
                        "source_file": issue.source_file,
                        "source_line": issue.source_line,
                    })

            edits = self.graph.edit_trail.get_edits_for_target(edge_id)
            if edits:
                segment.has_manual_edit = True
                segment.edit_ids = [e.edit_id for e in edits]
                for edit in edits:
                    result.manual_edit_impacts.append({
                        "edit_id": edit.edit_id,
                        "edit_type": edit.edit_type.value,
                        "edge_id": edge_id,
                        "from_node": from_node,
                        "to_node": to_node,
                        "editor": edit.editor,
                        "edit_time": edit.edit_time.isoformat(),
                        "reason": edit.reason,
                        "old_value": edit.old_value,
                        "new_value": edit.new_value,
                        "source_file": edit.source_file,
                        "source_line": edit.source_line,
                    })

            result.route_segments.append(segment)

        all_edits = list(self.graph.edit_trail.edits)
        if all_edits:
            for edit in all_edits:
                already_in_route = any(
                    edit.edit_id in seg.edit_ids
                    for seg in result.route_segments
                    if seg.has_manual_edit
                )
                if not already_in_route:
                    result.manual_edit_impacts.append({
                        "edit_id": edit.edit_id,
                        "edit_type": edit.edit_type.value,
                        "edge_id": None,
                        "from_node": None,
                        "to_node": None,
                        "editor": edit.editor,
                        "edit_time": edit.edit_time.isoformat(),
                        "reason": edit.reason,
                        "old_value": edit.old_value,
                        "new_value": edit.new_value,
                        "target_id": edit.target_id,
                        "affected_node_ids": edit.affected_node_ids,
                        "affected_edge_ids": edit.affected_edge_ids,
                        "source_file": edit.source_file,
                        "source_line": edit.source_line,
                    })

        for node_id in path_nodes:
            self.tracer.trace_node_to_result(node_id, result)

        result.edge_length_trace = self.tracer.trace_result_to_edge_lengths(result)
        result.trace_entries = self.tracer.get_all_traces()

        if result.direction_errors or result.barrier_issues or result.accessibility_breakpoints:
            result.status = RouteStatus.HAS_WARNINGS
        else:
            result.status = RouteStatus.SUCCESS

        return result

    def get_weight_overrides(self) -> Dict[str, float]:
        return dict(self._edge_weight_overrides)

    def get_removed_edges(self) -> set:
        return set(self._removed_edges)
