"""
数据合并与冲突检测模块
负责合并航线节点和航班频次数据，检测并展示冲突
"""
import pandas as pd
from typing import Dict, List, Tuple, Any
from dataclasses import dataclass, field

@dataclass
class Conflict:
    conflict_type: str
    airport_code: str
    field: str
    node_value: Any
    flight_value: Any
    severity: str = "medium"
    source_records: List[Dict] = field(default_factory=list)
    
    def to_dict(self) -> Dict:
        return {
            "conflict_type": self.conflict_type,
            "airport_code": self.airport_code,
            "field": self.field,
            "node_value": self.node_value,
            "flight_value": self.flight_value,
            "severity": self.severity,
            "source_records_count": len(self.source_records)
        }

class DataMerger:
    def __init__(self, nodes_df: pd.DataFrame, flights_df: pd.DataFrame):
        self.nodes_df = nodes_df
        self.flights_df = flights_df
        self.conflicts: List[Conflict] = []
        self.merged_nodes_df = None
        self.merged_routes_df = None
        self.airports_in_routes = set()
    
    def analyze(self) -> Dict[str, Any]:
        """执行完整的合并与冲突分析"""
        self._extract_airports_from_routes()
        self._detect_duplicate_nodes()
        self._detect_missing_nodes()
        self._detect_capacity_issues()
        self._merge_data()
        
        return self.get_merge_report()
    
    def _extract_airports_from_routes(self):
        """从航线中提取所有涉及的机场"""
        origins = set(self.flights_df["origin"].dropna().unique())
        destinations = set(self.flights_df["destination"].dropna().unique())
        self.airports_in_routes = origins.union(destinations)
    
    def _detect_duplicate_nodes(self):
        """检测重复的节点记录"""
        duplicates = self.nodes_df[self.nodes_df.duplicated("airport_code", keep=False)]
        for code in duplicates["airport_code"].unique():
            records = duplicates[duplicates["airport_code"] == code]
            for field in ["airport_name", "capacity", "city"]:
                if field in records.columns and records[field].nunique() > 1:
                    self.conflicts.append(Conflict(
                        conflict_type="duplicate_node",
                        airport_code=code,
                        field=field,
                        node_value=records[field].iloc[0],
                        flight_value=records[field].iloc[1],
                        severity="high",
                        source_records=records.to_dict("records")
                    ))
    
    def _detect_missing_nodes(self):
        """检测航线中存在但节点表中缺失的机场"""
        node_airports = set(self.nodes_df["airport_code"].dropna().unique())
        missing = self.airports_in_routes - node_airports
        
        for airport in missing:
            route_count = len(self.flights_df[
                (self.flights_df["origin"] == airport) | 
                (self.flights_df["destination"] == airport)
            ])
            self.conflicts.append(Conflict(
                conflict_type="missing_node",
                airport_code=airport,
                field="airport_code",
                node_value=None,
                flight_value=airport,
                severity="high",
                source_records=[{
                    "route_count": route_count,
                    "sample_routes": self.flights_df[
                        (self.flights_df["origin"] == airport) | 
                        (self.flights_df["destination"] == airport)
                    ].head(3).to_dict("records")
                }]
            ))
    
    def _detect_capacity_issues(self):
        """检测容量缺失和异常值"""
        missing_capacity = self.nodes_df[self.nodes_df["capacity"].isna()]
        for _, row in missing_capacity.iterrows():
            self.conflicts.append(Conflict(
                conflict_type="missing_capacity",
                airport_code=row["airport_code"],
                field="capacity",
                node_value=None,
                flight_value="N/A",
                severity="medium",
                source_records=[row.to_dict()]
            ))
        
        zero_capacity = self.nodes_df[self.nodes_df["capacity"] == 0]
        for _, row in zero_capacity.iterrows():
            self.conflicts.append(Conflict(
                conflict_type="zero_capacity",
                airport_code=row["airport_code"],
                field="capacity",
                node_value=0,
                flight_value="N/A",
                severity="high",
                source_records=[row.to_dict()]
            ))
    
    def _merge_data(self):
        """合并数据，保留所有冲突信息供人工处理"""
        self.merged_nodes_df = self.nodes_df.drop_duplicates("airport_code", keep=False).copy()
        
        self.merged_routes_df = self.flights_df.copy()
        self.merged_routes_df["has_conflict"] = (
            self.merged_routes_df["origin"].isin([c.airport_code for c in self.conflicts]) |
            self.merged_routes_df["destination"].isin([c.airport_code for c in self.conflicts])
        )
    
    def get_merge_report(self) -> Dict[str, Any]:
        """获取合并报告"""
        report = {
            "summary": {
                "total_nodes": len(self.nodes_df),
                "unique_nodes": len(self.nodes_df["airport_code"].unique()),
                "total_routes": len(self.flights_df),
                "airports_in_routes": len(self.airports_in_routes),
                "total_conflicts": len(self.conflicts),
                "conflicts_by_type": self._get_conflicts_by_type()
            },
            "conflicts": [c.to_dict() for c in self.conflicts],
            "high_priority_conflicts": [c.to_dict() for c in self.conflicts if c.severity == "high"]
        }
        return report
    
    def _get_conflicts_by_type(self) -> Dict[str, int]:
        """按类型统计冲突数量"""
        type_counts = {}
        for conflict in self.conflicts:
            type_counts[conflict.conflict_type] = type_counts.get(conflict.conflict_type, 0) + 1
        return type_counts
    
    def get_conflicts_dataframe(self) -> pd.DataFrame:
        """获取冲突数据的DataFrame格式"""
        return pd.DataFrame([c.to_dict() for c in self.conflicts])
    
    def save_merged_data(self, output_path: str):
        """保存合并后的数据"""
        with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
            if self.merged_nodes_df is not None:
                self.merged_nodes_df.to_excel(writer, sheet_name="nodes", index=False)
            if self.merged_routes_df is not None:
                self.merged_routes_df.to_excel(writer, sheet_name="routes", index=False)
            self.get_conflicts_dataframe().to_excel(writer, sheet_name="conflicts", index=False)
        
        print(f"合并数据已保存至: {output_path}")
        print(f"  - 节点数: {len(self.merged_nodes_df) if self.merged_nodes_df is not None else 0}")
        print(f"  - 航线条数: {len(self.merged_routes_df) if self.merged_routes_df is not None else 0}")
        print(f"  - 冲突数: {len(self.conflicts)}")
