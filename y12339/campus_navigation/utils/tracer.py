from typing import Dict, List, Any, Optional
from ..models import (
    CampusGraph,
    Node,
    Edge,
    NavigationResult,
    TraceEntry,
    RouteSegment,
)


class Tracer:
    def __init__(self, graph: CampusGraph):
        self.graph = graph
        self.trace_entries: List[TraceEntry] = []

    def trace_node_to_result(self, node_id: str, result: NavigationResult) -> List[TraceEntry]:
        traces = []
        node = self.graph.get_node(node_id)
        if not node:
            return traces

        traces.append(TraceEntry(
            source_type="node",
            source_id=node_id,
            source_name=node.name,
            target_type="navigation_result",
            target_id=result.request_id,
            target_name=f"导航请求 {result.request_id}",
            relationship="节点参与导航计算",
            metadata={"node_position": node.x, "node_y": node.y},
        ))

        if node_id in result.node_sequence:
            position = result.node_sequence.index(node_id)
            traces.append(TraceEntry(
                source_type="node",
                source_id=node_id,
                source_name=node.name,
                target_type="route_sequence",
                target_id=f"pos_{position}",
                target_name=f"路线位置 {position}",
                relationship="节点在路线序列中",
                metadata={"sequence_position": position},
            ))

        for segment in result.route_segments:
            if segment.from_node == node_id or segment.to_node == node_id:
                edge = self.graph.get_edge(segment.edge_id)
                traces.append(TraceEntry(
                    source_type="node",
                    source_id=node_id,
                    source_name=node.name,
                    target_type="edge",
                    target_id=segment.edge_id,
                    target_name=edge.description if edge else segment.edge_id,
                    relationship="节点连接到边",
                    metadata={
                        "edge_length": segment.length,
                        "edge_direction": segment.direction,
                        "source_file": edge.source_file if edge else None,
                        "source_line": edge.source_line if edge else None,
                    },
                ))

        self.trace_entries.extend(traces)
        return traces

    def trace_result_to_edge_lengths(self, result: NavigationResult) -> List[Dict[str, Any]]:
        edge_lengths = []
        for i, segment in enumerate(result.route_segments):
            edge = self.graph.get_edge(segment.edge_id)
            from_node = self.graph.get_node(segment.from_node)
            to_node = self.graph.get_node(segment.to_node)

            edge_lengths.append({
                "segment_index": i,
                "edge_id": segment.edge_id,
                "from_node_id": segment.from_node,
                "from_node_name": from_node.name if from_node else segment.from_node,
                "to_node_id": segment.to_node,
                "to_node_name": to_node.name if to_node else segment.to_node,
                "reported_length": segment.length,
                "actual_edge_length": edge.length if edge else None,
                "length_match": edge.length == segment.length if edge else False,
                "edge_source_file": edge.source_file if edge else None,
                "edge_source_line": edge.source_line if edge else None,
                "direction": segment.direction,
            })

            if edge:
                trace = TraceEntry(
                    source_type="navigation_result",
                    source_id=result.request_id,
                    source_name=f"导航请求 {result.request_id}",
                    target_type="edge",
                    target_id=segment.edge_id,
                    target_name=edge.description or segment.edge_id,
                    relationship="路线使用边",
                    metadata={
                        "segment_index": i,
                        "edge_length": edge.length,
                        "segment_length": segment.length,
                    },
                )
                self.trace_entries.append(trace)

        return edge_lengths

    def trace_edge_length_to_result(self, edge_id: str, result: NavigationResult) -> Optional[TraceEntry]:
        edge = self.graph.get_edge(edge_id)
        if not edge:
            return None

        for i, segment in enumerate(result.route_segments):
            if segment.edge_id == edge_id:
                trace = TraceEntry(
                    source_type="edge",
                    source_id=edge_id,
                    source_name=edge.description or edge_id,
                    target_type="navigation_result",
                    target_id=result.request_id,
                    target_name=f"导航请求 {result.request_id}",
                    relationship="边被路线使用",
                    metadata={
                        "segment_index": i,
                        "edge_length": edge.length,
                        "segment_length": segment.length,
                        "from_node": segment.from_node,
                        "to_node": segment.to_node,
                        "source_file": edge.source_file,
                        "source_line": edge.source_line,
                    },
                )
                self.trace_entries.append(trace)
                return trace

        return None

    def trace_reverse(self, target_type: str, target_id: str) -> List[TraceEntry]:
        results = []
        for trace in self.trace_entries:
            if trace.target_type == target_type and trace.target_id == target_id:
                results.append(trace)
        return results

    def verify_edge_length_consistency(self, result: NavigationResult) -> Dict[str, Any]:
        inconsistencies = []
        total_reported = 0.0
        total_actual = 0.0

        for segment in result.route_segments:
            edge = self.graph.get_edge(segment.edge_id)
            if not edge:
                inconsistencies.append({
                    "edge_id": segment.edge_id,
                    "issue": "边不存在于图中",
                    "reported_length": segment.length,
                })
                continue

            total_reported += segment.length
            total_actual += edge.length

            if edge.length != segment.length:
                inconsistencies.append({
                    "edge_id": segment.edge_id,
                    "issue": "边长度不一致",
                    "reported_length": segment.length,
                    "actual_length": edge.length,
                    "difference": segment.length - edge.length,
                    "source_file": edge.source_file,
                    "source_line": edge.source_line,
                })

        return {
            "total_reported_distance": total_reported,
            "total_actual_distance": total_actual,
            "total_distance_match": abs(total_reported - result.total_distance) < 0.01,
            "result_total_distance": result.total_distance,
            "inconsistencies": inconsistencies,
            "inconsistency_count": len(inconsistencies),
        }

    def get_all_traces(self) -> List[TraceEntry]:
        return self.trace_entries

    def clear_traces(self) -> None:
        self.trace_entries = []
