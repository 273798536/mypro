"""图遍历核心引擎"""

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional, Set, Tuple
from uuid import uuid4

import networkx as nx

from .config import get_config
from .models import (
    Community,
    EdgeType,
    GraphEdge,
    GraphNode,
    NodeType,
    RiskLevel,
    TraversalResult,
)


class GraphStore:
    """图数据存储"""
    
    def __init__(self):
        self.nodes: Dict[str, GraphNode] = {}
        self.edges: Dict[str, GraphEdge] = {}
        self._nx_graph = nx.Graph()
        self._edge_lookup: Dict[Tuple[str, str], str] = {}
    
    def add_node(self, node: GraphNode) -> None:
        """添加节点"""
        self.nodes[node.node_id] = node
        self._nx_graph.add_node(
            node.node_id,
            type=node.node_type.value,
            risk_level=node.get_risk_level().value,
        )
    
    def add_edge(self, edge: GraphEdge) -> None:
        """添加边"""
        self.edges[edge.edge_id] = edge
        key = tuple(sorted([edge.source_id, edge.target_id]))
        self._edge_lookup[key] = edge.edge_id
        self._nx_graph.add_edge(
            edge.source_id,
            edge.target_id,
            type=edge.edge_type.value,
            is_stale=edge.is_stale,
        )
    
    def get_node(self, node_id: str) -> Optional[GraphNode]:
        """获取节点"""
        return self.nodes.get(node_id)
    
    def get_edge(self, edge_id: str) -> Optional[GraphEdge]:
        """获取边"""
        return self.edges.get(edge_id)
    
    def get_edge_by_nodes(self, source_id: str, target_id: str) -> Optional[GraphEdge]:
        """通过两端节点获取边"""
        key = tuple(sorted([source_id, target_id]))
        edge_id = self._edge_lookup.get(key)
        return self.edges.get(edge_id) if edge_id else None
    
    def get_neighbors(self, node_id: str) -> List[str]:
        """获取邻居节点"""
        if node_id not in self._nx_graph:
            return []
        return list(self._nx_graph.neighbors(node_id))
    
    def get_connected_components(self) -> List[Set[str]]:
        """获取连通分量"""
        return list(nx.connected_components(self._nx_graph))
    
    def update_node(self, node_id: str, **kwargs) -> Optional[GraphNode]:
        """更新节点"""
        node = self.nodes.get(node_id)
        if not node:
            return None
        for key, value in kwargs.items():
            if hasattr(node, key):
                setattr(node, key, value)
        node.updated_at = datetime.now()
        self._nx_graph.nodes[node_id]["risk_level"] = node.get_risk_level().value
        return node
    
    def remove_edge(self, edge_id: str) -> bool:
        """移除边"""
        edge = self.edges.get(edge_id)
        if not edge:
            return False
        key = tuple(sorted([edge.source_id, edge.target_id]))
        self._edge_lookup.pop(key, None)
        self._nx_graph.remove_edge(edge.source_id, edge.target_id)
        del self.edges[edge_id]
        return True


