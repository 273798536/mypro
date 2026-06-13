from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from datetime import datetime


@dataclass
class ScreenshotRef:
    path: str
    caption: str
    version: str
    timestamp: datetime


@dataclass
class RemarkEntry:
    content: str
    author: str
    timestamp: datetime
    is_latest: bool = False


@dataclass
class SensorRecord:
    timestamp: datetime
    device_id: str
    raw_value: float
    raw_unit: str
    normalized_value: float
    normalized_unit: str
    speckle_contrast: Optional[float] = None
    speckle_size_um: Optional[float] = None
    remarks: List[RemarkEntry] = field(default_factory=list)
    screenshots: List[ScreenshotRef] = field(default_factory=list)
    version: str = "v1"
    unit_conversion_note: str = ""
    calc_steps: List[str] = field(default_factory=list)
    row_index: int = 0


@dataclass
class DuplicateInfo:
    device_id: str
    occurrences: List[int]
    timestamps: List[datetime]
    values: List[float]
    reason_hint: str
    impact_scope: str


@dataclass
class ExportResult:
    summary: Dict[str, Any]
    duplicate_alerts: List[DuplicateInfo]
    records: List[SensorRecord]
    terminal_text: str
    screenshot_doc_path: str
    calc_trace_path: str
    history_dir: str
