"""特殊场景处理 - 关系过长、设备共享误伤、标签滞后"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

from .config import get_config
from .graph_engine import GraphStore
from .models import (
    EdgeType,
    GraphEdge,
    GraphNode,
    NodeType,
    RiskLevel,
    RiskTag,
    TraversalResult,
    VersionedValue,
)
from .version_manager import VersionManager


@dataclass
class LongRelationAlert:
    """关系过长告警"""
    traversal_id: str
    path_length: int
    threshold: int
    original_path: List[str]
    current_path: List[str]
    risk_level_before: str
    risk_level_after: str
    notes: str = ""
    is_manual_override: bool = False


@dataclass
class DeviceShareAlert:
    """设备共享误伤告警"""
    device_id: str
    account_count: int
    threshold: int
    original_risk: str
    current_risk: str
    account_ids: List[str]
    notes: str = ""
    false_positive_accounts: List[str] = field(default_factory=list)
    is_manual_reviewed: bool = False


@dataclass
class StaleTagAlert:
    """标签滞后告警"""
    node_id: str
    tag_name: str
    original_level: str
    current_level: str
    days_stale: int
    threshold_days: int
    notes: str = ""
    is_manual_updated: bool = False


class SpecialCaseHandler:
    """特殊场景处理器"""
    
    def __init__(
        self,
        graph_store: GraphStore,
        version_manager: VersionManager,
    ):
        self.config = get_config()
        self.graph_store = graph_store
        self.version_manager = version_manager
        
        self.long_relation_alerts: List[LongRelationAlert] = []
        self.device_share_alerts: List[DeviceShareAlert] = []
        self.stale_tag_alerts: List[StaleTagAlert] = []
        
        self._original_values: Dict[str, VersionedValue] = {}
    
    def check_long_relations(
        self,
        traversal: TraversalResult,
    ) -> Optional[LongRelationAlert]:
        """检查关系过长"""
        threshold = self.config.graph.long_relation_threshold
        path_length = len(traversal.path)
        
        if path_length > threshold:
            original_risk = traversal.risk_level.value
            adjusted_risk = self._adjust_risk_for_long_chain(traversal)
            
            alert = LongRelationAlert(
                traversal_id=traversal.traversal_id,
                path_length=path_length,
                threshold=threshold,
                original_path=list(traversal.path),
                current_path=list(traversal.path),
                risk_level_before=original_risk,
                risk_level_after=adjusted_risk,
                notes=f"路径长度 {path_length} 超过阈值 {threshold}，风险已自动降级",
            )
            
            self.long_relation_alerts.append(alert)
            self._record_original_value(
                f"traversal_{traversal.traversal_id}_risk",
                original_risk,
                adjusted_risk,
            )
            
            return alert
        return None
    
    def _adjust_risk_for_long_chain(self, traversal: TraversalResult) -> str:
        """根据路径长度调整风险等级"""
        original_level = traversal.risk_level
        
        if original_level == RiskLevel.HIGH:
            return RiskLevel.MEDIUM.value
        elif original_level == RiskLevel.MEDIUM:
            return RiskLevel.LOW.value
        return original_level.value
    
    def check_device_sharing(
        self,
        device_id: str,
    ) -> Optional[DeviceShareAlert]:
        """检查设备共享误伤"""
        device_node = self.graph_store.get_node(device_id)
        if not device_node or device_node.node_type != NodeType.DEVICE:
            return None
        
        threshold = self.config.graph.device_share_threshold
        
        account_neighbors = []
        for neighbor_id in self.graph_store.get_neighbors(device_id):
            neighbor = self.graph_store.get_node(neighbor_id)
            if neighbor and neighbor.node_type == NodeType.ACCOUNT:
                account_neighbors.append(neighbor_id)
        
        account_count = len(account_neighbors)
        
        if account_count >= threshold:
            original_risk = device_node.get_risk_level().value
            current_risk = self._evaluate_device_share_risk(device_id, account_neighbors)
            
            alert = DeviceShareAlert(
                device_id=device_id,
                account_count=account_count,
                threshold=threshold,
                original_risk=original_risk,
                current_risk=current_risk,
                account_ids=account_neighbors,
                notes=f"设备关联 {account_count} 个账户，超过阈值 {threshold}，已标记需人工复核",
            )
            
            self.device_share_alerts.append(alert)
            self._record_original_value(
                f"device_{device_id}_risk",
                original_risk,
                current_risk,
            )
            
            return alert
        return None
    
    def _evaluate_device_share_risk(
        self,
        device_id: str,
        account_ids: List[str],
    ) -> str:
        """评估设备共享风险，考虑误伤可能"""
        high_risk_count = 0
        for account_id in account_ids:
            account = self.graph_store.get_node(account_id)
            if account and account.get_risk_level() == RiskLevel.HIGH:
                high_risk_count += 1
        
        high_risk_ratio = high_risk_count / len(account_ids) if account_ids else 0
        
        if high_risk_ratio >= 0.7:
            return RiskLevel.HIGH.value
        elif high_risk_ratio >= 0.3:
            return RiskLevel.MEDIUM.value
        return RiskLevel.LOW.value
    
    def check_stale_tags(
        self,
        node_id: str,
        days_threshold: Optional[int] = None,
    ) -> List[StaleTagAlert]:
        """检查标签滞后"""
        if days_threshold is None:
            days_threshold = self.config.graph.address_edge_staleness_days
        
        node = self.graph_store.get_node(node_id)
        if not node:
            return []
        
        alerts = []
        reference_date = datetime.now()
        
        for tag in node.risk_tags:
            if not tag.is_active:
                continue
            
            tag_age = (reference_date - tag.created_at).days
            
            if tag_age > days_threshold:
                original_level = tag.level.value
                current_level = self._adjust_stale_tag_level(tag, tag_age)
                
                alert = StaleTagAlert(
                    node_id=node_id,
                    tag_name=tag.name,
                    original_level=original_level,
                    current_level=current_level,
                    days_stale=tag_age,
                    threshold_days=days_threshold,
                    notes=f"标签 '{tag.name}' 已 {tag_age} 天未更新，超过阈值 {days_threshold} 天",
                )
                
                alerts.append(alert)
                self.stale_tag_alerts.append(alert)
                self._record_original_value(
                    f"node_{node_id}_tag_{tag.name}_level",
                    original_level,
                    current_level,
                )
        
        return alerts
    
    def _adjust_stale_tag_level(self, tag: RiskTag, days_stale: int) -> str:
        """调整陈旧标签的风险等级"""
        decay_factor = days_stale / 30
        
        if tag.level == RiskLevel.HIGH:
            if decay_factor > 2:
                return RiskLevel.LOW.value
            elif decay_factor > 1:
                return RiskLevel.MEDIUM.value
        elif tag.level == RiskLevel.MEDIUM:
            if decay_factor > 1:
                return RiskLevel.LOW.value
        
        return tag.level.value
    
    def _record_original_value(
        self,
        key: str,
        original_value: Any,
        current_value: Any,
    ) -> None:
        """记录原始值和当前值，用于复盘"""
        if key not in self._original_values:
            self._original_values[key] = VersionedValue(
                current_value=current_value,
                original_value=original_value,
            )
        else:
            self._original_values[key].current_value = current_value
            self._original_values[key].updated_at = datetime.now()
    
    def get_original_value(self, key: str) -> Optional[VersionedValue]:
        """获取原始值记录"""
        return self._original_values.get(key)
    
    def review_false_positive(
        self,
        device_id: str,
        account_id: str,
        operator: str,
        reason: str,
    ) -> bool:
        """标记设备共享误伤"""
        for alert in self.device_share_alerts:
            if alert.device_id == device_id and account_id in alert.account_ids:
                if account_id not in alert.false_positive_accounts:
                    alert.false_positive_accounts.append(account_id)
                    alert.is_manual_reviewed = True
                
                self.version_manager.record_correction(
                    correction_type="false_positive",
                    target_id=account_id,
                    target_type="account",
                    before_value="marked_risky",
                    after_value="false_positive",
                    reason=reason,
                    operator=operator,
                    affected_traversals=self._find_affected_traversals(device_id),
                )
                
                return True
        return False
    
    def _find_affected_traversals(self, node_id: str) -> List[str]:
        """查找受影响的遍历"""
        affected = []
        for traversal in self.graph_store._traverser.traversal_history.values():
            if node_id in traversal.visited_nodes:
                affected.append(traversal.traversal_id)
        return affected
    
    def get_all_alerts(self) -> Dict[str, List]:
        """获取所有告警"""
        return {
            "long_relations": self.long_relation_alerts,
            "device_shares": self.device_share_alerts,
            "stale_tags": self.stale_tag_alerts,
        }
    
    def get_audit_log(self, target_id: Optional[str] = None) -> List[Dict]:
        """获取审计日志，用于复盘"""
        logs = []
        
        for key, value in self._original_values.items():
            if target_id and target_id not in key:
                continue
            
            logs.append({
                "key": key,
                "original_value": value.original_value,
                "current_value": value.current_value,
                "version": value.version,
                "updated_at": value.updated_at.isoformat(),
                "updated_by": value.updated_by,
            })
        
        return sorted(logs, key=lambda x: x["updated_at"], reverse=True)
