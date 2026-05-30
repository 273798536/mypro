"""
延误传播分析模块
分析延误在航线网络中的传播路径和影响范围
"""
import networkx as nx
import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Any, Set
from dataclasses import dataclass, field

@dataclass
class PropagationPath:
    source_airport: str
    affected_airport: str
    delay_minutes: float
    propagation_hops: int
    affected_flights: List[Dict]
    confidence_score: float
    
    def to_dict(self) -> Dict:
        return {
            "source_airport": self.source_airport,
            "affected_airport": self.affected_airport,
            "delay_minutes": self.delay_minutes,
            "propagation_hops": self.propagation_hops,
            "affected_flights_count": len(self.affected_flights),
            "confidence_score": self.confidence_score
        }

class DelayPropagationAnalyzer:
    def __init__(self, G: nx.DiGraph, routes_df: pd.DataFrame):
        self.G = G
        self.routes_df = routes_df
        self.propagation_paths: List[PropagationPath] = []
        self.affected_airports: Dict[str, Set[str]] = {}
        self.delay_impact_scores: Dict[str, float] = {}
    
    def calculate_propagation(self, source_airport: str, 
                            initial_delay: float = 60,
                            max_hops: int = 3) -> Dict[str, Any]:
        """
        计算从指定机场出发的延误传播
        initial_delay: 初始延误（分钟）
        max_hops: 最大传播层数
        """
        if not self.G.has_node(source_airport):
            return {"error": f"机场 {source_airport} 不存在于网络中"}
        
        propagated_delays = {source_airport: initial_delay}
        visited = {source_airport: 0}
        affected = set([source_airport])
        
        for hop in range(1, max_hops + 1):
            current_delays = {}
            for airport, delay in propagated_delays.items():
                if visited.get(airport, 0) < hop:
                    for successor in self.G.successors(airport):
                        if successor not in propagated_delays:
                            edge_data = self.G.edges[airport, successor]
                            flight_freq = edge_data.get("frequency", 1)
                            avg_delay = edge_data.get("avg_delay", 0)
                            
                            propagation_factor = min(0.8, flight_freq / 50)
                            propagated_delay = delay * propagation_factor * (1 + avg_delay / 60)
                            
                            if propagated_delay > 10:
                                current_delays[successor] = max(
                                    current_delays.get(successor, 0),
                                    propagated_delay
                                )
                                affected.add(successor)
                                visited[successor] = hop
                                
                                affected_flights = self.routes_df[
                                    (self.routes_df["origin"] == airport) & 
                                    (self.routes_df["destination"] == successor)
                                ].to_dict("records")
                                
                                self.propagation_paths.append(PropagationPath(
                                    source_airport=source_airport,
                                    affected_airport=successor,
                                    delay_minutes=propagated_delay,
                                    propagation_hops=hop,
                                    affected_flights=affected_flights,
                                    confidence_score=propagation_factor
                                ))
            
            propagated_delays.update(current_delays)
            if not current_delays:
                break
        
        self.affected_airports[source_airport] = affected
        self.delay_impact_scores[source_airport] = sum(propagated_delays.values())
        
        return {
            "source_airport": source_airport,
            "initial_delay": initial_delay,
            "total_affected_airports": len(affected),
            "max_propagation_hops": max_hops,
            "propagated_delays": propagated_delays,
            "total_delay_impact": sum(propagated_delays.values()),
            "affected_by_hop": self._group_by_hops(visited)
        }
    
    def _group_by_hops(self, visited: Dict[str, int]) -> Dict[int, List[str]]:
        """按传播层数分组"""
        groups = {}
        for airport, hop in visited.items():
            if hop not in groups:
                groups[hop] = []
            groups[hop].append(airport)
        return groups
    
    def analyze_all_bottlenecks(self, bottleneck_codes: List[str], 
                               initial_delay: float = 60) -> pd.DataFrame:
        """分析所有瓶颈机场的延误传播影响"""
        results = []
        for airport in bottleneck_codes:
            if self.G.has_node(airport):
                result = self.calculate_propagation(airport, initial_delay)
                if "error" not in result:
                    results.append({
                        "airport_code": airport,
                        "affected_airports": result["total_affected_airports"],
                        "total_delay_impact": result["total_delay_impact"],
                        "max_hops_reached": max(result["affected_by_hop"].keys())
                    })
        
        return pd.DataFrame(results).sort_values("total_delay_impact", ascending=False)
    
    def identify_critical_propagation_points(self, 
                                            threshold_hops: int = 2,
                                            threshold_affected: int = 5) -> List[Dict]:
        """识别关键传播点（延误传播影响超过阈值的节点）"""
        critical_points = []
        
        for node in self.G.nodes():
            result = self.calculate_propagation(node, 60, threshold_hops)
            if "error" not in result:
                if result["total_affected_airports"] >= threshold_affected:
                    critical_points.append({
                        "airport_code": node,
                        "airport_name": self.G.nodes[node].get("airport_name", node),
                        "affected_airports": result["total_affected_airports"],
                        "total_delay_impact": result["total_delay_impact"],
                        "risk_level": "high" if result["total_affected_airports"] > 10 else "medium"
                    })
        
        return sorted(critical_points, key=lambda x: x["total_delay_impact"], reverse=True)
    
    def get_propagation_report(self) -> Dict[str, Any]:
        """获取传播分析报告"""
        return {
            "summary": {
                "total_propagation_paths": len(self.propagation_paths),
                "unique_source_airports": len(self.affected_airports),
                "average_affected_per_source": (
                    np.mean([len(v) for v in self.affected_airports.values()])
                    if self.affected_airports else 0
                )
            },
            "top_impact_airports": (
                sorted(self.delay_impact_scores.items(), key=lambda x: x[1], reverse=True)[:10]
            ),
            "propagation_paths": [p.to_dict() for p in self.propagation_paths]
        }
    
    def save_propagation_results(self, output_path: str):
        """保存传播分析结果"""
        with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
            paths_df = pd.DataFrame([p.to_dict() for p in self.propagation_paths])
            if not paths_df.empty:
                paths_df.to_excel(writer, sheet_name="propagation_paths", index=False)
            
            if self.delay_impact_scores:
                impact_df = pd.DataFrame(
                    list(self.delay_impact_scores.items()),
                    columns=["airport_code", "delay_impact_score"]
                ).sort_values("delay_impact_score", ascending=False)
                impact_df.to_excel(writer, sheet_name="delay_impact", index=False)
        
        print(f"延误传播分析结果已保存至: {output_path}")
        print(f"  - 传播路径: {len(self.propagation_paths)} 条")
        print(f"  - 影响机场: {len(self.delay_impact_scores)} 个")
