"""
数据加载模块
负责加载航线节点和航班频次数据
"""
import pandas as pd
import os
from typing import Tuple, Dict, Any

from config import Config

class DataLoader:
    def __init__(self, node_file: str = None, flight_file: str = None):
        self.node_file = node_file or Config.NODE_FILE
        self.flight_file = flight_file or Config.FLIGHT_FILE
        self.nodes_df = None
        self.flights_df = None
    
    def load_nodes(self) -> pd.DataFrame:
        """
        加载航线节点数据
        期望列: airport_code, airport_name, city, province, capacity, is_international
        """
        if not os.path.exists(self.node_file):
            raise FileNotFoundError(f"节点数据文件不存在: {self.node_file}")
        
        self.nodes_df = pd.read_excel(self.node_file)
        self._validate_nodes()
        return self.nodes_df
    
    def load_flights(self) -> pd.DataFrame:
        """
        加载航班频次数据
        期望列: flight_number, origin, destination, frequency, aircraft_type, distance, avg_delay
        """
        if not os.path.exists(self.flight_file):
            raise FileNotFoundError(f"航班数据文件不存在: {self.flight_file}")
        
        self.flights_df = pd.read_excel(self.flight_file)
        self._validate_flights()
        return self.flights_df
    
    def _validate_nodes(self):
        """验证节点数据完整性"""
        required_columns = ["airport_code", "airport_name", "capacity"]
        missing = [col for col in required_columns if col not in self.nodes_df.columns]
        if missing:
            raise ValueError(f"节点数据缺少必要列: {missing}")
        
        duplicates = self.nodes_df[self.nodes_df.duplicated("airport_code", keep=False)]
        if not duplicates.empty:
            print(f"警告: 发现 {len(duplicates)} 条重复的机场代码记录")
    
    def _validate_flights(self):
        """验证航班数据完整性"""
        required_columns = ["origin", "destination", "frequency"]
        missing = [col for col in required_columns if col not in self.flights_df.columns]
        if missing:
            raise ValueError(f"航班数据缺少必要列: {missing}")
    
    def load_all(self) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """加载所有数据"""
        return self.load_nodes(), self.load_flights()
    
    def get_data_summary(self) -> Dict[str, Any]:
        """获取数据摘要"""
        summary = {}
        if self.nodes_df is not None:
            summary["nodes"] = {
                "count": len(self.nodes_df),
                "columns": list(self.nodes_df.columns),
                "missing_capacity": self.nodes_df["capacity"].isna().sum()
            }
        if self.flights_df is not None:
            summary["flights"] = {
                "count": len(self.flights_df),
                "unique_routes": len(self.flights_df[["origin", "destination"]].drop_duplicates()),
                "total_frequency": self.flights_df["frequency"].sum()
            }
        return summary
