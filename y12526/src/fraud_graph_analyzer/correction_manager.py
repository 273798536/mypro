"""人工修正和历史回溯功能"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4

from .graph_engine import GraphStore, GraphTraverser
from .models import (
    CorrectionRecord,
    CorrectionType,
    GraphEdge,
    GraphNode,
    RiskLevel,
    RiskTag,
    TraversalResult,
)
from .version_manager import VersionManager


@dataclass
class CorrectionDiff:
    """修正前后差异"""
    target_id: str
    target_type: str
    before_value: Any
    after_value: Any
    affected_traversal_count: int
    affected_community_count: int


class CorrectionManager:
    """人工修正管理器"""
    
    def __init__(
        self,
        graph_store: GraphStore,
        version_manager: VersionManager,
    ):
        self.graph_store = graph_store
        self.version_manager = version_manager
        self._traverser: Optional[GraphTraverser] = None
    
    def set_traverser(self, traverser: GraphTraverser) -> None:
        """设置遍历器"""
        self._traverser = traverser
    
    def mark_false_positive(
        self,
        node_id: str,
        operator: str,
        reason: str,
    ) -> CorrectionDiff:
        """标记误伤"""
        node = self.graph_store.get_node(node_id)
        if not node:
            raise ValueError(f"节点不存在: {node_id}")
        
        before_tags = [t.name for t in node.risk_tags if t.is_active]
        before_risk = node.get_risk_level().value
        
        for tag in node.risk_tags:
            if tag.level in [RiskLevel.HIGH, RiskLevel.MEDIUM]:
                tag.is_active = False
        
        after_tags = [t.name for t in node.risk_tags if t.is_active]
        after_risk = node.get_risk_level().value
        
        node.updated_at = datetime.now()
        
        affected_traversals = self._find_affected_traversals(node_id)
        
        record = self.version_manager.record_correction(
            correction_type=CorrectionType.FALSE_POSITIVE,
            target_id=node_id,
            target_type="node",
            before_value={"tags": before_tags, "risk_level": before_risk},
            after_value={"tags": after_tags, "risk_level": after_risk},
            reason=reason,
            operator=operator,
            affected_traversals=affected_traversals,
        )
        
        return CorrectionDiff(
            target_id=node_id,
            target_type="node",
            before_value=before_risk,
            after_value=after_risk,
            affected_traversal_count=len(affected_traversals),
            affected_community_count=self._count_affected_communities(node_id),
        )
    
    def update_risk_tag(
        self,
        node_id: str,
        tag_name: str,
        new_level: RiskLevel,
        operator: str,
        reason: str,
    ) -> CorrectionDiff:
        """更新风险标签"""
        node = self.graph_store.get_node(node_id)
        if not node:
            raise ValueError(f"节点不存在: {node_id}")
        
        tag = next((t for t in node.risk_tags if t.name == tag_name), None)
        if not tag:
            tag = RiskTag(
                name=tag_name,
                level=new_level,
                tag_version=self.version_manager.current_version,
            )
            node.risk_tags.append(tag)
            before_level = "none"
        else:
            before_level = tag.level.value
            tag.level = new_level
            tag.tag_version = self.version_manager.current_version
        
        node.updated_at = datetime.now()
        
        affected_traversals = self._find_affected_traversals(node_id)
        
        self.version_manager.record_correction(
            correction_type=CorrectionType.LABEL_UPDATE,
            target_id=node_id,
            target_type="node_tag",
            before_value=before_level,
            after_value=new_level.value,
            reason=reason,
            operator=operator,
            affected_traversals=affected_traversals,
        )
        
        return CorrectionDiff(
            target_id=node_id,
            target_type="node_tag",
            before_value=before_level,
            after_value=new_level.value,
            affected_traversal_count=len(affected_traversals),
            affected_community_count=self._count_affected_communities(node_id),
        )
    
    def remove_edge(
        self,
        edge_id: str,
        operator: str,
        reason: str,
    ) -> CorrectionDiff:
        """移除边"""
        edge = self.graph_store.get_edge(edge_id)
        if not edge:
            raise ValueError(f"边不存在: {edge_id}")
        
        before_edge = {
            "source": edge.source_id,
            "target": edge.target_id,
            "type": edge.edge_type.value,
        }
        
        affected_traversals = self._find_affected_traversals_by_edge(edge_id)
        
        self.graph_store.remove_edge(edge_id)
        
        self.version_manager.record_correction(
            correction_type=CorrectionType.EDGE_REMOVAL,
            target_id=edge_id,
            target_type="edge",
            before_value=before_edge,
            after_value=None,
            reason=reason,
            operator=operator,
            affected_traversals=affected_traversals,
        )
        
        return CorrectionDiff(
            target_id=edge_id,
            target_type="edge",
            before_value=before_edge,
            after_value=None,
            affected_traversal_count=len(affected_traversals),
            affected_community_count=0,
        )
    
    def add_edge(
        self,
        source_id: str,
        target_id: str,
        edge_type: Any,
        operator: str,
        reason: str,
        properties: Optional[Dict] = None,
    ) -> CorrectionDiff:
        """添加边"""
        if not self.graph_store.get_node(source_id):
            raise ValueError(f"源节点不存在: {source_id}")
        if not self.graph_store.get_node(target_id):
            raise ValueError(f"目标节点不存在: {target_id}")
        
        edge = GraphEdge(
            source_id=source_id,
            target_id=target_id,
            edge_type=edge_type,
            properties=properties or {},
            is_manual=True,
        )
        
        self.graph_store.add_edge(edge)
        
        affected_traversals = self._find_affected_traversals(source_id)
        affected_traversals.extend(self._find_affected_traversals(target_id))
        affected_traversals = list(set(affected_traversals))
        
        self.version_manager.record_correction(
            correction_type=CorrectionType.EDGE_ADD,
            target_id=edge.edge_id,
            target_type="edge",
            before_value=None,
            after_value={
                "source": source_id,
                "target": target_id,
                "type": edge_type.value,
            },
            reason=reason,
            operator=operator,
            affected_traversals=affected_traversals,
        )
        
        return CorrectionDiff(
            target_id=edge.edge_id,
            target_type="edge",
            before_value=None,
            after_value={"source": source_id, "target": target_id},
            affected_traversal_count=len(affected_traversals),
            affected_community_count=0,
        )
    
    def _find_affected_traversals(self, node_id: str) -> List[str]:
        """查找受影响的遍历"""
        if not self._traverser:
            return []
        
        affected = []
        for traversal_id, traversal in self._traverser.traversal_history.items():
            if node_id in traversal.visited_nodes:
                affected.append(traversal_id)
        return affected
    
    def _find_affected_traversals_by_edge(self, edge_id: str) -> List[str]:
        """通过边查找受影响的遍历"""
        if not self._traverser:
            return []
        
        affected = []
        for traversal_id, traversal in self._traverser.traversal_history.items():
            if edge_id in traversal.visited_edges:
                affected.append(traversal_id)
        return affected
    
    def _count_affected_communities(self, node_id: str) -> int:
        """统计受影响的社群数量"""
        if not self._traverser:
            return 0
        
        communities = self._traverser.detect_communities()
        count = 0
        for community in communities:
            if node_id in community.node_ids:
                count += 1
        return count
    
    def get_correction_history(
        self,
        target_id: Optional[str] = None,
        operator: Optional[str] = None,
    ) -> List[Dict]:
        """获取修正历史"""
        history = self.version_manager.get_correction_history()
        
        if target_id:
            history = [h for h in history if h.target_id == target_id]
        if operator:
            history = [h for h in history if h.operator == operator]
        
        return [
            {
                "correction_id": h.correction_id,
                "type": h.correction_type.value,
                "target_id": h.target_id,
                "target_type": h.target_type,
                "before": h.before_value,
                "after": h.after_value,
                "reason": h.reason,
                "operator": h.operator,
                "created_at": h.created_at.isoformat(),
                "affected_traversals": h.affected_traversals,
            }
            for h in history
        ]
    
    def get_traversal_state_diff(
        self,
        traversal_id: str,
    ) -> Dict:
        """获取遍历的状态变化差异"""
        if not self._traverser:
            return {}
        
        traversal = self._traverser.get_traversal_by_id(traversal_id)
        if not traversal:
            return {}
        
        corrections = self.version_manager.get_correction_history()
        relevant_corrections = [
            c for c in corrections
            if traversal_id in c.affected_traversals
        ]
        
        original_risk = traversal.risk_level.value
        current_risk = self._recalculate_traversal_risk(traversal)
        
        return {
            "traversal_id": traversal_id,
            "original_risk_level": original_risk,
            "current_risk_level": current_risk,
            "original_flagged": traversal.is_flagged,
            "current_flagged": current_risk in ["high", "medium"],
            "correction_count": len(relevant_corrections),
            "corrections": [
                {
                    "type": c.correction_type.value,
                    "target_id": c.target_id,
                    "before": c.before_value,
                    "after": c.after_value,
                    "operator": c.operator,
                    "reason": c.reason,
                }
                for c in relevant_corrections
            ],
        }
    
    def _recalculate_traversal_risk(self, traversal: TraversalResult) -> str:
        """重新计算遍历的风险等级"""
        risk_levels = []
        for node_id in traversal.visited_nodes:
            node = self.graph_store.get_node(node_id)
            if node:
                risk_levels.append(node.get_risk_level().value)
        
        if "high" in risk_levels:
            return "high"
        if "medium" in risk_levels:
            return "medium"
        if "low" in risk_levels:
            return "low"
        return "none"
    
    def get_node_history(self, node_id: str) -> Dict:
        """获取节点的完整历史记录"""
        node = self.graph_store.get_node(node_id)
        if not node:
            return {}
        
        corrections = self.version_manager.get_correction_history(target_id=node_id)
        
        return {
            "node_id": node_id,
            "current_state": {
                "type": node.node_type.value,
                "risk_level": node.get_risk_level().value,
                "tags": [
                    {"name": t.name, "level": t.level.value, "active": t.is_active}
                    for t in node.risk_tags
                ],
            },
            "correction_history": [
                {
                    "type": c.correction_type.value,
                    "before": c.before_value,
                    "after": c.after_value,
                    "reason": c.reason,
                    "operator": c.operator,
                    "created_at": c.created_at.isoformat(),
                }
                for c in corrections
            ],
        }
