from typing import Dict, List, Set, Tuple, Optional
from dataclasses import dataclass, field
from .graph_model import TopologyGraph, Node, Edge, Issue, IssueType, EdgeDirection
from .connectivity_audit import AuditReport


@dataclass
class ChangeItem:
    change_type: str
    item_type: str
    item_id: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    details: Dict = field(default_factory=dict)


@dataclass
class ChangeReport:
    old_report: Optional[AuditReport] = None
    new_report: Optional[AuditReport] = None
    node_changes: List[ChangeItem] = field(default_factory=list)
    edge_changes: List[ChangeItem] = field(default_factory=list)
    issue_changes: List[ChangeItem] = field(default_factory=list)
    breakpoints: List[Dict] = field(default_factory=list)
    path_changes: List[Dict] = field(default_factory=dict)


class ChangeDetector:
    def __init__(self, old_graph: TopologyGraph, new_graph: TopologyGraph):
        self.old_graph = old_graph
        self.new_graph = new_graph
        self.change_report = ChangeReport()
    
    def compare_graphs(self, old_report: Optional[AuditReport] = None, 
                       new_report: Optional[AuditReport] = None) -> ChangeReport:
        self.change_report.old_report = old_report
        self.change_report.new_report = new_report
        
        self._compare_nodes()
        self._compare_edges()
        self._detect_breakpoints()
        self._compare_paths(old_report, new_report)
        self._compare_issues(old_report, new_report)
        
        return self.change_report
    
    def _compare_nodes(self):
        old_node_ids = set(self.old_graph.nodes.keys())
        new_node_ids = set(self.new_graph.nodes.keys())
        
        added = new_node_ids - old_node_ids
        removed = old_node_ids - new_node_ids
        common = old_node_ids & new_node_ids
        
        for node_id in added:
            node = self.new_graph.get_node(node_id)
            self.change_report.node_changes.append(ChangeItem(
                change_type="added",
                item_type="node",
                item_id=node_id,
                new_value=node.name if node else node_id,
                details={
                    "layer": node.layer if node else "",
                    "source": "节点列表对比"
                }
            ))
        
        for node_id in removed:
            node = self.old_graph.get_node(node_id)
            self.change_report.node_changes.append(ChangeItem(
                change_type="removed",
                item_type="node",
                item_id=node_id,
                old_value=node.name if node else node_id,
                details={
                    "layer": node.layer if node else "",
                    "source": "节点列表对比"
                }
            ))
        
        for node_id in common:
            old_node = self.old_graph.get_node(node_id)
            new_node = self.new_graph.get_node(node_id)
            if old_node and new_node:
                if old_node.layer != new_node.layer:
                    self.change_report.node_changes.append(ChangeItem(
                        change_type="modified",
                        item_type="node",
                        item_id=node_id,
                        old_value=f"layer: {old_node.layer}",
                        new_value=f"layer: {new_node.layer}",
                        details={
                            "field": "layer",
                            "source": "节点属性对比"
                        }
                    ))
                if old_node.name != new_node.name:
                    self.change_report.node_changes.append(ChangeItem(
                        change_type="modified",
                        item_type="node",
                        item_id=node_id,
                        old_value=old_node.name,
                        new_value=new_node.name,
                        details={
                            "field": "name",
                            "source": "节点属性对比"
                        }
                    ))
    
    def _compare_edges(self):
        old_edge_ids = set(self.old_graph.edges.keys())
        new_edge_ids = set(self.new_graph.edges.keys())
        
        added = new_edge_ids - old_edge_ids
        removed = old_edge_ids - new_edge_ids
        common = old_edge_ids & new_edge_ids
        
        for edge_id in added:
            edge = self.new_graph.get_edge(edge_id)
            if edge:
                self.change_report.edge_changes.append(ChangeItem(
                    change_type="added",
                    item_type="edge",
                    item_id=edge_id,
                    new_value=f"{edge.source} → {edge.target}",
                    details={
                        "source_node": edge.source,
                        "target_node": edge.target,
                        "direction": edge.direction.value,
                        "source": "边关系对比"
                    }
                ))
        
        for edge_id in removed:
            edge = self.old_graph.get_edge(edge_id)
            if edge:
                self.change_report.edge_changes.append(ChangeItem(
                    change_type="removed",
                    item_type="edge",
                    item_id=edge_id,
                    old_value=f"{edge.source} → {edge.target}",
                    details={
                        "source_node": edge.source,
                        "target_node": edge.target,
                        "direction": edge.direction.value,
                        "source": "边关系对比"
                    }
                ))
        
        for edge_id in common:
            old_edge = self.old_graph.get_edge(edge_id)
            new_edge = self.new_graph.get_edge(edge_id)
            if old_edge and new_edge:
                if old_edge.direction != new_edge.direction:
                    self.change_report.edge_changes.append(ChangeItem(
                        change_type="modified",
                        item_type="edge",
                        item_id=edge_id,
                        old_value=f"direction: {old_edge.direction.value}",
                        new_value=f"direction: {new_edge.direction.value}",
                        details={
                            "field": "direction",
                            "source": "边属性对比"
                        }
                    ))
                if old_edge.source != new_edge.source or old_edge.target != new_edge.target:
                    self.change_report.edge_changes.append(ChangeItem(
                        change_type="modified",
                        item_type="edge",
                        item_id=edge_id,
                        old_value=f"{old_edge.source} → {old_edge.target}",
                        new_value=f"{new_edge.source} → {new_edge.target}",
                        details={
                            "field": "connection",
                            "source": "边属性对比"
                        }
                    ))
    
    def _detect_breakpoints(self):
        old_nodes = set(self.old_graph.nodes.keys())
        new_nodes = set(self.new_graph.nodes.keys())
        common_nodes = old_nodes & new_nodes
        
        for node in common_nodes:
            old_out = set(self.old_graph.G.successors(node))
            new_out = set(self.new_graph.G.successors(node))
            lost_connections = old_out - new_out
            for target in lost_connections:
                edge = self.old_graph.get_edge_by_nodes(node, target)
                self.change_report.breakpoints.append({
                    "type": "lost_connection",
                    "node": node,
                    "disconnected_from": target,
                    "edge_id": edge.id if edge else None,
                    "message": f"节点 {node} 失去了到 {target} 的连接",
                    "source": "断点检测"
                })
            
            old_in = set(self.old_graph.G.predecessors(node))
            new_in = set(self.new_graph.G.predecessors(node))
            lost_incoming = old_in - new_in
            for source in lost_incoming:
                edge = self.old_graph.get_edge_by_nodes(source, node)
                self.change_report.breakpoints.append({
                    "type": "lost_incoming",
                    "node": node,
                    "disconnected_from": source,
                    "edge_id": edge.id if edge else None,
                    "message": f"节点 {node} 失去了来自 {source} 的连接",
                    "source": "断点检测"
                })
    
    def _compare_paths(self, old_report: Optional[AuditReport], new_report: Optional[AuditReport]):
        if not old_report or not new_report:
            return
        
        old_paths = {(pr.path[0], pr.path[-1]): pr for pr in old_report.path_results if pr.path}
        new_paths = {(pr.path[0], pr.path[-1]): pr for pr in new_report.path_results if pr.path}
        
        all_pairs = set(old_paths.keys()) | set(new_paths.keys())
        
        for pair in all_pairs:
            start, end = pair
            old_path_result = old_paths.get(pair)
            new_path_result = new_paths.get(pair)
            
            change_info = {
                "start": start,
                "end": end,
                "change_type": "",
                "old_path": old_path_result.path if old_path_result else [],
                "new_path": new_path_result.path if new_path_result else [],
                "source": "路径变更对比"
            }
            
            if old_path_result and not new_path_result:
                change_info["change_type"] = "path_lost"
                change_info["message"] = f"从 {start} 到 {end} 的路径已断开"
            elif not old_path_result and new_path_result:
                change_info["change_type"] = "path_created"
                change_info["message"] = f"从 {start} 到 {end} 建立了新路径"
            elif old_path_result and new_path_result:
                if old_path_result.path != new_path_result.path:
                    change_info["change_type"] = "path_modified"
                    change_info["message"] = f"从 {start} 到 {end} 的路径发生变化"
                else:
                    continue
            
            self.change_report.path_changes.append(change_info)
    
    def _compare_issues(self, old_report: Optional[AuditReport], new_report: Optional[AuditReport]):
        if not old_report or not new_report:
            return
        
        def get_issue_key(issue):
            return f"{issue.type.value}|{'|'.join(issue.nodes)}|{'|'.join(issue.edges)}"
        
        old_issue_keys = {get_issue_key(issue): issue for issue in 
                          old_report.isolated_nodes + old_report.cross_layer_mismatches +
                          old_report.direction_reversals + old_report.broken_paths}
        new_issue_keys = {get_issue_key(issue): issue for issue in
                          new_report.isolated_nodes + new_report.cross_layer_mismatches +
                          new_report.direction_reversals + new_report.broken_paths}
        
        old_keys = set(old_issue_keys.keys())
        new_keys = set(new_issue_keys.keys())
        
        resolved = old_keys - new_keys
        introduced = new_keys - old_keys
        
        for key in resolved:
            issue = old_issue_keys[key]
            self.change_report.issue_changes.append(ChangeItem(
                change_type="resolved",
                item_type="issue",
                item_id=key,
                old_value=issue.message,
                details={
                    "issue_type": issue.type.value,
                    "severity": issue.severity,
                    "source": "问题变更对比"
                }
            ))
        
        for key in introduced:
            issue = new_issue_keys[key]
            self.change_report.issue_changes.append(ChangeItem(
                change_type="introduced",
                item_type="issue",
                item_id=key,
                new_value=issue.message,
                details={
                    "issue_type": issue.type.value,
                    "severity": issue.severity,
                    "source": "问题变更对比"
                }
            ))
