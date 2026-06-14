from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum


class AnomalyStatus(str, Enum):
    PENDING = "待处理"
    CONFIRMED = "已确认"
    RESOLVED = "已解决"
    DISMISSED = "已驳回"
    WAIVED = "已授权豁免"


class AnomalyType(str, Enum):
    FILENAME_MISMATCH = "文件名不匹配"
    TIMECODE_OFFBEAT = "时码偏半拍"
    TRACKLIST_NOTE_MISMATCH = "曲目表备注不符"
    SCOPE_IMPACT = "影响范围扩大"
    LICENSE_AUTH = "授权备注"


class MatchStatus(str, Enum):
    MATCHED = "已匹配"
    UNMATCHED = "未匹配"
    PARTIAL = "部分匹配"
    RESOLVED = "已人工对齐"


@dataclass
class TracklistItem:
    id: Optional[int]
    track_no: int
    track_title: str
    expected_filename: str
    duration: str
    source_line_no: int
    notes: str = ""
    version_screenshot_path: str = ""
    import_batch_id: str = ""
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)


@dataclass
class RecordingFile:
    id: Optional[int]
    filename: str
    file_path: str
    file_hash: str
    timecode: str
    duration: str
    detected_title: str = ""
    detected_track_no: Optional[int] = None
    match_status: MatchStatus = MatchStatus.UNMATCHED
    matched_track_id: Optional[int] = None
    import_batch_id: str = ""
    imported_at: datetime = field(default_factory=datetime.now)


@dataclass
class RemarkHistory:
    id: Optional[int]
    anomaly_id: int
    remark_type: str
    content: str
    source: str
    operator: str
    attachment_path: str = ""
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class StatusChange:
    id: Optional[int]
    anomaly_id: int
    from_status: AnomalyStatus
    to_status: AnomalyStatus
    reason: str
    operator: str
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class Judgment:
    id: Optional[int]
    anomaly_id: int
    judgment_text: str
    source_ref: str
    impact_scope: str
    is_favorable: bool
    operator: str
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class TimecodeAnomaly:
    id: Optional[int]
    anomaly_type: AnomalyType
    title: str
    description: str
    status: AnomalyStatus
    track_id: Optional[int]
    file_id: Optional[int]
    source_file_line: int
    impact_scope: str
    matched_track_title: str = ""
    matched_filename: str = ""
    current_judgment: str = ""
    current_snapshot: str = ""
    latest_remark: str = ""
    latest_remark_at: Optional[datetime] = None
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    remarks: List[RemarkHistory] = field(default_factory=list)
    status_history: List[StatusChange] = field(default_factory=list)
    judgments: List[Judgment] = field(default_factory=list)


@dataclass
class ImportBatch:
    batch_id: str
    source_type: str
    source_ref: str
    file_count: int
    track_count: int
    operator: str
    note: str = ""
    created_at: datetime = field(default_factory=datetime.now)
