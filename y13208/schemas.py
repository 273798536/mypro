from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum

from models import (
    AnomalyStatus, AnomalyType, MatchStatus
)


class TracklistRow(BaseModel):
    track_no: int
    track_title: str
    expected_filename: str
    duration: str
    source_line_no: Optional[int] = None
    notes: Optional[str] = ""
    version_screenshot_path: Optional[str] = ""


class RecordingFileRow(BaseModel):
    filename: str
    file_path: Optional[str] = None
    file_hash: Optional[str] = None
    timecode: str
    duration: str


class ImportTracklistRequest(BaseModel):
    rows: List[TracklistRow]
    source_ref: str
    operator: str
    note: Optional[str] = ""


class ImportFilesRequest(BaseModel):
    rows: List[RecordingFileRow]
    source_ref: str
    operator: str
    note: Optional[str] = ""


class BatchSummary(BaseModel):
    batch_id: str
    source_type: str
    source_ref: str
    count: int
    operator: str
    created_at: datetime


class DetectionRequest(BaseModel):
    track_batch_id: Optional[str] = None
    file_batch_id: Optional[str] = None
    operator: Optional[str] = "api-user"


class DetectionResultResponse(BaseModel):
    batch_id: str
    tracks_imported: int
    files_imported: int
    anomalies_created: int
    unmatched_files: List[str]
    unmatched_tracks: List[str]
    warning_messages: List[str]


class RemarkAppendRequest(BaseModel):
    anomaly_id: int
    content: str
    source: str
    operator: str
    attachment_path: Optional[str] = ""


class JudgmentRequest(BaseModel):
    anomaly_id: int
    judgment_text: str
    source_ref: str
    operator: str
    impact_scope: Optional[str] = ""


class LicenseWaiveRequest(BaseModel):
    anomaly_id: int
    license_remark: str
    operator: str
    source_ref: Optional[str] = "演出统筹授权"


class StatusChangeResponse(BaseModel):
    success: bool
    anomaly_id: int
    from_status: str
    to_status: str
    message: str


class RemarkResponse(BaseModel):
    id: int
    anomaly_id: int
    remark_type: str
    content: str
    source: str
    operator: str
    attachment_path: str
    created_at: datetime


class StatusChangeItem(BaseModel):
    id: int
    anomaly_id: int
    from_status: str
    to_status: str
    reason: str
    operator: str
    created_at: datetime


class JudgmentItem(BaseModel):
    id: int
    anomaly_id: int
    judgment_text: str
    source_ref: str
    impact_scope: str
    is_favorable: bool
    operator: str
    created_at: datetime


class AnomalyResponse(BaseModel):
    id: int
    anomaly_type: str
    title: str
    description: str
    status: str
    track_id: Optional[int]
    file_id: Optional[int]
    source_file_line: int
    impact_scope: str
    matched_track_title: str
    matched_filename: str
    current_judgment: str
    current_snapshot: str
    latest_remark: str
    latest_remark_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    remarks: List[RemarkResponse]
    status_history: List[StatusChangeItem]
    judgments: List[JudgmentItem]


class AlignmentStatusResponse(BaseModel):
    total_tracks: int
    total_files: int
    total_anomalies: int
    anomalies_by_status: Dict[str, int]
    unmatched_file_count: int
    unmatched_filenames: List[str]
    consistency_check: Dict[str, Any]


class ReportGenerateRequest(BaseModel):
    report_title: Optional[str] = "录音棚时码异常提醒报告"
    include_resolved: Optional[bool] = True
    operator_context: Optional[str] = "API 调用"


class ReportInfoResponse(BaseModel):
    report_path: str
    download_url: str
    word_count: int
    generated_at: datetime


class ApiResponse[T](BaseModel):
    code: int = 0
    message: str = "success"
    data: Optional[T] = None


class ApiError(BaseModel):
    code: int
    message: str
    detail: Optional[str] = None
