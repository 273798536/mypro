import os
from typing import Dict, List, Any, Optional, Tuple
from ..models import (
    CampusGraph,
    Node,
    Edge,
    Barrier,
    AccessibilityIssue,
    NavigationResult,
    RouteSegment,
)


class SVGExporter:
    def __init__(self, graph: CampusGraph):
        self.graph = graph
        self.margin = 50
        self.node_radius = 12
        self.scale = 1.5

    def _calculate_bounds(self) -> Tuple[float, float, float, float]:
        if not self.graph.nodes:
            return (0, 0, 500, 500)

        xs = [node.x for node in self.graph.nodes.values()]
        ys = [node.y for node in self.graph.nodes.values()]

        min_x = min(xs) - self.margin
        max_x = max(xs) + self.margin
        min_y = min(ys) - self.margin
        max_y = max(ys) + self.margin

        return (min_x, min_y, max_x, max_y)

    def _transform_coords(self, x: float, y: float, bounds: Tuple[float, float, float, float]) -> Tuple[float, float]:
        min_x, min_y, max_x, max_y = bounds
        width = (max_x - min_x) * self.scale
        height = (max_y - min_y) * self.scale

        tx = (x - min_x) * self.scale
        ty = (y - min_y) * self.scale

        return (tx, ty)

    def export_map(
        self,
        output_path: str,
        result: Optional[NavigationResult] = None,
        show_accessibility: bool = True,
        show_barriers: bool = True,
        show_manual_edits: bool = True,
    ) -> Dict[str, Any]:
        bounds = self._calculate_bounds()
        min_x, min_y, max_x, max_y = bounds
        width = int((max_x - min_x) * self.scale + 2 * self.margin)
        height = int((max_y - min_y) * self.scale + 2 * self.margin)

        svg_parts: List[str] = []
        svg_parts.append(f'<?xml version="1.0" encoding="UTF-8"?>')
        svg_parts.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">')
        svg_parts.append(f'  <defs>')
        svg_parts.append(f'    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">')
        svg_parts.append(f'      <polygon points="0 0, 10 3.5, 0 7" fill="#666"/>')
        svg_parts.append(f'    </marker>')
        svg_parts.append(f'    <marker id="arrowhead-red" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">')
        svg_parts.append(f'      <polygon points="0 0, 10 3.5, 0 7" fill="#e74c3c"/>')
        svg_parts.append(f'    </marker>')
        svg_parts.append(f'    <pattern id="hatch" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">')
        svg_parts.append(f'      <line x1="0" y1="0" x2="0" y2="8" stroke="#e74c3c" stroke-width="3"/>')
        svg_parts.append(f'    </pattern>')
        svg_parts.append(f'  </defs>')

        svg_parts.append(f'  <rect width="{width}" height="{height}" fill="#f8f9fa"/>')
        svg_parts.append(f'  <text x="10" y="25" font-family="sans-serif" font-size="16" font-weight="bold" fill="#333">Dijkstra校园导航 - 地图导出</text>')

        legend_y = 50
        svg_parts.append(f'  <text x="10" y="{legend_y}" font-family="sans-serif" font-size="12" font-weight="bold" fill="#333">图例:</text>')
        legend_y += 20
        svg_parts.append(f'  <circle cx="20" cy="{legend_y-4}" r="6" fill="#3498db"/>')
        svg_parts.append(f'  <text x="35" y="{legend_y}" font-family="sans-serif" font-size="11" fill="#333">道路节点</text>')
        legend_y += 18
        svg_parts.append(f'  <line x1="10" y1="{legend_y}" x2="30" y2="{legend_y}" stroke="#27ae60" stroke-width="3"/>')
        svg_parts.append(f'  <text x="35" y="{legend_y+4}" font-family="sans-serif" font-size="11" fill="#333">导航路线</text>')
        legend_y += 18
        svg_parts.append(f'  <line x1="10" y1="{legend_y}" x2="30" y2="{legend_y}" stroke="#999" stroke-width="2"/>')
        svg_parts.append(f'  <text x="35" y="{legend_y+4}" font-family="sans-serif" font-size="11" fill="#333">普通道路</text>')
        if show_barriers:
            legend_y += 18
            svg_parts.append(f'  <line x1="10" y1="{legend_y}" x2="30" y2="{legend_y}" stroke="url(#hatch)" stroke-width="4"/>')
            svg_parts.append(f'  <text x="35" y="{legend_y+4}" font-family="sans-serif" font-size="11" fill="#333">围挡阻断</text>')
        if show_accessibility:
            legend_y += 18
            svg_parts.append(f'  <line x1="10" y1="{legend_y}" x2="30" y2="{legend_y}" stroke="#f39c12" stroke-width="3" stroke-dasharray="5,3"/>')
            svg_parts.append(f'  <text x="35" y="{legend_y+4}" font-family="sans-serif" font-size="11" fill="#333">无障碍问题</text>')
        if show_manual_edits:
            legend_y += 18
            svg_parts.append(f'  <line x1="10" y1="{legend_y}" x2="30" y2="{legend_y}" stroke="#9b59b6" stroke-width="3" stroke-dasharray="8,2"/>')
            svg_parts.append(f'  <text x="35" y="{legend_y+4}" font-family="sans-serif" font-size="11" fill="#333">人工修改边</text>')

        route_edge_ids = set()
        route_node_ids = set()
        if result:
            route_edge_ids = set(s.edge_id for s in result.route_segments)
            route_node_ids = set(result.node_sequence)

        edge_correspondence: List[Dict[str, Any]] = []
        node_correspondence: List[Dict[str, Any]] = []

        svg_parts.append(f'  <g id="edges">')
        for edge_id, edge in self.graph.edges.items():
            from_node = self.graph.get_node(edge.from_node)
            to_node = self.graph.get_node(edge.to_node)
            if not from_node or not to_node:
                continue

            x1, y1 = self._transform_coords(from_node.x, from_node.y, bounds)
            x2, y2 = self._transform_coords(to_node.x, to_node.y, bounds)

            is_in_route = edge_id in route_edge_ids
            has_barrier = any(b.is_active() for b in self.graph.get_barriers_on_edge(edge_id))
            has_accessibility_issue = any(not a.resolved for a in self.graph.get_accessibility_issues_on_edge(edge_id))
            has_manual_edit = len(self.graph.edit_trail.get_edits_for_target(edge_id)) > 0

            stroke_color = "#95a5a6"
            stroke_width = 2
            dash_array = None
            marker_end = None
            fill_pattern = None

            if is_in_route:
                stroke_color = "#27ae60"
                stroke_width = 5
            elif show_barriers and has_barrier:
                fill_pattern = "url(#hatch)"
                stroke_width = 4
            elif show_manual_edits and has_manual_edit:
                stroke_color = "#9b59b6"
                stroke_width = 3
                dash_array = "8,2"
            elif show_accessibility and has_accessibility_issue:
                stroke_color = "#f39c12"
                stroke_width = 3
                dash_array = "5,3"

            if edge.direction.value != "bidirectional":
                if edge.direction.value == "forward":
                    marker_end = "url(#arrowhead)"
                elif edge.direction.value == "backward":
                    marker_end = "url(#arrowhead-red)"

            mid_x = (x1 + x2) / 2
            mid_y = (y1 + y2) / 2

            edge_corr = {
                "edge_id": edge_id,
                "from_node": edge.from_node,
                "to_node": edge.to_node,
                "length": edge.length,
                "direction": edge.direction.value,
                "svg_path": f"M{x1},{y1} L{x2},{y2}",
                "label_position": {"x": mid_x, "y": mid_y - 10},
                "is_in_route": is_in_route,
                "has_barrier": has_barrier,
                "has_accessibility_issue": has_accessibility_issue,
                "has_manual_edit": has_manual_edit,
                "source_file": edge.source_file,
                "source_line": edge.source_line,
            }
            edge_correspondence.append(edge_corr)

            style_parts = []
            if fill_pattern:
                style_parts.append(f'stroke="{fill_pattern}"')
            else:
                style_parts.append(f'stroke="{stroke_color}"')
            style_parts.append(f'stroke-width="{stroke_width}"')
            style_parts.append('fill="none"')
            if dash_array:
                style_parts.append(f'stroke-dasharray="{dash_array}"')
            if marker_end:
                style_parts.append(f'marker-end="{marker_end}"')

            svg_parts.append(f'    <line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" {" ".join(style_parts)}/>')

            label = f"{edge.length:.0f}m"
            svg_parts.append(f'    <text x="{mid_x:.1f}" y="{mid_y-8:.1f}" font-family="sans-serif" font-size="9" fill="#666" text-anchor="middle">{label}</text>')

            if is_in_route:
                segment_idx = None
                for i, s in enumerate(result.route_segments):
                    if s.edge_id == edge_id:
                        segment_idx = i
                        break
                if segment_idx is not None:
                    svg_parts.append(f'    <text x="{mid_x:.1f}" y="{mid_y+15:.1f}" font-family="sans-serif" font-size="10" font-weight="bold" fill="#27ae60" text-anchor="middle">[{segment_idx}]</text>')

        svg_parts.append(f'  </g>')

        if show_barriers:
            svg_parts.append(f'  <g id="barriers">')
            for barrier_id, barrier in self.graph.barriers.items():
                if not barrier.is_active():
                    continue
                edge = self.graph.get_edge(barrier.edge_id)
                if not edge:
                    continue
                from_node = self.graph.get_node(edge.from_node)
                to_node = self.graph.get_node(edge.to_node)
                if not from_node or not to_node:
                    continue

                x1, y1 = self._transform_coords(from_node.x, from_node.y, bounds)
                x2, y2 = self._transform_coords(to_node.x, to_node.y, bounds)
                mid_x = (x1 + x2) / 2
                mid_y = (y1 + y2) / 2

                is_expired = barrier.is_expired()
                fill_color = "#e74c3c" if is_expired else "#f39c12"
                border_color = "#c0392b" if is_expired else "#e67e22"

                svg_parts.append(f'    <rect x="{mid_x-15}" y="{mid_y-15}" width="30" height="30" rx="4" fill="{fill_color}" stroke="{border_color}" stroke-width="2"/>')
                svg_parts.append(f'    <text x="{mid_x}" y="{mid_y+4}" font-family="sans-serif" font-size="12" font-weight="bold" fill="white" text-anchor="middle">B</text>')

                label_y = mid_y + 30
                status_text = "过期!" if is_expired else "施工中"
                svg_parts.append(f'    <text x="{mid_x}" y="{label_y}" font-family="sans-serif" font-size="9" fill="{border_color}" text-anchor="middle">{barrier_id}: {status_text}</text>')
            svg_parts.append(f'  </g>')

        if show_accessibility:
            svg_parts.append(f'  <g id="accessibility_issues">')
            for issue_id, issue in self.graph.accessibility_issues.items():
                if issue.resolved:
                    continue
                edge = self.graph.get_edge(issue.edge_id)
                if not edge:
                    continue
                from_node = self.graph.get_node(edge.from_node)
                to_node = self.graph.get_node(edge.to_node)
                if not from_node or not to_node:
                    continue

                x1, y1 = self._transform_coords(from_node.x, from_node.y, bounds)
                x2, y2 = self._transform_coords(to_node.x, to_node.y, bounds)
                mid_x = (x1 + x2) / 2
                mid_y = (y1 + y2) / 2

                severity = issue.severity
                if severity >= 4:
                    fill_color = "#e74c3c"
                    border_color = "#c0392b"
                elif severity >= 2:
                    fill_color = "#f39c12"
                    border_color = "#e67e22"
                else:
                    fill_color = "#3498db"
                    border_color = "#2980b9"

                offset_x = 20 if mid_x < width / 2 else -20
                svg_parts.append(f'    <circle cx="{mid_x+offset_x}" cy="{mid_y}" r="10" fill="{fill_color}" stroke="{border_color}" stroke-width="2"/>')
                svg_parts.append(f'    <text x="{mid_x+offset_x}" y="{mid_y+4}" font-family="sans-serif" font-size="10" font-weight="bold" fill="white" text-anchor="middle">A</text>')
            svg_parts.append(f'  </g>')

        svg_parts.append(f'  <g id="nodes">')
        for node_id, node in self.graph.nodes.items():
            x, y = self._transform_coords(node.x, node.y, bounds)

            is_in_route = node_id in route_node_ids
            is_start = result and node_id == result.start_node
            is_end = result and node_id == result.end_node

            fill_color = "#3498db"
            stroke_color = "#2980b9"
            radius = self.node_radius

            if is_start:
                fill_color = "#27ae60"
                stroke_color = "#1e8449"
                radius = 15
            elif is_end:
                fill_color = "#e74c3c"
                stroke_color = "#c0392b"
                radius = 15
            elif is_in_route:
                fill_color = "#2ecc71"
                stroke_color = "#27ae60"

            node_corr = {
                "node_id": node_id,
                "name": node.name,
                "coordinates": {"x": node.x, "y": node.y},
                "svg_position": {"x": x, "y": y},
                "is_in_route": is_in_route,
                "is_start": is_start,
                "is_end": is_end,
                "source_file": node.source_file,
                "source_line": node.source_line,
            }
            node_correspondence.append(node_corr)

            svg_parts.append(f'    <circle cx="{x:.1f}" cy="{y:.1f}" r="{radius}" fill="{fill_color}" stroke="{stroke_color}" stroke-width="2"/>')

            if is_start:
                svg_parts.append(f'    <text x="{x:.1f}" y="{y+4:.1f}" font-family="sans-serif" font-size="10" font-weight="bold" fill="white" text-anchor="middle">起</text>')
            elif is_end:
                svg_parts.append(f'    <text x="{x:.1f}" y="{y+4:.1f}" font-family="sans-serif" font-size="10" font-weight="bold" fill="white" text-anchor="middle">终</text>')

            label_y = y + radius + 15
            svg_parts.append(f'    <text x="{x:.1f}" y="{label_y:.1f}" font-family="sans-serif" font-size="10" fill="#333" text-anchor="middle">{node.name}</text>')
            svg_parts.append(f'    <text x="{x:.1f}" y="{label_y+12:.1f}" font-family="sans-serif" font-size="8" fill="#999" text-anchor="middle">{node_id}</text>')

        svg_parts.append(f'  </g>')

        if result and result.manual_edit_impacts and show_manual_edits:
            svg_parts.append(f'  <g id="manual_edits">')
            for i, impact in enumerate(result.manual_edit_impacts):
                edge = self.graph.get_edge(impact.get("edge_id") or "")
                target_id = impact.get("target_id", "")
                aff_edges = impact.get("affected_edge_ids", [])
                mid_x = None
                mid_y = None

                if edge:
                    from_node = self.graph.get_node(edge.from_node)
                    to_node = self.graph.get_node(edge.to_node)
                    if from_node and to_node:
                        x1, y1 = self._transform_coords(from_node.x, from_node.y, bounds)
                        x2, y2 = self._transform_coords(to_node.x, to_node.y, bounds)
                        mid_x = (x1 + x2) / 2
                        mid_y = (y1 + y2) / 2
                elif aff_edges:
                    ref_edge = self.graph.get_edge(aff_edges[0])
                    if ref_edge:
                        fn = self.graph.get_node(ref_edge.from_node)
                        tn = self.graph.get_node(ref_edge.to_node)
                        if fn and tn:
                            x1, y1 = self._transform_coords(fn.x, fn.y, bounds)
                            x2, y2 = self._transform_coords(tn.x, tn.y, bounds)
                            mid_x = (x1 + x2) / 2
                            mid_y = (y1 + y2) / 2 - 30
                elif target_id.startswith("B"):
                    barrier = self.graph.barriers.get(target_id)
                    if barrier:
                        ref_edge = self.graph.get_edge(barrier.edge_id)
                        if ref_edge:
                            fn = self.graph.get_node(ref_edge.from_node)
                            tn = self.graph.get_node(ref_edge.to_node)
                            if fn and tn:
                                x1, y1 = self._transform_coords(fn.x, fn.y, bounds)
                                x2, y2 = self._transform_coords(tn.x, tn.y, bounds)
                                mid_x = (x1 + x2) / 2
                                mid_y = (y1 + y2) / 2 - 30

                if mid_x is not None and mid_y is not None:
                    svg_parts.append(f'    <rect x="{mid_x-12}" y="{mid_y-25}" width="24" height="20" rx="3" fill="#9b59b6" stroke="#8e44ad" stroke-width="1"/>')
                    svg_parts.append(f'    <text x="{mid_x}" y="{mid_y-11}" font-family="sans-serif" font-size="9" font-weight="bold" fill="white" text-anchor="middle">✎{i+1}</text>')
            svg_parts.append(f'  </g>')

        svg_parts.append(f'  <g id="metadata">')
        info_y = height - 70
        svg_parts.append(f'    <rect x="10" y="{info_y}" width="{width-20}" height="60" rx="4" fill="white" stroke="#ddd" stroke-width="1"/>')
        svg_parts.append(f'    <text x="20" y="{info_y+20}" font-family="sans-serif" font-size="10" fill="#666">节点数: {len(self.graph.nodes)} | 边数: {len(self.graph.edges)} | 围挡: {len(self.graph.barriers)} | 无障碍问题: {len(self.graph.accessibility_issues)}</text>')
        if result:
            svg_parts.append(f'    <text x="20" y="{info_y+38}" font-family="sans-serif" font-size="10" fill="#666">导航路线: {result.start_node} → {result.end_node} | 距离: {result.total_distance:.1f}m | 路段: {len(result.route_segments)}</text>')
            svg_parts.append(f'    <text x="20" y="{info_y+56}" font-family="sans-serif" font-size="10" fill="#666">请求ID: {result.request_id} | 状态: {result.status.value}</text>')
        svg_parts.append(f'  </g>')

        svg_parts.append(f'</svg>')

        svg_content = "\n".join(svg_parts)

        os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(svg_content)

        correspondence = {
            "nodes": node_correspondence,
            "edges": edge_correspondence,
            "map_dimensions": {"width": width, "height": height},
            "bounds": {"min_x": min_x, "min_y": min_y, "max_x": max_x, "max_y": max_y},
            "scale": self.scale,
        }

        corr_path = output_path.replace(".svg", "_correspondence.json")
        import json
        with open(corr_path, "w", encoding="utf-8") as f:
            json.dump(correspondence, f, ensure_ascii=False, indent=2)

        return {
            "svg_file": output_path,
            "correspondence_file": corr_path,
            "correspondence": correspondence,
            "node_count": len(node_correspondence),
            "edge_count": len(edge_correspondence),
        }