class GraphTraverser:
    """图遍历器"""
    
    def __init__(self, graph_store: GraphStore):
        self.graph_store = graph_store
        self.config = get_config()
        self.traversal_history: Dict[str, TraversalResult] = {}
    
    def bfs_traverse(
        self,
        start_node_id: str,
        max_depth: Optional[int] = None,
        tag_version: str = "v1.0",
    ) -> TraversalResult:
        """广度优先遍历"""
        if max_depth is None:
            max_depth = self.config.graph.max_path_length
        
        start_node = self.graph_store.get_node(start_node_id)
        if not start_node:
            raise ValueError(f"节点不存在: {start_node_id}")
        
        visited_nodes: Set[str] = set()
        visited_edges: Set[str] = set()
        path: List[str] = [start_node_id]
        
        queue = deque([(start_node_id, 0)])
        visited_nodes.add(start_node_id)
        
        while queue:
            current_id, depth = queue.popleft()
            
            if depth >= max_depth:
                continue
            
            for neighbor_id in self.graph_store.get_neighbors(current_id):
                if neighbor_id not in visited_nodes:
                    edge = self.graph_store.get_edge_by_nodes(current_id, neighbor_id)
                    if edge and not edge.is_stale:
                        visited_nodes.add(neighbor_id)
                        visited_edges.add(edge.edge_id)
                        queue.append((neighbor_id, depth + 1))
        
        path = list(visited_nodes)
        risk_level = self._calculate_path_risk(visited_nodes)
        
        result = TraversalResult(
            start_node_id=start_node_id,
            path=path,
            visited_nodes=list(visited_nodes),
            visited_edges=list(visited_edges),
            risk_level=risk_level,
            tag_version=tag_version,
            is_flagged=risk_level in [RiskLevel.HIGH, RiskLevel.MEDIUM],
        )
        
        self.traversal_history[result.traversal_id] = result
        return result
    
    def find_risk_paths(
        self,
        start_node_id: str,
        target_risk: RiskLevel = RiskLevel.HIGH,
        max_depth: Optional[int] = None,
    ) -> List[List[str]]:
        """查找风险路径"""
        if max_depth is None:
            max_depth = self.config.graph.max_path_length
        
        paths: List[List[str]] = []
        start_node = self.graph_store.get_node(start_node_id)
        
        if not start_node:
            return paths
        
        def dfs(current_id: str, path: List[str], visited: Set[str], depth: int):
            if depth > max_depth:
                return
            
            current_node = self.graph_store.get_node(current_id)
            if current_node and current_node.get_risk_level() == target_risk:
                if len(path) > 1:
                    paths.append(list(path))
            
            for neighbor_id in self.graph_store.get_neighbors(current_id):
                if neighbor_id not in visited:
                    edge = self.graph_store.get_edge_by_nodes(current_id, neighbor_id)
                    if edge and not edge.is_stale:
                        visited.add(neighbor_id)
                        path.append(neighbor_id)
                        dfs(neighbor_id, path, visited, depth + 1)
                        path.pop()
        
        dfs(start_node_id, [start_node_id], {start_node_id}, 0)
        return paths
    
    def detect_communities(
        self,
        tag_version: str = "v1.0",
    ) -> List[Community]:
        """检测社群"""
        communities: List[Community] = []
        components = self.graph_store.get_connected_components()
        
        min_size = self.config.graph.min_community_size
        max_size = self.config.graph.max_community_size
        
        for component in components:
            if min_size <= len(component) <= max_size:
                node_ids = list(component)
                edge_ids = self._collect_edges(node_ids)
                risk_score = self._calculate_community_risk(node_ids)
                
                community = Community(
                    node_ids=node_ids,
                    edge_ids=edge_ids,
                    risk_score=risk_score,
                    tag_version=tag_version,
                )
                communities.append(community)
        
        communities.sort(key=lambda c: c.risk_score, reverse=True)
        return communities
    
    def _calculate_path_risk(self, node_ids: Set[str]) -> RiskLevel:
        """计算路径风险等级"""
        risk_levels: List[RiskLevel] = []
        for node_id in node_ids:
            node = self.graph_store.get_node(node_id)
            if node:
                risk_levels.append(node.get_risk_level())
        
        if RiskLevel.HIGH in risk_levels:
            return RiskLevel.HIGH
        if RiskLevel.MEDIUM in risk_levels:
            return RiskLevel.MEDIUM
        if RiskLevel.LOW in risk_levels:
            return RiskLevel.LOW
        return RiskLevel.NONE
    
    def _calculate_community_risk(self, node_ids: List[str]) -> float:
        """计算社群风险分数"""
        if not node_ids:
            return 0.0
        
        total = 0.0
        for node_id in node_ids:
            node = self.graph_store.get_node(node_id)
            if node:
                level = node.get_risk_level()
                if level == RiskLevel.HIGH:
                    total += 1.0
                elif level == RiskLevel.MEDIUM:
                    total += 0.5
                elif level == RiskLevel.LOW:
                    total += 0.2
        
        return total / len(node_ids)
    
    def _collect_edges(self, node_ids: List[str]) -> List[str]:
        """收集社群内的边"""
        edge_ids: Set[str] = set()
        node_set = set(node_ids)
        
        for i, node_id in enumerate(node_ids):
            for neighbor_id in self.graph_store.get_neighbors(node_id):
                if neighbor_id in node_set:
                    edge = self.graph_store.get_edge_by_nodes(node_id, neighbor_id)
                    if edge:
                        edge_ids.add(edge.edge_id)
        
        return list(edge_ids)
    
    def get_traversal_by_id(self, traversal_id: str) -> Optional[TraversalResult]:
        """根据ID获取遍历结果"""
        return self.traversal_history.get(traversal_id)
