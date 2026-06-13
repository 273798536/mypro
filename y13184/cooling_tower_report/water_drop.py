"""
水滴数据处理模块

核心职责：
- 读取冷却塔水滴的原始数据（温度、流量等）
- 为每条数据打上"基于哪版铭牌"的追溯ID"
- 支持从CSV导入/导出，保持数据完整性

设计要点：
- 每条水滴记录都有唯一ID，异常点可以"一路点回"原始数据
- 数据和铭牌版本解耦——同一份原始数据，用不同版本的铭牌算出来结果可能不一样
"""

import csv
import os
from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import List, Optional, Dict, Any
import hashlib


@dataclass
class WaterDropRecord:
    """单条水滴记录"""
    record_id: str
    timestamp: str
    temperature: float
    flow_rate: float
    tower_id: str = "CT-001"
    source_file: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class WaterDropProcessor:
    """
    水滴数据处理器

    负责原始数据的加载、存储、查询。
    不做异常判断——那是 anomaly 模块的事，
    这样"数据"和"判断"分开，
    改了阈值也不怕，原始数据永远是干净的。
    """

    def __init__(self, data_dir: str):
        self.data_dir = data_dir
        self.records: List[WaterDropRecord] = []
        self._source_file = ""

    def load_from_csv(self, csv_path: str) -> int:
        """
        从CSV加载水滴数据

        CSV格式：
            timestamp,temperature,flow_rate,tower_id
            2024-06-14 08:00:00,28.5,45.2,CT-001
        """
        self.records = []
        self._source_file = os.path.basename(csv_path)
        with open(csv_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for i, row in enumerate(reader):
                record = WaterDropRecord(
                    record_id=f"wd_{i:06d}",
                    timestamp=row["timestamp"],
                    temperature=float(row["temperature"]),
                    flow_rate=float(row["flow_rate"]),
                    tower_id=row.get("tower_id", "CT-001"),
                    source_file=self._source_file,
                )
                self.records.append(record)
        return len(self.records)

    def save_raw_csv(self, output_path: str) -> None:
        """导出原始数据CSV——不带任何判断，纯原始数据"""
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=[
                "record_id", "timestamp", "temperature", "flow_rate",
                "tower_id", "source_file"
            ])
            writer.writeheader()
            for r in self.records:
                writer.writerow(r.to_dict())

    def get_records_in_range(self, start: Optional[str] = None,
                             end: Optional[str] = None) -> List[WaterDropRecord]:
        """按时间范围筛选数据"""
        result = self.records
        if start:
            result = [r for r in result if r.timestamp >= start]
        if end:
            result = [r for r in result if r.timestamp <= end]
        return result

    def get_record_by_id(self, record_id: str) -> Optional[WaterDropRecord]:
        """按ID查单条记录——异常点"点回材料"的入口"""
        for r in self.records:
            if r.record_id == record_id:
                return r
        return None

    def data_hash(self) -> str:
        """原始数据哈希——用来校验报告和数据是否对得上"""
        content = "|".join(
            f"{r.record_id},{r.timestamp},{r.temperature},{r.flow_rate}"
            for r in self.records
        )
        return hashlib.sha256(content.encode("utf-8")).hexdigest()[:16]

    def record_count(self) -> int:
        return len(self.records)
