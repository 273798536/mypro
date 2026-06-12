"""
海草床覆盖度估算 - 数据模型
核心原则：所有处理步骤共用同一批 ProcessingRecord，
界面、报告、下载都从同一份记录取数，避免各算各的。
"""

import uuid
import hashlib
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import List, Dict, Optional, Any


RECORD_STATUS_RAW = "raw"
RECORD_STATUS_CLEANED = "cleaned"
RECORD_STATUS_TIDE_COMPUTED = "tide_computed"
RECORD_STATUS_ESTIMATED = "estimated"
RECORD_STATUS_FLAGGED = "flagged"
RECORD_STATUS_DUPLICATE = "duplicate"

STAGE_WEATHER_FORECAST = "weather_forecast"
STAGE_TRACK_CLEANING = "track_cleaning"
STAGE_TIDE_COMPUTATION = "tide_computation"
STAGE_COVERAGE_ESTIMATION = "coverage_estimation"
STAGE_DUPLICATE_CHECK = "duplicate_check"


@dataclass
class SourceRef:
    """来源引用，用于溯源：result -> source"""
    source_id: str
    source_type: str
    source_name: str
    raw_value: Any = None
    fetched_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class ProcessingOpinion:
    """处理意见：每一步处理都留下意见，方便倒查"""
    stage: str
    operator: str
    opinion: str
    decision: str
    evidence: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class ProcessingRecord:
    """
    处理记录 - 整个系统的核心数据结构。
    潮汐计算、轨迹清洗、覆盖度估算都写入同一份记录。
    溯源链路：record -> source_refs -> processing_opinions
    """
    record_id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    batch_id: str = ""
    vessel_id: str = ""
    survey_time: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    longitude: float = 0.0
    latitude: float = 0.0
    depth: float = 0.0
    coverage: Optional[float] = None
    status: str = RECORD_STATUS_RAW
    timezone_offset_hours: int = 8
    source_refs: List[SourceRef] = field(default_factory=list)
    processing_opinions: List[ProcessingOpinion] = field(default_factory=list)
    weather_data: Dict[str, Any] = field(default_factory=dict)
    tide_data: Dict[str, Any] = field(default_factory=dict)
    track_data: Dict[str, Any] = field(default_factory=dict)
    flags: List[str] = field(default_factory=list)
    duplicate_of: Optional[str] = None
    extra: Dict[str, Any] = field(default_factory=dict)

    def fingerprint(self) -> str:
        """
        计算记录指纹，用于重复上报检测。
        用 vessel_id + survey_time + 经纬度 做指纹。
        """
        key = f"{self.vessel_id}|{self.survey_time.isoformat()}|{self.longitude:.4f}|{self.latitude:.4f}"
        return hashlib.md5(key.encode("utf-8")).hexdigest()

    def add_opinion(self, stage: str, operator: str, opinion: str,
                    decision: str, evidence: Optional[Dict] = None):
        self.processing_opinions.append(ProcessingOpinion(
            stage=stage, operator=operator, opinion=opinion,
            decision=decision, evidence=evidence or {}
        ))

    def add_source(self, source_id: str, source_type: str, source_name: str, raw_value=None):
        self.source_refs.append(SourceRef(
            source_id=source_id, source_type=source_type,
            source_name=source_name, raw_value=raw_value
        ))

    def add_flag(self, flag: str):
        if flag not in self.flags:
            self.flags.append(flag)
        self.status = RECORD_STATUS_FLAGGED

    def get_latest_opinion_by_stage(self, stage: str) -> Optional[ProcessingOpinion]:
        for op in reversed(self.processing_opinions):
            if op.stage == stage:
                return op
        return None

    def trace_back(self, indent: int = 0) -> str:
        """
        生成溯源文本，从结果一路回到来源和处理记录。
        验收时倒查用。
        """
        prefix = "  " * indent
        lines = []
        lines.append(f"{prefix}记录 {self.record_id} (状态: {self.status})")
        lines.append(f"{prefix}  船: {self.vessel_id}, 时间: {self.survey_time.isoformat()} (UTC{self.timezone_offset_hours:+d})")
        lines.append(f"{prefix}  位置: ({self.longitude:.4f}, {self.latitude:.4f}), 深度: {self.depth:.2f}m")
        if self.coverage is not None:
            lines.append(f"{prefix}  覆盖度: {self.coverage:.2%}")
        if self.flags:
            lines.append(f"{prefix}  标记: {', '.join(self.flags)}")
        if self.duplicate_of:
            lines.append(f"{prefix}  重复于: {self.duplicate_of}")

        if self.processing_opinions:
            lines.append(f"{prefix}  处理意见:")
            for op in self.processing_opinions:
                lines.append(f"{prefix}    [{op.stage}] {op.operator} - {op.opinion} -> {op.decision}")
                if op.evidence:
                    for k, v in op.evidence.items():
                        lines.append(f"{prefix}      证据: {k} = {v}")

        if self.source_refs:
            lines.append(f"{prefix}  来源:")
            for src in self.source_refs:
                lines.append(f"{prefix}    {src.source_type}/{src.source_name} (id={src.source_id})")

        return "\n".join(lines)
