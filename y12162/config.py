from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Dict

BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
OUTPUT_DIR = BASE_DIR / "output"
EXAMPLES_DIR = BASE_DIR / "examples"

@dataclass
class DataConfig:
    required_columns: List[str] = field(default_factory=lambda: [
        "时间", "速度", "电流", "电压", "区间", "车站", "列车号"
    ])
    
    optional_columns: List[str] = field(default_factory=lambda: [
        "坡度", "坡度版本", "运行方向", "天气", "载客量", "备注"
    ])
    
    energy_columns: List[str] = field(default_factory=lambda: [
        "时间", "速度", "电流", "电压", "功率", "能量"
    ])
    
    section_columns: List[str] = field(default_factory=lambda: [
        "区间", "车站", "下一站", "坡度", "坡度版本", "运行方向"
    ])
    
    current_threshold: float = 0.5
    speed_threshold: float = 5.0
    voltage_nominal: float = 1500.0
    current_missing_max_gap: int = 5
    
    duplicate_section_window: int = 600
    slope_version_key: str = "坡度版本"
    
    output_formats: List[str] = field(default_factory=lambda: ["csv", "xlsx", "json"])
    
    bad_row_categories: Dict[str, str] = field(default_factory=lambda: {
        "empty": "空行",
        "missing_cols": "缺列",
        "remark_only": "仅备注",
        "invalid_data": "无效数据",
        "current_missing": "电流缺采",
        "duplicate_section": "站间重复",
        "wrong_slope_version": "坡度版本错"
    })

config = DataConfig()

for d in [DATA_DIR, OUTPUT_DIR, EXAMPLES_DIR]:
    d.mkdir(exist_ok=True)
