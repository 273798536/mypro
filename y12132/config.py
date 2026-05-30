"""
配置管理模块
"""
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
OUTPUT_DIR = os.path.join(BASE_DIR, "output")
REPORT_DIR = os.path.join(BASE_DIR, "reports")

for dir_path in [DATA_DIR, OUTPUT_DIR, REPORT_DIR]:
    os.makedirs(dir_path, exist_ok=True)

class Config:
    NODE_FILE = os.path.join(DATA_DIR, "nodes.xlsx")
    FLIGHT_FILE = os.path.join(DATA_DIR, "flights.xlsx")
    MERGED_FILE = os.path.join(OUTPUT_DIR, "merged_network.xlsx")
    BOTTLENECK_FILE = os.path.join(OUTPUT_DIR, "bottleneck_analysis.xlsx")
    PROPAGATION_FILE = os.path.join(OUTPUT_DIR, "delay_propagation.xlsx")
    
    CENTRALITY_METRICS = [
        "degree",
        "betweenness",
        "closeness",
        "eigenvector"
    ]
    
    BOTTLENECK_THRESHOLD = {
        "high_betweenness": 0.1,
        "low_capacity_ratio": 0.7,
        "high_delay_propagation": 3
    }
    
    REPORT_TEMPLATE = os.path.join(BASE_DIR, "templates", "report_template.html")
