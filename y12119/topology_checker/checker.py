from dataclasses import dataclass, field
from typing import Dict, List, Set, Tuple, Optional
from collections import defaultdict
from .graph import TopologyGraph, Node, Edge, EdgeDirection, NodeType


@dataclass(eq=True, frozen=True)
class ConnectivityIssue:
    issue_type: str
    severity: str
    description: str
    affected_items: tuple
    details: tuple = field(default_factory=tuple)

    def __post_init__(self):
        object.__setattr__(self, 'affected_items', tuple(sorted(self.affected_items)))
        object.__setattr__(self, 'details', tuple(sorted(self.details.items())) if isinstance(self.details, dict) else tuple(self.details))


@dataclass
class CheckResult:
    check_name: str
    passed: bool
    issues: List[ConnectivityIssue] = field(default_factory=list)
    summary: Dict = field(default_factory=dict)


class TopologyChecker:
    def __init__(self, graph: TopologyGraph):
        self.graph = graph
        self._previous_result: Optional[Dict] = None

    def check_isolated_nodes(self) -> CheckResult:
        isolated = self.graph.get_isolated_nodes()
        issues = []
        for node in isolated:
            issues.append(ConnectivityIssue(
                issue_type="isolated_node",
                severity="warning",
                description=f"节点 {node.node_id} ({node.name}) 是孤立节点，无任何边连接",
                affected_items=[node.node_id],
                details={"layer": node.layer}
            ))
        return CheckResult(
            check_name="isolated_nodes",
            passed=len(isolated) == 0,
            issues=issues,
            summary={"count": len(isolated)}
        )

    def check_reversed_edges(self) -> CheckResult:
        reversed_edges = self.graph.get_reversed_edges()
        issues = []
        for edge in reversed_edges:
            issues.append(ConnectivityIssue(
                issue_type="reversed_edge",
                severity="error",
                description=f"边 {edge.edge_id} 是反向边，可能导致路径阻断",
                affected_items=[edge.edge_id, edge.from_node, edge.to_node],
                details={"from": edge.from_node, "to": edge.to_node}
            ))
        return CheckResult(
            check_name="reversed_edges",
            passed=len(reversed_edges) == 0,
            issues=issues,
            summary={"count": len(reversed_edges)}
        )

    def check_cross_layer_edges(self) -> CheckResult:
        cross_edges = self.graph.get_cross_layer_edges()
        issues = []
        for edge, from_layer, to_layer in cross_edges:
            issues.append(ConnectivityIssue(
                issue_type="cross_layer_edge",
                severity="warning",
                description=f"边 {edge.edge_id} 跨层连接: {from_layer} -> {to_layer}",
                affected_items=[edge.edge_id, edge.from_node, edge.to_node],
                details={"from_layer": from_layer, "to_layer": to_layer}
            ))
        return CheckResult(
            check_name="cross_layer_edges",
            passed=len(cross_edges) == 0,
            issues=issues,
            summary={"count": len(cross_edges)}
        )

    def check_path_connectivity(self, use_accessible: bool = False) -> CheckResult:
        components = self.graph.get_connected_components(use_accessible=use_accessible)
        issues = []
        
        sorted_components = sorted(components, key=lambda c: (-len(c), min(c) if c else ""))
        
        if len(sorted_components) > 1:
            for i, comp in enumerate(sorted_components):
                sorted_comp = sorted(comp)
                issues.append(ConnectivityIssue(
                    issue_type="disconnected_component",
                    severity="error",
                    description=f"存在不连通子图 #{i+1}，包含 {len(comp)} 个节点",
                    affected_items=list(sorted_comp),
                    details={"component_size": len(comp), "nodes": sorted_comp}
                ))
        
        return CheckResult(
            check_name="path_connectivity",
            passed=len(sorted_components) == 1,
            issues=issues,
            summary={
                "component_count": len(sorted_components),
                "component_sizes": [len(c) for c in sorted_components]
            }
        )

    def check_accessibility_impact(self) -> CheckResult:
        changes = self.graph.get_accessibility_changes()
        issues = []
        
        if changes["nodes"] or changes["edges"]:
            prev_components = self._previous_result.get("components", []) if self._previous_result else []
            curr_components = self.graph.get_connected_components(use_accessible=True)
            
            impacted_paths = self._find_impacted_paths(changes)
            
            issues.append(ConnectivityIssue(
                issue_type="accessibility_impact",
                severity="info",
                description=f"无障碍标签变更影响分析",
                affected_items=changes["nodes"] + changes["edges"],
                details={
                    "changed_nodes": changes["nodes"],
                    "changed_edges": changes["edges"],
                    "impacted_paths": impacted_paths
                }
            ))
        
        return CheckResult(
            check_name="accessibility_impact",
            passed=True,
            issues=issues,
            summary={
                "changed_nodes": len(changes["nodes"]),
                "changed_edges": len(changes["edges"])
            }
        )

    def _find_impacted_paths(self, changes: Dict[str, List[str]]) -> List[Dict]:
        impacted = []
        
        for node_id in changes["nodes"]:
            node = self.graph.nodes[node_id]
            if node.accessible is not None:
                impacted.append({
                    "type": "node",
                    "id": node_id,
                    "accessible": node.accessible
                })
        
        for edge_id in changes["edges"]:
            edge = self.graph.edges[edge_id]
            if edge.accessible is not None:
                impacted.append({
                    "type": "edge",
                    "id": edge_id,
                    "accessible": edge.accessible,
                    "from": edge.from_node,
                    "to": edge.to_node
                })
        
        return impacted

    def run_all_checks(self, use_accessible: bool = False) -> Dict[str, CheckResult]:
        results = {}
        results["isolated_nodes"] = self.check_isolated_nodes()
        results["reversed_edges"] = self.check_reversed_edges()
        results["cross_layer_edges"] = self.check_cross_layer_edges()
        results["path_connectivity"] = self.check_path_connectivity(use_accessible=use_accessible)
        
        if self._previous_result:
            results["accessibility_impact"] = self.check_accessibility_impact()
        
        self._previous_result = {
            "components": self.graph.get_connected_components(use_accessible=use_accessible)
        }
        
        return results

    def compare_with_previous(self, previous: Dict[str, CheckResult], use_accessible: bool = False) -> Dict:
        current = self.run_all_checks(use_accessible=use_accessible)
        diff = {}
        
        for check_name, curr_result in current.items():
            prev_result = previous.get(check_name)
            if prev_result:
                prev_issue_keys = set((i.issue_type, i.description) for i in prev_result.issues)
                curr_issue_keys = set((i.issue_type, i.description) for i in curr_result.issues)
                
                new_keys = curr_issue_keys - prev_issue_keys
                resolved_keys = prev_issue_keys - curr_issue_keys
                
                new_issues = [i for i in curr_result.issues if (i.issue_type, i.description) in new_keys]
                resolved_issues = [i for i in prev_result.issues if (i.issue_type, i.description) in resolved_keys]
                
                diff[check_name] = {
                    "previous_passed": prev_result.passed,
                    "current_passed": curr_result.passed,
                    "changed": prev_result.passed != curr_result.passed or bool(new_issues) or bool(resolved_issues),
                    "new_issues": new_issues,
                    "resolved_issues": resolved_issues
                }
        
        return diff
