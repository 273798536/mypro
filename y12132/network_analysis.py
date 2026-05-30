"""
网络分析模块
负责计算网络中心性、识别瓶颈节点
"""
import networkx as nx
import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Any
from dataclasses import dataclass

from config import Config

@dataclass
class BottleneckNode:
    airport_code: str
    airport_name: str
    bottleneck_type: str
    bottleneck_score: float
    centrality_metrics: Dict[str, float]
    evidence: List[Dict]
    severity: str = "medium"
    
    def to_dict(self) -> Dict:
        result = {
            "airport_code": self.airport_code,
            "airport_name": self.airport_name,
            "bottleneck_type": self.bottleneck_type,
            "bottleneck_score": self.bottleneck_score,
            "severity": self.severity,
            "evidence_count": len(self.evidence)
        }
        result.update(self.centrality_metrics)
        return result

class NetworkAnalyzer:
    def __init__(self, nodes_df: pd.DataFrame, routes_df: pd.DataFrame):
        self.nodes_df = nodes_df
        self.routes_df = routes_df
        self.G = None
        self.centrality_df = None
        self.bottlenecks: List[BottleneckNode] = []
        self.node_traffic = {}
    
    def build_network(self) -> nx.DiGraph:
        """构建航线网络"""
        G = nx.DiGraph()
        
        for _, row in self.nodes_df.iterrows():
            node_attr = row.to_dict()
            G.add_node(row["airport_code"], **node_attr)
        
        for _, row in self.routes_df.iterrows():
            origin = row["origin"]
            dest = row["destination"]
            if G.has_node(origin) and G.has_node(dest):
                weight = row.get("frequency", 1)
                G.add_edge(origin, dest, weight=weight, **row.to_dict())
        
        self.G = G
        return G
    
    def calculate_centrality(self) -> pd.DataFrame:
        """计算各种中心性指标"""
        if self.G is None:
            self.build_network()
        
        G_undirected = self.G.to_undirected()
        
        centrality_data = []
        
        degree_cent = nx.degree_centrality(self.G)
        betweenness_cent = nx.betweenness_centrality(self.G, weight="weight")
        closeness_cent = nx.closeness_centrality(G_undirected)
        eigenvector_cent = nx.eigenvector_centrality_numpy(G_undirected, weight="weight")
        
        for node in self.G.nodes():
            node_data = self.G.nodes[node]
            centrality_data.append({
                "airport_code": node,
                "airport_name": node_data.get("airport_name", node),
                "degree_centrality": degree_cent.get(node, 0),
                "betweenness_centrality": betweenness_cent.get(node, 0),
                "closeness_centrality": closeness_cent.get(node, 0),
                "eigenvector_centrality": eigenvector_cent.get(node, 0),
                "in_degree": self.G.in_degree(node, weight="weight"),
                "out_degree": self.G.out_degree(node, weight="weight"),
                "total_degree": self.G.degree(node, weight="weight"),
                "capacity": node_data.get("capacity", 0)
            })
        
        self.centrality_df = pd.DataFrame(centrality_data)
        self._calculate_traffic_load()
        return self.centrality_df
    
    def _calculate_traffic_load(self):
        """计算每个节点的实际流量负载"""
        for node in self.G.nodes():
            in_traffic = sum([
                self.G.edges[u, node].get("weight", 1) 
                for u in self.G.predecessors(node)
            ])
            out_traffic = sum([
                self.G.edges[node, v].get("weight", 1) 
                for v in self.G.successors(node)
            ])
            total_traffic = in_traffic + out_traffic
            
            node_data = self.G.nodes[node]
            capacity = node_data.get("capacity", 0)
            capacity_ratio = total_traffic / capacity if capacity > 0 else float('inf')
            
            self.node_traffic[node] = {
                "in_traffic": in_traffic,
                "out_traffic": out_traffic,
                "total_traffic": total_traffic,
                "capacity": capacity,
                "capacity_ratio": capacity_ratio
            }
    
    def identify_bottlenecks(self, thresholds: Dict = None) -> List[BottleneckNode]:
        """识别网络瓶颈节点"""
        if self.centrality_df is None:
            self.calculate_centrality()
        
        thresholds = thresholds or Config.BOTTLENECK_THRESHOLD
        self.bottlenecks = []
        
        for _, row in self.centrality_df.iterrows():
            airport = row["airport_code"]
            traffic = self.node_traffic.get(airport, {})
            bottleneck_types = []
            evidence = []
            score = 0
            
            if row["betweenness_centrality"] >= thresholds["high_betweenness"]:
                bottleneck_types.append("high_betweenness")
                score += 3
                evidence.append({
                    "type": "high_betweenness",
                    "value": row["betweenness_centrality"],
                    "threshold": thresholds["high_betweenness"],
                    "description": f"介数中心性过高 ({row['betweenness_centrality']:.3f})，大量航线依赖此节点"
                })
            
            capacity_ratio = traffic.get("capacity_ratio", 0)
            if capacity_ratio >= thresholds["low_capacity_ratio"]:
                bottleneck_types.append("capacity_overload")
                score += 2
                evidence.append({
                    "type": "capacity_overload",
                    "value": capacity_ratio,
                    "threshold": thresholds["low_capacity_ratio"],
                    "total_traffic": traffic.get("total_traffic", 0),
                    "capacity": traffic.get("capacity", 0),
                    "description": f"容量利用率 {capacity_ratio:.1%}，超过警戒值"
                })
            
            if row["degree_centrality"] >= 0.3 and traffic.get("total_traffic", 0) > 100:
                bottleneck_types.append("high_traffic_hub")
                score += 2
                evidence.append({
                    "type": "high_traffic_hub",
                    "degree_centrality": row["degree_centrality"],
                    "total_traffic": traffic.get("total_traffic", 0),
                    "description": "高连接度枢纽，流量集中"
                })
            
            if bottleneck_types:
                severity = "high" if score >= 4 else "medium"
                self.bottlenecks.append(BottleneckNode(
                    airport_code=airport,
                    airport_name=row["airport_name"],
                    bottleneck_type=",".join(bottleneck_types),
                    bottleneck_score=score,
                    centrality_metrics={
                        "degree_centrality": row["degree_centrality"],
                        "betweenness_centrality": row["betweenness_centrality"],
                        "closeness_centrality": row["closeness_centrality"],
                        "eigenvector_centrality": row["eigenvector_centrality"]
                    },
                    evidence=evidence,
                    severity=severity
                ))
        
        self.bottlenecks.sort(key=lambda x: x.bottleneck_score, reverse=True)
        return self.bottlenecks
    
    def get_analysis_report(self) -> Dict[str, Any]:
        """获取分析报告"""
        if not self.bottlenecks:
            self.identify_bottlenecks()
        
        return {
            "network_summary": {
                "node_count": self.G.number_of_nodes() if self.G else 0,
                "edge_count": self.G.number_of_edges() if self.G else 0,
                "is_connected": nx.is_weakly_connected(self.G) if self.G else False,
                "density": nx.density(self.G) if self.G else 0
            },
            "centrality_summary": {
                "top_by_degree": self.centrality_df.nlargest(5, "degree_centrality")[
                    ["airport_code", "degree_centrality"]
                ].to_dict("records") if self.centrality_df is not None else [],
                "top_by_betweenness": self.centrality_df.nlargest(5, "betweenness_centrality")[
                    ["airport_code", "betweenness_centrality"]
                ].to_dict("records") if self.centrality_df is not None else []
            },
            "bottlenecks": {
                "total_count": len(self.bottlenecks),
                "high_severity": len([b for b in self.bottlenecks if b.severity == "high"]),
                "medium_severity": len([b for b in self.bottlenecks if b.severity == "medium"]),
                "details": [b.to_dict() for b in self.bottlenecks]
            }
        }
    
    def get_bottlenecks_dataframe(self) -> pd.DataFrame:
        """获取瓶颈节点DataFrame"""
        return pd.DataFrame([b.to_dict() for b in self.bottlenecks])
    
    def save_analysis_results(self, output_path: str):
        """保存分析结果"""
        with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
            if self.centrality_df is not None:
                self.centrality_df.to_excel(writer, sheet_name="centrality", index=False)
            self.get_bottlenecks_dataframe().to_excel(writer, sheet_name="bottlenecks", index=False)
            
            traffic_df = pd.DataFrame.from_dict(self.node_traffic, orient="index").reset_index()
            traffic_df.rename(columns={"index": "airport_code"}, inplace=True)
            traffic_df.to_excel(writer, sheet_name="traffic_load", index=False)
        
        print(f"网络分析结果已保存至: {output_path}")
        print(f"  - 中心性指标: {len(self.centrality_df) if self.centrality_df is not None else 0} 条")
        print(f"  - 瓶颈节点: {len(self.bottlenecks)} 个")
