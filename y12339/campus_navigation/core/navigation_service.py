from typing import Dict, Any, Optional
from ..models import (
    CampusGraph,
    NavigationResult,
    AccessibilityProfile,
)
from ..utils import DataLoader, Tracer
from .dijkstra import DijkstraRouter
from .data_validator import DataValidator


class NavigationService:
    def __init__(self, graph: Optional[CampusGraph] = None):
        self.graph = graph
        self.router = None
        self.validator = None
        self.tracer = None

        if graph:
            self._initialize_components()

    def _initialize_components(self):
        if self.graph:
            self.router = DijkstraRouter(self.graph)
            self.validator = DataValidator(self.graph)
            self.tracer = Tracer(self.graph)

    def load_graph(self, filepath: str) -> Dict[str, Any]:
        loader = DataLoader()
        self.graph = loader.load_from_file(filepath)
        self._initialize_components()
        return loader.get_load_report()

    def validate_data(self) -> Dict[str, Any]:
        if not self.validator:
            raise ValueError("Graph not loaded")

        results = self.validator.validate_all()
        results["summary"] = self.validator.get_validation_summary(results)
        return results

    def find_route(
        self,
        start_node: str,
        end_node: str,
        accessibility_profile: Optional[AccessibilityProfile] = None,
    ) -> NavigationResult:
        if not self.router:
            raise ValueError("Graph not loaded")

        result = self.router.find_shortest_path(start_node, end_node, accessibility_profile)

        if self.tracer:
            consistency = self.tracer.verify_edge_length_consistency(result)
            if not consistency["total_distance_match"]:
                result.warnings.append(
                    f"总距离不一致: 报告{result.total_distance}, 实际{consistency['total_actual_distance']}"
                )
            if consistency["inconsistencies"]:
                for inc in consistency["inconsistencies"]:
                    result.warnings.append(
                        f"边 {inc['edge_id']} 长度不一致: 报告{inc['reported_length']}, 实际{inc['actual_length']}"
                    )

        return result

    def trace_node_to_result(self, node_id: str, result: NavigationResult):
        if not self.tracer:
            raise ValueError("Graph not loaded")
        return self.tracer.trace_node_to_result(node_id, result)

    def trace_edge_to_result(self, edge_id: str, result: NavigationResult):
        if not self.tracer:
            raise ValueError("Graph not loaded")
        return self.tracer.trace_edge_length_to_result(edge_id, result)

    def trace_result_to_edges(self, result: NavigationResult):
        if not self.tracer:
            raise ValueError("Graph not loaded")
        return self.tracer.trace_result_to_edge_lengths(result)

    def verify_consistency(self, result: NavigationResult) -> Dict[str, Any]:
        if not self.tracer:
            raise ValueError("Graph not loaded")
        return self.tracer.verify_edge_length_consistency(result)

    def get_manual_edit_impacts(self, result: NavigationResult) -> Dict[str, Any]:
        impacts = []
        weight_overrides = self.router.get_weight_overrides() if self.router else {}

        for edit_impact in result.manual_edit_impacts:
            edge_id = edit_impact.get("edge_id")
            if edge_id and edge_id in weight_overrides:
                edit_impact["actual_weight_override"] = weight_overrides[edge_id]
            impacts.append(edit_impact)

        return {
            "total_edits_affecting_route": len(impacts),
            "weight_overrides_applied": weight_overrides,
            "removed_edges": list(self.router.get_removed_edges()) if self.router else [],
            "details": impacts,
        }

    def get_graph_stats(self) -> Dict[str, Any]:
        if not self.graph:
            raise ValueError("Graph not loaded")

        return {
            "node_count": len(self.graph.nodes),
            "edge_count": len(self.graph.edges),
            "barrier_count": len(self.graph.barriers),
            "accessibility_issue_count": len(self.graph.accessibility_issues),
            "manual_edit_count": len(self.graph.edit_trail.edits),
            "bidirectional_edges": sum(
                1 for e in self.graph.edges.values() if e.direction.value == "bidirectional"
            ),
            "forward_edges": sum(
                1 for e in self.graph.edges.values() if e.direction.value == "forward"
            ),
            "backward_edges": sum(
                1 for e in self.graph.edges.values() if e.direction.value == "backward"
            ),
            "wheelchair_accessible_edges": sum(
                1 for e in self.graph.edges.values() if "wheelchair" in e.accessibility_tags
            ),
        }
