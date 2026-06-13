"""
异常检测模块

核心职责：
- 基于某一版铭牌的阈值，判断哪些水滴数据异常
- 每条异常都带完整追溯链：水滴记录ID → 触发的阈值 → 铭牌版本
- 支持"备注影响判断"——如果铭牌备注改了阈值，异常列表要跟着变

为什么异常要单独一个模块？
因为"数据是客观的，判断是主观的"。
同一份水滴数据，用v3版铭牌算出来有5个异常，
用v5版铭牌可能就只有2个。
异常列表必须和铭牌版本绑定，不能混。
"""

from dataclasses import dataclass, field, asdict
from typing import List, Dict, Any, Optional

from .nameplate import NameplateVersion, ThresholdConfig
from .water_drop import WaterDropRecord


@dataclass
class AnomalyRecord:
    """
    单条异常记录

    关键设计：每条异常都带 trace_chain（追溯链），
    从图表点一下，就能一路追到：
      1. 原始水滴数据
      2. 触发了哪个阈值条件
      3. 这个阈值来自哪版铭牌
      4. 有没有备注影响了这个判断
    """
    anomaly_id: str
    record_id: str
    timestamp: str
    anomaly_type: str
    value: float
    threshold_value: float
    threshold_name: str
    nameplate_version: int
    nameplate_snapshot_hash: str
    trace_chain: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class AnomalyDetector:
    """异常检测器——用指定版本的铭牌去检测水滴数据"""

    def __init__(self, nameplate_version: NameplateVersion):
        self.nameplate = nameplate_version
        self.thresholds = nameplate_version.thresholds

    def detect(self, records: List[WaterDropRecord]) -> List[AnomalyRecord]:
        """
        检测一批水滴数据中的异常

        返回的每条异常都带完整追溯信息，
        排班同事从图表点进去，直接就能看到"为什么算异常"。
        """
        anomalies: List[AnomalyRecord] = []
        count = 0

        for record in records:
            record_anomalies = self._detect_one(record)
            for a in record_anomalies:
                count += 1
                a.anomaly_id = f"anom_{count:06d}"
                anomalies.append(a)

        return anomalies

    def _detect_one(self, record: WaterDropRecord) -> List[AnomalyRecord]:
        """检测单条记录的所有异常维度"""
        anomalies: List[AnomalyRecord] = []
        th = self.thresholds

        if record.temperature > th.water_drop_temp_high:
            anomalies.append(self._make_anomaly(
                record, "temp_high", record.temperature,
                th.water_drop_temp_high, "water_drop_temp_high",
                f"温度 {record.temperature}℃ 超过上限 {th.water_drop_temp_high}℃"
            ))

        if record.temperature < th.water_drop_temp_low:
            anomalies.append(self._make_anomaly(
                record, "temp_low", record.temperature,
                th.water_drop_temp_low, "water_drop_temp_low",
                f"温度 {record.temperature}℃ 低于下限 {th.water_drop_temp_low}℃"
            ))

        if record.flow_rate > th.water_drop_flow_high:
            anomalies.append(self._make_anomaly(
                record, "flow_high", record.flow_rate,
                th.water_drop_flow_high, "water_drop_flow_high",
                f"流量 {record.flow_rate}{th.unit} 超过上限 {th.water_drop_flow_high}{th.unit}"
            ))

        if record.flow_rate < th.water_drop_flow_low:
            anomalies.append(self._make_anomaly(
                record, "flow_low", record.flow_rate,
                th.water_drop_flow_low, "water_drop_flow_low",
                f"流量 {record.flow_rate}{th.unit} 低于下限 {th.water_drop_flow_low}{th.unit}"
            ))

        return anomalies

    def _make_anomaly(self, record: WaterDropRecord, anomaly_type: str,
                      value: float, threshold_value: float,
                      threshold_name: str, description: str) -> AnomalyRecord:
        """构造一条带追溯链的异常记录"""
        active_notes = [n for n in self.nameplate.notes if not n.is_retracted]
        retracted_notes = [n for n in self.nameplate.notes if n.is_retracted]

        trace_chain = {
            "record_id": record.record_id,
            "record_timestamp": record.timestamp,
            "anomaly_type": anomaly_type,
            "value": value,
            "threshold_value": threshold_value,
            "threshold_name": threshold_name,
            "unit": self.thresholds.unit,
            "description": description,
            "nameplate_version": self.nameplate.version,
            "nameplate_snapshot_hash": self.nameplate.snapshot_hash(),
            "nameplate_operator": self.nameplate.operator,
            "nameplate_change_reason": self.nameplate.change_reason,
            "active_notes_count": len(active_notes),
            "active_notes": [
                {
                    "note_id": n.note_id,
                    "content": n.content,
                    "impact": n.impact_description,
                    "operator": n.operator,
                    "timestamp": n.timestamp,
                }
                for n in active_notes
            ],
            "retracted_notes_count": len(retracted_notes),
            "retracted_notes": [
                {
                    "note_id": n.note_id,
                    "content": n.content,
                    "retract_reason": n.retract_reason,
                    "retract_operator": n.retract_operator,
                    "retract_timestamp": n.retract_timestamp,
                }
                for n in retracted_notes
            ],
            "source_file": record.source_file,
            "tower_id": record.tower_id,
        }

        return AnomalyRecord(
            anomaly_id="",
            record_id=record.record_id,
            timestamp=record.timestamp,
            anomaly_type=anomaly_type,
            value=value,
            threshold_value=threshold_value,
            threshold_name=threshold_name,
            nameplate_version=self.nameplate.version,
            nameplate_snapshot_hash=self.nameplate.snapshot_hash(),
            trace_chain=trace_chain,
        )

    def summary(self, anomalies: List[AnomalyRecord]) -> Dict[str, Any]:
        """生成异常统计摘要"""
        by_type: Dict[str, int] = {}
        for a in anomalies:
            by_type[a.anomaly_type] = by_type.get(a.anomaly_type, 0) + 1

        return {
            "total_records": 0,
            "total_anomalies": len(anomalies),
            "by_type": by_type,
            "nameplate_version": self.nameplate.version,
            "thresholds": self.thresholds.to_dict(),
            "active_note_count": sum(1 for n in self.nameplate.notes if not n.is_retracted),
            "retracted_note_count": sum(1 for n in self.nameplate.notes if n.is_retracted),
        }
