import json
import os
from typing import Tuple, Dict, Any, List
from ..models import (
    CampusGraph,
    Node,
    Edge,
    Barrier,
    AccessibilityIssue,
    ManualEdit,
)


class DataLoader:
    def __init__(self):
        self.load_errors: List[Dict[str, Any]] = []
        self.load_warnings: List[Dict[str, Any]] = []

    def load_from_file(self, filepath: str) -> CampusGraph:
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Data file not found: {filepath}")

        with open(filepath, "r", encoding="utf-8") as f:
            raw_content = f.read()
            lines = raw_content.split("\n")

        try:
            data = json.loads(raw_content)
        except json.JSONDecodeError as e:
            error_info = {
                "type": "json_parse_error",
                "message": f"JSON解析错误: {str(e)}",
                "line": e.lineno,
                "column": e.colno,
                "source_file": filepath,
            }
            self.load_errors.append(error_info)
            raise

        graph = CampusGraph()
        source_file = os.path.basename(filepath)

        if "nodes" in data:
            for idx, node_data in enumerate(data["nodes"]):
                try:
                    source_line = self._find_line_for_item(lines, node_data, "node_id")
                    node = Node.from_dict(node_data, source_file=source_file, source_line=source_line)
                    graph.add_node(node)
                except Exception as e:
                    self.load_errors.append({
                        "type": "node_load_error",
                        "item_index": idx,
                        "item_id": node_data.get("node_id", "unknown"),
                        "message": str(e),
                        "source_file": source_file,
                    })

        if "edges" in data:
            for idx, edge_data in enumerate(data["edges"]):
                try:
                    source_line = self._find_line_for_item(lines, edge_data, "edge_id")
                    edge = Edge.from_dict(edge_data, source_file=source_file, source_line=source_line)
                    graph.add_edge(edge)
                except Exception as e:
                    self.load_errors.append({
                        "type": "edge_load_error",
                        "item_index": idx,
                        "item_id": edge_data.get("edge_id", "unknown"),
                        "message": str(e),
                        "source_file": source_file,
                    })

        if "barriers" in data:
            for idx, barrier_data in enumerate(data["barriers"]):
                try:
                    source_line = self._find_line_for_item(lines, barrier_data, "barrier_id")
                    barrier = Barrier.from_dict(barrier_data, source_file=source_file, source_line=source_line)
                    graph.add_barrier(barrier)
                except Exception as e:
                    self.load_errors.append({
                        "type": "barrier_load_error",
                        "item_index": idx,
                        "item_id": barrier_data.get("barrier_id", "unknown"),
                        "message": str(e),
                        "source_file": source_file,
                    })

        if "accessibility_issues" in data:
            for idx, issue_data in enumerate(data["accessibility_issues"]):
                try:
                    source_line = self._find_line_for_item(lines, issue_data, "issue_id")
                    issue = AccessibilityIssue.from_dict(issue_data, source_file=source_file, source_line=source_line)
                    graph.add_accessibility_issue(issue)
                except Exception as e:
                    self.load_errors.append({
                        "type": "accessibility_load_error",
                        "item_index": idx,
                        "item_id": issue_data.get("issue_id", "unknown"),
                        "message": str(e),
                        "source_file": source_file,
                    })

        edits_source = None
        if "manual_edits" in data:
            edits_source = data["manual_edits"]
        elif "edit_trail" in data and isinstance(data["edit_trail"], dict) and "edits" in data["edit_trail"]:
            edits_source = data["edit_trail"]["edits"]

        if edits_source:
            for idx, edit_data in enumerate(edits_source):
                try:
                    source_line = self._find_line_for_item(lines, edit_data, "edit_id")
                    edit = ManualEdit.from_dict(edit_data, source_file=source_file, source_line=source_line)
                    graph.add_manual_edit(edit)
                except Exception as e:
                    self.load_errors.append({
                        "type": "manual_edit_load_error",
                        "item_index": idx,
                        "item_id": edit_data.get("edit_id", "unknown"),
                        "message": str(e),
                        "source_file": source_file,
                    })

        self._validate_references(graph, source_file)
        return graph

    def _find_line_for_item(self, lines: List[str], item: Dict[str, Any], id_field: str) -> int:
        search_str = f'"{id_field}": "{item.get(id_field, "")}"'
        for i, line in enumerate(lines, 1):
            if search_str in line:
                return i
        return None

    def _validate_references(self, graph: CampusGraph, source_file: str) -> None:
        node_ids = graph.get_all_node_ids()
        edge_ids = graph.get_all_edge_ids()

        for edge in graph.edges.values():
            if edge.from_node not in node_ids:
                self.load_warnings.append({
                    "type": "edge_reference_warning",
                    "edge_id": edge.edge_id,
                    "message": f"边 {edge.edge_id} 引用不存在的起点节点 {edge.from_node}",
                    "source_file": source_file,
                    "source_line": edge.source_line,
                })
            if edge.to_node not in node_ids:
                self.load_warnings.append({
                    "type": "edge_reference_warning",
                    "edge_id": edge.edge_id,
                    "message": f"边 {edge.edge_id} 引用不存在的终点节点 {edge.to_node}",
                    "source_file": source_file,
                    "source_line": edge.source_line,
                })

        for barrier in graph.barriers.values():
            if barrier.edge_id not in edge_ids:
                self.load_warnings.append({
                    "type": "barrier_reference_warning",
                    "barrier_id": barrier.barrier_id,
                    "message": f"围挡 {barrier.barrier_id} 引用不存在的边 {barrier.edge_id}",
                    "source_file": source_file,
                    "source_line": barrier.source_line,
                })

        for issue in graph.accessibility_issues.values():
            if issue.edge_id not in edge_ids:
                self.load_warnings.append({
                    "type": "accessibility_reference_warning",
                    "issue_id": issue.issue_id,
                    "message": f"无障碍问题 {issue.issue_id} 引用不存在的边 {issue.edge_id}",
                    "source_file": source_file,
                    "source_line": issue.source_line,
                })

    def save_to_file(self, graph: CampusGraph, filepath: str) -> None:
        data = graph.to_dict()
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def get_load_report(self) -> Dict[str, Any]:
        return {
            "errors": self.load_errors,
            "warnings": self.load_warnings,
            "error_count": len(self.load_errors),
            "warning_count": len(self.load_warnings),
        }
