"""数据模型定义"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any, List
from uuid import uuid4


class NodeType(str, Enum):
    """节点类型"""
    ACCOUNT = "account"
    ADDRESS = "address"
    DEVICE = "device"
    IP = "ip"
    PHONE = "phone"


class EdgeType(str, Enum):
    """关系类型"""
    REGISTERED_AT = "registered_at"
    USED_DEVICE = "used_device"
    LOGGED_IN_FROM = "logged_in_from"
    LINKED_PHONE = "linked_phone"
    TRANSACTED_WITH = "transacted_with"
    SHARED_ADDRESS = "shared_address"


class RiskLevel(str, Enum):
    """风险等级"""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    NONE = "none"


class CorrectionType(str, Enum):
    """人工修正类型"""
    FALSE_POSITIVE = "false_positive"
    LABEL_UPDATE = "label_update"
    EDGE_REMOVAL = "edge_removal"
    EDGE_ADD = "edge_add"


@dataclass
class VersionedValue:
    """带版本追踪的值"""
    current_value: Any
    original_value: Any
    version: str = "v1.0"
    updated_at: datetime = field(default_factory=datetime.now)
    updated_by: Optional[str] = None


@dataclass
class RiskTag:
    """风险标签"""
    name: str
    level: RiskLevel
    tag_id: str = field(default_factory=lambda: str(uuid4()))
    description: str = ""
    tag_version: str = "v1.0"
    created_at: datetime = field(default_factory=datetime.now)
    is_active: bool = True


@dataclass
class GraphNode:
    """图节点"""
    node_id: str
    node_type: NodeType
    properties: Dict[str, Any] = field(default_factory=dict)
    risk_tags: List[RiskTag] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    is_artificial: bool = False
    
    def get_risk_level(self) -> RiskLevel:
        """获取节点风险等级"""
        if not self.risk_tags:
            return RiskLevel.NONE
        levels = [tag.level for tag in self.risk_tags if tag.is_active]
        if RiskLevel.HIGH in levels:
            return RiskLevel.HIGH
        if RiskLevel.MEDIUM in levels:
            return RiskLevel.MEDIUM
        if RiskLevel.LOW in levels:
            return RiskLevel.LOW
        return RiskLevel.NONE


@dataclass
class GraphEdge:
    """图边"""
    source_id: str
    target_id: str
    edge_type: EdgeType
    edge_id: str = field(default_factory=lambda: str(uuid4()))
    properties: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    is_stale: bool = False
    is_manual: bool = False
    
    def get_staleness_days(self, reference_date: Optional[datetime] = None) -> int:
        """获取边的陈旧天数"""
        if reference_date is None:
            reference_date = datetime.now()
        last_update = self.properties.get("last_verified", self.updated_at)
        if isinstance(last_update, str):
            last_update = datetime.fromisoformat(last_update)
        return (reference_date - last_update).days


@dataclass
class CorrectionRecord:
    """人工修正记录"""
    correction_type: CorrectionType
    target_id: str
    target_type: str
    before_value: Any
    after_value: Any
    reason: str
    operator: str
    correction_id: str = field(default_factory=lambda: str(uuid4()))
    created_at: datetime = field(default_factory=datetime.now)
    affected_traversals: List[str] = field(default_factory=list)


@dataclass
class TraversalResult:
    """图遍历结果"""
    start_node_id: str
    path: List[str]
    visited_nodes: List[str]
    visited_edges: List[str]
    risk_level: RiskLevel
    traversal_id: str = field(default_factory=lambda: str(uuid4()))
    community_id: Optional[str] = None
    tag_version: str = "v1.0"
    created_at: datetime = field(default_factory=datetime.now)
    is_flagged: bool = False
    notes: str = ""


@dataclass
class Community:
    """社群"""
    node_ids: List[str] = field(default_factory=list)
    edge_ids: List[str] = field(default_factory=list)
    community_id: str = field(default_factory=lambda: str(uuid4()))
    risk_score: float = 0.0
    detected_at: datetime = field(default_factory=datetime.now)
    tag_version: str = "v1.0"
    is_verified: bool = False
