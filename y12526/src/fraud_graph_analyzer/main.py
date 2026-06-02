"""主入口模块 - 整合所有功能"""

from typing import Optional

from .address_edge_checker import AddressEdgeChecker
from .analyzer import FraudGraphAnalyzer
from .config import get_config
from .correction_manager import CorrectionManager
from .graph_engine import GraphStore, GraphTraverser
from .models import RiskLevel
from .special_cases import SpecialCaseHandler
from .version_manager import VersionManager


class FraudGraphAnalysisTool:
    """图论社群欺诈筛查分析工具"""
    
    def __init__(self):
        self.config = get_config()
        
        self.graph_store = GraphStore()
        self.version_manager = VersionManager()
        self.traverser = GraphTraverser(self.graph_store)
        self.analyzer = FraudGraphAnalyzer(self.graph_store, self.version_manager)
        self.correction_manager = CorrectionManager(self.graph_store, self.version_manager)
        self.special_case_handler = SpecialCaseHandler(self.graph_store, self.version_manager)
        self.address_checker = AddressEdgeChecker(self.graph_store)
        
        self.correction_manager.set_traverser(self.traverser)
    
    def run_full_analysis(
        self,
        start_node_ids: Optional[list] = None,
        tag_version: Optional[str] = None,
    ) -> dict:
        """运行完整分析流程"""
        if tag_version is None:
            tag_version = self.version_manager.current_version
        
        results = {
            "tag_version": tag_version,
            "traversals": [],
            "communities": [],
            "alerts": {},
            "address_issues": {},
        }
        
        if start_node_ids:
            for node_id in start_node_ids:
                traversal = self.traverser.bfs_traverse(
                    node_id,
                    tag_version=tag_version,
                )
                results["traversals"].append({
                    "traversal_id": traversal.traversal_id,
                    "start_node": node_id,
                    "risk_level": traversal.risk_level.value,
                    "node_count": len(traversal.visited_nodes),
                    "is_flagged": traversal.is_flagged,
                })
                
                long_relation_alert = self.special_case_handler.check_long_relations(traversal)
                if long_relation_alert:
                    results["alerts"].setdefault("long_relations", []).append({
                        "traversal_id": traversal.traversal_id,
                        "path_length": long_relation_alert.path_length,
                        "threshold": long_relation_alert.threshold,
                    })
        
        communities = self.traverser.detect_communities(tag_version=tag_version)
        results["communities"] = [
            {
                "community_id": c.community_id,
                "node_count": len(c.node_ids),
                "edge_count": len(c.edge_ids),
                "risk_score": c.risk_score,
            }
            for c in communities
        ]
        
        device_nodes = [
            nid for nid, n in self.graph_store.nodes.items()
            if n.node_type.value == "device"
        ]
        for device_id in device_nodes:
            device_alert = self.special_case_handler.check_device_sharing(device_id)
            if device_alert:
                results["alerts"].setdefault("device_shares", []).append({
                    "device_id": device_id,
                    "account_count": device_alert.account_count,
                    "threshold": device_alert.threshold,
                    "current_risk": device_alert.current_risk,
                })
        
        address_suggestions = self.address_checker.get_batch_suggestions()
        results["address_issues"] = {
            "total_issues": address_suggestions["total_issues"],
            "missing_address_count": address_suggestions["missing_address_count"],
            "stale_address_count": address_suggestions["stale_address_count"],
            "high_priority_count": address_suggestions["high_priority_count"],
        }
        
        return results
    
    def quick_start_demo(self):
        """快速启动演示"""
        print("=" * 60)
        print("图论社群欺诈筛查分析工具 - 演示模式")
        print("=" * 60)
        
        print("\n[1] 正在加载样例数据...")
        sample_data = self._load_sample_data()
        print(f"   - 加载 {sample_data['node_count']} 个节点")
        print(f"   - 加载 {sample_data['edge_count']} 条边")
        
        print("\n[2] 运行完整分析...")
        high_risk_nodes = [
            nid for nid, n in self.graph_store.nodes.items()
            if n.get_risk_level() == RiskLevel.HIGH
        ]
        results = self.run_full_analysis(start_node_ids=high_risk_nodes[:2])
        
        print(f"   - 执行 {len(results['traversals'])} 次图遍历")
        print(f"   - 发现 {len(results['communities'])} 个社群")
        
        print("\n[3] 分析结果摘要:")
        print(f"   - 高风险遍历: {sum(1 for t in results['traversals'] if t['is_flagged'])}")
        print(f"   - 高风险社群: {sum(1 for c in results['communities'] if c['risk_score'] > 0.5)}")
        
        print("\n[4] 特殊场景告警:")
        alerts = results.get("alerts", {})
        print(f"   - 关系过长: {len(alerts.get('long_relations', []))} 条")
        print(f"   - 设备共享: {len(alerts.get('device_shares', []))} 条")
        
        print("\n[5] 地址边问题:")
        addr = results.get("address_issues", {})
        print(f"   - 缺失地址边: {addr.get('missing_address_count', 0)} 个账户")
        print(f"   - 陈旧地址边: {addr.get('stale_address_count', 0)} 条")
        print(f"   - 高优先级修复: {addr.get('high_priority_count', 0)} 项")
        
        print("\n" + "=" * 60)
        print("演示完成! 输出文件位于 output/ 目录")
        print("=" * 60)
        
        return results
    
    def _load_sample_data(self) -> dict:
        """加载样例数据"""
        from datetime import datetime, timedelta
        
        from .models import EdgeType, GraphEdge, GraphNode, NodeType, RiskTag
        
        accounts = [
            ("acc_001", "张三", [("fraud_confirmed", RiskLevel.HIGH)]),
            ("acc_002", "李四", [("suspicious_activity", RiskLevel.MEDIUM)]),
            ("acc_003", "王五", []),
            ("acc_004", "赵六", [("money_laundering", RiskLevel.HIGH)]),
            ("acc_005", "钱七", []),
            ("acc_006", "孙八", []),
            ("acc_007", "周九", [("device_sharing", RiskLevel.MEDIUM)]),
        ]
        
        for acc_id, label, tags in accounts:
            risk_tags = [
                RiskTag(name=t, level=l, tag_version="v1.0")
                for t, l in tags
            ]
            node = GraphNode(
                node_id=acc_id,
                node_type=NodeType.ACCOUNT,
                properties={"label": label, "name": label},
                risk_tags=risk_tags,
            )
            self.graph_store.add_node(node)
        
        addresses = [
            ("addr_001", "北京市朝阳区xxx路1号"),
            ("addr_002", "上海市浦东新区xxx路2号"),
            ("addr_003", "广州市天河区xxx路3号"),
        ]
        
        for addr_id, label in addresses:
            node = GraphNode(
                node_id=addr_id,
                node_type=NodeType.ADDRESS,
                properties={"label": label},
            )
            self.graph_store.add_node(node)
        
        devices = [
            ("dev_001", "iPhone 14"),
            ("dev_002", "MacBook Pro"),
            ("dev_003", "Android Phone"),
        ]
        
        for dev_id, label in devices:
            node = GraphNode(
                node_id=dev_id,
                node_type=NodeType.DEVICE,
                properties={"label": label},
            )
            self.graph_store.add_node(node)
        
        edges_data = [
            ("acc_001", "addr_001", EdgeType.REGISTERED_AT),
            ("acc_002", "addr_001", EdgeType.SHARED_ADDRESS),
            ("acc_004", "addr_002", EdgeType.REGISTERED_AT),
            ("acc_001", "dev_001", EdgeType.USED_DEVICE),
            ("acc_002", "dev_001", EdgeType.USED_DEVICE),
            ("acc_003", "dev_001", EdgeType.USED_DEVICE),
            ("acc_007", "dev_001", EdgeType.USED_DEVICE),
            ("acc_004", "dev_002", EdgeType.USED_DEVICE),
            ("acc_005", "dev_002", EdgeType.USED_DEVICE),
            ("acc_001", "acc_004", EdgeType.TRANSACTED_WITH),
            ("acc_002", "acc_003", EdgeType.TRANSACTED_WITH),
            ("acc_005", "acc_006", EdgeType.TRANSACTED_WITH),
        ]
        
        now = datetime.now()
        stale_date = now - timedelta(days=10)
        
        for i, (src, tgt, etype) in enumerate(edges_data):
            is_stale = i == 0
            last_verified = stale_date if is_stale else now
            
            edge = GraphEdge(
                source_id=src,
                target_id=tgt,
                edge_type=etype,
                properties={"last_verified": last_verified.isoformat()},
                is_stale=is_stale,
            )
            self.graph_store.add_edge(edge)
        
        return {
            "node_count": len(self.graph_store.nodes),
            "edge_count": len(self.graph_store.edges),
        }
