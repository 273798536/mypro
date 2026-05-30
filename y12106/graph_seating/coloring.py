from typing import List, Dict, Set, Optional, Any, Tuple
from collections import defaultdict
from datetime import datetime

from .config import Config
from .exceptions import ColoringError, ConflictCycle
from .models import ConflictGraph, ColoringResult, ColorAssignment
from .models.trace import TraceChain, TraceRecord, ConstraintExplanation, SeatChangeHistory


class GraphColoring:
    def __init__(self, config: Optional[Config] = None):
        self.config = config or Config()
        self.trace_chains: Dict[str, TraceChain] = {}
        self.cycles: List[ConflictCycle] = []
        self.isolated_nodes: Set[str] = set()

    def color(self, graph: ConflictGraph,
              trace_chains: Optional[Dict[str, TraceChain]] = None,
              num_colors: Optional[int] = None) -> ColoringResult:

        if trace_chains:
            self.trace_chains = trace_chains

        result = ColoringResult(
            algorithm=self.config.COLORING_ALGORITHM,
            total_nodes=len(graph.nodes)
        )

        if num_colors is None:
            num_colors = min(len(graph.nodes), self.config.MAX_CLASSES_PER_GRADE)

        if self.config.DETECT_CYCLES:
            result.cycles_found = self._detect_and_isolate_cycles(graph, result)

        working_graph = self._get_working_graph(graph, result)

        try:
            if self.config.COLORING_ALGORITHM == "welsh_powell":
                self._welsh_powell(working_graph, result, num_colors)
            elif self.config.COLORING_ALGORITHM == "backtracking":
                self._backtracking(working_graph, result, num_colors)
            elif self.config.COLORING_ALGORITHM == "dsatur":
                self._dsatur(working_graph, result, num_colors)
            else:
                self._welsh_powell(working_graph, result, num_colors)

            result.success = len(result.uncolored_nodes) == 0
            result.completed_at = datetime.now()

            self._trace_coloring_result(graph, result)

        except Exception as e:
            result.success = False
            result.completed_at = datetime.now()
            raise ColoringError(f"着色失败: {str(e)}", result.uncolored_nodes) from e

        self._merge_isolated_results(graph, result)

        return result

    def _detect_and_isolate_cycles(self, graph: ConflictGraph, result: ColoringResult) -> List[List[str]]:
        cycles = graph.detect_cycles(min_cycle_length=3)

        for cycle_nodes in cycles:
            if len(cycle_nodes) % 2 == 1:
                cycle_id = f"cycle_{datetime.now().strftime('%H%M%S')}_{len(self.cycles)}"

                edges = []
                total_weight = 0.0
                for i in range(len(cycle_nodes)):
                    a, b = cycle_nodes[i], cycle_nodes[(i + 1) % len(cycle_nodes)]
                    edge = graph.get_edge(a, b)
                    if edge:
                        edges.append((a, b, edge.weight))
                        total_weight += edge.weight

                cycle = ConflictCycle(
                    cycle_id=cycle_id,
                    nodes=cycle_nodes,
                    edges=edges,
                    weight=total_weight,
                    detected_at=datetime.now().isoformat(),
                    isolated=self.config.ISOLATE_CYCLE_CASES
                )
                self.cycles.append(cycle)

                if self.config.ISOLATE_CYCLE_CASES:
                    for node in cycle_nodes:
                        self.isolated_nodes.add(node)
                    result.isolated_cycles.append(cycle_nodes)
                    result.trace_log.append({
                        "type": "cycle_isolated",
                        "cycle_id": cycle_id,
                        "nodes": cycle_nodes,
                        "weight": total_weight,
                        "timestamp": datetime.now().isoformat()
                    })

        return cycles

    def _get_working_graph(self, graph: ConflictGraph, result: ColoringResult) -> ConflictGraph:
        if not self.isolated_nodes:
            return graph

        working_nodes = [nid for nid in graph.nodes if nid not in self.isolated_nodes]
        return graph.get_subgraph(working_nodes)

    def _welsh_powell(self, graph: ConflictGraph, result: ColoringResult, num_colors: int):
        sorted_nodes = graph.get_nodes_sorted_by_degree()
        colors_used = 0

        for node_id in sorted_nodes:
            if node_id in result.assignments:
                continue

            used_colors = set()
            for neighbor, weight in graph.get_neighbors(node_id):
                if neighbor in result.assignments:
                    used_colors.add(result.assignments[neighbor].color)

            assigned_color = None
            for color in range(num_colors):
                if color not in used_colors:
                    assigned_color = color
                    break

            if assigned_color is None:
                if self.config.ALLOW_COLOR_BACKTRACK:
                    assigned_color = self._try_backtrack(graph, result, node_id, num_colors)
                if assigned_color is None:
                    result.uncolored_nodes.append(node_id)
                    result.trace_log.append({
                        "type": "uncolored",
                        "node": node_id,
                        "reason": "no_available_color",
                        "used_colors": list(used_colors),
                        "timestamp": datetime.now().isoformat()
                    })
                    continue

            colors_used = max(colors_used, assigned_color + 1)
            self._assign_color(graph, result, node_id, assigned_color)

        result.colors_used = colors_used

    def _backtracking(self, graph: ConflictGraph, result: ColoringResult, num_colors: int):
        sorted_nodes = graph.get_nodes_sorted_by_degree()
        self._backtrack_color(graph, result, sorted_nodes, 0, num_colors)

    def _backtrack_color(self, graph: ConflictGraph, result: ColoringResult,
                         nodes: List[str], index: int, num_colors: int) -> bool:
        if index >= len(nodes):
            return True

        node_id = nodes[index]

        if node_id in self.isolated_nodes:
            return self._backtrack_color(graph, result, nodes, index + 1, num_colors)

        used_colors = set()
        for neighbor, _ in graph.get_neighbors(node_id):
            if neighbor in result.assignments:
                used_colors.add(result.assignments[neighbor].color)

        backtrack_depth = 0
        for color in range(num_colors):
            if color not in used_colors:
                if backtrack_depth > self.config.MAX_BACKTRACK_DEPTH:
                    result.trace_log.append({
                        "type": "backtrack_limit_reached",
                        "node": node_id,
                        "timestamp": datetime.now().isoformat()
                    })
                    break

                self._assign_color(graph, result, node_id, color, backtrack_depth)
                backtrack_depth += 1
                result.backtrack_count += 1
                result.max_backtrack_depth = max(result.max_backtrack_depth, backtrack_depth)

                if self._backtrack_color(graph, result, nodes, index + 1, num_colors):
                    return True

                del result.assignments[node_id]
                if color in result.color_classes:
                    if node_id in result.color_classes[color]:
                        result.color_classes[color].remove(node_id)

        if node_id not in result.assignments:
            result.uncolored_nodes.append(node_id)

        return False

    def _dsatur(self, graph: ConflictGraph, result: ColoringResult, num_colors: int):
        uncolored = set(graph.nodes.keys())
        saturation = defaultdict(set)

        while uncolored:
            node_id = max(uncolored, key=lambda n: (
                len(saturation[n]),
                graph.nodes[n].degree
            ))

            used_colors = saturation[node_id]
            assigned_color = None

            for color in range(num_colors):
                if color not in used_colors:
                    assigned_color = color
                    break

            if assigned_color is None:
                result.uncolored_nodes.append(node_id)
                uncolored.remove(node_id)
                continue

            self._assign_color(graph, result, node_id, assigned_color)

            for neighbor, _ in graph.get_neighbors(node_id):
                if neighbor in uncolored:
                    saturation[neighbor].add(assigned_color)

            uncolored.remove(node_id)

        result.colors_used = max(result.assignments.values(), key=lambda x: x.color).color + 1 if result.assignments else 0

    def _try_backtrack(self, graph: ConflictGraph, result: ColoringResult,
                       node_id: str, num_colors: int) -> Optional[int]:
        for color in range(num_colors):
            conflicts = []
            for neighbor, weight in graph.get_neighbors(node_id):
                if neighbor in result.assignments and result.assignments[neighbor].color == color:
                    if weight < 0.8 and not result.assignments[neighbor].is_override:
                        conflicts.append((neighbor, weight))

            if conflicts and len(conflicts) == 1:
                conflicting_neighbor, weight = conflicts[0]

                if result.backtrack_count < self.config.MAX_BACKTRACK_DEPTH:
                    old_assignment = result.assignments[conflicting_neighbor]
                    del result.assignments[conflicting_neighbor]
                    if conflicting_neighbor in result.color_classes.get(old_assignment.color, []):
                        result.color_classes[old_assignment.color].remove(conflicting_neighbor)

                    new_color = None
                    for c in range(num_colors):
                        used = set()
                        for nb, _ in graph.get_neighbors(conflicting_neighbor):
                            if nb in result.assignments:
                                used.add(result.assignments[nb].color)
                        if c not in used and c != old_assignment.color:
                            new_color = c
                            break

                    if new_color is not None:
                        self._assign_color(graph, result, conflicting_neighbor, new_color,
                                         backtrack_count=old_assignment.backtrack_count + 1)
                        result.backtrack_count += 1

                        return color
                    else:
                        result.assignments[conflicting_neighbor] = old_assignment
                        if conflicting_neighbor not in result.color_classes.get(old_assignment.color, []):
                            result.color_classes.setdefault(old_assignment.color, []).append(conflicting_neighbor)

        return None

    def _assign_color(self, graph: ConflictGraph, result: ColoringResult,
                      node_id: str, color: int, backtrack_count: int = 0):
        constraints = []
        for neighbor, weight in graph.get_neighbors(node_id):
            if neighbor in result.assignments and result.assignments[neighbor].color == color:
                constraints.append({
                    "type": "conflict_violation",
                    "neighbor": neighbor,
                    "weight": weight
                })

        color_labels = ["一班", "二班", "三班", "四班", "五班", "六班", "七班", "八班"]

        assignment = ColorAssignment(
            student_id=node_id,
            color=color,
            color_label=color_labels[color] if color < len(color_labels) else f"组{color + 1}",
            confidence=1.0 if not constraints else 0.5,
            constraints=constraints,
            backtrack_count=backtrack_count
        )

        result.assignments[node_id] = assignment
        result.color_classes.setdefault(color, []).append(node_id)

        result.trace_log.append({
            "type": "color_assigned",
            "node": node_id,
            "color": color,
            "color_label": assignment.color_label,
            "backtrack_count": backtrack_count,
            "constraints": constraints,
            "timestamp": datetime.now().isoformat()
        })

        self._add_trace_for_assignment(graph, node_id, assignment, result)

    def _add_trace_for_assignment(self, graph: ConflictGraph, node_id: str,
                                  assignment: ColorAssignment, result: ColoringResult):
        if node_id not in self.trace_chains:
            return

        chain = self.trace_chains[node_id]
        neighbors = graph.get_neighbors(node_id)

        constraints = []
        for neighbor, weight in neighbors:
            if neighbor in result.assignments:
                neighbor_color = result.assignments[neighbor].color
                if neighbor_color == assignment.color:
                    status = "VIOLATION"
                else:
                    status = "OK"
                constraints.append(ConstraintExplanation(
                    student_id=node_id,
                    constraint_type=f"color_{status.lower()}",
                    description=f"与学生{neighbor}的颜色约束: {neighbor_color} vs {assignment.color} - {status}",
                    source="graph_coloring",
                    weight=weight,
                    affected_students=[neighbor]
                ))

        for c in constraints:
            chain.add_constraint(c)

        chain.add_record(TraceRecord(
            student_id=node_id,
            trace_type="coloring",
            action="color_assigned",
            description=f"分配到颜色组 {assignment.color} ({assignment.color_label})",
            source_module="coloring",
            input_state={
                "neighbors": [{"id": n[0], "weight": n[1]} for n in neighbors],
                "available_colors": [c for c in range(result.colors_used or 8)]
            },
            output_state={
                "assigned_color": assignment.color,
                "color_label": assignment.color_label,
                "confidence": assignment.confidence
            },
            constraints=constraints
        ))

    def _trace_coloring_result(self, graph: ConflictGraph, result: ColoringResult):
        if not self.config.ENABLE_TRACE:
            return

        for node_id, assignment in result.assignments.items():
            if node_id not in self.trace_chains:
                continue

            chain = self.trace_chains[node_id]
            chain.add_record(TraceRecord(
                student_id=node_id,
                trace_type="coloring",
                action="coloring_complete",
                description=f"图着色完成，最终分配: {assignment.color_label}",
                source_module="coloring",
                data_hash=f"{node_id}_{assignment.color}_{datetime.now().isoformat()}",
                input_state={},
                output_state=assignment.to_dict()
            ))

    def _merge_isolated_results(self, graph: ConflictGraph, result: ColoringResult):
        if not self.isolated_nodes:
            return

        for node_id in self.isolated_nodes:
            color = result.colors_used
            assignment = ColorAssignment(
                student_id=node_id,
                color=color,
                color_label=f"隔离组-{color + 1}",
                confidence=0.3,
                is_override=True,
                override_reason="冲突闭环，已隔离等待人工复核",
                constraints=[{"type": "cycle_isolation", "reason": "检测到冲突闭环"}]
            )
            result.assignments[node_id] = assignment
            result.color_classes.setdefault(color, []).append(node_id)

            if node_id in result.uncolored_nodes:
                result.uncolored_nodes.remove(node_id)

        result.colors_used = max(result.assignments.values(), key=lambda x: x.color).color + 1 if result.assignments else 0

    def validate_coloring(self, graph: ConflictGraph, result: ColoringResult) -> List[Dict[str, Any]]:
        violations = []

        for (a, b), edge in graph.edges.items():
            if a not in result.assignments or b not in result.assignments:
                continue

            color_a = result.assignments[a].color
            color_b = result.assignments[b].color

            if color_a == color_b and edge.weight >= 0.7:
                violations.append({
                    "type": "hard_conflict",
                    "student_a": a,
                    "student_b": b,
                    "color": color_a,
                    "weight": edge.weight,
                    "conflict_type": edge.conflict_type,
                    "severity": "high" if edge.weight >= 0.9 else "medium"
                })

        for color, students in result.color_classes.items():
            if len(students) > self.config.DEFAULT_SEATS_PER_CLASS:
                violations.append({
                    "type": "capacity_exceeded",
                    "color": color,
                    "count": len(students),
                    "max_capacity": self.config.DEFAULT_SEATS_PER_CLASS,
                    "excess": len(students) - self.config.DEFAULT_SEATS_PER_CLASS
                })

        return violations

    def get_cycles(self) -> List[ConflictCycle]:
        return self.cycles

    def get_isolated_nodes(self) -> Set[str]:
        return self.isolated_nodes

    def get_trace_chain(self, student_id: str) -> Optional[TraceChain]:
        return self.trace_chains.get(student_id)

    def get_all_trace_chains(self) -> Dict[str, TraceChain]:
        return self.trace_chains
