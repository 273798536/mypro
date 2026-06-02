"""分析工具核心功能 - 图表、明细和统一数据源"""

import json
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import uuid4

import pandas as pd
from pyvis.network import Network

from .config import get_config
from .graph_engine import GraphStore, GraphTraverser
from .models import Community, GraphEdge, GraphNode, RiskLevel, TraversalResult
from .version_manager import VersionManager


@dataclass
class AnalysisContext:
    """分析上下文 - 确保图表、明细、下载共用同一份数据源"""
    
    context_id: str = field(default_factory=lambda: str(uuid4()))
    created_at: datetime = field(default_factory=datetime.now)
    tag_version: str = "v1.0"
    
    nodes: Dict[str, GraphNode] = field(default_factory=dict)
    edges: Dict[str, GraphEdge] = field(default_factory=dict)
    traversals: Dict[str, TraversalResult] = field(default_factory=dict)
    communities: List[Community] = field(default_factory=list)
    
    source_timestamp: datetime = field(default_factory=datetime.now)


class FraudGraphAnalyzer:
    """欺诈图分析器"""
    
    def __init__(
        self,
        graph_store: Optional[GraphStore] = None,
        version_manager: Optional[VersionManager] = None,
    ):
        self.config = get_config()
        self.graph_store = graph_store or GraphStore()
        self.traverser = GraphTraverser(self.graph_store)
        self.version_manager = version_manager or VersionManager()
        self._contexts: Dict[str, AnalysisContext] = {}
    
    def create_analysis_context(
        self,
        node_ids: Optional[List[str]] = None,
        community_ids: Optional[List[str]] = None,
        traversal_ids: Optional[List[str]] = None,
        tag_version: Optional[str] = None,
    ) -> AnalysisContext:
        """创建分析上下文 - 统一数据源"""
        if tag_version is None:
            tag_version = self.version_manager.current_version
        
        context = AnalysisContext(tag_version=tag_version)
        
        if node_ids:
            for node_id in node_ids:
                node = self.graph_store.get_node(node_id)
                if node:
                    context.nodes[node_id] = node
                    for neighbor_id in self.graph_store.get_neighbors(node_id):
                        neighbor = self.graph_store.get_node(neighbor_id)
                        if neighbor:
                            context.nodes[neighbor_id] = neighbor
                        edge = self.graph_store.get_edge_by_nodes(node_id, neighbor_id)
                        if edge:
                            context.edges[edge.edge_id] = edge
        
        if community_ids:
            all_communities = self.traverser.detect_communities(tag_version=tag_version)
            for community in all_communities:
                if community.community_id in community_ids:
                    context.communities.append(community)
                    for node_id in community.node_ids:
                        node = self.graph_store.get_node(node_id)
                        if node:
                            context.nodes[node_id] = node
                    for edge_id in community.edge_ids:
                        edge = self.graph_store.get_edge(edge_id)
                        if edge:
                            context.edges[edge_id] = edge
        
        if traversal_ids:
            for traversal_id in traversal_ids:
                traversal = self.traverser.get_traversal_by_id(traversal_id)
                if traversal:
                    context.traversals[traversal_id] = traversal
                    for node_id in traversal.visited_nodes:
                        node = self.graph_store.get_node(node_id)
                        if node:
                            context.nodes[node_id] = node
                    for edge_id in traversal.visited_edges:
                        edge = self.graph_store.get_edge(edge_id)
                        if edge:
                            context.edges[edge_id] = edge
        
        self._contexts[context.context_id] = context
        return context
    
    def generate_network_graph(
        self,
        context: AnalysisContext,
        output_filename: Optional[str] = None,
    ) -> str:
        """生成网络图 - 使用上下文统一数据源"""
        if output_filename is None:
            output_filename = f"network_{context.context_id[:8]}.html"
        
        output_path = self.config.output_dir / "graphs" / output_filename
        
        net = Network(
            height="800px",
            width="100%",
            bgcolor="#222222",
            font_color="white",
            notebook=False,
        )
        
        color_map = {
            RiskLevel.HIGH: "#ff4444",
            RiskLevel.MEDIUM: "#ffaa00",
            RiskLevel.LOW: "#88ccff",
            RiskLevel.NONE: "#666666",
        }
        
        shape_map = {
            "account": "dot",
            "address": "square",
            "device": "triangle",
            "ip": "diamond",
            "phone": "star",
        }
        
        for node_id, node in context.nodes.items():
            risk_level = node.get_risk_level()
            color = color_map.get(risk_level, "#666666")
            shape = shape_map.get(node.node_type.value, "dot")
            title = f"{node.node_type.value}: {node_id}\nRisk: {risk_level.value}"
            
            net.add_node(
                node_id,
                label=node.properties.get("label", node_id[:8]),
                title=title,
                color=color,
                shape=shape,
                size=20 if risk_level == RiskLevel.HIGH else 15,
            )
        
        for edge_id, edge in context.edges.items():
            source = edge.source_id
            target = edge.target_id
            if source in context.nodes and target in context.nodes:
                color = "#ff0000" if edge.is_stale else "#97c2fc"
                title = f"{edge.edge_type.value}"
                if edge.is_stale:
                    title += " (STALE)"
                net.add_edge(source, target, title=title, color=color, width=2)
        
        net.set_options("""
        {
          "physics": {
            "forceAtlas2Based": {
              "gravitationalConstant": -50,
              "centralGravity": 0.01,
              "springLength": 100,
              "springConstant": 0.08
            },
            "maxVelocity": 50,
            "solver": "forceAtlas2Based",
            "timestep": 0.35,
            "stabilization": {"iterations": 150}
          }
        }
        """)
        
        net.write_html(str(output_path))
        return str(output_path)
    
    def get_node_details(
        self,
        context: AnalysisContext,
        node_id: str,
    ) -> Optional[Dict[str, Any]]:
        """获取节点明细 - 使用上下文统一数据源"""
        node = context.nodes.get(node_id)
        if not node:
            return None
        
        neighbors = []
        for neighbor_id in self.graph_store.get_neighbors(node_id):
            if neighbor_id in context.nodes:
                edge = self.graph_store.get_edge_by_nodes(node_id, neighbor_id)
                neighbors.append({
                    "node_id": neighbor_id,
                    "node_type": context.nodes[neighbor_id].node_type.value,
                    "risk_level": context.nodes[neighbor_id].get_risk_level().value,
                    "edge_type": edge.edge_type.value if edge else None,
                    "edge_stale": edge.is_stale if edge else False,
                })
        
        return {
            "node_id": node.node_id,
            "node_type": node.node_type.value,
            "risk_level": node.get_risk_level().value,
            "risk_tags": [
                {"name": tag.name, "level": tag.level.value, "version": tag.tag_version}
                for tag in node.risk_tags
            ],
            "properties": node.properties,
            "neighbors": neighbors,
            "created_at": node.created_at.isoformat(),
            "updated_at": node.updated_at.isoformat(),
            "original_tags": [t.name for t in node.risk_tags],
        }
    
    def export_to_csv(
        self,
        context: AnalysisContext,
        output_prefix: Optional[str] = None,
    ) -> Dict[str, str]:
        """导出CSV文件 - 使用上下文统一数据源"""
        if output_prefix is None:
            output_prefix = f"analysis_{context.context_id[:8]}"
        
        output_dir = self.config.output_dir / "reports"
        
        nodes_data = []
        for node_id, node in context.nodes.items():
            nodes_data.append({
                "node_id": node.node_id,
                "node_type": node.node_type.value,
                "risk_level": node.get_risk_level().value,
                "tag_count": len(node.risk_tags),
                "tag_names": ",".join([t.name for t in node.risk_tags]),
                "created_at": node.created_at.isoformat(),
                "updated_at": node.updated_at.isoformat(),
            })
        
        nodes_df = pd.DataFrame(nodes_data)
        nodes_path = output_dir / f"{output_prefix}_nodes.csv"
        nodes_df.to_csv(nodes_path, index=False)
        
        edges_data = []
        for edge_id, edge in context.edges.items():
            edges_data.append({
                "edge_id": edge.edge_id,
                "source_id": edge.source_id,
                "target_id": edge.target_id,
                "edge_type": edge.edge_type.value,
                "is_stale": edge.is_stale,
                "staleness_days": edge.get_staleness_days(),
                "created_at": edge.created_at.isoformat(),
                "updated_at": edge.updated_at.isoformat(),
            })
        
        edges_df = pd.DataFrame(edges_data)
        edges_path = output_dir / f"{output_prefix}_edges.csv"
        edges_df.to_csv(edges_path, index=False)
        
        traversals_data = []
        for traversal_id, traversal in context.traversals.items():
            traversals_data.append({
                "traversal_id": traversal.traversal_id,
                "start_node_id": traversal.start_node_id,
                "risk_level": traversal.risk_level.value,
                "node_count": len(traversal.visited_nodes),
                "edge_count": len(traversal.visited_edges),
                "is_flagged": traversal.is_flagged,
                "tag_version": traversal.tag_version,
                "created_at": traversal.created_at.isoformat(),
            })
        
        traversals_path = None
        if traversals_data:
            traversals_df = pd.DataFrame(traversals_data)
            traversals_path = output_dir / f"{output_prefix}_traversals.csv"
            traversals_df.to_csv(traversals_path, index=False)
        
        return {
            "nodes": str(nodes_path),
            "edges": str(edges_path),
            "traversals": str(traversals_path) if traversals_path else None,
            "context_id": context.context_id,
            "source_timestamp": context.source_timestamp.isoformat(),
        }
    
    def export_to_json(
        self,
        context: AnalysisContext,
        output_filename: Optional[str] = None,
    ) -> str:
        """导出JSON文件 - 使用上下文统一数据源"""
        if output_filename is None:
            output_filename = f"analysis_{context.context_id[:8]}.json"
        
        output_path = self.config.output_dir / "reports" / output_filename
        
        data = {
            "context_id": context.context_id,
            "tag_version": context.tag_version,
            "source_timestamp": context.source_timestamp.isoformat(),
            "generated_at": datetime.now().isoformat(),
            "nodes": [
                {
                    "node_id": n.node_id,
                    "node_type": n.node_type.value,
                    "risk_level": n.get_risk_level().value,
                    "risk_tags": [
                        {"name": t.name, "level": t.level.value, "version": t.tag_version}
                        for t in n.risk_tags
                    ],
                    "properties": n.properties,
                }
                for n in context.nodes.values()
            ],
            "edges": [
                {
                    "edge_id": e.edge_id,
                    "source_id": e.source_id,
                    "target_id": e.target_id,
                    "edge_type": e.edge_type.value,
                    "is_stale": e.is_stale,
                    "staleness_days": e.get_staleness_days(),
                }
                for e in context.edges.values()
            ],
            "traversals": [
                {
                    "traversal_id": t.traversal_id,
                    "start_node_id": t.start_node_id,
                    "path": t.path,
                    "risk_level": t.risk_level.value,
                    "is_flagged": t.is_flagged,
                }
                for t in context.traversals.values()
            ],
            "communities": [
                {
                    "community_id": c.community_id,
                    "node_count": len(c.node_ids),
                    "edge_count": len(c.edge_ids),
                    "risk_score": c.risk_score,
                    "node_ids": c.node_ids,
                }
                for c in context.communities
            ],
        }
        
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        return str(output_path)
    
    def get_context(self, context_id: str) -> Optional[AnalysisContext]:
        """获取分析上下文"""
        return self._contexts.get(context_id)
