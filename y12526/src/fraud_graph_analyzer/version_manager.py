"""数据版本管理和标签口径追踪"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional, Set, Tuple
from uuid import uuid4

from .models import (
    Community,
    CorrectionRecord,
    CorrectionType,
    GraphNode,
    RiskTag,
    TraversalResult,
)


@dataclass
class TagVersionDiff:
    """标签版本差异"""
    version_from: str
    version_to: str
    added_tags: List[str] = field(default_factory=list)
    removed_tags: List[str] = field(default_factory=list)
    modified_tags: List[str] = field(default_factory=list)


@dataclass
class VersionImpact:
    """版本影响分析"""
    affected_nodes: List[str] = field(default_factory=list)
    affected_traversals: List[str] = field(default_factory=list)
    affected_communities: List[str] = field(default_factory=list)
    risk_level_changes: Dict[str, Tuple[str, str]] = field(default_factory=dict)


class VersionManager:
    """版本管理器"""
    
    def __init__(self):
        self.tag_versions: Dict[str, List[RiskTag]] = {}
        self.traversal_versions: Dict[str, List[TraversalResult]] = {}
        self.community_versions: Dict[str, List[Community]] = {}
        self.correction_history: List[CorrectionRecord] = []
        self._current_version: str = "v1.0"
    
    @property
    def current_version(self) -> str:
        """获取当前版本"""
        return self._current_version
    
    def register_tag_version(self, version: str, tags: List[RiskTag]) -> None:
        """注册标签版本"""
        self.tag_versions[version] = tags
        if version > self._current_version:
            self._current_version = version
    
    def get_tags_by_version(self, version: str) -> List[RiskTag]:
        """获取指定版本的标签"""
        return self.tag_versions.get(version, [])
    
    def compare_tag_versions(self, version_from: str, version_to: str) -> TagVersionDiff:
        """比较两个标签版本的差异"""
        tags_from = {t.name: t for t in self.get_tags_by_version(version_from)}
        tags_to = {t.name: t for t in self.get_tags_by_version(version_to)}
        
        diff = TagVersionDiff(version_from=version_from, version_to=version_to)
        
        all_names = set(tags_from.keys()) | set(tags_to.keys())
        for name in all_names:
            if name not in tags_from and name in tags_to:
                diff.added_tags.append(name)
            elif name in tags_from and name not in tags_to:
                diff.removed_tags.append(name)
            elif tags_from[name].level != tags_to[name].level:
                diff.modified_tags.append(name)
        
        return diff
    
    def analyze_version_impact(
        self,
        version_from: str,
        version_to: str,
        nodes: Dict[str, GraphNode],
        traversals: Dict[str, TraversalResult],
        communities: List[Community],
    ) -> VersionImpact:
        """分析版本变更的影响"""
        diff = self.compare_tag_versions(version_from, version_to)
        impact = VersionImpact()
        
        affected_tag_names = set(diff.added_tags + diff.removed_tags + diff.modified_tags)
        
        for node_id, node in nodes.items():
            node_tag_names = {t.name for t in node.risk_tags}
            if node_tag_names & affected_tag_names:
                impact.affected_nodes.append(node_id)
                old_level = self._get_node_risk_level(node, version_from)
                new_level = self._get_node_risk_level(node, version_to)
                if old_level != new_level:
                    impact.risk_level_changes[node_id] = (old_level, new_level)
        
        for traversal_id, traversal in traversals.items():
            if traversal.tag_version == version_from:
                traversal_nodes = set(traversal.visited_nodes)
                if traversal_nodes & set(impact.affected_nodes):
                    impact.affected_traversals.append(traversal_id)
        
        for community in communities:
            if community.tag_version == version_from:
                community_nodes = set(community.node_ids)
                if community_nodes & set(impact.affected_nodes):
                    impact.affected_communities.append(community.community_id)
        
        return impact
    
    def _get_node_risk_level(self, node: GraphNode, version: str) -> str:
        """获取节点在指定版本的风险等级"""
        version_tags = {t.name: t.level for t in self.get_tags_by_version(version)}
        levels = []
        for tag in node.risk_tags:
            if tag.name in version_tags:
                levels.append(version_tags[tag.name])
        
        if "high" in levels:
            return "high"
        if "medium" in levels:
            return "medium"
        if "low" in levels:
            return "low"
        return "none"
    
    def record_correction(
        self,
        correction_type: CorrectionType,
        target_id: str,
        target_type: str,
        before_value: any,
        after_value: any,
        reason: str,
        operator: str,
        affected_traversals: Optional[List[str]] = None,
    ) -> CorrectionRecord:
        """记录人工修正"""
        record = CorrectionRecord(
            correction_type=correction_type,
            target_id=target_id,
            target_type=target_type,
            before_value=before_value,
            after_value=after_value,
            reason=reason,
            operator=operator,
            affected_traversals=affected_traversals or [],
        )
        self.correction_history.append(record)
        return record
    
    def get_correction_history(
        self,
        target_id: Optional[str] = None,
        correction_type: Optional[CorrectionType] = None,
    ) -> List[CorrectionRecord]:
        """获取修正历史"""
        history = self.correction_history
        if target_id:
            history = [h for h in history if h.target_id == target_id]
        if correction_type:
            history = [h for h in history if h.correction_type == correction_type]
        return history
    
    def get_traversal_diff(
        self,
        traversal_id: str,
        before_version: str,
        after_version: str,
        traversal_store: Dict[str, TraversalResult],
    ) -> Dict:
        """获取遍历在不同版本下的差异"""
        before_traversals = self.traversal_versions.get(before_version, [])
        after_traversals = self.traversal_versions.get(after_version, [])
        
        before = next((t for t in before_traversals if t.traversal_id == traversal_id), None)
        after = next((t for t in after_traversals if t.traversal_id == traversal_id), None)
        
        if not before or not after:
            return {}
        
        return {
            "traversal_id": traversal_id,
            "before_risk_level": before.risk_level,
            "after_risk_level": after.risk_level,
            "before_is_flagged": before.is_flagged,
            "after_is_flagged": after.is_flagged,
            "node_count_change": len(after.visited_nodes) - len(before.visited_nodes),
            "edge_count_change": len(after.visited_edges) - len(before.visited_edges),
        }
