"""地址边缺失检查和可操作提示"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from .config import get_config
from .graph_engine import GraphStore
from .models import EdgeType, GraphNode, NodeType


@dataclass
class MissingAddressEdge:
    """缺失的地址边"""
    account_id: str
    suggested_action: str
    priority: str
    reason: str
    related_nodes: List[str] = field(default_factory=list)
    estimated_impact: str = ""


@dataclass
class AddressEdgeIssue:
    """地址边问题"""
    account_id: str
    issue_type: str
    edge_id: Optional[str] = None
    staleness_days: Optional[int] = None
    suggested_fix: str = ""


class AddressEdgeChecker:
    """地址边检查器"""
    
    def __init__(self, graph_store: GraphStore):
        self.config = get_config()
        self.graph_store = graph_store
    
    def check_account_address_edges(
        self,
        account_id: str,
    ) -> Dict[str, Any]:
        """检查账户的地址边情况"""
        account = self.graph_store.get_node(account_id)
        if not account or account.node_type != NodeType.ACCOUNT:
            return {"error": "无效的账户节点"}
        
        address_edges = []
        neighbors = self.graph_store.get_neighbors(account_id)
        
        for neighbor_id in neighbors:
            edge = self.graph_store.get_edge_by_nodes(account_id, neighbor_id)
            neighbor = self.graph_store.get_node(neighbor_id)
            
            if edge and neighbor and neighbor.node_type == NodeType.ADDRESS:
                if edge.edge_type in [EdgeType.REGISTERED_AT, EdgeType.SHARED_ADDRESS]:
                    address_edges.append({
                        "edge_id": edge.edge_id,
                        "address_id": neighbor_id,
                        "edge_type": edge.edge_type.value,
                        "is_stale": edge.is_stale,
                        "staleness_days": edge.get_staleness_days(),
                        "last_verified": edge.properties.get("last_verified", str(edge.updated_at)),
                    })
        
        stale_count = sum(1 for e in address_edges if e["is_stale"])
        
        return {
            "account_id": account_id,
            "address_edge_count": len(address_edges),
            "stale_edge_count": stale_count,
            "has_address_edge": len(address_edges) > 0,
            "edges": address_edges,
            "needs_attention": len(address_edges) == 0 or stale_count > 0,
        }
    
    def find_missing_address_edges(self) -> List[MissingAddressEdge]:
        """查找缺失地址边的账户并给出可操作提示"""
        missing_edges: List[MissingAddressEdge] = []
        
        for node_id, node in self.graph_store.nodes.items():
            if node.node_type != NodeType.ACCOUNT:
                continue
            
            check_result = self.check_account_address_edges(node_id)
            
            if check_result.get("address_edge_count", 0) == 0:
                missing = self._analyze_missing_edge(node)
                missing_edges.append(missing)
        
        return sorted(
            missing_edges,
            key=lambda x: {"high": 0, "medium": 1, "low": 2}[x.priority],
        )
    
    def _analyze_missing_edge(self, account: GraphNode) -> MissingAddressEdge:
        """分析缺失地址边的情况并给出建议"""
        neighbors = self.graph_store.get_neighbors(account.node_id)
        neighbor_types = set()
        related_nodes = []
        
        for neighbor_id in neighbors:
            neighbor = self.graph_store.get_node(neighbor_id)
            if neighbor:
                neighbor_types.add(neighbor.node_type.value)
                if neighbor.node_type in [NodeType.DEVICE, NodeType.IP]:
                    related_nodes.append(neighbor_id)
        
        risk_level = account.get_risk_level().value
        
        if risk_level == "high":
            priority = "high"
            suggested_action = "立即补充地址信息 - 高风险账户必须有地址关联"
            estimated_impact = "缺失地址边可能导致高风险社群检测遗漏"
        elif risk_level == "medium":
            priority = "medium"
            suggested_action = "建议尽快补充地址信息 - 中等风险账户应有地址关联"
            estimated_impact = "缺失地址边影响风险传播路径分析"
        else:
            priority = "low"
            suggested_action = "可在下次数据更新时补充地址信息"
            estimated_impact = "对当前风险分析影响较小"
        
        reason_parts = [f"账户风险等级: {risk_level}"]
        if NodeType.DEVICE.value in neighbor_types:
            reason_parts.append("有关联设备但无地址")
        if NodeType.IP.value in neighbor_types:
            reason_parts.append("有登录IP但无地址")
        if not neighbor_types:
            reason_parts.append("账户无任何关联节点")
        
        return MissingAddressEdge(
            account_id=account.node_id,
            suggested_action=suggested_action,
            priority=priority,
            reason="; ".join(reason_parts),
            related_nodes=related_nodes[:5],
            estimated_impact=estimated_impact,
        )
    
    def find_stale_address_edges(
        self,
        days_threshold: Optional[int] = None,
    ) -> List[AddressEdgeIssue]:
        """查找陈旧的地址边"""
        if days_threshold is None:
            days_threshold = self.config.graph.address_edge_staleness_days
        
        issues: List[AddressEdgeIssue] = []
        
        for edge_id, edge in self.graph_store.edges.items():
            if edge.edge_type not in [EdgeType.REGISTERED_AT, EdgeType.SHARED_ADDRESS]:
                continue
            
            staleness_days = edge.get_staleness_days()
            
            if staleness_days > days_threshold:
                source = self.graph_store.get_node(edge.source_id)
                target = self.graph_store.get_node(edge.target_id)
                
                account_id = edge.source_id
                if source and source.node_type != NodeType.ACCOUNT:
                    account_id = edge.target_id
                
                issue = AddressEdgeIssue(
                    account_id=account_id,
                    issue_type="stale_address_edge",
                    edge_id=edge_id,
                    staleness_days=staleness_days,
                    suggested_fix=(
                        f"请验证地址信息有效性，该地址边已 {staleness_days} 天未更新 "
                        f"(阈值: {days_threshold} 天)"
                    ),
                )
                issues.append(issue)
        
        return sorted(issues, key=lambda x: x.staleness_days or 0, reverse=True)
    
    def get_actionable_suggestions(
        self,
        account_id: str,
    ) -> Dict[str, Any]:
        """获取针对特定账户的可操作建议"""
        account = self.graph_store.get_node(account_id)
        if not account or account.node_type != NodeType.ACCOUNT:
            return {"error": "无效的账户节点"}
        
        check_result = self.check_account_address_edges(account_id)
        suggestions = []
        
        if check_result.get("address_edge_count", 0) == 0:
            missing_analysis = self._analyze_missing_edge(account)
            suggestions.append({
                "type": "missing_address_edge",
                "priority": missing_analysis.priority,
                "action": missing_analysis.suggested_action,
                "reason": missing_analysis.reason,
                "impact": missing_analysis.estimated_impact,
                "steps": [
                    "1. 从CRM系统获取该账户的注册地址",
                    "2. 创建地址节点 (node_type: address)",
                    "3. 建立账户到地址的 'registered_at' 关系边",
                    "4. 设置边的 last_verified 时间为当前时间",
                ],
            })
        
        stale_edges = [e for e in check_result.get("edges", []) if e.get("is_stale")]
        for stale in stale_edges:
            suggestions.append({
                "type": "stale_address_edge",
                "priority": "medium" if stale["staleness_days"] > 7 else "low",
                "action": f"验证地址 '{stale['address_id']}' 的有效性并更新",
                "reason": f"地址边已 {stale['staleness_days']} 天未验证",
                "impact": "陈旧地址可能影响社群检测准确性",
                "edge_id": stale["edge_id"],
                "steps": [
                    "1. 核对账户最新地址信息",
                    "2. 如地址有效，更新边的 last_verified 时间",
                    "3. 如地址无效，移除该边并添加新地址边",
                ],
            })
        
        return {
            "account_id": account_id,
            "risk_level": account.get_risk_level().value,
            "suggestion_count": len(suggestions),
            "suggestions": suggestions,
        }
    
    def get_batch_suggestions(
        self,
        limit: int = 20,
        priority_filter: Optional[str] = None,
    ) -> Dict[str, Any]:
        """批量获取地址边问题和建议"""
        missing = self.find_missing_address_edges()
        stale = self.find_stale_address_edges()
        
        if priority_filter:
            missing = [m for m in missing if m.priority == priority_filter]
        
        all_suggestions = []
        
        for m in missing:
            all_suggestions.append({
                "account_id": m.account_id,
                "issue_type": "missing_address",
                "priority": m.priority,
                "action": m.suggested_action,
                "reason": m.reason,
            })
        
        for s in stale:
            priority = "high" if (s.staleness_days or 0) > 14 else "medium"
            all_suggestions.append({
                "account_id": s.account_id,
                "issue_type": "stale_address",
                "priority": priority,
                "action": s.suggested_fix,
                "staleness_days": s.staleness_days,
            })
        
        all_suggestions.sort(
            key=lambda x: {"high": 0, "medium": 1, "low": 2}[x["priority"]]
        )
        
        return {
            "total_issues": len(all_suggestions),
            "missing_address_count": len(missing),
            "stale_address_count": len(stale),
            "high_priority_count": sum(1 for s in all_suggestions if s["priority"] == "high"),
            "suggestions": all_suggestions[:limit],
        }
    
    def generate_fix_script(
        self,
        account_id: str,
        address_id: str,
        edge_type: str = "registered_at",
    ) -> str:
        """生成修复脚本"""
        script = f"""# 地址边修复脚本
# 账户: {account_id}
# 地址: {address_id}
# 关系类型: {edge_type}

from fraud_graph_analyzer import GraphStore, GraphEdge, EdgeType, datetime

graph_store = GraphStore()

# 检查地址节点是否存在
address_node = graph_store.get_node("{address_id}")
if not address_node:
    print(f"警告: 地址节点 {address_id} 不存在，请先创建")
else:
    # 创建地址边
    edge = GraphEdge(
        source_id="{account_id}",
        target_id="{address_id}",
        edge_type=EdgeType.{edge_type.upper()},
        properties={{"last_verified": datetime.now().isoformat()}},
    )
    graph_store.add_edge(edge)
    print(f"已创建地址边: {edge.edge_id}")
"""
        return script
